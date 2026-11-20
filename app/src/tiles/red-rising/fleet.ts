// The fleets over Mars: free-flying warships that drift on slow paths of
// their own round the edges of the sky, and the fighting between them. The
// Augustan line: the Morning Star, Darrow's later flagship, white with red
// scythes and a crescent bow like a shark's open mouth (MS 45, 57); the Pax,
// his flagship in the Lion's Rain, the dreadnought whose spitTubes fire the
// Rain (GS 22, 37); two destroyers; and Victra's destroyer with its leechCraft
// (GS 38). Against them: the Warchild, the Bellona flagship, and two consorts
// in blue and silver (GS 38); and the Rim's ships, the moonBreaker Dustmaker
// (LB 20) and the black Charybdis with the three-headed electric dragon on its
// sides (IG 15). Between them, the Archimedes, the corvette like a reared
// cobra's head that Cassius and Lysander sailed after the war (IG 8). ripWings
// and wasps chase each other, railguns and missiles streak between the lines
// at each other's engines, flak bursts, dropships fly low over the ground
// column, and now and then drones rise from the depot in the canyon's wall.
//
// Where they fly is laid out for the view the tile opens with, which sees a
// thing at height y 0.86 y further west and 0.95 y further north than it is:
// the Augustans over the north-east, seen above the plateau's rim at the right
// of the picture; the Bellona and the Rim along the west edge, seen above the
// board's west edge at the left; the destroyers between them over the north,
// seen above the towers. Every part of every ship stays on the board, outside
// the shield, and ten above anything built; a check flies every path on load
// and says how near each comes (see `checkFleet`).
//
// The books give the looks of the Morning Star, the Warchild's colours, the
// Charybdis's paint and the Archimedes's shape. Everything else is this tile's
// own drawing: the Pax in gunmetal and the Reaper's red, Victra's destroyer
// dark with jade, the Dustmaker in dust and bronze with a ring about its waist,
// unlike either other fleet.
//
// Every ship is one mesh of the city's material (`fleetMaterial`), so it takes
// the tile's light, its outlines and its lit windows; a lamp or a hangar's
// mouth is a surface lit within. What glows by day too, engines, bolts and
// flashes, is drawn in a few instanced meshes shared by the whole fleet. The
// shadow map is drawn once, so each ship carries a soft shadow of its own laid
// on the ground below it.

import * as THREE from 'three';
import { GeoBuilder, interior, rng, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { face3 } from '../../engine/shapes';
import type { Build } from '../../engine/tile';
import { DEPOT_MOUTH } from './canyon';
import { landAt } from './land';
import { LOTS, SHIELD, STAGES } from './plan';
import { LOOP_MIDDLE, SOUTH } from './roads';

export type ShipId = 'morningStar' | 'pax' | 'warchild' | 'dustmaker' | 'charybdis' | 'archimedes' | 'victra';

export interface Fleet {
  /** Where a ship is now, its middle, and which way its bow points (radians: 0 east, a quarter turn south). */
  where(id: ShipId): { x: number; y: number; z: number; heading: number };
  /** The mouths of a ship's spitTubes now, along its port side, from which the Rain is fired. */
  tubes(id: 'pax' | 'morningStar'): V3[];
  /** Plays the leechCraft's run at the Warchild (story 11) from now. Returns how many seconds it takes. */
  leeches(): number;
  /** Plays the Charybdis's chase of the Archimedes through the fleet, which ends with the corvette slipping away. Returns how long. */
  chase(): number;
  /** Stands every ship still as it is at `t` seconds, for pictures; null lets them go. */
  hold(t: number | null): void;
}

type P2 = [number, number];
type RGB = [number, number, number];

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** The Morning Star: white, with the Reaper's red scythes (MS 57). */
const MS_WHITE = 0xf1eee7, MS_SHADE = 0xd6d2c9, MS_DECK = 0xc4c0b8, MS_STEEL = 0x8b9098, MS_DARK = 0x4b4d54, MS_RED = 0xb11f19, MS_KEEL = 0xbdb8ae;
/** The Pax and the Augustan destroyers: gunmetal and the Reaper's red (the books are silent: this tile's own). */
const GUN = 0x434750, GUN_DARK = 0x2c2e34, GUN_LIGHT = 0x60656e, REAPER = 0xa5221b;
/** House Bellona: blue and silver (GS 38). */
const B_BLUE = 0x27498c, B_DEEP = 0x1a3060, B_SILVER = 0xc9d2dc, B_STEEL = 0x8e99a6;
/** The Rim's Dustmaker: dust and bronze (silent: this tile's own). */
const DUST = 0x7f796e, DUST_LIGHT = 0x989184, DUST_DARK = 0x4f4a42, BRONZE = 0x6b5638, BRONZE_DARK = 0x3f3325;
/** The Charybdis: black (IG 15), its plates a little lighter so that its shape reads. */
const BLACK = 0x1a1b1f, BLACK_PLATE = 0x2a2c33, BLACK_EDGE = 0x464a53;
/** Victra's destroyer: dark, with the Julii's jade (silent: this tile's own). */
const V_DARK = 0x262c2e, V_PLATE = 0x353e41, JADE = 0x2fa37a;
/** The Archimedes: a dark bronze hood over a pale belly, as a cobra's (silent beyond its shape). */
const COBRA = 0x4f4a2c, COBRA_PALE = 0xd6c99f, COBRA_DARK = 0x2c2a1c;
/** Lit things: the mouth of a hangar, a spitTube, a lamp; each glows at night. */
const AMBER = 0xf2b360, TUBE_HOT = 0xff9440, HANGAR_IN = 0xf0c27c, JADE_LIGHT = 0x8ff0c8, BELLONA_LIGHT = 0x9fd4ff, RIM_LIGHT = 0xd9c6ff, ELECTRIC = 0x6ff3ff;
const RED_LAMP = 0xff3a2a, GREEN_LAMP = 0x48ff7a, WHITE_LAMP = 0xfff4dc;
/** Glass that a ship looks out of. */
const GLASS = 0x2a3a4c;

/** The fires of each fleet's engines, as an exhaust glows: brighter than white where they are hottest. */
const FIRE_AUG: RGB = [2.2, 1.25, 0.6], FIRE_BEL: RGB = [1.0, 1.5, 2.4], FIRE_RIM: RGB = [1.7, 1.35, 2.4], FIRE_JADE: RGB = [0.9, 2.0, 1.4], FIRE_BLACK: RGB = [1.0, 1.9, 2.4], FIRE_GOLD: RGB = [2.2, 1.7, 0.8];
/** Bolts of each side: the Augustans' orange-white, the Bellona's blue-white, the Rim's violet. */
const BOLT_AUG: RGB = [2.6, 1.7, 0.9], BOLT_BEL: RGB = [1.3, 1.9, 2.8], BOLT_RIM: RGB = [2.0, 1.4, 2.8];

// windows: rows of small ports on a hull, a bridge's band of glass, and the rows of a dorsal city's blocks
const PORTS: WinSpec = { cell: 1.1, storey: 1.3, lit: 0.9, kind: 4 };
const PORTS_SPARSE: WinSpec = { cell: 1.6, storey: 1.3, lit: 0.75, kind: 4 };
const BLOCKS: WinSpec = { cell: 1.2, storey: 1.2, lit: 0.9, kind: 0 };
const BRIDGE: WinSpec = { cell: 0.9, storey: 1.6, lit: 1.0, kind: 1 };
const SLITS: WinSpec = { cell: 1.4, storey: 2.6, lit: 0.8, kind: 6 };
const DECKS: WinSpec = { cell: 1.25, storey: 2.5, lit: 0.95, kind: 0 };

// ---------------------------------------------------------------------------
// Vectors
// ---------------------------------------------------------------------------

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const centroid = (ps: V3[]): V3 => mul(ps.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / ps.length);
const near = (a: V3, b: V3): boolean => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 1e-5;
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** A number from 0 to 1 that is the same every time it is asked for the same two numbers. */
const hash = (a: number, b = 0): number => {
  const s = Math.sin(a * 127.1 + b * 311.7 + 0.5) * 43758.5453;
  return s - Math.floor(s);
};

/** A ring of a hull: points (across, up) laid at `x`, scaled across and up, and lifted. */
const ring = (x: number, pts: P2[], sz = 1, sy = 1, dy = 0): V3[] => pts.map(([z, y]): V3 => [x, y * sy + dy, z * sz]);

// ---------------------------------------------------------------------------
// The kit a ship is built with
// ---------------------------------------------------------------------------

/** An engine's exhaust: where its nozzle opens, which way the fire goes, how wide and long, and its colour. */
interface Plume { at: V3; dir: V3; r: number; len: number; color: RGB }
/** A lamp that blinks: where, its colour, how large, its period, where in it it starts, and for what share of it it is lit. */
interface Blink { at: V3; color: RGB; size: number; period: number; phase: number; duty: number }

/** A ship as built, in its own coordinates: its bow along +x, its starboard along +z. */
interface Model {
  geo: THREE.BufferGeometry;
  L: number;
  W: number;
  plumes: Plume[];
  blinks: Blink[];
  /** The mouths of its spitTubes, for the Rain. */
  tubes: V3[];
  /** The ends of its guns' barrels, from which its bolts are fired. */
  muzzles: V3[];
  /** Its hull, as triangles seen from above, for its shadow. */
  plan: number[];
  /** Points over its whole surface, for the check of how near it comes to things. */
  samples: V3[];
  /** Its box: half its length and width, and how far it reaches below and above its middle. */
  box: { hx: number; hz: number; y0: number; y1: number };
}

class Kit {
  readonly g = new GeoBuilder();
  readonly plumes: Plume[] = [];
  readonly blinks: Blink[] = [];
  readonly tubes: V3[] = [];
  readonly muzzles: V3[] = [];
  readonly L: number;
  readonly r: () => number;

  constructor(L: number, seed: number) {
    this.L = L;
    this.r = rng(seed);
  }

  /** A face of four corners, its normal turned away from a point inside. */
  quad(a: V3, b: V3, c: V3, d: V3, color: number, inside: V3, o: QuadOpts = {}): void {
    let n = cross(sub(c, a), sub(d, b));
    if (len(n) < 1e-9) return;
    n = unit(n);
    if (dot(n, sub(centroid([a, b, c, d]), inside)) < 0) n = mul(n, -1);
    this.g.quad(a, b, c, d, n, color, o);
  }

  /** A triangle, its normal turned away from a point inside. */
  tri(a: V3, b: V3, c: V3, color: number, inside: V3, o: QuadOpts = {}): void {
    let n = cross(sub(b, a), sub(c, a));
    if (len(n) < 1e-9) return;
    n = unit(n);
    if (dot(n, sub(centroid([a, b, c]), inside)) < 0) n = mul(n, -1);
    face3(this.g, a, b, c, n, color, o);
  }

  /**
   * A hull lofted through rings of the same number of points: band j of
   * segment s runs between points j and j + 1 of rings s and s + 1. Windows
   * run along the ship, so that their columns line up from end to end.
   */
  loft(rings: V3[][], color: (band: number, seg: number) => number, o: { win?: (band: number, seg: number) => WinSpec | undefined; skip?: (band: number, seg: number) => boolean; inside?: (seg: number) => V3; seed?: number } = {}): void {
    for (let s = 0; s + 1 < rings.length; s++) {
      const A = rings[s], B = rings[s + 1], n = A.length;
      const inside = o.inside ? o.inside(s) : centroid([...A, ...B]);
      for (let j = 0; j < n; j++) {
        if (o.skip?.(j, s)) continue;
        const j2 = (j + 1) % n, a = A[j], b = B[j], c = B[j2], d = A[j2];
        const col = color(j, s);
        if (near(b, c)) this.tri(a, b, d, col, inside);
        else if (near(a, d)) this.tri(a, b, c, col, inside);
        else {
          const w = o.win?.(j, s);
          this.quad(a, b, c, d, col, inside, w ? { win: w, u0: a[0] + this.L / 2, u1: b[0] + this.L / 2, L: this.L, seed: (o.seed ?? 0) + j * 0.17 } : {});
        }
      }
    }
  }

  /** A ring closed with a fan of triangles. */
  cap(rg: V3[], color: number, inside: V3, o: QuadOpts = {}): void {
    const c = centroid(rg);
    for (let j = 0; j < rg.length; j++) this.tri(c, rg[j], rg[(j + 1) % rg.length], color, inside, o);
  }

  /** A round bar from a to b, `ra` and `rb` in radius, closed at either end unless told not to be. */
  frustum(a: V3, b: V3, ra: number, rb: number, sides: number, color: number, o: { capA?: number | false; capB?: number | false; phase?: number; win?: WinSpec } = {}): void {
    const ax = unit(sub(b, a)), ref: V3 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = unit(cross(ax, ref)), v = cross(ax, u), L = len(sub(b, a)), slope = (ra - rb) / Math.max(L, 1e-6), ph = o.phase ?? Math.PI / sides;
    const at = (c: V3, r: number, t: number): V3 => add(c, add(mul(u, Math.cos(t) * r), mul(v, Math.sin(t) * r)));
    for (let i = 0; i < sides; i++) {
      const t0 = ph + (i / sides) * Math.PI * 2, t1 = ph + ((i + 1) / sides) * Math.PI * 2, tm = (t0 + t1) / 2;
      const n = unit(add(add(mul(u, Math.cos(tm)), mul(v, Math.sin(tm))), mul(ax, slope)));
      const pa0 = at(a, ra, t0), pa1 = at(a, ra, t1), pb0 = at(b, rb, t0), pb1 = at(b, rb, t1);
      if (rb < 1e-4) face3(this.g, pa0, pa1, b, n, color);
      else if (ra < 1e-4) face3(this.g, a, pb1, pb0, n, color);
      else this.g.quad(pa0, pa1, pb1, pb0, n, color, o.win ? { win: o.win } : {});
      if (o.capA !== false && ra > 1e-4) face3(this.g, a, pa1, pa0, mul(ax, -1), o.capA ?? color);
      if (o.capB !== false && rb > 1e-4) face3(this.g, b, pb0, pb1, ax, o.capB ?? color);
    }
  }

  /** A box along any three axes at right angles, `h` half its size along each. Faces as `box` names them: E W along the first, T B the second, S N the third. */
  rbox(c: V3, h: V3, ax: V3, ay: V3, az: V3, color: number, o: { faces?: string; top?: number; win?: WinSpec } = {}): void {
    const f = o.faces ?? 'NESWTB';
    const P = (sx: number, sy: number, sz: number): V3 => add(c, add(add(mul(ax, sx * h[0]), mul(ay, sy * h[1])), mul(az, sz * h[2])));
    const q: QuadOpts = o.win ? { win: o.win } : {};
    if (f.includes('E')) this.g.quad(P(1, -1, -1), P(1, -1, 1), P(1, 1, 1), P(1, 1, -1), ax, color, q);
    if (f.includes('W')) this.g.quad(P(-1, -1, 1), P(-1, -1, -1), P(-1, 1, -1), P(-1, 1, 1), mul(ax, -1), color, q);
    if (f.includes('T')) this.g.quad(P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1), ay, o.top ?? color, q);
    if (f.includes('B')) this.g.quad(P(-1, -1, 1), P(1, -1, 1), P(1, -1, -1), P(-1, -1, -1), mul(ay, -1), color, q);
    if (f.includes('S')) this.g.quad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), az, color, q);
    if (f.includes('N')) this.g.quad(P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), mul(az, -1), color, q);
  }

  /** A flat plate on a face, `u` and `v` along the face, `n` its outward normal: its corners, `lift` proud of it. */
  plate(o: V3, u: V3, v: V3, n: V3, u0: number, v0: number, u1: number, v1: number, lift: number, color: number, q: QuadOpts = {}): void {
    const P = (a: number, b: number): V3 => add(add(add(o, mul(u, a)), mul(v, b)), mul(n, lift));
    this.g.quad(P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), n, color, q);
  }

  /** A shape painted on a face: an outline in the face's own coordinates, a little proud of it. */
  decal(o: V3, u: V3, v: V3, n: V3, outline: P2[], color: number, lift = 0.07, q: QuadOpts = {}): void {
    const tris = THREE.ShapeUtils.triangulateShape(outline.map((p) => new THREE.Vector2(p[0], p[1])), []);
    const P = (p: P2): V3 => add(add(add(o, mul(u, p[0])), mul(v, p[1])), mul(n, lift));
    for (const t of tris) face3(this.g, P(outline[t[0]]), P(outline[t[1]]), P(outline[t[2]]), n, color, q);
  }

  /** A stroke painted on a face: a line of points, `w` wide. */
  stroke(o: V3, u: V3, v: V3, n: V3, pts: P2[], w: number, color: number, lift: number, q: QuadOpts = {}): void {
    const P = (a: number, b: number): V3 => add(add(add(o, mul(u, a)), mul(v, b)), mul(n, lift));
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.hypot(bx - ax, by - ay) || 1, px = (-(by - ay) / l) * (w / 2), py = ((bx - ax) / l) * (w / 2);
      // a little past each end, so that the bends close
      const ex = ((bx - ax) / l) * (w * 0.35), ey = ((by - ay) / l) * (w * 0.35);
      this.g.quad(P(ax - ex + px, ay - ey + py), P(ax - ex - px, ay - ey - py), P(bx + ex - px, by + ey - py), P(bx + ex + px, by + ey + py), n, color, q);
    }
  }

  /** A railgun turret: a ring, a housing, and one or two barrels, standing on `up` and pointing along `fwd`. */
  turret(at: V3, up: V3, fwd: V3, s: number, base: number, body: number, barrel: number, twin: boolean | number = true, reach = 2.3): void {
    const f = unit(sub(fwd, mul(up, dot(fwd, up)))), side = unit(cross(f, up));
    const n = twin === true ? 2 : twin === false ? 1 : twin;
    this.frustum(add(at, mul(up, -0.1 * s)), add(at, mul(up, 0.38 * s)), 0.9 * s, 0.78 * s, 8, base, { capA: false });
    const hc = add(at, mul(up, 0.7 * s));
    this.rbox(hc, [0.78 * s, 0.33 * s, 0.32 * s + 0.15 * s * n], f, up, side, body, { faces: 'NESWT' });
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * 0.56;
      const p0 = add(add(hc, mul(side, o * s)), mul(f, 0.7 * s)), p1 = add(p0, mul(f, reach * s));
      this.frustum(p0, p1, 0.15 * s, 0.12 * s, 4, barrel, { capA: false, phase: Math.PI / 4 });
      this.muzzles.push(p1);
    }
  }

  /** An engine: its housing, set into the hull, and its fire. */
  nozzle(at: V3, dir: V3, r: number, housing: number, fire: RGB, depth = r * 1.1, plume = r * 5): void {
    const back = add(at, mul(dir, depth));
    this.frustum(add(at, mul(dir, -0.4)), back, r * 1.18, r * 1.04, 10, housing, { capA: false, capB: 0x17171b });
    this.plumes.push({ at: add(back, mul(dir, 0.03)), dir, r: r * 0.86, len: plume, color: fire });
  }

  /** A lamp: a small box lit from within, which shines at night. */
  lamp(at: V3, s: number, color: number, lit = 2.6): void {
    this.g.box(at[0] - s, at[1] - s, at[2] - s, at[0] + s, at[1] + s, at[2] + s, color, { faces: 'NESWTB', win: interior(lit) });
  }

  blink(at: V3, color: RGB, size: number, period: number, phase: number, duty: number): void {
    this.blinks.push({ at, color, size, period, phase, duty });
  }

  /** The mouth of a spitTube on a face: a dark frame and its hot core, and where a shell leaves it. */
  mouth(at: V3, u: V3, v: V3, n: V3, s: number, frame: number, core = TUBE_HOT): void {
    this.plate(at, u, v, n, -s / 2, -s / 2, s / 2, s / 2, 0.05, frame);
    this.plate(at, u, v, n, -s * 0.3, -s * 0.3, s * 0.3, s * 0.3, 0.09, core, { win: interior(2.8) });
    this.tubes.push(add(at, mul(n, 0.4)));
  }

  /** Finished: the geometry, and what else the fleet needs to know about the ship. */
  done(W: number, box: Model['box']): Model {
    const geo = this.g.build();
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    // seen from above: every triangle's corners, for the shadow
    const plan: number[] = [];
    for (let i = 0; i < pos.count; i++) plan.push(pos.getX(i), pos.getZ(i));
    // points over the surface, one in each small cell of space, for the check: every corner, and points across every large face
    const cells = new Map<string, V3>();
    const put = (p: V3): void => {
      const key = `${Math.round(p[0] / 3.2)},${Math.round(p[1] / 3.2)},${Math.round(p[2] / 3.2)}`;
      if (!cells.has(key)) cells.set(key, p);
    };
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const a: V3 = [pos.getX(i), pos.getY(i), pos.getZ(i)], b: V3 = [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)], c: V3 = [pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2)];
      put(a);
      put(b);
      put(c);
      const area = len(cross(sub(b, a), sub(c, a))) / 2;
      for (let j = 0; j < Math.min(60, Math.floor(area / 6)); j++) {
        let u = hash(i, j), v = hash(j + 0.5, i);
        if (u + v > 1) {
          u = 1 - u;
          v = 1 - v;
        }
        put(add(a, add(mul(sub(b, a), u), mul(sub(c, a), v))));
      }
    }
    return { geo, L: this.L, W, plumes: this.plumes, blinks: this.blinks, tubes: this.tubes, muzzles: this.muzzles, plan, samples: [...cells.values()], box };
  }
}

/** The outward normal of a band from p to q round a ring (in across and up), for a hull whose middle is at `mid` up. */
function bandFrame(p: P2, q: P2, side: number): { up: V3; n: V3; o: (t: number, x: number) => V3 } {
  const up = unit([0, q[1] - p[1], q[0] - p[0]]);
  let n: V3 = [0, -(q[0] - p[0]), q[1] - p[1]];
  n = unit(n);
  if (n[2] * side < 0) n = mul(n, -1);
  return { up, n, o: (t: number, x: number): V3 => [x, p[1] + (q[1] - p[1]) * t, p[0] + (q[0] - p[0]) * t] };
}

const X: V3 = [1, 0, 0], Y: V3 = [0, 1, 0], Z: V3 = [0, 0, 1];

// ---------------------------------------------------------------------------
// The Morning Star
// ---------------------------------------------------------------------------

/**
 * The Morning Star, a moonBreaker eight kilometres long and one and a half
 * tall, the largest warship of the saga (MS 45): 118 long here. Its bow is a
 * crescent, so that it looks like a shark with its mouth open swimming
 * sideways (MS 45): two jaws curving forward and in, fanged with guns, round
 * the mouth of its great dock, lit within. White, with a red scythe the length
 * of each flank, its blade the jaw itself (MS 57); a sloppy red crescent on its
 * underside where the paint ran out (MS 57). A floating city of docks along
 * its back, hangar bays along its chines (at least eighteen, MS 47), rows of
 * spitTubes along its port side (IG prologue), railguns, torpedo tubes and
 * particle cannons on every side (MS 46), and the gravity generators low in its
 * hull that keep it up in air (DA 17), glowing under its keel.
 */
function morningStar(): Model {
  const L = 118, k = new Kit(L, 0x5717), H = L / 2;
  const R: P2[] = [[-9, -10], [-12, -7.5], [-13, -4], [-13, 5], [-9.5, 9], [9.5, 9], [13, 5], [13, -4], [12, -7.5], [9, -10]];
  // bands: 0 port chine, 1 port tube band, 2 port flank, 3 port shoulder, 4 deck, 5 starboard shoulder, 6 starboard flank, 7 starboard band, 8 starboard chine, 9 keel
  const BAND = [MS_SHADE, MS_STEEL, MS_WHITE, MS_SHADE, MS_DECK, MS_SHADE, MS_WHITE, MS_STEEL, MS_SHADE, MS_KEEL];
  const rings = [ring(-H, R, 0.8, 0.8, 0.4), ring(-56.5, R, 0.94, 0.94, 0.1), ring(-54, R), ring(22, R)];
  k.loft(rings, (j) => BAND[j], { seed: 1 });
  k.cap(rings[0], MS_STEEL, [-50, 0, 0]);
  k.cap(rings[3], MS_STEEL, [10, 0, 0]);

  // --- the jaws: a crescent, each jaw a horn curving forward and in ---
  const SP: [number, number, number, number, number][] = [
    // x, how far out, width, half-height, middle height
    [15, 8.4, 8.4, 9.2, -0.5], [22, 9.6, 8.6, 9.0, -0.3], [29, 10.8, 8.2, 8.0, 0.1], [36, 11.3, 7.4, 6.9, 0.5],
    [43, 10.6, 6.2, 5.6, 0.8], [49, 8.8, 4.6, 4.2, 1.0], [54, 6.4, 3.0, 2.8, 1.2], [57.5, 4.2, 1.5, 1.4, 1.3], [59.5, 2.6, 0.25, 0.3, 1.3],
  ];
  for (const s of [-1, 1]) {
    const rgs: V3[][] = [], axis: V3[] = [];
    SP.forEach(([x, zo, w, h, yc], i) => {
      const a = SP[Math.max(0, i - 1)], b = SP[Math.min(SP.length - 1, i + 1)];
      const t = unit([b[0] - a[0], 0, s * (b[1] - a[1])]);
      let n: V3 = [-t[2], 0, t[0]];
      if (n[2] * s < 0) n = mul(n, -1);
      const P: V3 = [x, yc, s * zo];
      const at = (out: number, up: number): V3 => add(add(P, mul(n, out)), [0, up, 0]);
      rgs.push([at(w * 0.28, h), at(w * 0.5, h * 0.4), at(w * 0.5, -h * 0.4), at(w * 0.28, -h), at(-w * 0.3, -h * 0.86), at(-w * 0.5, -h * 0.3), at(-w * 0.5, h * 0.3), at(-w * 0.3, h * 0.86)]);
      axis.push(P);
    });
    // bands: 0 outer slope, 1 the outer face (the scythe's blade, red), 2 lower slope, 3 under, 4 inner lower, 5 the mouth's wall, 6 inner upper, 7 top
    const JAW = [MS_WHITE, MS_RED, MS_SHADE, MS_KEEL, MS_STEEL, MS_DARK, MS_STEEL, MS_DECK];
    k.loft(rgs, (j, seg) => (j === 1 && seg === 0 ? MS_WHITE : JAW[j]), { inside: (seg) => lerp3(axis[seg], axis[seg + 1], 0.5), seed: 3 + s });
    // fangs along the mouth's wall: guns that point into the mouth, pale as teeth
    for (let i = 1; i < 7; i++) {
      for (const f of [0.3, 0.72]) {
        const a = rgs[i], b = rgs[i + 1];
        const p = lerp3(lerp3(a[5], a[6], 0.5), lerp3(b[5], b[6], 0.5), f), q = lerp3(lerp3(a[4], a[5], 0.6), lerp3(b[4], b[5], 0.6), f);
        const inward = unit([0, 0, -s]);
        const size = 0.42 * (1.2 - i * 0.09);
        k.frustum(p, add(add(p, mul(inward, 2.2 * (1.2 - i * 0.1))), [0.5, -0.4, 0]), size, 0.04, 5, MS_WHITE, { capA: false });
        k.frustum(q, add(add(q, mul(inward, 1.4)), [0.4, 0.5, 0]), size * 0.75, 0.04, 5, MS_WHITE, { capA: false });
      }
    }
    // guns on each jaw's back
    for (const i of [2, 4]) {
      const top = lerp3(rgs[i][7], rgs[i][0], 0.5);
      k.turret(add(top, [0, 0.05, 0]), Y, [1, 0, -s * 0.4], 0.95, MS_STEEL, MS_SHADE, MS_WHITE);
    }
    // the jaws' tips: red to port, green to starboard
    k.lamp([59.2, 1.3, s * 2.7], 0.3, s < 0 ? RED_LAMP : GREEN_LAMP, 3);
    k.blink([59.9, 1.6, s * 2.6], s < 0 ? [3, 0.4, 0.3] : [0.4, 3, 0.8], 0.9, 1.0, 0, 1);
  }

  // --- the great dock: its mouth at the back of the jaws, lit within, with gantries across it ---
  k.plate([22, 0, 0], [0, 0, 1], Y, X, -4.7, -7.2, 4.7, 7.2, 0.12, HANGAR_IN, { win: interior(2.4) });
  k.g.box(22, 7.1, -5.2, 22.6, 7.8, 5.2, MS_DARK, { faces: 'NESWTB' });
  k.g.box(22, -7.8, -5.2, 22.6, -7.1, 5.2, MS_DARK, { faces: 'NESWTB' });
  for (const s of [-1, 1]) k.g.box(22, -7.1, s < 0 ? -5.2 : 4.6, 22.6, 7.1, s < 0 ? -4.6 : 5.2, MS_DARK, { faces: 'NESWT' });
  for (const y of [-3.6, 0, 3.6]) k.g.box(22.25, y - 0.18, -4.6, 22.55, y + 0.18, 4.6, MS_STEEL, { faces: 'NESWTB' });
  // a shuttle at its moorings, in the light of the dock
  k.g.box(22.6, -1.6, -1.4, 26, -0.4, 1.4, MS_WHITE, { faces: 'NESWTB' });

  // --- the scythes: on each flank, the snath along the hull widening into the heel of a blade that is the jaw ---
  const snath: P2[] = [[-54, -3.1], [-50, -2.7], [6, -1.35], [14, -2.4], [22, -3.9], [22, 3.3], [14, 2.1], [6, 0.95], [-50, -0.55], [-54, -0.15]];
  for (const s of [-1, 1]) k.decal([0, 0, s * 13], X, Y, [0, 0, s], snath, MS_RED, 0.08);
  // and the scythe's two grips, standing up from the snath as a scythe's handles do
  for (const s of [-1, 1]) {
    for (const [x, y0] of [[-36, -0.75], [-12, 0.1]] as P2[]) k.decal([0, 0, s * 13], X, Y, [0, 0, s], [[x, y0 - 0.4], [x + 1.0, y0 - 0.4], [x + 2.4, y0 + 3.3], [x + 1.4, y0 + 3.3]], MS_RED, 0.14);
  }

  // --- under the keel: the sloppy red crescent, where the paint ran out (MS 57) ---
  {
    const r = rng(0xc5e);
    const c1: P2 = [-14, 0], c2: P2 = [-10.4, 0], R1 = 8.2, R2 = 6.6;
    const out: P2[] = [];
    for (let i = 0; i <= 22; i++) {
      const a = (51 + (i / 22) * (309 - 51)) * (Math.PI / 180), rr = R1 + (r() - 0.5) * 0.7;
      out.push([c1[0] + Math.cos(a) * rr, c1[1] + Math.sin(a) * rr]);
    }
    for (let i = 0; i <= 16; i++) {
      const a = (284 - (i / 16) * (284 - 76)) * (Math.PI / 180), rr = R2 + (r() - 0.5) * 0.55;
      out.push([c2[0] + Math.cos(a) * rr, c2[1] + Math.sin(a) * rr]);
    }
    // the keel's underside faces down: across it runs to starboard, and the crescent is drawn with x along and z across
    k.decal([0, -10, 0], X, [0, 0, -1], [0, -1, 0], out.map(([u, v]): P2 => [u, -v]), MS_RED, 0.09);
    // drips where the brush ran dry
    for (const [u, v, rr] of [[-21.5, 4.4, 0.7], [-23.6, -1.8, 0.5], [-19.2, -5.9, 0.6], [-9.6, 7.4, 0.4]] as [number, number, number][]) {
      k.decal([0, -10, 0], X, [0, 0, -1], [0, -1, 0], Array.from({ length: 7 }, (_, i): P2 => [u + Math.cos((i / 7) * Math.PI * 2) * rr, v + Math.sin((i / 7) * Math.PI * 2) * rr * 0.8]), MS_RED, 0.09);
    }
  }

  // --- the gravity generators low in the hull, glowing under the keel (DA 17) ---
  for (const x of [-46, -36, 10]) {
    k.frustum([x, -9.9, 0], [x, -10.7, 0], 3.1, 2.8, 12, MS_STEEL, { capA: false });
    // the pale disc, lit within, and its dark heart
    const disc = (r: number): P2[] => Array.from({ length: 12 }, (_, i): P2 => [Math.cos((i / 12) * Math.PI * 2 + Math.PI / 12) * r, Math.sin((i / 12) * Math.PI * 2 + Math.PI / 12) * r]);
    k.decal([x, -10.7, 0], X, [0, 0, 1], [0, -1, 0], disc(2.7), 0xa8dcff, 0.02, { win: interior(1.8) });
    k.decal([x, -10.7, 0], X, [0, 0, 1], [0, -1, 0], disc(1.3), MS_DARK, 0.06);
  }
  // armour panels along the keel
  for (let x = -52; x < 18; x += 4.6) {
    if (Math.abs(x + 41) < 9 || Math.abs(x - 10) < 5 || (x > -27 && x < -1)) continue;
    k.g.box(x, -10.25, -6.5, x + 3.8, -10.0, -1.2, MS_SHADE, { faces: 'NESWB' });
    k.g.box(x, -10.25, 1.2, x + 3.8, -10.0, 6.5, MS_SHADE, { faces: 'NESWB' });
  }
  // guns under the keel
  for (const x of [-30, -4, 16]) for (const s of [-1, 1]) k.turret([x, -10, s * 5.6], [0, -1, 0], [1, 0, s * 0.3], 0.9, MS_STEEL, MS_SHADE, MS_WHITE);

  // --- the chines: nine hangar bays to a side, lit within ---
  for (const s of [-1, 1]) {
    const p: P2 = [s * 9, -10], q: P2 = [s * 12, -7.5], f = bandFrame(p, q, s);
    for (let i = 0; i < 9; i++) {
      const x = -47 + i * 7.6, o = f.o(0.5, x);
      k.plate(o, X, f.up, f.n, -2.5, -1.45, 2.5, 1.45, 0.05, MS_DARK);
      k.plate(o, X, f.up, f.n, -2.05, -1.1, 2.05, 1.1, 0.09, HANGAR_IN, { win: interior(2.2) });
      // a hood over its mouth
      k.rbox(add(o, add(mul(f.up, 1.6), mul(f.n, 0.3))), [2.6, 0.12, 0.3], X, f.up, f.n, MS_SHADE);
    }
  }

  // --- the port side's spitTubes in two rows, and the starboard side's torpedo tubes ---
  {
    const f = bandFrame([-12, -7.5], [-13, -4], -1);
    for (let i = 0; i < 28; i++) for (const t of [0.3, 0.72]) k.mouth(f.o(t, -48 + i * 2.3), X, f.up, f.n, 0.95, MS_DARK);
    const g = bandFrame([12, -7.5], [13, -4], 1);
    for (let i = 0; i < 14; i++) k.mouth(g.o(0.5, -46 + i * 4.6), X, g.up, g.n, 1.2, MS_DARK, 0xb8402c);
    // the torpedo tubes are not the Rain's
    k.tubes.splice(56);
  }

  // --- the docks along its back: armoured blocks in two tones of white either side of an avenue, with batteries on
  // their roofs and the dark mouths of hangars in their sides, a few towers over them, and few lights ---
  const r = k.r;
  for (let x = -52; x < 17; ) {
    const run = 4.2 + r() * 4.2;
    if (x > -49 && x < -31) {
      x = -31;
      continue;
    }
    for (const side of [-1, 1]) {
      const h = 1.1 + r() * 1.5, x0 = x + 0.4, x1 = Math.min(21.5, x + run - 0.4), xm = (x0 + x1) / 2, hw = (x1 - x0) / 2;
      const [za, zb] = side < 0 ? [-7.0, -1.3] : [1.3, 7.0];
      const tone = r() < 0.5 ? MS_WHITE : MS_SHADE;
      k.g.box(x0, 9, za, x1, 9 + h, zb, tone, { faces: 'NESWT' });
      if (hw > 1.2 && r() < 0.55) {
        // the dark mouth of a hangar in its outer face, dimly lit within
        k.plate([xm, 9 + h * 0.48, side < 0 ? za : zb], X, Y, [0, 0, side], -Math.min(1.7, hw - 0.5), -h * 0.34, Math.min(1.7, hw - 0.5), h * 0.34, 0.04, 0x2b2722, { win: interior(0.7) });
      }
      if (r() < 0.55) k.turret([xm, 9 + h, (za + zb) / 2], Y, [1, 0, side * 0.6], 0.72, MS_STEEL, MS_SHADE, MS_WHITE);
      else k.g.box(x0 + 0.7, 9 + h, za + 0.7, x1 - 0.7, 9 + h + 0.45, zb - 0.7, tone === MS_WHITE ? MS_SHADE : MS_WHITE, { faces: 'NESWT' });
    }
    x += run;
  }
  // three towers over the docks, each with a lit slit or two and a red crown
  for (const [x, z, h] of [[-22, -4.1, 6.6], [-2.2, 4.0, 5.2], [11.5, -4.0, 4.4]] as V3[]) {
    k.g.box(x - 1.3, 9, z - 1.3, x + 1.3, 9 + h, z + 1.3, MS_WHITE, { faces: 'NESWT' });
    k.g.box(x - 1.5, 9 + h, z - 1.5, x + 1.5, 9 + h + 0.5, z + 1.5, MS_RED, { faces: 'NESWTB' });
    for (const s of [-1, 1]) k.plate([x, 9 + h - 1.2, z + s * 1.3], X, Y, [0, 0, s], -0.95, -0.1, 0.95, 0.1, 0.03, AMBER, { win: interior(2.4) });
    k.blink([x, 9 + h + 0.7, z], [3, 0.35, 0.25], 0.26, 1.9, hash(x, z), 0.2);
  }
  // armour on its flanks in great plates, a second white over the first, and a few small lights
  for (const s of [-1, 1]) {
    for (const [v0, v1, off] of [[-3.85, -1.15, 0], [-1.0, 1.75, 3.3], [1.9, 4.85, 1.6]] as V3[]) {
      for (let i = 0, x = -53.5 + off; x < 21; i++, x += 6.7) {
        const xa = Math.max(-53.6, x), xb = Math.min(21.7, x + 6.4);
        if (xb - xa > 0.6) k.plate([0, 0, s * 13], X, Y, [0, 0, s], xa, v0, xb, v1, 0.03, i % 2 ? 0xe4e0d8 : MS_SHADE);
      }
    }
    for (let x = -50; x < 20; x += 9.3) k.lamp([x, 4.45, s * 13.06], 0.13, AMBER, 2.4);
    for (let x = -46; x < 20; x += 13.1) k.lamp([x, -3.5, s * 13.06], 0.12, AMBER, 2.2);
  }
  // landing pads on the avenue down the middle, raised a little, their lights round them
  for (const x of [-22, 2]) {
    k.g.box(x - 2.6, 9, -1.1, x + 2.6, 9.35, 1.1, MS_STEEL, { faces: 'NESWT' });
    k.g.box(x - 2.2, 9.35, -0.8, x + 2.2, 9.42, 0.8, MS_RED, { faces: 'NESWT' });
    for (const dx of [-2.4, 2.4]) k.lamp([x + dx, 9.5, 0], 0.13, AMBER, 2.4);
  }
  // the command tower, with its bridge looking forward over the city, and its mast
  k.g.box(-47, 9, -7, -33, 12.6, 7, MS_WHITE, { faces: 'NESWT' });
  k.g.box(-45, 12.6, -5.4, -35, 15.4, 5.4, MS_SHADE, { faces: 'NESWT' });
  for (const s of [-1, 1]) k.plate([-40, 11.1, s * 7], X, Y, [0, 0, s], -5.5, -0.12, 5.5, 0.12, 0.03, AMBER, { win: interior(2.2) });
  k.g.box(-44, 15.4, -4.4, -36.4, 16.9, 4.4, GLASS, { win: BRIDGE, seed: 9 });
  k.g.box(-44.3, 16.9, -4.7, -36.1, 17.3, 4.7, MS_RED, { faces: 'NESWT' });
  for (const s of [-1, 1]) k.g.box(-41, 15.4, s < 0 ? -7.6 : 4.4, -37.6, 16.5, s < 0 ? -4.4 : 7.6, MS_WHITE, { faces: 'NESWTB', win: BRIDGE });
  k.frustum([-40, 17.3, 0], [-40, 21.4, 0], 0.22, 0.1, 6, 0xe2e2e2, { capA: false });
  k.g.box(-40.1, 19.6, -1.8, -39.9, 19.8, 1.8, 0xe2e2e2, { faces: 'NESWTB' });
  k.blink([-40, 21.6, 0], [3, 0.35, 0.25], 0.55, 1.6, 0, 0.22);
  for (const [x, z, h] of [[-18, 4.8, 3.4], [8, -5.2, 3.0], [-52, -3.5, 2.6]] as V3[]) {
    k.frustum([x, 9, z], [x, 9 + h + 3, z], 0.16, 0.07, 4, 0xe2e2e2, { capA: false });
    k.blink([x, 9 + h + 3.2, z], [3, 0.35, 0.25], 0.38, 2.0, hash(x), 0.18);
  }
  // particle cannons on the shoulders: domes, each with its emitter
  for (const x of [-28, -6, 14]) {
    for (const s of [-1, 1]) {
      // a drum set into the shoulder, a dome on it, and its emitter
      const c: V3 = [x, 5.0, s * 11.2];
      k.frustum(c, add(c, [0, 2.7, 0]), 2.0, 1.85, 10, MS_SHADE, { capA: false, capB: false });
      k.frustum(add(c, [0, 2.7, 0]), add(c, [0, 3.8, 0]), 1.85, 0.45, 10, MS_WHITE, { capA: false });
      k.frustum(add(c, [0.6, 3.3, s * 0.7]), add(c, [3.2, 4.0, s * 1.6]), 0.35, 0.25, 6, MS_STEEL, { capA: false });
      k.muzzles.push(add(c, [3.3, 4.0, s * 1.65]));
    }
  }
  // batteries along the shoulders, between the particle cannons
  for (const s of [-1, 1]) {
    const f = bandFrame([s * 13, 5], [s * 9.5, 9], s);
    for (const x of [-48, -40, -18, 4, 20]) k.turret(f.o(0.78, x), unit(add(f.n, [0, 1.0, 0])), [1, 0, s * 0.6], 0.68, MS_STEEL, MS_SHADE, MS_WHITE);
  }
  // railguns along the deck's edges
  for (const x of [-26, -14, -2, 10]) for (const s of [-1, 1]) k.turret([x + 3.4, 9, s * 8.3], Y, [1, 0, s * 0.5], 1.0, MS_STEEL, MS_SHADE, MS_WHITE);

  // --- the engines: twelve in three rows, set in the stern ---
  for (const y of [-4.3, 0.2, 4.5]) for (const z of [-6.9, -2.3, 2.3, 6.9]) k.nozzle([-H + 0.2, y, z], [-1, 0, 0], 1.72, MS_DARK, FIRE_AUG, 2.2, 10);
  // a frame round them
  k.g.box(-H - 0.6, -7.0, -10.2, -H + 0.2, -6.4, 10.2, MS_STEEL, { faces: 'NESWTB' });
  k.g.box(-H - 0.6, 6.9, -10.2, -H + 0.2, 7.5, 10.2, MS_STEEL, { faces: 'NESWTB' });
  for (const s of [-1, 1]) k.g.box(-H - 0.6, -6.4, s < 0 ? -10.2 : 9.6, -H + 0.2, 6.9, s < 0 ? -9.6 : 10.2, MS_STEEL, { faces: 'NESWTB' });

  // --- the docks' cranes, standing over the city on its back ---
  for (const x of [-27, -4, 12]) {
    for (const s of [-1, 1]) k.g.box(x - 0.3, 9, s * 7.6 - 0.3, x + 0.3, 15.6, s * 7.6 + 0.3, MS_STEEL, { faces: 'NESW' });
    k.g.box(x - 0.45, 15.6, -8.2, x + 0.45, 16.4, 8.2, MS_DARK, { faces: 'NESWTB' });
    const z = hash(x) * 8 - 4;
    k.g.box(x - 0.7, 14.9, z - 0.6, x + 0.7, 15.6, z + 0.6, MS_RED, { faces: 'NESWTB' });
    k.frustum([x, 14.9, z], [x, 11.4 + hash(x, 2) * 2, z], 0.06, 0.06, 4, 0xe6e6e6, { capA: false });
    k.blink([x, 16.6, (hash(x, 5) < 0.5 ? -1 : 1) * 8.0], [3, 0.35, 0.25], 0.26, 1.7, hash(x, 3), 0.25);
  }
  // armour on the shoulders, between the particle cannons
  for (const s of [-1, 1]) {
    const f = bandFrame([s * 13, 5], [s * 9.5, 9], s);
    for (let x = -50; x < 18; x += 5.6) {
      if ([-28, -6, 14].some((c) => Math.abs(x + 2.4 - c) < 4)) continue;
      k.rbox(add(f.o(0.45, x + 2.4), mul(f.n, 0.1)), [2.4, 1.3, 0.1], X, f.up, f.n, Math.round((x + 50) / 5.6) % 2 ? MS_WHITE : MS_SHADE);
    }
  }
  // guns along the chines, between the hangars
  for (const s of [-1, 1]) {
    const f = bandFrame([s * 9, -10], [s * 12, -7.5], s);
    for (let i = 0; i < 8; i++) k.turret(f.o(0.5, -43.2 + i * 7.6), f.n, [1, 0, 0], 0.62, MS_STEEL, MS_SHADE, MS_WHITE);
  }
  // sensor domes under the keel, between the generators
  for (const x of [-27, 2, 19]) for (const s of [-1, 1]) {
    k.frustum([x, -9.95, s * 5.4], [x, -10.6, s * 5.4], 1.0, 0.8, 8, MS_SHADE, { capA: false, capB: false });
    k.frustum([x, -10.6, s * 5.4], [x, -11.2, s * 5.4], 0.8, 0.15, 8, MS_WHITE, { capA: false });
  }

  // running lights and strobes
  for (const x of [-50, -35, -20, -5, 10]) for (const s of [-1, 1]) k.blink([x, 9.3, s * 9.6], [2.6, 2.5, 2.2], 0.32, 2.4, hash(x, s), 0.1);
  for (const x of [-40, -12, 14]) k.blink([x, -10.4, 0], [3, 0.4, 0.3], 0.4, 1.8, hash(x, 7), 0.15);
  k.blink([-H - 0.5, 8.2, 0], [3, 3, 2.8], 0.55, 1.1, 0.3, 0.08);
  for (const s of [-1, 1]) k.lamp([-30, 5.2, s * 13.1], 0.22, s < 0 ? RED_LAMP : GREEN_LAMP);

  return k.done(28, { hx: 60, hz: 15, y0: -11.8, y1: 21.8 });
}

// ---------------------------------------------------------------------------
// The Pax and the Augustan destroyers
// ---------------------------------------------------------------------------

/**
 * The Pax, Darrow's flagship in the Lion's Rain: a dreadnought five
 * kilometres long (GS 22), 85 long here, with at least eighty railguns and
 * eight engines (MS 45), and a forward hangar with hundreds of spitTubes in
 * rows along its port wall (GS 37), whose mouths open along its port side.
 * Its colour is silent: dark gunmetal with the Reaper's red on its spine, its
 * blade of a bow and the armour along its flanks.
 */
function pax(): Model {
  const L = 85, k = new Kit(L, 0x9a7), H = L / 2;
  const R: P2[] = [[-2.6, -6.2], [-5.6, -3.6], [-6.4, 0.6], [-4.8, 3.6], [-1.3, 6.2], [1.3, 6.2], [4.8, 3.6], [6.4, 0.6], [5.6, -3.6], [2.6, -6.2]];
  // bands: 0 port lower, 1 port flank (the spitTubes), 2 port shoulder, 3 port upper, 4 spine, 5 starboard upper, 6 starboard shoulder, 7 starboard flank, 8 starboard lower, 9 keel
  const rings = [ring(-H, R, 0.92, 0.92), ring(-39, R), ring(18, R), ring(27, R, 0.78, 0.82, 0.4), ring(34, R, 0.5, 0.58, 0.9), ring(39.5, R, 0.22, 0.3, 1.3), ring(H, R, 0.02, 0.04, 1.5)];
  const BAND = [GUN_DARK, GUN, GUN, GUN_LIGHT, REAPER, GUN_LIGHT, GUN, GUN, GUN_DARK, GUN_DARK];
  k.loft(rings, (j, s) => (s >= 4 && j >= 2 && j <= 6 ? REAPER : s === 3 && (j === 3 || j === 5) ? REAPER : BAND[j]), {
    win: (j, s) => (s === 1 && (j === 2 || j === 6 || j === 7) ? PORTS_SPARSE : undefined),
    seed: 11,
  });
  k.cap(rings[0], GUN_DARK, [-38, 0, 0]);

  // the forward hangar's port wall: its spitTubes in four rows of twenty-four, on a dark panel
  {
    const f = bandFrame([-5.6, -3.6], [-6.4, 0.6], -1);
    k.plate(f.o(0.5, 3.4), X, f.up, f.n, -14.2, -2.05, 14.2, 2.05, 0.03, GUN_DARK);
    for (let i = 0; i < 24; i++) for (const t of [0.15, 0.38, 0.61, 0.84]) k.mouth(f.o(t, -9.3 + i * 1.1), X, f.up, f.n, 0.62, 0x1d1e22);
    // red bands at each end of the hangar
    for (const x of [-11, 17.8]) k.plate(f.o(0.5, x), X, f.up, f.n, -0.5, -2.1, 0.5, 2.1, 0.04, REAPER);
  }
  // armour along the shoulders, overlapping plates, every other one edged in red
  for (const s of [-1, 1]) {
    const f = bandFrame([s * 6.4, 0.6], [s * 4.8, 3.6], s);
    for (let i = 0; i < 9; i++) {
      const x = -35 + i * 5.8, o = f.o(0.5, x);
      k.rbox(add(o, mul(f.n, 0.16)), [2.75, 1.5, 0.14], X, f.up, f.n, i % 2 ? GUN_LIGHT : GUN);
      if (i % 2 === 0) k.plate(add(o, mul(f.up, 1.42)), X, f.up, f.n, -2.75, -0.12, 2.75, 0.12, 0.31, REAPER);
    }
    // and along the lower flank
    const g = bandFrame([s * 2.6, -6.2], [s * 5.6, -3.6], s);
    for (let i = 0; i < 7; i++) k.rbox(add(g.o(0.5, -32 + i * 7), mul(g.n, 0.15)), [3.1, 1.1, 0.13], X, g.up, g.n, GUN_LIGHT);
    // and a railgun on each, so that it carries its eighty and more
    for (let i = 0; i < 7; i++) k.turret(add(g.o(0.5, -32 + i * 7), mul(g.n, 0.28)), g.n, [1, 0, s * 0.5], 0.6, GUN_DARK, GUN, 0xbfc3ca);
  }
  {
    // starboard flank: a long band of plates with lit ports
    const f = bandFrame([6.4, 0.6], [5.6, -3.6], 1);
    for (let i = 0; i < 6; i++) k.plate(f.o(0.5, -34 + i * 8.6), X, f.up, f.n, -3.6, -1.6, 3.6, 1.6, 0.06, GUN_LIGHT, { win: PORTS_SPARSE });
  }

  // the bridge tower, a third of the way from the stern, with its mast
  k.g.box(-31, 4.6, -3.4, -17, 9.2, 3.4, GUN, { win: PORTS_SPARSE, seed: 13 });
  k.g.box(-29, 9.2, -2.4, -20, 11.6, 2.4, GUN_LIGHT, { win: PORTS_SPARSE, seed: 14 });
  k.g.box(-28, 11.6, -2.0, -21.5, 12.9, 2.0, GLASS, { win: BRIDGE, seed: 15 });
  k.g.box(-28.3, 12.9, -2.2, -21.2, 13.25, 2.2, REAPER, { faces: 'NESWT' });
  k.frustum([-24.5, 13.25, 0], [-24.5, 17.4, 0], 0.2, 0.08, 6, 0xd8d8d8, { capA: false });
  k.g.box(-24.6, 15.6, -1.5, -24.4, 15.8, 1.5, 0xd8d8d8, { faces: 'NESWTB' });
  k.blink([-24.5, 17.6, 0], [3, 0.35, 0.25], 0.42, 1.5, 0.1, 0.2);
  // a red stripe down the tower's front
  k.plate([-17, 6.8, 0], [0, 0, 1], Y, X, -0.6, -2.2, 0.6, 2.2, 0.05, REAPER);

  // railguns: four great turrets on the spine, smaller ones on the upper flanks and under the keel
  // a spine down its back, red along its top, with the great turrets on it
  k.g.box(-37, 5.9, -0.95, 17, 7.3, 0.95, GUN_DARK, { faces: 'NESWT' });
  k.g.box(-36.5, 7.3, -0.5, 16.5, 7.38, 0.5, REAPER, { faces: 'NESWT' });
  for (const x of [-12, -4, 4, 12]) k.turret([x, 7.3, 0], Y, X, 1.3, GUN_DARK, GUN_LIGHT, 0xbfc3ca);
  k.turret([22, 5.9, 0], Y, X, 1.15, GUN_DARK, GUN_LIGHT, 0xbfc3ca);
  // a fin like a shark's aft of the bridge, edged in red
  {
    const t = 0.35, y0 = 7.0, A: V3 = [-42, y0, 0], B: V3 = [-33, y0, 0], C: V3 = [-37.5, y0 + 6.6, 0], D: V3 = [-41.2, y0 + 6.6, 0];
    for (const s of [-1, 1]) k.quad(add(A, [0, 0, s * t]), add(B, [0, 0, s * t]), add(C, [0, 0, s * t * 0.5]), add(D, [0, 0, s * t * 0.5]), GUN, [-38, y0 + 2, 0]);
    k.quad(add(B, [0, 0, -t]), add(B, [0, 0, t]), add(C, [0, 0, t * 0.5]), add(C, [0, 0, -t * 0.5]), REAPER, [-38, y0 + 2, 0]);
    k.quad(add(D, [0, 0, -t * 0.5]), add(D, [0, 0, t * 0.5]), add(C, [0, 0, t * 0.5]), add(C, [0, 0, -t * 0.5]), GUN_DARK, [-38, y0 + 2, 0]);
    k.quad(add(A, [0, 0, -t]), add(A, [0, 0, t]), add(D, [0, 0, t * 0.5]), add(D, [0, 0, -t * 0.5]), GUN_DARK, [-37, y0 + 2, 0]);
    k.blink([-37.6, y0 + 6.8, 0], [3, 0.35, 0.25], 0.32, 1.3, 0.6, 0.2);
  }
  // sponsons along both flanks aft, with gun ports, a red edge and turrets on their tops
  for (const s of [-1, 1]) {
    k.g.box(-38, -2.6, s < 0 ? -7.7 : 5.4, -15, 1.0, s < 0 ? -5.4 : 7.7, GUN, { faces: s < 0 ? 'NEWTB' : 'SEWTB' });
    k.g.box(-38.2, 1.0, s < 0 ? -7.85 : 5.4, -14.8, 1.3, s < 0 ? -5.4 : 7.85, REAPER, { faces: s < 0 ? 'NEWTB' : 'SEWTB' });
    for (let x = -36.5; x < -16; x += 2.1) k.plate([x, -0.9, s * 7.7], X, Y, [0, 0, s], -0.55, -0.55, 0.55, 0.55, 0.04, 0x16171a);
    for (const x of [-33, -22]) k.turret([x, 1.3, s * 6.6], Y, [1, 0, s * 0.6], 0.75, GUN_DARK, GUN, 0xbfc3ca);
  }
  // masts over the bridge
  for (const s of [-1, 1]) k.frustum([-26.8, 13.25, s * 1.4], [-26.8, 15.8, s * 1.4], 0.1, 0.05, 4, 0xd8d8d8, { capA: false });
  for (const s of [-1, 1]) {
    const f = bandFrame([s * 4.8, 3.6], [s * 1.3, 6.2], s);
    for (const x of [-37, -34, -14.5, 0, 8, 15]) k.turret(f.o(0.5, x), unit(add(f.n, [0, 0.6, 0])), [1, 0, s * 0.6], 0.72, GUN_DARK, GUN, 0xbfc3ca);
  }
  for (const x of [-20, -2, 14]) k.turret([x, -6.2, 0], [0, -1, 0], X, 0.95, GUN_DARK, GUN, 0xbfc3ca);

  // the eight engines, in an engine block across the stern
  k.g.box(-H - 1.2, -4.2, -6.1, -H + 0.4, 4.2, 6.1, GUN_DARK, { faces: 'NESWTB' });
  k.g.box(-H - 1.4, -4.5, -6.4, -H - 0.9, 4.5, 6.4, REAPER, { faces: 'NESWTB' });
  for (const y of [-2.2, 2.2]) for (const z of [-4.35, -1.45, 1.45, 4.35]) k.nozzle([-H - 1.0, y, z], [-1, 0, 0], 1.18, GUN_DARK, FIRE_AUG, 1.4, 7.5);

  // keel fin and greebles under the hull
  k.g.box(-30, -7.6, -0.5, 10, -6.0, 0.5, GUN_DARK, { faces: 'NESWB' });
  for (let x = -36; x < 16; x += 3.3) k.g.box(x, -6.45, -2.3, x + 2.2, -6.15, -0.8, GUN_LIGHT, { faces: 'NESWB' });
  // running lights
  for (const s of [-1, 1]) k.lamp([30, 1.6, s * 4.9], 0.22, s < 0 ? RED_LAMP : GREEN_LAMP, 3);
  for (const x of [-36, -6, 20]) k.blink([x, 6.5, 0], [2.6, 2.5, 2.2], 0.3, 2.2, hash(x, 3), 0.1);
  k.blink([H, 1.6, 0], [3, 3, 2.8], 0.45, 1.3, 0.2, 0.1);
  return k.done(15.6, { hx: 44.2, hz: 8, y0: -7.8, y1: 17.8 });
}

/** An Augustan destroyer: a smaller blade of the Pax's family, gunmetal and red, three turrets and four engines (silent: this tile's own). */
function augustan(): Model {
  const L = 34, k = new Kit(L, 0x6d1), H = L / 2;
  const R: P2[] = [[-1.4, -3.4], [-3.2, -1.8], [-3.6, 0.6], [-2.4, 2.4], [-0.6, 3.4], [0.6, 3.4], [2.4, 2.4], [3.6, 0.6], [3.2, -1.8], [1.4, -3.4]];
  const rings = [ring(-H, R, 0.9, 0.9), ring(-15.5, R), ring(6, R), ring(11, R, 0.66, 0.72, 0.4), ring(15, R, 0.3, 0.38, 0.8), ring(H, R, 0.02, 0.04, 1.0)];
  const BAND = [GUN_DARK, GUN, GUN, GUN_LIGHT, REAPER, GUN_LIGHT, GUN, GUN, GUN_DARK, GUN_DARK];
  k.loft(rings, (j, s) => (s >= 3 && j >= 2 && j <= 6 ? REAPER : BAND[j]), { win: (j, s) => (s === 1 && (j === 2 || j === 6) ? PORTS_SPARSE : undefined), seed: 21 });
  k.cap(rings[0], GUN_DARK, [-14, 0, 0]);
  k.g.box(-12, 2.6, -1.8, -5, 5.2, 1.8, GUN, { win: PORTS_SPARSE, seed: 22 });
  k.g.box(-11, 5.2, -1.4, -6.5, 6.1, 1.4, GLASS, { win: BRIDGE, seed: 23 });
  k.g.box(-11.2, 6.1, -1.5, -6.3, 6.35, 1.5, REAPER, { faces: 'NESWT' });
  k.frustum([-8.8, 6.35, 0], [-8.8, 8.6, 0], 0.12, 0.06, 4, 0xd8d8d8, { capA: false });
  k.blink([-8.8, 8.75, 0], [3, 0.35, 0.25], 0.3, 1.7, 0.4, 0.2);
  for (const x of [-1, 4.5]) k.turret([x, 3.4, 0], Y, X, 0.85, GUN_DARK, GUN_LIGHT, 0xbfc3ca);
  k.turret([-15, 3.0, 0], Y, [-1, 0, 0], 0.7, GUN_DARK, GUN_LIGHT, 0xbfc3ca);
  k.turret([-2, -3.4, 0], [0, -1, 0], X, 0.7, GUN_DARK, GUN, 0xbfc3ca);
  for (const s of [-1, 1]) {
    const f = bandFrame([s * 3.6, 0.6], [s * 2.4, 2.4], s);
    for (let i = 0; i < 4; i++) k.rbox(add(f.o(0.5, -12 + i * 4.6), mul(f.n, 0.12)), [2.0, 0.9, 0.1], X, f.up, f.n, GUN_LIGHT);
    k.lamp([9, 1.0, s * 3.2], 0.18, s < 0 ? RED_LAMP : GREEN_LAMP, 3);
  }
  for (const y of [-1.2, 1.2]) for (const z of [-1.6, 1.6]) k.nozzle([-H, y, z], [-1, 0, 0], 0.95, GUN_DARK, FIRE_AUG, 1.0, 5);
  k.blink([H, 1.0, 0], [3, 3, 2.8], 0.3, 1.4, 0.6, 0.1);
  return k.done(7.2, { hx: 18.2, hz: 3.8, y0: -4.4, y1: 8.8 });
}

// ---------------------------------------------------------------------------
// Victra's destroyer
// ---------------------------------------------------------------------------

/**
 * Victra's destroyer, hollowed out to carry ten times its leechCraft (GS 38):
 * a deep-bellied hull whose keel opens in two doors over a bay lit within.
 * Its look is silent: dark, with the Julii's jade. The doors are meshes of
 * their own, hinged along the bay's sides (see `victraDoor`).
 */
const BAY = { x0: -11, x1: 9, z: 3.4, y: -4.6 };
function victra(): Model {
  const L = 36, k = new Kit(L, 0x71c), H = L / 2;
  const R: P2[] = [[-3.4, -4.6], [-4.6, -2.6], [-4.4, 1.6], [-2.6, 3.6], [-0.8, 4.3], [0.8, 4.3], [2.6, 3.6], [4.4, 1.6], [4.6, -2.6], [3.4, -4.6]];
  const rings = [ring(-H, R, 0.88, 0.88), ring(-16, R), ring(BAY.x0, R), ring(BAY.x1, R), ring(13, R, 0.8, 0.82, 0.3), ring(H, R, 0.05, 0.08, 0.8)];
  const BAND = [V_PLATE, V_DARK, V_DARK, V_PLATE, V_DARK, V_DARK, V_PLATE, V_DARK, V_DARK, V_PLATE];
  // the keel is open over the bay
  k.loft(rings, (j) => BAND[j], { skip: (j, s) => j === 9 && s === 2, win: (j, s) => (s >= 1 && s <= 3 && (j === 2 || j === 6) ? PORTS_SPARSE : undefined), seed: 31 });
  k.cap(rings[0], V_DARK, [-14, 0, 0]);
  // the bay, lit within: its roof, its walls and its ends, seen through the open doors
  const { x0, x1, z, y } = BAY;
  const IN = 0x2b3a35;
  k.g.quad([x0, -0.6, -z], [x1, -0.6, -z], [x1, -0.6, z], [x0, -0.6, z], [0, -1, 0], IN, { win: interior(1.6) });
  for (const s of [-1, 1]) k.g.quad([x0, y, s * z], [x1, y, s * z], [x1, -0.6, s * z], [x0, -0.6, s * z], [0, 0, -s], IN, { win: interior(1.2) });
  k.g.quad([x0, y, -z], [x0, y, z], [x0, -0.6, z], [x0, -0.6, -z], [1, 0, 0], IN, { win: interior(1.2) });
  k.g.quad([x1, y, z], [x1, y, -z], [x1, -0.6, -z], [x1, -0.6, z], [-1, 0, 0], IN, { win: interior(1.2) });
  // racks across the roof where the leechCraft hang, and lamps along them
  for (let x = x0 + 1.5; x < x1; x += 2.5) {
    k.g.box(x - 0.15, -1.0, -z + 0.2, x + 0.15, -0.62, z - 0.2, 0x5a6a64, { faces: 'NESWB' });
    k.lamp([x, -1.1, 0], 0.14, JADE_LIGHT, 2.6);
  }
  // a stripe of jade down each flank, and jade lamps
  for (const s of [-1, 1]) {
    k.decal([0, 0, s * 4.45], X, Y, [0, 0, s], [[-15, 0.1], [9, 0.1], [12, 0.5], [12, 0.9], [9, 0.75], [-15, 0.75]], JADE, 0.07);
    k.lamp([12, 0.5, s * 3.9], 0.2, s < 0 ? RED_LAMP : GREEN_LAMP, 3);
  }
  // armour plates along its flanks, batteries on its shoulders, and a ridge down its back trimmed in jade
  for (const s of [-1, 1]) {
    const low = bandFrame([s * 4.6, -2.6], [s * 4.4, 1.6], s), high = bandFrame([s * 4.4, 1.6], [s * 2.6, 3.6], s);
    for (let x = -14.8; x < 8; x += 4.6) k.rbox(add(low.o(0.62, x), mul(low.n, 0.1)), [3.6, 1.5, 0.12], X, low.up, low.n, V_PLATE);
    for (const x of [-15.5, -3.5, 7]) k.turret(high.o(0.45, x), unit(add(high.n, [0, 0.7, 0])), [1, 0, s * 0.6], 0.62, V_DARK, V_PLATE, 0xc8d0cc);
  }
  k.g.box(-5.2, 4.25, -0.55, 11.5, 4.85, 0.55, V_PLATE, { faces: 'NESWT' });
  k.g.box(-5.0, 4.85, -0.18, 11.3, 4.95, 0.18, JADE, { faces: 'NESWT' });
  // the bridge, a low tower aft
  k.g.box(-13, 3.6, -1.6, -6, 5.6, 1.6, V_PLATE, { win: PORTS_SPARSE, seed: 32 });
  k.g.box(-12, 5.6, -1.3, -7.2, 6.5, 1.3, GLASS, { win: BRIDGE, seed: 33 });
  k.g.box(-12.2, 6.5, -1.4, -7.0, 6.75, 1.4, JADE, { faces: 'NESWT' });
  k.frustum([-9.5, 6.75, 0], [-9.5, 8.8, 0], 0.12, 0.06, 4, 0xd8d8d8, { capA: false });
  k.blink([-9.5, 9.0, 0], [0.5, 3, 1.6], 0.3, 1.6, 0.2, 0.2);
  for (const x of [-2, 5]) k.turret([x, 4.95, 0], Y, X, 0.8, V_DARK, V_PLATE, 0xc8d0cc);
  for (const y of [-1.4, 1.6]) for (const zz of [-1.7, 1.7]) k.nozzle([-H, y, zz], [-1, 0, 0], 0.95, V_DARK, FIRE_JADE, 1.0, 5);
  k.blink([H, 0.8, 0], [0.6, 3, 1.8], 0.3, 1.2, 0.5, 0.1);
  return k.done(9.2, { hx: 18.4, hz: 4.7, y0: -4.8, y1: 9.1 });
}

/** One of the two doors of Victra's bay, built about its hinge: it lies along x, out from the hinge across the bay, and opens by turning about x. */
function victraDoor(s: number): THREE.BufferGeometry {
  const g = new GeoBuilder(), w = BAY.z;
  // s = -1: the port door, hinged at z = -3.4, reaching to the middle
  const z0 = 0, z1 = -s * (w - 0.02);
  const [za, zb] = z0 < z1 ? [z0, z1] : [z1, z0];
  g.box(BAY.x0 + 0.05, -0.32, za, BAY.x1 - 0.05, 0, zb, V_PLATE, { faces: 'NESWTB' });
  for (let x = BAY.x0 + 2; x < BAY.x1 - 1; x += 4) g.box(x, -0.42, za + 0.4, x + 2.6, -0.32, zb - 0.4, V_DARK, { faces: 'NESWB' });
  g.box(BAY.x0 + 0.5, -0.4, s < 0 ? zb - 0.6 : za + 0.2, BAY.x1 - 0.5, -0.32, s < 0 ? zb - 0.2 : za + 0.6, JADE, { faces: 'NESWB' });
  return g.build();
}

// ---------------------------------------------------------------------------
// The Warchild and the Bellona consorts
// ---------------------------------------------------------------------------

/** The heights of the Warchild's lights, from the keel up, between which they go out deck by deck: its two decks of lit slits, its spine, its bridge and its spire. */
const WAR_DECKS = [-6.4, -3.0, 0.2, 2.8, 5.6, 9.2, 14];

/** A Bellona warship's ring: a spearhead's section, deep below with a keel, a sharp chine along each side, scaled from the Warchild's. */
const BELLONA_RING: P2[] = [[-1.6, -6.4], [-5.6, -3.4], [-7.2, 0.4], [-5.8, 3.0], [-1.6, 4.8], [1.6, 4.8], [5.8, 3.0], [7.2, 0.4], [5.6, -3.4], [1.6, -6.4]];
/** The silver-white of Bellona's armour and prows. */
const B_WHITE = 0xe9eef3;

/**
 * A Bellona warship's hull, of the same family as the Augustan destroyers but
 * in Bellona's blue and silver (GS 38): one long armoured spearhead with a
 * keel, deep blue, its spine and its prow silver-white, three silver bands of
 * armour about it, a spine of guns, guns along its chines, and its decks shown
 * only by thin lit slits along its flanks. `s` scales it from the Warchild's 70.
 */
function bellonaHull(k: Kit, s: number, seed: number): void {
  const R = BELLONA_RING.map(([z, y]): P2 => [z * s, y * s]), H = 35 * s;
  const rings = [
    ring(-H, R, 0.92, 0.92), ring(-H + 3 * s, R), ring(0, R), ring(14 * s, R, 0.78, 0.9, 0.1 * s),
    ring(24 * s, R, 0.5, 0.74, 0.3 * s), ring(31 * s, R, 0.24, 0.5, 0.6 * s), ring(H, R, 0.02, 0.14, 0.8 * s),
  ];
  // bands: 0 port keel slope, 1 port lower flank, 2 port upper flank, 3 port spine slope, 4 spine, 5 starboard spine slope, 6 starboard upper flank, 7 starboard lower flank, 8 starboard keel slope, 9 keel
  k.loft(rings, (j, sg) => (sg >= 4 && j >= 1 && j <= 8 ? B_WHITE : j === 4 ? B_WHITE : j === 3 || j === 5 ? B_BLUE : B_DEEP), { seed });
  k.cap(rings[0], B_DEEP, [-H + 4 * s, 0, 0]);
  // three silver bands of armour about the hull
  for (const x of [-24, -12, -1.6]) {
    const x0 = x * s, x1 = (x + 1.6) * s;
    k.loft([ring(x0, R), ring(x0, R, 1.04, 1.035), ring(x1, R, 1.04, 1.035), ring(x1, R)], () => B_SILVER, { inside: () => [x0 + 0.8 * s, -0.8 * s, 0] });
  }
  // the keel, edged in silver
  k.g.box(-28 * s, -8.6 * s, -0.7 * s, 10 * s, -5.6 * s, 0.7 * s, B_DEEP, { faces: 'NESW' });
  k.g.box(-28.2 * s, -8.9 * s, -0.75 * s, 10.2 * s, -8.6 * s, 0.75 * s, B_SILVER, { faces: 'NESWTB' });
  // the spine: a ridge down the back, silver along its top
  k.g.box(-30 * s, 4.2 * s, -1.0 * s, 14 * s, 5.9 * s, 1.0 * s, B_DEEP, { faces: 'NESWT' });
  k.g.box(-29.6 * s, 5.9 * s, -0.42 * s, 13.6 * s, 5.98 * s, 0.42 * s, B_WHITE, { faces: 'NESWT' });
  for (const side of [-1, 1]) {
    // two decks of thin lit slits down each flank, and dark gun ports below them
    const lo = bandFrame([side * 5.6 * s, -3.4 * s], [side * 7.2 * s, 0.4 * s], side), up = bandFrame([side * 7.2 * s, 0.4 * s], [side * 5.8 * s, 3.0 * s], side);
    for (let x = -31 * s; x < -3 * s; x += 4.4 * s) {
      k.plate(lo.o(0.55, x + 1.5 * s), X, lo.up, lo.n, -1.5 * s, -0.09 * s, 1.5 * s, 0.09 * s, 0.04 * s, BELLONA_LIGHT, { win: interior(2.6) });
      k.plate(up.o(0.42, x + 3.0 * s), X, up.up, up.n, -1.3 * s, -0.08 * s, 1.3 * s, 0.08 * s, 0.04 * s, BELLONA_LIGHT, { win: interior(2.6) });
      k.plate(lo.o(0.2, x + 1.0 * s), X, lo.up, lo.n, -0.45 * s, -0.22 * s, 0.45 * s, 0.22 * s, 0.04 * s, 0x10182c);
      k.plate(lo.o(0.2, x + 3.2 * s), X, lo.up, lo.n, -0.45 * s, -0.22 * s, 0.45 * s, 0.22 * s, 0.04 * s, 0x10182c);
    }
    // running lights at the prow
    k.lamp([22 * s, 0.4 * s, side * 4.0 * s], 0.2 * s, side < 0 ? RED_LAMP : GREEN_LAMP, 3);
  }
}

/** Twin guns down a Bellona hull's chines and on its keel. */
function bellonaGuns(k: Kit, s: number, xs: number[], size: number): void {
  for (const side of [-1, 1]) {
    const f = bandFrame([side * 7.2 * s, 0.4 * s], [side * 5.8 * s, 3.0 * s], side);
    for (const x of xs) k.turret(f.o(0.85, x * s), unit(add(f.n, [0, 0.8, 0])), [1, 0, side * 0.5], size, B_DEEP, B_STEEL, 0xe2e8ee);
    const g = bandFrame([side * 1.6 * s, -6.4 * s], [side * 5.6 * s, -3.4 * s], side);
    for (const x of [xs[0], xs[xs.length - 2]]) k.turret(g.o(0.6, x * s), g.n, [1, 0, 0], size * 0.9, B_DEEP, B_STEEL, 0xe2e8ee);
  }
}

/**
 * The Warchild, the Bellona flagship, painted blue and silver like the whole
 * Bellona fleet (GS 38): 70 long. A Bellona spearhead with the heaviest guns
 * in the sky, three great triple turrets on its spine and another aft; a low
 * armoured bridge with a thin lit slit, its spire, and six engines. When the
 * leechCraft are aboard, its lights go out deck by deck. Its look beyond its
 * colours, and the silver eagle on its flanks, are this tile's own.
 */
function warchild(): Model {
  const L = 70, k = new Kit(L, 0xb11), H = L / 2;
  bellonaHull(k, 1, 41);
  // the heaviest guns in the sky: great triple turrets on the spine
  for (const x of [-7, 1, 9]) k.turret([x, 5.98, 0], Y, X, 1.65, B_DEEP, B_STEEL, 0xe2e8ee, 3, 3.1);
  k.turret([-28, 5.98, 0], Y, [-1, 0, 0], 1.4, B_DEEP, B_STEEL, 0xe2e8ee, 3, 2.8);
  bellonaGuns(k, 1, [-27, -19, -11, -3], 0.78);
  // the bridge: low and armoured, a thin lit slit across its face, and its spire
  k.g.box(-24, 5.9, -2.1, -13, 8.6, 2.1, B_DEEP, { faces: 'NESW' });
  k.g.box(-24.3, 8.6, -2.35, -12.7, 9.05, 2.35, B_WHITE, { faces: 'NESWTB' });
  k.plate([-13, 7.6, 0], [0, 0, 1], Y, X, -1.6, -0.17, 1.6, 0.17, 0.05, BELLONA_LIGHT, { win: interior(2.8) });
  for (const s of [-1, 1]) k.plate([-18.5, 7.6, s * 2.1], X, Y, [0, 0, s], -3.6, -0.12, 3.6, 0.12, 0.05, BELLONA_LIGHT, { win: interior(2.4) });
  k.frustum([-19, 9.05, 0], [-19, 10.3, 0], 0.95, 0.7, 8, B_WHITE, { capA: false, capB: false });
  k.frustum([-19, 10.3, 0], [-19, 13.6, 0], 0.7, 0.04, 8, B_WHITE, { capA: false });
  k.blink([-19, 13.75, 0], [1.2, 1.8, 3], 0.32, 1.8, 0.2, 0.2);
  // the silver eagle on each flank, its wings spread, its head to the bow
  const EAGLE: P2[] = [
    [0.15, 1.15], [0.62, 0.95], [0.3, 0.78], [0.55, 0.55], [1.5, 0.95], [2.6, 1.28], [3.5, 1.18], [2.9, 0.84], [3.25, 0.62], [2.4, 0.48], [2.65, 0.22], [1.6, 0.16],
    [0.5, 0.1], [0.42, -0.62], [0.95, -1.12], [0, -0.92], [-0.95, -1.12], [-0.42, -0.62], [-0.5, 0.1], [-1.6, 0.16], [-2.65, 0.22], [-2.4, 0.48], [-3.25, 0.62],
    [-2.9, 0.84], [-3.5, 1.18], [-2.6, 1.28], [-1.5, 0.95], [-0.55, 0.55], [-0.3, 0.86], [-0.15, 1.12],
  ];
  for (const s of [-1, 1]) {
    const f = bandFrame([s * 7.2, 0.4], [s * 5.8, 3.0], s);
    k.decal(f.o(0.5, -5), X, f.up, f.n, EAGLE.map(([u, v]): P2 => [u * 1.15, v * 1.15]), B_WHITE, 0.07);
  }
  // six engines in a block across the stern
  k.g.box(-H - 0.9, -3.4, -5.0, -H + 0.4, 2.6, 5.0, B_DEEP, { faces: 'NESWTB' });
  k.g.box(-H - 1.0, 2.6, -5.2, -H + 0.2, 3.0, 5.2, B_WHITE, { faces: 'NESWTB' });
  for (const y of [-1.6, 1.0]) for (const z of [-3.4, 0, 3.4]) k.nozzle([-H - 0.7, y, z], [-1, 0, 0], 1.15, B_DEEP, FIRE_BEL, 1.2, 7);
  k.blink([H, 0.8, 0], [2.4, 2.8, 3], 0.38, 1.2, 0.1, 0.1);
  return k.done(15.2, { hx: 36.3, hz: 7.7, y0: -9.0, y1: 13.8 });
}

/** Where on the Warchild a leech can latch: on its starboard side, the side the view sees, from its keel to its spine. */
function warchildLatches(n: number): { at: V3; n: V3 }[] {
  const r = rng(0x1ee), out: { at: V3; n: V3 }[] = [];
  const bands: [P2, P2][] = [[[5.8, 3.0], [1.6, 4.8]], [[7.2, 0.4], [5.8, 3.0]], [[5.6, -3.4], [7.2, 0.4]], [[1.6, -6.4], [5.6, -3.4]]];
  for (let i = 0; i < n; i++) {
    const [p, q] = bands[i % bands.length], f = bandFrame(p, q, 1);
    out.push({ at: add(f.o(0.18 + r() * 0.64, -30 + r() * 26), mul(f.n, 0.05)), n: f.n });
  }
  return out;
}

/** A Bellona consort: a smaller spearhead of the Warchild's family, 32 long, with twin guns on its spine and a low bridge (blue and silver, GS 38). */
function consort(): Model {
  const L = 32, k = new Kit(L, 0xc0c), H = L / 2, s = L / 70;
  bellonaHull(k, s, 51);
  for (const x of [-1.5, 4]) k.turret([x, 5.98 * s, 0], Y, X, 0.72, B_DEEP, B_STEEL, 0xe2e8ee);
  k.turret([-13, 5.98 * s, 0], Y, [-1, 0, 0], 0.6, B_DEEP, B_STEEL, 0xe2e8ee);
  bellonaGuns(k, s, [-27, -17, -7, -1], 0.4);
  k.g.box(-11, 2.7, -0.95, -5.6, 3.9, 0.95, B_DEEP, { faces: 'NESW' });
  k.g.box(-11.15, 3.9, -1.08, -5.45, 4.12, 1.08, B_WHITE, { faces: 'NESWTB' });
  k.plate([-5.6, 3.45, 0], [0, 0, 1], Y, X, -0.75, -0.08, 0.75, 0.08, 0.03, BELLONA_LIGHT, { win: interior(2.8) });
  k.frustum([-8.3, 4.12, 0], [-8.3, 6.4, 0], 0.42, 0.03, 6, B_WHITE, { capA: false });
  k.blink([-8.3, 6.5, 0], [1.2, 1.8, 3], 0.26, 1.9, 0.3, 0.2);
  k.g.box(-H - 0.5, -1.6, -2.3, -H + 0.3, 1.2, 2.3, B_DEEP, { faces: 'NESWTB' });
  for (const y of [-0.7, 0.45]) for (const z of [-1.4, 1.4]) k.nozzle([-H - 0.4, y, z], [-1, 0, 0], 0.55, B_DEEP, FIRE_BEL, 0.6, 4);
  return k.done(7, { hx: 16.6, hz: 3.6, y0: -4.2, y1: 6.7 });
}

// ---------------------------------------------------------------------------
// The Rim: the Dustmaker and the Charybdis
// ---------------------------------------------------------------------------

/**
 * The Dustmaker, a moonBreaker of the Rim six kilometres long and Helios au
 * Lux's flagship for forty years (LB 20): 95 long here. The books do not say
 * how it looks, and it is drawn to be unlike either other fleet: a massive,
 * austere hull of dust and dark bronze like a temple turned warship, its
 * flanks ribbed like a colonnade with tall lit slits between the ribs, gun
 * decks along its sides, a long dorsal ridge with its bridge, a broad chisel
 * of a prow, two blade fins aft, and a great ring about its waist on four
 * pylons. Its fires are pale violet.
 */
function dustmaker(): Model {
  const L = 95, k = new Kit(L, 0xd57), H = L / 2;
  const R: P2[] = [[-3.6, -8], [-8, -4], [-8.4, 3.2], [-4.6, 7.6], [4.6, 7.6], [8.4, 3.2], [8, -4], [3.6, -8]];
  // bands: 0 port lower slope, 1 port flank, 2 port upper slope, 3 top, 4 starboard upper slope, 5 starboard flank, 6 starboard lower slope, 7 bottom
  const prow36: P2[] = [[-3.2, -8], [-7, -4.2], [-7.2, 1.8], [-3.6, 4.4], [3.6, 4.4], [7.2, 1.8], [7, -4.2], [3.2, -8]];
  const prow44: P2[] = [[-2.4, -7.6], [-5, -4.6], [-5, -0.8], [-2.6, 0.8], [2.6, 0.8], [5, -0.8], [5, -4.6], [2.4, -7.6]];
  const prow47: P2[] = [[-1.4, -7.0], [-3.2, -5.4], [-3.2, -3.0], [-1.4, -2.2], [1.4, -2.2], [3.2, -3.0], [3.2, -5.4], [1.4, -7.0]];
  const rings = [ring(-H, R, 0.86, 0.86), ring(-44, R), ring(26, R), ring(36, prow36), ring(44, prow44), ring(H, prow47)];
  const BAND = [DUST_DARK, DUST, DUST_LIGHT, DUST, DUST_LIGHT, DUST, DUST_DARK, DUST_DARK];
  k.loft(rings, (j, s) => (s >= 2 && j >= 2 && j <= 4 ? BRONZE : s >= 2 && (j === 1 || j === 5) ? DUST_DARK : BAND[j]), { win: (j, s) => (s === 1 && (j === 1 || j === 5) ? SLITS : undefined), seed: 61 });
  k.cap(rings[0], DUST_DARK, [-40, 0, 0]);
  k.cap(rings[5], BRONZE_DARK, [42, -4, 0]);
  // the prow's edges in bronze, and a bronze beak below its chisel
  for (const s of [-1, 1]) k.frustum([26, 7.6, s * 4.6], [H, -2.2, s * 1.4], 0.4, 0.26, 4, BRONZE_DARK, { phase: Math.PI / 4 });
  k.frustum([30, -8.2, 0], [H + 1.5, -6.4, 0], 0.9, 0.2, 4, BRONZE_DARK, { phase: Math.PI / 4 });
  for (const s of [-1, 1]) {
    // the colonnade down each flank, its ribs over the lit slits, between a cornice and a plinth
    for (let x = -42; x < 25; x += 3.6) {
      if (Math.abs(x + 8) < 3) continue;
      k.g.box(x - 0.3, -2.3, s < 0 ? -8.85 : 8.4, x + 0.3, 3.2, s < 0 ? -8.4 : 8.85, BRONZE_DARK, { faces: s < 0 ? 'NEWTB' : 'SEWTB' });
    }
    k.g.box(-43, 3.2, s < 0 ? -9.0 : 8.3, 25, 3.8, s < 0 ? -8.3 : 9.0, BRONZE, { faces: s < 0 ? 'NEWTB' : 'SEWTB' });
    // the gun decks below the colonnade: long sponsons with their ports, and guns along their tops
    for (const [x0, x1] of [[-40, -11], [-5, 18]] as P2[]) {
      k.g.box(x0, -5.4, s < 0 ? -10.6 : 7.4, x1, -2.3, s < 0 ? -7.4 : 10.6, DUST, { faces: s < 0 ? 'NEWTB' : 'SEWTB' });
      k.g.box(x0 - 0.2, -2.3, s < 0 ? -10.8 : 7.4, x1 + 0.2, -1.9, s < 0 ? -7.4 : 10.8, BRONZE, { faces: s < 0 ? 'NEWTB' : 'SEWTB' });
      for (let x = x0 + 2; x < x1 - 1; x += 2.6) k.plate([x, -3.85, s * 10.6], X, Y, [0, 0, s], -0.75, -0.75, 0.75, 0.75, 0.04, 0x1e1b16, {});
      for (let x = x0 + 4; x < x1 - 2; x += 8) k.turret([x, -1.9, s * 9.2], Y, [1, 0, s * 0.7], 0.75, BRONZE_DARK, DUST, 0xd9cdb0);
    }
  }
  // a heavy armoured collar about its waist, flush with its gun decks, banded in bronze, with lit ports round it
  {
    const x0 = -11, x1 = -5, ri = 8.4, ro = 10.5, n = 16;
    const P = (x: number, r: number, a: number): V3 => [x, Math.cos(a) * r, Math.sin(a) * r];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
      const out: V3 = [0, Math.cos(am), Math.sin(am)];
      k.g.quad(P(x0, ro, a0), P(x1, ro, a0), P(x1, ro, a1), P(x0, ro, a1), out, DUST_DARK);
      k.g.quad(P(x1, ri, a0), P(x1, ro, a0), P(x1, ro, a1), P(x1, ri, a1), X, BRONZE_DARK);
      k.g.quad(P(x0, ri, a0), P(x0, ro, a0), P(x0, ro, a1), P(x0, ri, a1), [-1, 0, 0], BRONZE_DARK);
      // two bronze bands round it, and a lit port between them in every other plate
      for (const xb of [x0 + 0.35, x1 - 0.95]) k.g.quad(P(xb, ro + 0.05, a0), P(xb + 0.6, ro + 0.05, a0), P(xb + 0.6, ro + 0.05, a1), P(xb, ro + 0.05, a1), out, BRONZE);
      if (i % 2) k.g.quad(P(x0 + 2.1, ro + 0.04, a0 + 0.1), P(x1 - 2.1, ro + 0.04, a0 + 0.1), P(x1 - 2.1, ro + 0.04, a1 - 0.1), P(x0 + 2.1, ro + 0.04, a1 - 0.1), out, 0x6a5a8a, { win: interior(2.0) });
    }
    // its four great lamps
    for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) k.blink([(x0 + x1) / 2, Math.cos(a) * 10.8, Math.sin(a) * 10.8], [2.4, 1.9, 3], 0.45, 2.6, a / 6.28, 0.12);
  }
  // the dorsal ridge: a long block of lit slits under a bronze cornice, its bridge at its head
  k.g.box(-38, 7.4, -2.8, 22, 9.8, 2.8, DUST_LIGHT, { win: SLITS, seed: 62 });
  k.g.box(-38.3, 9.8, -3.1, 22.3, 10.2, 3.1, BRONZE, { faces: 'NESWTB' });
  k.g.box(10, 10.2, -2.4, 21, 11.8, 2.4, GLASS, { win: BRIDGE, seed: 63 });
  k.g.box(9.7, 11.8, -2.7, 21.3, 12.2, 2.7, BRONZE_DARK, { faces: 'NESWTB' });
  // two blade fins aft, swept back, edged in bronze
  for (const [x0, x1, h] of [[-36, -26, 7.2], [-23, -15, 5.2]] as V3[]) {
    const t = 0.4, y0 = 10.2, sw = 3.6;
    const A: V3 = [x0, y0, 0], B: V3 = [x1, y0, 0], C: V3 = [x1 - sw, y0 + h, 0], D: V3 = [x0 - sw * 0.6, y0 + h, 0];
    for (const s of [-1, 1]) k.quad(add(A, [0, 0, s * t]), add(B, [0, 0, s * t]), add(C, [0, 0, s * t * 0.6]), add(D, [0, 0, s * t * 0.6]), DUST_DARK, [x0, y0 + 2, 0]);
    k.quad(add(B, [0, 0, -t]), add(B, [0, 0, t]), add(C, [0, 0, t * 0.6]), add(C, [0, 0, -t * 0.6]), BRONZE, [x0, y0 + 2, 0]);
    k.quad(add(D, [0, 0, -t * 0.6]), add(D, [0, 0, t * 0.6]), add(C, [0, 0, t * 0.6]), add(C, [0, 0, -t * 0.6]), BRONZE, [x0, y0 + 2, 0]);
    k.quad(add(A, [0, 0, -t]), add(A, [0, 0, t]), add(D, [0, 0, t * 0.6]), add(D, [0, 0, -t * 0.6]), BRONZE_DARK, [x0 + 3, y0 + 2, 0]);
    k.blink([x1 - sw, y0 + h + 0.2, 0], [2.4, 1.9, 3], 0.32, 2.2, hash(x0), 0.18);
  }
  // guns on its back and under it, and a keel
  k.turret([-30, 10.2, 0], Y, X, 1.2, BRONZE_DARK, DUST, 0xd9cdb0);
  for (const x of [30, 35]) k.turret([x, 7.6 - (x - 26) * 0.32, 0], Y, X, 1.2, BRONZE_DARK, DUST, 0xd9cdb0);
  for (const x of [-42, -18, 2, 18]) for (const s of [-1, 1]) k.turret([x, 5.9, s * 6.4], unit([0, 0.7, s * 0.7]), [1, 0, s * 0.5], 0.75, BRONZE_DARK, DUST, 0xd9cdb0);
  k.g.box(-36, -10.2, -0.7, 22, -7.8, 0.7, BRONZE_DARK, { faces: 'NESWB' });
  for (const x of [-26, -2, 16]) for (const s of [-1, 1]) k.turret([x, -7.6, s * 2.8], [0, -1, 0], X, 0.9, BRONZE_DARK, DUST, 0xd9cdb0);
  // five engines in a quincunx, in a dark bronze collar
  k.g.box(-H - 0.8, -6.4, -6.4, -H + 0.3, 6.4, 6.4, BRONZE_DARK, { faces: 'NESWTB' });
  for (const [y, z] of [[0, 0], [3.1, 3.1], [3.1, -3.1], [-3.1, 3.1], [-3.1, -3.1]] as P2[]) k.nozzle([-H - 0.6, y, z], [-1, 0, 0], y === 0 ? 2.0 : 1.55, BRONZE_DARK, FIRE_RIM, 1.6, y === 0 ? 10 : 7.5);
  for (const s of [-1, 1]) k.lamp([30, 2, s * 8.0], 0.24, RIM_LIGHT, 2.6);
  k.blink([H + 1.5, -6.4, 0], [2.4, 1.9, 3], 0.4, 1.4, 0.4, 0.12);
  return k.done(21.6, { hx: 49.2, hz: 10.9, y0: -10.6, y1: 17.6 });
}


/**
 * The Charybdis, Diomedes au Raa's destroyer, black, with a three-headed
 * electric dragon on its sides (IG 15): 34 long. The dragon is drawn in lines
 * of electric blue, lit from within, with lightning about its heads. Its dish
 * antennae are for jamming (IG 15).
 */
function charybdis(): Model {
  const L = 34, k = new Kit(L, 0xc4a), H = L / 2;
  const R: P2[] = [[-1.4, -3.6], [-3.6, -1.6], [-3.7, 2.2], [-2.0, 3.6], [2.0, 3.6], [3.7, 2.2], [3.6, -1.6], [1.4, -3.6]];
  const rings = [ring(-H, R, 0.9, 0.9), ring(-15, R), ring(6, R), ring(12, R, 0.7, 0.75, 0.4), ring(H, R, 0.04, 0.06, 0.7)];
  k.loft(rings, (j, s) => (j === 1 || j === 5 ? BLACK : j === 3 ? BLACK_PLATE : s >= 2 ? BLACK_EDGE : BLACK_PLATE), { seed: 71 });
  k.cap(rings[0], BLACK, [-14, 0, 0]);
  // the dragon on each flank: strokes in electric blue, lit within
  const DRAGON: P2[][] = [
    [[-11, 1.4], [-9.2, 1.0], [-7.2, 1.3], [-5.2, 1.9], [-3.2, 2.1], [-1.2, 2.0]],
    [[-11.6, 1.7], [-11, 1.4], [-11.5, 1.0]],
    [[-4.4, 1.9], [-4.6, 1.0], [-3.9, 0.9]],
    [[-1.6, 1.9], [-1.4, 1.1], [-0.8, 1.0]],
    [[-4.0, 2.3], [-5.2, 3.4], [-2.6, 3.7], [-0.6, 3.2], [-2.0, 2.5], [-4.0, 2.3]],
    [[-5.2, 3.4], [-3.4, 2.5]], [[-2.6, 3.7], [-2.4, 2.5]],
    [[-1.2, 2.0], [0.4, 2.9], [2.0, 3.25]],
    [[-1.2, 2.0], [0.8, 2.15], [2.4, 2.1]],
    [[-1.2, 2.0], [0.4, 1.3], [2.0, 0.95]],
    [[3.6, 3.35], [4.3, 3.0], [4.0, 2.75], [4.9, 2.4]],
    [[4.0, 2.1], [4.8, 1.8], [4.5, 1.55], [5.6, 1.3]],
    [[3.6, 0.9], [4.4, 0.55], [4.1, 0.4], [5.0, 0.1]],
  ];
  const HEADS: P2[] = [[2.0, 3.25], [2.4, 2.1], [2.0, 0.95]];
  for (const s of [-1, 1]) {
    const o: V3 = [0, -1.6, s * 3.6], v = unit([0, 3.8, s * 0.1]), n: V3 = [0, 0, s];
    // the wing's membrane, dimmer, under the strokes; the body filled
    k.decal(o, X, v, n, [[-4.0, 2.3], [-5.2, 3.4], [-2.6, 3.7], [-0.6, 3.2], [-2.0, 2.5]], 0x1b6a76, 0.06, { win: interior(1.4) });
    k.decal(o, X, v, n, [[-7.2, 1.15], [-5.2, 1.6], [-3.2, 1.85], [-1.2, 1.75], [-1.2, 2.25], [-3.2, 2.35], [-5.2, 2.2], [-7.2, 1.45]], ELECTRIC, 0.07, { win: interior(3.2) });
    for (const line of DRAGON) k.stroke(o, X, v, n, line, 0.3, ELECTRIC, 0.09, { win: interior(3.2) });
    for (const [hx, hy] of HEADS) {
      // a head: a wedge with its jaw open, and an eye
      k.decal(o, X, v, n, [[hx - 0.3, hy - 0.38], [hx + 1.5, hy - 0.08], [hx + 0.5, hy + 0.04], [hx + 1.4, hy + 0.36], [hx - 0.3, hy + 0.42]], ELECTRIC, 0.09, { win: interior(3.2) });
      k.decal(o, X, v, n, [[hx + 0.2, hy + 0.12], [hx + 0.42, hy + 0.12], [hx + 0.42, hy + 0.3], [hx + 0.2, hy + 0.3]], 0xffffff, 0.13, { win: interior(4) });
    }
  }
  // a ridge down its back, and two swept fins aft like a dragon's folded wings, edged in its blue
  k.g.box(-13, 3.5, -0.6, 10, 4.5, 0.6, BLACK_EDGE, { faces: 'NESWT' });
  for (const s of [-1, 1]) {
    const A: V3 = [-17, 3.4, s * 1.6], B: V3 = [-10, 3.4, s * 1.6], C: V3 = [-14.6, 7.6, s * 3.2], D: V3 = [-17.4, 7.0, s * 2.8];
    const t: V3 = [0, 0, s * 0.18];
    k.quad(add(A, t), add(B, t), add(C, t), add(D, t), BLACK_PLATE, [-14, 4, 0]);
    k.quad(sub(A, t), sub(B, t), sub(C, t), sub(D, t), BLACK_PLATE, [-14, 4, s * 9]);
    k.quad(add(B, t), sub(B, t), sub(C, t), add(C, t), ELECTRIC, [-14, 4, 0], { win: interior(3) });
    k.quad(add(D, t), sub(D, t), sub(C, t), add(C, t), BLACK_EDGE, [-15, 4, 0]);
  }
  // plates along its upper flanks
  for (const s of [-1, 1]) {
    const f = bandFrame([s * 3.7, 2.2], [s * 2.0, 3.6], s);
    for (let x = -14; x < 7; x += 4.2) k.rbox(add(f.o(0.5, x + 1.8), mul(f.n, 0.07)), [1.8, 0.7, 0.07], X, f.up, f.n, BLACK_EDGE);
  }
  // dish antennae, for jamming
  for (const [x, z] of [[-6, 1.2], [-1, -1.4]] as P2[]) {
    k.frustum([x, 3.6, z], [x, 4.6, z], 0.12, 0.12, 4, BLACK_EDGE, { capA: false });
    k.frustum([x - 0.2, 4.6, z], [x + 0.3, 5.4, z], 0.2, 1.1, 8, BLACK_EDGE, { capA: false, capB: 0x50545c });
  }
  k.g.box(-12, 3.6, -1.6, -6.8, 5.4, 1.6, BLACK_PLATE, { win: PORTS_SPARSE, seed: 72 });
  k.g.box(-11.4, 5.4, -1.3, -7.6, 6.2, 1.3, GLASS, { win: BRIDGE, seed: 73 });
  for (const x of [1, 7]) k.turret([x, 3.6, 0], Y, X, 0.8, BLACK, BLACK_EDGE, 0xb6bcc6);
  k.turret([-14, 3.4, 0], Y, [-1, 0, 0], 0.6, BLACK, BLACK_EDGE, 0xb6bcc6);
  for (const x of [-6, 4]) k.turret([x, -3.6, 0], [0, -1, 0], X, 0.7, BLACK, BLACK_EDGE, 0xb6bcc6);
  for (const [y, z] of [[0.6, 0], [-1.6, -1.6], [-1.6, 1.6]] as P2[]) k.nozzle([-H, y, z], [-1, 0, 0], y > 0 ? 1.1 : 0.85, BLACK_EDGE, FIRE_BLACK, 1.0, 5.5);
  for (const s of [-1, 1]) k.lamp([10, 1.8, s * 3.2], 0.16, ELECTRIC, 3);
  for (const x of [-12, -2, 8]) k.blink([x, 3.8, 0], [0.6, 2.4, 3], 0.26, 1.6, hash(x, 9), 0.14);
  return k.done(7.6, { hx: 17.4, hz: 3.9, y0: -4.2, y1: 7.9 });
}

// ---------------------------------------------------------------------------
// The Archimedes
// ---------------------------------------------------------------------------

/**
 * The Archimedes, Cassius and Lysander's corvette after the war, fifty metres
 * long and shaped like a reared cobra's head (IG 8): 6 long here. Its hood is
 * a broad shell that rises towards the front, over a slim body, with the head
 * at its front and two lit eyes. Nothing of its official drawings is used:
 * the books' words only.
 */
function archimedes(): Model {
  const L = 6, k = new Kit(L, 0xa2c), H = L / 2;
  // the hood: rings across it from the neck to the snout, a shell that rises to the front
  const hood: [number, number][] = [[-3, 0.75], [-2.2, 1.6], [-1.2, 2.3], [-0.2, 2.65], [0.8, 2.45], [1.7, 1.8], [2.4, 1.2], [3, 0.5]];
  const rings = hood.map(([x, w]): V3[] => {
    const yt = 0.25 + (x + 3) * 0.2, yb = yt - 0.42;
    return [[x, yb, -w], [x, yt, -w * 0.95], [x, yt + 0.28, 0], [x, yt, w * 0.95], [x, yb, w], [x, yb - 0.12, 0]];
  });
  k.loft(rings, (j) => (j === 1 || j === 2 ? COBRA : j === 0 || j === 3 ? COBRA_DARK : COBRA_PALE), { inside: (s) => [(hood[s][0] + hood[s + 1][0]) / 2, 0.1 + (hood[s][0] + 3) * 0.2, 0] });
  k.cap(rings[0], COBRA_DARK, [-2, 0.2, 0]);
  // the pale marks on the back of the hood
  for (const s of [-1, 1]) k.decal([0, 0, 0], X, [0, 0, s], [0, 1, 0], Array.from({ length: 8 }, (_, i): P2 => [-0.6 + Math.cos((i / 8) * Math.PI * 2) * 0.55, 1.05 + Math.sin((i / 8) * Math.PI * 2) * 0.35]), COBRA_PALE, 0.0);
  // the slim body under the hood
  const B: P2[] = [[-0.55, -0.75], [-0.85, -0.2], [-0.55, 0.15], [0.55, 0.15], [0.85, -0.2], [0.55, -0.75]];
  const body = [ring(-3.1, B, 0.8, 0.8), ring(-2, B), ring(1.6, B), ring(2.5, B, 0.4, 0.5, 0.2)];
  k.loft(body, (j) => (j === 2 ? COBRA_DARK : j === 5 ? COBRA_PALE : COBRA), {});
  k.cap(body[0], COBRA_DARK, [-2, -0.3, 0]);
  k.cap(body[3], COBRA_PALE, [2, -0.3, 0]);
  // the eyes: lit
  for (const s of [-1, 1]) k.lamp([2.15, 1.38, s * 0.55], 0.11, 0xffd36a, 3);
  for (const s of [-1, 1]) k.nozzle([-3.0, -0.3, s * 0.4], [-1, 0, 0], 0.26, COBRA_DARK, FIRE_GOLD, 0.3, 1.6);
  return k.done(5.4, { hx: 3.2, hz: 2.7, y0: -0.9, y1: 1.7 });
}

// ---------------------------------------------------------------------------
// Small craft: ripWings, wasps, leechCraft, dropships and drones
// ---------------------------------------------------------------------------

/** A ripWing: a swept-wing fighter, the Augustans' in gunmetal with red tips (silent: this tile's own). */
function ripWing(): THREE.BufferGeometry {
  const k = new Kit(3.2, 1);
  const R: P2[] = [[-0.22, -0.2], [-0.3, 0.05], [0, 0.28], [0.3, 0.05], [0.22, -0.2]];
  k.loft([ring(-1.6, R, 0.8, 0.8), ring(-0.6, R), ring(0.6, R, 0.85, 0.9), ring(1.6, R, 0.05, 0.1, 0.02)], (j) => (j === 2 || j === 1 ? 0x45484f : 0x34363c));
  k.cap(ring(-1.6, R, 0.8, 0.8), 0x2a2c31, [0, 0, 0]);
  for (const s of [-1, 1]) {
    const a: V3 = [0.5, 0, s * 0.25], b: V3 = [-1.4, 0, s * 1.75], c: V3 = [-1.55, 0, s * 1.55], d: V3 = [-1.2, 0, s * 0.25];
    k.quad(add(a, [0, 0.05, 0]), add(b, [0, 0.05, 0]), add(c, [0, 0.05, 0]), add(d, [0, 0.05, 0]), 0x50545c, [-0.5, -1, s * 0.8]);
    k.quad(add(a, [0, -0.04, 0]), add(b, [0, -0.04, 0]), add(c, [0, -0.04, 0]), add(d, [0, -0.04, 0]), 0x34363c, [-0.5, 1, s * 0.8]);
    k.quad(add(b, [0, 0.07, 0]), add(c, [0, 0.07, 0]), add(c, [0.25, 0.07, -s * 0.1]), add(b, [0.25, 0.07, -s * 0.12]), REAPER, [-1.3, -1, s * 1.5]);
  }
  k.quad([-1.5, 0.25, 0], [-0.9, 0.25, 0], [-1.25, 0.85, 0], [-1.6, 0.85, 0], 0x45484f, [-1.2, 0.5, 1]);
  k.quad([-1.5, 0.25, 0], [-0.9, 0.25, 0], [-1.25, 0.85, 0], [-1.6, 0.85, 0], 0x45484f, [-1.2, 0.5, -1]);
  k.plate([0.6, 0.22, 0], X, [0, 0, 1], [0, 1, 0], -0.35, -0.16, 0.25, 0.16, 0.04, 0x9fd0ff, { win: interior(2) });
  return k.g.build();
}

/** A wasp: a stubby fighter with short wings and a sting of a tail, the Bellona's in blue-grey and silver (silent: this tile's own). */
function wasp(): THREE.BufferGeometry {
  const k = new Kit(2.6, 2);
  const R: P2[] = [[-0.32, -0.25], [-0.4, 0.08], [0, 0.36], [0.4, 0.08], [0.32, -0.25]];
  k.loft([ring(-1.3, R, 0.25, 0.3, 0.1), ring(-0.6, R), ring(0.4, R, 1.05, 1.0), ring(1.3, R, 0.15, 0.2, 0.0)], (j) => (j === 2 || j === 1 ? 0x4a5a78 : 0x34405a));
  for (const s of [-1, 1]) {
    k.quad([0.3, 0.02, s * 0.3], [-0.5, 0.02, s * 0.32], [-0.2, 0.02, s * 1.35], [0.35, 0.02, s * 1.2], 0xb8c2cc, [0, -1, s * 0.6]);
    k.quad([0.3, -0.03, s * 0.3], [-0.5, -0.03, s * 0.32], [-0.2, -0.03, s * 1.35], [0.35, -0.03, s * 1.2], 0x34405a, [0, 1, s * 0.6]);
  }
  k.plate([0.5, 0.3, 0], X, [0, 0, 1], [0, 1, 0], -0.3, -0.18, 0.2, 0.18, 0.06, 0xffd59a, { win: interior(2) });
  return k.g.build();
}

/** A leechCraft: a squat boarding craft with four claws, that latches onto a hull like a tick (GS 38; its look is this tile's own). */
function leech(): THREE.BufferGeometry {
  const k = new Kit(1.6, 3);
  k.frustum([-0.75, 0.3, 0], [0.6, 0.3, 0], 0.55, 0.38, 6, 0x3c4a44, { capA: 0x2a3430, capB: 0x2a3430 });
  k.frustum([0.6, 0.3, 0], [0.85, 0.3, 0], 0.38, 0.2, 6, 0x5d6b64);
  for (const [x, s] of [[-0.4, -1], [-0.4, 1], [0.35, -1], [0.35, 1]] as P2[]) k.frustum([x, 0.15, s * 0.35], [x + 0.25, -0.25, s * 0.75], 0.08, 0.05, 4, 0x8a9a92);
  k.plate([-0.1, 0.72, 0], X, [0, 0, 1], [0, 1, 0], -0.15, -0.15, 0.15, 0.15, 0.02, JADE_LIGHT, { win: interior(3) });
  return k.g.build();
}

/** A dropship: a boxy carrier on stub wings with two engine pods, in Augustan grey and red (GS 39 names them; the look is this tile's own). */
function dropship(): THREE.BufferGeometry {
  const k = new Kit(6, 4);
  k.g.box(-2.4, -0.8, -1.05, 1.6, 0.8, 1.05, 0x5a5e66, { faces: 'NESWTB', win: PORTS_SPARSE });
  k.quad([1.6, -0.8, -1.05], [2.9, -0.4, -0.6], [2.9, -0.4, 0.6], [1.6, -0.8, 1.05], 0x4a4d54, [1.8, 0, 0]);
  k.quad([1.6, 0.8, -1.05], [2.9, 0.2, -0.6], [2.9, 0.2, 0.6], [1.6, 0.8, 1.05], 0x2a3a4c, [1.8, 0, 0], { win: BRIDGE });
  k.quad([2.9, -0.4, -0.6], [2.9, 0.2, -0.6], [2.9, 0.2, 0.6], [2.9, -0.4, 0.6], 0x4a4d54, [1.8, 0, 0]);
  for (const s of [-1, 1]) {
    k.tri([1.6, -0.8, s * 1.05], [2.9, -0.4, s * 0.6], [2.9, 0.2, s * 0.6], 0x4a4d54, [2, 0, 0]);
    k.tri([1.6, -0.8, s * 1.05], [2.9, 0.2, s * 0.6], [1.6, 0.8, s * 1.05], 0x4a4d54, [2, 0, 0]);
    k.g.box(-1.2, 0.0, s < 0 ? -2.6 : 1.05, 0.4, 0.3, s < 0 ? -1.05 : 2.6, 0x4a4d54, { faces: 'NESWTB' });
    k.frustum([-1.6, 0.15, s * 2.9], [0.6, 0.15, s * 2.9], 0.42, 0.36, 8, 0x3a3d44, { capA: 0x1a1a1e, capB: 0x3a3d44 });
    k.g.box(-2.3, 0.8, s < 0 ? -1.06 : 0.86, 1.5, 0.95, s < 0 ? -0.86 : 1.06, REAPER, { faces: 'NESWT' });
  }
  return k.g.build();
}

/** A drone of the depot's swarm (GS 39): a small dark lozenge with a red eye (its look is this tile's own). */
function drone(): THREE.BufferGeometry {
  const k = new Kit(1, 5);
  k.frustum([-0.45, 0, 0], [0, 0, 0], 0.05, 0.32, 4, 0x2e3035, { capA: false, phase: Math.PI / 4 });
  k.frustum([0, 0, 0], [0.45, 0, 0], 0.32, 0.05, 4, 0x3a3d44, { capB: false, phase: Math.PI / 4 });
  k.g.box(-0.08, -0.04, -0.55, 0.08, 0.04, 0.55, 0x52565e, { faces: 'NESWTB' });
  return k.g.build();
}

// ---------------------------------------------------------------------------
// Where they fly
// ---------------------------------------------------------------------------

/**
 * A ship's station: the middle of the slow closed path it drifts round, its
 * mean heading (degrees), its lap (seconds) and where in it it starts; how far
 * it drifts along its heading, across it and up and down, how far its bow
 * swings (degrees), and how far it banks into the swing. Laid out by the
 * offline check described at the head of the file: each stays on the board,
 * outside the shield, ten clear of every lot, and eight from every other ship.
 */
interface Station { c: V3; h0: number; T: number; ph: number; A: number; B: number; V: number; Y: number; bank: number }

const STATIONS: Record<string, Station> = {
  morningStar: { c: [18, 135, -52], h0: 138, T: 360, ph: 0, A: 4, B: 3, V: 1.5, Y: 4, bank: 3 },
  pax: { c: [93, 133, -34], h0: 90, T: 300, ph: 0.3, A: 5, B: 1.5, V: 1.2, Y: 3, bank: 3 },
  augA: { c: [78, 94, -94], h0: 138, T: 210, ph: 0.1, A: 4, B: 3, V: 1.5, Y: 8, bank: 6 },
  augB: { c: [44, 105, -53], h0: 150, T: 240, ph: 0.6, A: 5, B: 3, V: 1.5, Y: 8, bank: 6 },
  victra: { c: [-27, 104, -42], h0: 150, T: 200, ph: 0.4, A: 6, B: 4, V: 2, Y: 14, bank: 8 },
  warchild: { c: [-94, 91, 71], h0: -90, T: 270, ph: 0.15, A: 4, B: 1, V: 1.5, Y: 3, bank: 4 },
  dustmaker: { c: [-87, 126, 55], h0: -90, T: 330, ph: 0.7, A: 4, B: 1.5, V: 1.2, Y: 3, bank: 2 },
  belA: { c: [-50, 87, 95], h0: -42, T: 190, ph: 0.2, A: 4, B: 3, V: 1.5, Y: 8, bank: 6 },
  belB: { c: [-93, 97, 3], h0: -90, T: 230, ph: 0.85, A: 3, B: 2, V: 1.5, Y: 6, bank: 6 },
  charybdis: { c: [-86, 100.5, -47], h0: 120, T: 220, ph: 0.5, A: 3, B: 2, V: 1.5, Y: 6, bank: 8 },
};

/** The Archimedes's own small loop, flown bow first, and its lap. */
const ARCHI = { c: [62, 112, -14] as V3, a: 10, b: 7, T: 42 };

interface Pose { x: number; y: number; z: number; heading: number; bank: number; pitch: number; scale: number }

const D2R = Math.PI / 180;

function stationPose(s: Station, t: number): Pose {
  const th = 2 * Math.PI * (t / s.T + s.ph), h0 = s.h0 * D2R;
  const along = s.A * Math.sin(th), across = s.B * Math.cos(th), fx = Math.cos(h0), fz = Math.sin(h0);
  return {
    x: s.c[0] + fx * along - fz * across,
    y: s.c[1] + s.V * Math.sin(2 * th + 1.3),
    z: s.c[2] + fz * along + fx * across,
    heading: h0 - s.Y * D2R * Math.sin(th),
    bank: -s.bank * D2R * Math.cos(th),
    pitch: 0.012 * Math.cos(2 * th + 1.3),
    scale: 1,
  };
}

function archiPose(t: number): Pose {
  const w = (2 * Math.PI) / ARCHI.T, th = w * t;
  const x = ARCHI.c[0] + ARCHI.a * Math.cos(th), z = ARCHI.c[2] + ARCHI.b * Math.sin(th);
  const vx = -ARCHI.a * Math.sin(th), vz = ARCHI.b * Math.cos(th);
  const rate = (ARCHI.a * ARCHI.b) / (ARCHI.a * ARCHI.a * Math.sin(th) ** 2 + ARCHI.b * ARCHI.b * Math.cos(th) ** 2) * w;
  return { x, y: ARCHI.c[1] + 1.5 * Math.sin(2 * th), z, heading: Math.atan2(vz, vx), bank: clamp(rate * 3.2, 0, 0.5), pitch: 0.05 * Math.cos(2 * th), scale: 1 };
}

/** The shortest way round from one heading to another. */
const turnTo = (a: number, b: number): number => {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
    heading: a.heading + turnTo(a.heading, b.heading) * t, bank: a.bank + (b.bank - a.bank) * t, pitch: a.pitch + (b.pitch - a.pitch) * t, scale: a.scale + (b.scale - a.scale) * t,
  };
}

/**
 * A smooth line through points, each passed at its own time, as a curve that
 * a ship flies: where it is at `t`, and which way it is going. Catmull-Rom,
 * timed by the points' own times.
 */
function along(pts: V3[], times: number[], t: number): { p: V3; v: V3 } {
  const n = pts.length;
  if (t <= times[0]) return { p: pts[0], v: unit(sub(pts[1], pts[0])) };
  if (t >= times[n - 1]) return { p: pts[n - 1], v: unit(sub(pts[n - 1], pts[n - 2])) };
  let i = 0;
  while (i < n - 2 && t > times[i + 1]) i++;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
  const t0 = times[Math.max(0, i - 1)], t1 = times[i], t2 = times[i + 1], t3 = times[Math.min(n - 1, i + 2)];
  const m1 = mul(sub(p2, p0), (t2 - t1) / Math.max(1e-3, t2 - t0)), m2 = mul(sub(p3, p1), (t2 - t1) / Math.max(1e-3, t3 - t1));
  const u = (t - t1) / Math.max(1e-3, t2 - t1), u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const p = add(add(mul(p1, h00), mul(m1, h10)), add(mul(p2, h01), mul(m2, h11)));
  const d00 = 6 * u2 - 6 * u, d10 = 3 * u2 - 4 * u + 1, d01 = -6 * u2 + 6 * u, d11 = 3 * u2 - 2 * u;
  const v = add(add(mul(p1, d00), mul(m1, d10)), add(mul(p2, d01), mul(m2, d11)));
  return { p, v: unit(v) };
}

/** Times for a line of points, at an even speed from `t0` to `t1`. */
function timed(pts: V3[], t0: number, t1: number): number[] {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + len(sub(pts[i], pts[i - 1])));
  return d.map((v) => t0 + ((t1 - t0) * v) / d[d.length - 1]);
}

/** A pose for something flying along a line: level, banked into its turn, nose along its way. */
function flying(p: V3, v: V3, vPrev: V3, dt: number, maxBank: number, k = 2.2): Pose {
  const h = Math.atan2(v[2], v[0]), hp = Math.atan2(vPrev[2], vPrev[0]);
  const rate = turnTo(hp, h) / Math.max(1e-3, dt);
  return { x: p[0], y: p[1], z: p[2], heading: h, bank: clamp(rate * k, -maxBank, maxBank), pitch: Math.asin(clamp(v[1], -0.9, 0.9)), scale: 1 };
}

// ---------------------------------------------------------------------------
// Fighters: pairs chasing each other in loops
// ---------------------------------------------------------------------------

/** A dogfight: a loop in space that the quarry flies, and the hunter behind it on the same loop. */
interface Dogfight { c: V3; a: number; b: number; h: number; T: number; ph: number; tilt: number; lag: number; quarry: 'rip' | 'wasp' }

const DOGFIGHTS: Dogfight[] = [
  { c: [-55, 112, -14], a: 18, b: 10, h: 4, T: 17, ph: 0.1, tilt: 0.4, lag: 1.9, quarry: 'wasp' },
  { c: [-6, 111, 16], a: 15, b: 11, h: 3, T: 15, ph: 0.5, tilt: -0.3, lag: 1.6, quarry: 'rip' },
  { c: [38, 113, 26], a: 17, b: 11, h: 4, T: 16, ph: 0.3, tilt: 1.1, lag: 1.8, quarry: 'wasp' },
  { c: [-33, 108, 66], a: 16, b: 10, h: 3.5, T: 15, ph: 0.8, tilt: 2.0, lag: 1.7, quarry: 'rip' },
  { c: [14, 104, 74], a: 15, b: 9, h: 3, T: 14, ph: 0.2, tilt: 0.2, lag: 1.5, quarry: 'wasp' },
  { c: [68, 101, 42], a: 13, b: 9, h: 3, T: 13, ph: 0.65, tilt: 1.6, lag: 1.6, quarry: 'rip' },
  { c: [-60, 101, -84], a: 15, b: 9, h: 3, T: 16, ph: 0.4, tilt: 0.7, lag: 1.8, quarry: 'wasp' },
  { c: [18, 100, -94], a: 16, b: 8, h: 3, T: 15, ph: 0.9, tilt: 2.6, lag: 1.7, quarry: 'rip' },
];

/** Where on its loop a fighter is at `t`: a figure of eight, tipped, rising and falling. */
function dogAt(d: Dogfight, t: number): V3 {
  const th = 2 * Math.PI * (t / d.T + d.ph);
  const u = d.a * Math.sin(th), v = d.b * Math.sin(2 * th);
  const c = Math.cos(d.tilt), s = Math.sin(d.tilt);
  return [d.c[0] + u * c - v * s, d.c[1] + d.h * Math.sin(th + 1.1) + 1.4 * Math.cos(3 * th), d.c[2] + u * s + v * c];
}

// ---------------------------------------------------------------------------
// The low fliers: dropships over the column, and the depot's drones
// ---------------------------------------------------------------------------

/** The dropships' loops: along the rim road over the crown, and down the south road outside the wall. Built in `lowLoops`. */
interface Low { pts: V3[]; times: number[]; T: number }

function lowLoops(): Low[] {
  // the rim road's middle, between the hairpins, flown east at 53 over its middle and back west a little north of it, higher,
  // turning short of Olympus's rock
  const rim = LOOP_MIDDLE.filter((p) => p[2] < -80 && Math.abs(p[0]) < 52).sort((a, b) => a[0] - b[0]);
  const east = rim.filter((_, i) => i % 6 === 0).map((p): V3 => [p[0], 53, p[2]]);
  const west = [...east].reverse().map((p): V3 => [p[0], 55, p[2] - 15]);
  const rimLoop = [...east, [60, 54, -92] as V3, ...west, [-60, 54, -92] as V3];
  // the south road from the gate to the camp's ring, out over its middle and back higher
  const south = SOUTH.filter((p) => p[2] > 64).filter((_, i) => i % 3 === 0);
  const out = south.map((p): V3 => [p[0], Math.max(42, p[1] + 24), p[2]]);
  const back = [...south].reverse().map((p): V3 => [p[0], Math.max(50, p[1] + 32), p[2]]);
  const southLoop = [...out, [-42, 46, 96] as V3, ...back, [74, 50, 70] as V3];
  const make = (pts: V3[], speed: number): Low => {
    const closed = [...pts, pts[0]];
    let total = 0;
    for (let i = 1; i < closed.length; i++) total += len(sub(closed[i], closed[i - 1]));
    const T = total / speed;
    return { pts: closed, times: timed(closed, 0, T), T };
  };
  return [make(rimLoop, 5), make(southLoop, 4.5)];
}

/** When the drones rise: one swarm every so often, and how long it stays up. */
const SWARM = { every: 140, first: 25, up: 46, n: 30 };

// ---------------------------------------------------------------------------
// The shield and the board, for the check
// ---------------------------------------------------------------------------

/**
 * How far a place is from a ship, in the ship's own coordinates: a grid round
 * it, each cell holding the distance to the nearest point of its surface,
 * worked out once (a chamfer distance transform of the cells its points fall
 * in). For the check of how near two ships come.
 */
interface Field3 { at(p: V3): number }
function field3(samples: V3[], c = 1.6, margin = 12): Field3 {
  const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of samples) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i] - margin); hi[i] = Math.max(hi[i], p[i] + margin); }
  const nx = Math.ceil((hi[0] - lo[0]) / c) + 1, ny = Math.ceil((hi[1] - lo[1]) / c) + 1, nz = Math.ceil((hi[2] - lo[2]) / c) + 1;
  const d = new Float32Array(nx * ny * nz).fill(1e6);
  const idx = (i: number, j: number, k: number): number => (k * ny + j) * nx + i;
  for (const p of samples) d[idx(Math.floor((p[0] - lo[0]) / c), Math.floor((p[1] - lo[1]) / c), Math.floor((p[2] - lo[2]) / c))] = 0;
  const back: [number, number, number, number][] = [];
  for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (dz < 0 || (dz === 0 && dy < 0) || (dz === 0 && dy === 0 && dx < 0)) back.push([dx, dy, dz, c * Math.hypot(dx, dy, dz)]);
  }
  const pass = (dir: number): void => {
    for (let k = dir > 0 ? 0 : nz - 1; dir > 0 ? k < nz : k >= 0; k += dir) {
      for (let j = dir > 0 ? 0 : ny - 1; dir > 0 ? j < ny : j >= 0; j += dir) {
        for (let i = dir > 0 ? 0 : nx - 1; dir > 0 ? i < nx : i >= 0; i += dir) {
          let v = d[idx(i, j, k)];
          for (const [dx, dy, dz, w] of back) {
            const a = i + dx * dir, b = j + dy * dir, e = k + dz * dir;
            if (a < 0 || b < 0 || e < 0 || a >= nx || b >= ny || e >= nz) continue;
            v = Math.min(v, d[idx(a, b, e)] + w);
          }
          d[idx(i, j, k)] = v;
        }
      }
    }
  };
  pass(1);
  pass(-1);
  return {
    at(p) {
      const i = Math.floor((p[0] - lo[0]) / c), j = Math.floor((p[1] - lo[1]) / c), k = Math.floor((p[2] - lo[2]) / c);
      if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return margin;
      // the points stand for the surface between them: half a cell nearer than the cell's own distance
      return Math.max(0, d[idx(i, j, k)] - c * 0.5);
    },
  };
}

/** The lots near each square of the board, so that a place asks only about those. */
const LOT_CELL = 16;
const LOTS_NEAR: Map<string, typeof LOTS> = (() => {
  const m = new Map<string, typeof LOTS>();
  for (let i = -7; i <= 7; i++) for (let j = -8; j <= 8; j++) {
    const x0 = i * LOT_CELL - 24, x1 = (i + 1) * LOT_CELL + 24, z0 = j * LOT_CELL - 24, z1 = (j + 1) * LOT_CELL + 24;
    m.set(`${i},${j}`, LOTS.filter((l) => l.x1 > x0 && l.x0 < x1 && l.z1 > z0 && l.z0 < z1));
  }
  return m;
})();

function shieldGap(p: V3): number {
  const [cx, cy, cz] = SHIELD.c;
  const ex = (p[0] - cx) / SHIELD.rx, ey = (p[1] - cy) / SHIELD.ry, ez = (p[2] - cz) / SHIELD.rz;
  const e = Math.sqrt(ex * ex + ey * ey + ez * ez);
  return Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz) * (1 - 1 / Math.max(e, 1e-6));
}
function lotGap(p: V3): { d: number; id: string } {
  let d = 24, id = '';
  for (const l of LOTS_NEAR.get(`${Math.floor(p[0] / LOT_CELL)},${Math.floor(p[2] / LOT_CELL)}`) ?? []) {
    const ex = Math.max(l.x0 - p[0], 0, p[0] - l.x1), ez = Math.max(l.z0 - p[2], 0, p[2] - l.z1), ey = Math.max(0, p[1] - l.top);
    const v = Math.hypot(ex, ey, ez);
    if (v < d) { d = v; id = l.id; }
  }
  // the Citadel's tallest spire reaches 100 near (-59, 19)
  const sp = Math.hypot(Math.max(0, Math.hypot(p[0] + 59, p[2] - 19) - 1.5), Math.max(0, p[1] - 100));
  if (sp < d) { d = sp; id = 'the Citadel\'s spire'; }
  return { d, id };
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

/**
 * The city's material for a ship: windows, lit interiors and outlines as
 * everything built has them, but no snow settles on it, and by night its hull
 * keeps a little light of its own, as a fleet lit by its battle does. With
 * `decks`, the windows and lamps between two heights of the ship's own can be
 * put out, for the Warchild.
 */
function fleetMaterial(k: Build, key: string, decks?: { lo: { value: number }; hi: { value: number } }): THREE.MeshToonMaterial {
  const m = k.mat.city();
  const base = m.onBeforeCompile.bind(m);
  m.onBeforeCompile = (shader, renderer) => {
    base(shader, renderer);
    let fs = shader.fragmentShader.replace('float snowAmt = uSnow *', 'float snowAmt = 0.0 *');
    if (decks) {
      Object.assign(shader.uniforms, { uDarkLo: decks.lo, uDarkHi: decks.hi });
      fs = fs.replace('#include <common>', '#include <common>\nuniform float uDarkLo;\nuniform float uDarkHi;');
      fs = fs.replace('totalEmissiveRadiance += wmEmis;', 'totalEmissiveRadiance += wmEmis * (1.0 - step(uDarkLo, vWall.y) * step(vWall.y, uDarkHi));\n      totalEmissiveRadiance += diffuseColor.rgb * uNight * 0.14;');
    } else {
      fs = fs.replace('totalEmissiveRadiance += wmEmis;', 'totalEmissiveRadiance += wmEmis;\n      totalEmissiveRadiance += diffuseColor.rgb * uNight * 0.14;');
    }
    shader.fragmentShader = fs;
  };
  m.customProgramCacheKey = () => key;
  return m;
}

/** A mesh of the fleet's: lit as the tile is, casting no shadow (the shadows are drawn once), never culled. */
function mover(k: Build, geo: THREE.BufferGeometry, mat: THREE.Material, name: string): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  k.group.add(mesh);
  return mesh;
}

/** An instanced mesh of the fleet's, filled afresh each frame. */
function many(k: Build, geo: THREE.BufferGeometry, mat: THREE.Material, n: number, name: string): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.name = name;
  m.count = 0;
  m.frustumCulled = false;
  m.castShadow = false;
  m.receiveShadow = false;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  k.group.add(m);
  return m;
}

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------

/** The cells of the shadows' sheet, one for each kind of ship, and how finely each ship's shadow is laid on the ground. */
const SHEET = { w: 512, h: 512, cw: 256, ch: 64, cols: 2 };

/** Draws a ship's shape seen from above into its cell of the sheet, blurred. */
function drawShade(ctx: CanvasRenderingContext2D, cell: number, m: Model, pad: number): void {
  const cx = (cell % SHEET.cols) * SHEET.cw, cy = Math.floor(cell / SHEET.cols) * SHEET.ch;
  const cv = document.createElement('canvas');
  cv.width = SHEET.cw;
  cv.height = SHEET.ch;
  const c = cv.getContext('2d')!;
  const hx = m.box.hx + pad, hz = m.box.hz + pad;
  const X0 = (x: number): number => ((x + hx) / (2 * hx)) * SHEET.cw, Z0 = (z: number): number => ((z + hz) / (2 * hz)) * SHEET.ch;
  c.fillStyle = '#fff';
  c.beginPath();
  // every triangle turned the same way round, so that where they overlap they add (a hull's top and bottom, wound
  // against each other, would otherwise cancel and leave holes)
  for (let i = 0; i + 5 < m.plan.length; i += 6) {
    const ax = X0(m.plan[i]), az = Z0(m.plan[i + 1]), bx = X0(m.plan[i + 2]), bz = Z0(m.plan[i + 3]), cx2 = X0(m.plan[i + 4]), cz2 = Z0(m.plan[i + 5]);
    const area = (bx - ax) * (cz2 - az) - (cx2 - ax) * (bz - az);
    if (Math.abs(area) < 0.02) continue;
    c.moveTo(ax, az);
    if (area > 0) {
      c.lineTo(bx, bz);
      c.lineTo(cx2, cz2);
    } else {
      c.lineTo(cx2, cz2);
      c.lineTo(bx, bz);
    }
    c.closePath();
  }
  c.fill('nonzero');
  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.drawImage(cv, cx, cy);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The fleet
// ---------------------------------------------------------------------------

interface Ship {
  id: string;
  model: Model;
  mesh: THREE.Mesh;
  pose: Pose;
  /** Its cell of the shadows' sheet, and where its part of the shadow's grid begins. */
  cell: number;
  grid: { nx: number; nz: number; v0: number; pad: number };
  /** Which side it is on, for its bolts and its fires. */
  side: 'aug' | 'bel' | 'rim';
}

export function buildFleet(k: Build): Fleet {
  // --- the models, built once each ---
  const models = {
    morningStar: morningStar(), pax: pax(), augustan: augustan(), victra: victra(), warchild: warchild(), consort: consort(),
    dustmaker: dustmaker(), charybdis: charybdis(), archimedes: archimedes(),
  };
  const mat = fleetMaterial(k, 'city-fleet');
  const dark = { lo: { value: 1e3 }, hi: { value: -1e3 } };
  const warMat = fleetMaterial(k, 'city-fleet-warchild', dark);

  const ships: Ship[] = [];
  const shipOf = new Map<string, Ship>();
  const addShip = (id: string, model: Model, cell: number, side: Ship['side'], m: THREE.Material = mat): Ship => {
    const mesh = mover(k, model.geo, m, `fleet-${id}`);
    const pad = 3;
    const nx = Math.max(2, Math.ceil((2 * (model.box.hx + pad)) / 3)), nz = Math.max(2, Math.ceil((2 * (model.box.hz + pad)) / 3));
    const sh: Ship = { id, model, mesh, pose: { x: 0, y: 0, z: 0, heading: 0, bank: 0, pitch: 0, scale: 1 }, cell, grid: { nx, nz, v0: 0, pad }, side };
    ships.push(sh);
    shipOf.set(id, sh);
    return sh;
  };
  addShip('morningStar', models.morningStar, 0, 'aug');
  addShip('pax', models.pax, 1, 'aug');
  addShip('augA', models.augustan, 2, 'aug');
  addShip('augB', models.augustan, 2, 'aug');
  const victraShip = addShip('victra', models.victra, 3, 'aug');
  const war = addShip('warchild', models.warchild, 4, 'bel', warMat);
  addShip('belA', models.consort, 5, 'bel');
  addShip('belB', models.consort, 5, 'bel');
  addShip('dustmaker', models.dustmaker, 6, 'rim');
  const chary = addShip('charybdis', models.charybdis, 7, 'rim');
  const archi = addShip('archimedes', models.archimedes, 8, 'aug');
  // Victra's bay doors, hinged along each side of the bay
  const doors = [-1, 1].map((s) => {
    const d = new THREE.Mesh(victraDoor(s), mat);
    d.name = 'fleet-victra-door';
    d.frustumCulled = false;
    d.position.set(0, BAY.y, s * BAY.z);
    victraShip.mesh.add(d);
    return { mesh: d, s };
  });

  // --- what glows: engines' fires, blinking lamps, bolts and flashes, and smoke ---
  const fireGeo = (() => {
    // a cone along +x from a bright disc at its mouth, fading to nothing at its tip
    const pos: number[] = [], col: number[] = [], n = 10;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const p0 = [0, Math.cos(a0), Math.sin(a0)], p1 = [0, Math.cos(a1), Math.sin(a1)];
      // the cone's side
      pos.push(...p0, ...p1, 1, 0, 0);
      col.push(1, 1, 1, 1, 1, 1, 0, 0, 0);
      // the disc at the mouth, brighter in its middle
      pos.push(0, 0, 0, ...p1, ...p0);
      col.push(1.6, 1.6, 1.6, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  })();
  const additive = (): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const fireMat = additive();
  const plumeCount = ships.reduce((s, sh) => s + sh.model.plumes.length, 0) + 12;
  const fires = many(k, fireGeo, fireMat, plumeCount, 'fleet-fires');
  fires.renderOrder = 3;
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(boxGeo.getAttribute('position').count * 3).fill(1), 3));
  const fxMat = additive();
  const FX_MAX = 1100;
  const fx = many(k, boxGeo, fxMat, FX_MAX, 'fleet-fx');
  fx.renderOrder = 3;
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthWrite: false });
  const SMOKE_MAX = 320;
  const smoke = many(k, new THREE.IcosahedronGeometry(1, 0), smokeMat, SMOKE_MAX, 'fleet-smoke');
  smoke.renderOrder = 2;

  // --- small craft ---
  const rips = many(k, ripWing(), mat, DOGFIGHTS.length, 'fleet-ripwings');
  const wasps = many(k, wasp(), mat, DOGFIGHTS.length, 'fleet-wasps');
  const LEECHES = 40;
  const leechMesh = many(k, leech(), mat, LEECHES, 'fleet-leeches');
  const lows = lowLoops();
  const DROPS: { loop: number; off: number }[] = [{ loop: 0, off: 0 }, { loop: 0, off: 0.5 }, { loop: 1, off: 0.25 }];
  const drops = many(k, dropship(), mat, DROPS.length, 'fleet-dropships');
  const drones = many(k, drone(), mat, SWARM.n, 'fleet-drones');

  // --- the shadows: one mesh, a grid under each ship laid on the ground each frame, its shape from a sheet of the ships
  // seen from above: white where a ship is, on nothing, so that the sheet's alpha is the shadow's ---
  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = SHEET.w;
  sheetCanvas.height = SHEET.h;
  const sctx = sheetCanvas.getContext('2d')!;
  const cellModel = [models.morningStar, models.pax, models.augustan, models.victra, models.warchild, models.consort, models.dustmaker, models.charybdis, models.archimedes];
  cellModel.forEach((m, i) => drawShade(sctx, i, m, 3));
  const sheet = new THREE.CanvasTexture(sheetCanvas);
  let nv = 0;
  for (const sh of ships) {
    sh.grid.v0 = nv;
    nv += (sh.grid.nx + 1) * (sh.grid.nz + 1);
  }
  const shPos = new Float32Array(nv * 3), shUv = new Float32Array(nv * 2), shIdx: number[] = [];
  for (const sh of ships) {
    const { nx, nz, v0 } = sh.grid, cx = (sh.cell % SHEET.cols) * SHEET.cw, cy = Math.floor(sh.cell / SHEET.cols) * SHEET.ch;
    for (let j = 0; j <= nz; j++) {
      for (let i = 0; i <= nx; i++) {
        const v = v0 + j * (nx + 1) + i;
        // where on the sheet this corner is (the sheet's rows run down, its texture's up)
        shUv[v * 2] = (cx + (i / nx) * SHEET.cw) / SHEET.w;
        shUv[v * 2 + 1] = 1 - (cy + (j / nz) * SHEET.ch) / SHEET.h;
        if (i < nx && j < nz) {
          const a = v, b = v + 1, c = v + nx + 2, d = v + nx + 1;
          // wound so that the shadow faces the sky
          shIdx.push(a, d, b, b, d, c);
        }
      }
    }
  }
  const shGeo = new THREE.BufferGeometry();
  const shPosAttr = new THREE.BufferAttribute(shPos, 3);
  shPosAttr.setUsage(THREE.DynamicDrawUsage);
  shGeo.setAttribute('position', shPosAttr);
  shGeo.setAttribute('uv', new THREE.BufferAttribute(shUv, 2));
  // each corner's alpha: none where its part of a shadow would fall off the board (it is held at the board's edge, and fades)
  const shFade = new Float32Array(nv * 4).fill(1);
  const shFadeAttr = new THREE.BufferAttribute(shFade, 4);
  shFadeAttr.setUsage(THREE.DynamicDrawUsage);
  shGeo.setAttribute('color', shFadeAttr);
  shGeo.setIndex(shIdx);
  // blended in linear light, so it must be darker than it looks: 0.6 here takes about a third off the ground's brightness
  const shMat = new THREE.MeshBasicMaterial({ color: 0x05060a, map: sheet, vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const shadow = new THREE.Mesh(shGeo, shMat);
  // one name for the whole fleet: where two shadows cross they only darken, and the check for surfaces in one plane takes them for one
  shadow.name = 'fleet-shadow';
  shadow.frustumCulled = false;
  shadow.renderOrder = 2;
  shadow.layers.set(1);
  k.group.add(shadow);

  // ---------------------------------------------------------------------------
  // The clock, the stories, and where everything is
  // ---------------------------------------------------------------------------

  let clock = 0, held: number | null = null;
  const now = (): number => held ?? clock;
  /** The stories in the sky: when each began, or null. */
  const play = { leeches: null as number | null, chase: null as number | null, chaseFrom: [0, 0, 0] as V3 };
  const LEECH_LEN = 50, CHASE_LEN = 45;

  const base = (id: string, t: number): Pose => (id === 'archimedes' ? archiPose(t) : stationPose(STATIONS[id], t));

  // --- story 11: the leeches on the Warchild ---
  /** Where on the Warchild each leech latches: on its starboard side, the side the view sees. */
  const latches = warchildLatches(LEECHES);
  /** The moments of story 11, in seconds from its start. */
  const LS = { run: 12, open: [11, 14] as P2, launch: [13, 20] as P2, fly: 3.2, close: [20, 22] as P2, peel: [20, 31] as P2, dark: [24, 33] as P2, turn: [30, 37] as P2, hold: 41, release: [38, 43] as P2, back: [42, 50] as P2 };

  /** Where Victra's destroyer is, which way it heads, and how far its doors are open, at `tau` into story 11. */
  function leechesVictra(tau: number, t: number): { pose: Pose; doors: number } {
    const home = base('victra', t), w = base('warchild', t);
    const h = w.heading, f: V3 = [Math.cos(h), 0, Math.sin(h)], st: V3 = [-Math.sin(h), 0, Math.cos(h)];
    // alongside the Warchild's starboard side, a little below and forward
    const attack: V3 = add(add([w.x, w.y - 7, w.z], mul(st, 19)), mul(f, 2));
    const start = base('victra', (play.leeches ?? t));
    // up over the towers' north and the Citadel, high, and down to it from the south-east
    const go: V3[] = [[start.x, start.y, start.z], [-46, 110, -22], [-62, 117, 30], [-58, 106, 72], add(attack, [7, 8, 5]), attack];
    const back: V3[] = [attack, add(attack, [12, 12, -2]), [-60, 117, 30], [-46, 110, -20], [home.x, home.y, home.z]];
    const doors = smooth(LS.open[0], LS.open[1], tau) * (1 - smooth(LS.close[0], LS.close[1], tau));
    if (tau < LS.run) {
      const tt = timed(go, 0, LS.run), a = along(go, tt, tau), b = along(go, tt, tau - 0.15);
      const p = flying(a.p, a.v, b.v, 0.15, 0.35);
      // at the end of its run it turns to lie alongside
      return { pose: blend(p, { ...p, heading: h, bank: 0, pitch: 0 }, smooth(LS.run - 2.5, LS.run, tau)), doors };
    }
    if (tau < LS.peel[0]) return { pose: { x: attack[0], y: attack[1], z: attack[2], heading: h, bank: 0, pitch: 0, scale: 1 }, doors };
    const tt = timed(back, LS.peel[0], LS.peel[1]), a = along(back, tt, tau), b = along(back, tt, tau - 0.15);
    const p = flying(a.p, a.v, b.v, 0.15, 0.35);
    return { pose: blend(p, home, smooth(LS.peel[1] - 3, LS.peel[1], tau)), doors };
  }

  /**
   * The Warchild's turn towards the Augustan line, and its way back by the same
   * path. Its station lies between the board's west edge, its south edge and the
   * Citadel, so it first eases south, then swings its bow north-east as it comes
   * out east from under the Dustmaker, so that neither its bow nears the Citadel
   * nor its stern leaves the board.
   */
  function leechesWarchild(tau: number, t: number): Pose {
    const p = base('warchild', t);
    const u = smooth(LS.turn[0], LS.turn[1], tau) * (1 - smooth(LS.back[0], LS.back[1], tau));
    if (u <= 0) return p;
    const a = smooth(0, 0.3, u), b = smooth(0.3, 1, u), mid = 74.5, end = { x: -76, z: 77, h: -64 * D2R };
    return {
      ...p,
      x: p.x + (end.x - p.x) * b,
      y: p.y + 3 * u,
      z: p.z + (mid - p.z) * a + (end.z - mid) * b,
      heading: p.heading + turnTo(p.heading, end.h) * b,
      bank: p.bank + 0.07 * Math.sin(Math.PI * b),
    };
  }

  // --- the chase: the Charybdis after the Archimedes ---
  /**
   * Their lines through the fleet, each point with the moment it is passed. The
   * corvette breaks from its loop and darts north-east between the Pax and a
   * destroyer, between the Morning Star's stern and another, west under the
   * Morning Star and over Victra, past the Charybdis's post, which has been
   * firing at it, down into the gap between the Dustmaker and the Warchild,
   * out to the south-east, and dives into the cloud. The Charybdis drops in
   * behind it as it passes, follows it south by lines a destroyer can fly, and
   * goes home over the city.
   */
  function chaseRoutes(t: number): { corvette: [V3[], number[]]; charybdis: [V3[], number[]] } {
    const vic = base('victra', t), w = base('warchild', t), d = base('dustmaker', t), home = base('charybdis', t);
    const gx = (w.x + d.x) / 2 + 1;
    const corvette: [V3[], number[]] = [[
      play.chaseFrom, [80, 110, -50], [82, 111, -82], [50, 112, -84], [20, 114, -62], [vic.x + 6, vic.y + 10, vic.z + 13], [vic.x - 14, vic.y + 7, vic.z + 18], [-60, 108, -26], [-80, 107, 0],
      [gx, (w.y + 6 + d.y - 10.2) / 2, w.z - 36], [gx, (w.y + 5.2 + d.y - 14.4) / 2, d.z + 8], [-66, 101, 80], [-34, 94, 100], [-8, 68, 109],
    ], [4.5, 7, 9.2, 11.2, 13.3, 15.4, 16.6, 17.8, 19.6, 21.4, 23.2, 24.9, 26.7, 28.6]];
    const charybdis: [V3[], number[]] = [[
      [home.x, home.y, home.z], [-66, 110, -28], [-62, 118, 10], [-60, 120, 45], [-50, 108, 84], [-24, 104, 100], [0, 112, 92],
      // and home again, over the city and north of the towers
      [8, 116, 40], [-24, 116, -8], [-56, 112, -14], [-66, 110, -46], [-76, 106, -62], [home.x, home.y, home.z],
    ], [18, 21, 23.2, 25.3, 27.3, 29, 31, 33.4, 36, 37.9, 39.6, 41, 42.4]];
    return { corvette, charybdis };
  }
  const CH = { leave: [3.4, 4.6] as P2, gone: [27.4, 28.6] as P2, fire: [8, 27] as P2, home: [41.9, 44] as P2, back: [33, 42] as P2 };

  function chasePoses(tau: number, t: number): { corvette: Pose; charybdis: Pose } {
    const r = chaseRoutes(t);
    // the corvette: along its line, jinking from side to side
    let corvette: Pose;
    const loop = base('archimedes', t);
    if (tau < CH.gone[1]) {
      const [pts, tt] = r.corvette, a = along(pts, tt, tau), b = along(pts, tt, tau - 0.1);
      const side = unit(cross(a.v, [0, 1, 0])), jink = 2.0 * Math.sin(tau * 5.7) * smooth(6, 8, tau) * (1 - smooth(25, 27, tau));
      const p = add(a.p, mul(side, jink));
      corvette = { ...flying(p, a.v, b.v, 0.1, 0.9, 1.4), scale: 1 - smooth(CH.gone[0], CH.gone[1], tau) };
      corvette = blend(loop, corvette, smooth(CH.leave[0], CH.leave[1], tau));
    } else {
      // gone into the cloud; it climbs back to its own loop out of sight below the fleet, and grows into view again
      const from: Pose = { ...loop, x: 96, y: 64, z: -96, scale: 0 };
      const f = smooth(CH.back[0], CH.back[1], tau);
      corvette = { ...blend(from, loop, f), scale: f };
    }
    // the Charybdis: firing from its post, then after it, then home
    const home = base('charybdis', t), [cp, ct] = r.charybdis;
    let charybdis = home;
    if (tau > ct[0] && tau < CH.home[1]) {
      const a = along(cp, ct, tau), b = along(cp, ct, tau - 0.15);
      charybdis = blend(home, flying(a.p, a.v, b.v, 0.15, 0.4, 2), smooth(ct[0], ct[0] + 2.2, tau) * (1 - smooth(CH.home[0], CH.home[1], tau)));
    }
    return { corvette, charybdis };
  }

  /** Where every ship is at `t`, the stories included. */
  function poseAt(id: string, t: number): Pose {
    let p = base(id, t);
    if (play.leeches !== null) {
      const tau = t - play.leeches;
      if (tau >= 0 && tau <= LEECH_LEN) {
        if (id === 'victra') p = leechesVictra(tau, t).pose;
        if (id === 'warchild') p = leechesWarchild(tau, t);
      }
    }
    if (play.chase !== null) {
      const tau = t - play.chase;
      if (tau >= 0 && tau <= CHASE_LEN) {
        if (id === 'archimedes') p = chasePoses(tau, t).corvette;
        if (id === 'charybdis') p = chasePoses(tau, t).charybdis;
      }
    }
    return p;
  }

  // scratch, so that a frame makes nothing new
  const m4 = new THREE.Matrix4(), dm = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color(), eu = new THREE.Euler(0, 0, 0, 'YZX');

  /** Where a dropship is on its loop at `t`: flying level, banking through its turns. */
  function dropPose(d: { loop: number; off: number }, t: number): Pose {
    const L0 = lows[d.loop], tl = ((((t / L0.T + d.off) % 1) + 1) % 1) * L0.T;
    const a = along(L0.pts, L0.times, tl), b = along(L0.pts, L0.times, tl - 0.2);
    return { ...flying(a.p, a.v, b.v, 0.2, 0.3, 1.6), pitch: 0 };
  }

  /** Where each drone of the depot's swarm is at `t`, if it is out: out of the mouth, up the face of the wall, round and round over the canyon, and home. */
  function droneAt(i: number, t: number): V3 | null {
    const k0 = Math.floor((t - SWARM.first) / SWARM.every);
    if (k0 < 0) return null;
    const a = t - (SWARM.first + k0 * SWARM.every) - i * 0.13;
    if (a < 0 || a > SWARM.up) return null;
    const mouth: V3 = [DEPOT_MOUTH[0] + ((i % 6) - 2.5) * 0.6, DEPOT_MOUTH[1], DEPOT_MOUTH[2] - 1.6];
    const hub: V3 = [DEPOT_MOUTH[0] + 6 * Math.sin(a * 0.15), 58 + 3 * Math.sin(a * 0.3), -89 + 4 * Math.cos(a * 0.12)];
    const rr = 6 + hash(i, 51) * 10, sp = (0.5 + hash(i, 52) * 0.5) * (hash(i, 53) < 0.5 ? 1 : -1), th = a * sp + hash(i, 54) * 6.28;
    const orbit: V3 = [hub[0] + Math.cos(th) * rr, hub[1] + (hash(i, 55) - 0.5) * 10 + Math.sin(a * 1.3 + i) * 1.5, hub[2] + Math.sin(th) * rr * 0.7];
    const rise: V3 = [mouth[0], Math.min(54, mouth[1] + a * 6), mouth[2]];
    const home: V3 = [mouth[0], mouth[1] + 22 * (1 - smooth(SWARM.up - 6, SWARM.up - 0.5, a)), mouth[2]];
    return lerp3(lerp3(rise, orbit, smooth(1.5, 6, a)), home, smooth(SWARM.up - 9, SWARM.up - 4, a));
  }
  const mats = new Map<string, THREE.Matrix4>(ships.map((s) => [s.id, new THREE.Matrix4()]));

  /** The matrix that takes a ship's own coordinates to the tile's, at a pose. */
  function matrixOf(p: Pose, out: THREE.Matrix4): THREE.Matrix4 {
    eu.set(p.bank, -p.heading, p.pitch, 'YZX');
    q4.setFromEuler(eu);
    return out.compose(v1.set(p.x, p.y, p.z), q4, s3.set(p.scale, p.scale, p.scale));
  }
  const toWorld = (m: THREE.Matrix4, l: V3): V3 => {
    v2.set(l[0], l[1], l[2]).applyMatrix4(m);
    return [v2.x, v2.y, v2.z];
  };

  // --- filling the instanced meshes ---
  let nFx = 0, nSmoke = 0;
  const X1 = new THREE.Vector3(1, 0, 0);
  /** A glowing box: at `p`, stretched along `dir` if it has one. */
  function glow(p: V3, dir: V3 | null, l: number, w: number, c: RGB, k2 = 1): void {
    if (nFx >= FX_MAX) return;
    if (dir) q4.setFromUnitVectors(X1, v1.set(dir[0], dir[1], dir[2]).normalize());
    else q4.identity();
    m4.compose(v2.set(p[0], p[1], p[2]), q4, s3.set(dir ? l : w, w, w));
    fx.setMatrixAt(nFx, m4);
    fx.setColorAt(nFx, col.setRGB(c[0] * k2, c[1] * k2, c[2] * k2));
    nFx++;
  }
  function puff(p: V3, r: number, shade: number): void {
    if (nSmoke >= SMOKE_MAX || r <= 0.01) return;
    q4.setFromAxisAngle(v1.set(0.3, 1, 0.2).normalize(), p[0] * 0.7 + p[2] * 0.3);
    m4.compose(v2.set(p[0], p[1], p[2]), q4, s3.set(r, r, r));
    smoke.setMatrixAt(nSmoke, m4);
    smoke.setColorAt(nSmoke, col.setRGB(shade, shade, shade * 1.03));
    nSmoke++;
  }

  /** A flak burst at `p` that began `age` seconds ago: a flash, then a dark puff that swells and thins. */
  function flak(p: V3, age: number, size = 1): void {
    if (age < 0 || age > 2.2) return;
    if (age < 0.18) glow(p, null, 0, (0.8 + age * 10) * size, [3, 1.9, 0.9]);
    const r = size * (0.5 + 2.2 * smooth(0, 0.5, age)) * (1 - smooth(1.4, 2.2, age) * 0.6);
    puff(p, r, 0.16 + 0.12 * smooth(0.2, 2.2, age));
    for (let i = 0; i < 3; i++) {
      const o: V3 = [Math.cos(i * 2.1 + p[0]) * r * 0.6, Math.sin(i * 1.7 + p[1]) * r * 0.45, Math.sin(i * 2.9 + p[2]) * r * 0.6];
      puff(add(p, o), r * 0.6, 0.2 + 0.1 * smooth(0.2, 2.2, age));
    }
  }

  // ---------------------------------------------------------------------------
  // Each frame
  // ---------------------------------------------------------------------------

  const BOLT_SPEED = 170;
  const enemies = (s: Ship): Ship[] => ships.filter((o) => o.id !== 'archimedes' && (s.side === 'aug' ? o.side !== 'aug' : o.side === 'aug'));
  const shooters = ships.filter((s) => s.id !== 'archimedes' && s.model.muzzles.length > 0);
  const poseCache = new Map<string, { t: number; p: Pose }>();
  const poseNow = (id: string, t: number): Pose => {
    const c = poseCache.get(id);
    if (c && c.t === t) return c.p;
    const p = poseAt(id, t);
    poseCache.set(id, { t, p });
    return p;
  };
  const mTmp = new THREE.Matrix4();
  /** A point of a ship's own, where it is at `t`. */
  const pointAt = (id: string, l: V3, t: number): V3 => toWorld(matrixOf(poseNow(id, t), mTmp), l);

  /** Whether the line between two points passes clear of every ship but two. */
  function clearLine(a: V3, b: V3, t: number, skip: string[]): boolean {
    for (const s of ships) {
      if (skip.includes(s.id) || s.id === 'archimedes') continue;
      const p = poseNow(s.id, t), r = Math.max(s.model.box.hx, s.model.box.hz) + 2;
      const d = sub(b, a), l2 = dot(d, d), c: V3 = [p.x, p.y, p.z];
      const u = clamp(dot(sub(c, a), d) / Math.max(l2, 1e-6), 0, 1), q = add(a, mul(d, u));
      // a ship is a long thing: measured to its middle line, not its middle
      const h = p.heading, f: V3 = [Math.cos(h), 0, Math.sin(h)];
      const along2 = clamp(dot(sub(q, c), f), -s.model.box.hx, s.model.box.hx);
      if (len(sub(q, add(c, mul(f, along2)))) < Math.min(r, s.model.box.hz + 5)) return false;
    }
    return true;
  }

  function frame(t: number, night: number, fresh: boolean): void {
    poseCache.clear();
    nFx = 0;
    nSmoke = 0;
    // --- the ships ---
    for (const s of ships) {
      const p = poseNow(s.id, t);
      s.pose = p;
      s.mesh.position.set(p.x, p.y, p.z);
      s.mesh.rotation.set(p.bank, -p.heading, p.pitch, 'YZX');
      s.mesh.scale.setScalar(Math.max(1e-3, p.scale));
      s.mesh.visible = p.scale > 0.02;
      s.mesh.updateMatrix();
      mats.get(s.id)!.copy(s.mesh.matrix);
    }
    // Victra's doors
    let doorOpen = 0;
    if (play.leeches !== null) {
      const tau = t - play.leeches;
      if (tau >= 0 && tau <= LEECH_LEN) doorOpen = leechesVictra(tau, t).doors;
    }
    // each door swings down about its hinge: the port one turning one way about x, the starboard one the other
    for (const d of doors) d.mesh.rotation.set(-d.s * doorOpen * 1.25, 0, 0);

    // --- the Warchild's decks going dark and coming back ---
    dark.lo.value = 1e3;
    dark.hi.value = -1e3;
    let lightsOut = (_y: number): boolean => false;
    if (play.leeches !== null) {
      const tau = t - play.leeches;
      if (tau >= LS.dark[0] && tau <= LS.dark[1]) {
        // from the top deck down, one every 1.2 seconds; then back on from the top, one every 0.9
        const tops = [...WAR_DECKS].reverse();
        const goneTo = Math.min(tops.length - 1, Math.floor((tau - LS.dark[0]) / 1.2));
        const backTo = tau > LS.dark[1] - 3.6 ? Math.floor((tau - (LS.dark[1] - 3.6)) / 0.9) : -1;
        dark.lo.value = tops[goneTo] - 0.01;
        dark.hi.value = backTo < 0 ? 40 : tops[Math.min(tops.length - 1, backTo)] - 0.01;
        if (backTo >= tops.length - 1) dark.hi.value = -1e3;
        lightsOut = (y) => y >= dark.lo.value && y <= dark.hi.value;
      }
    }

    // --- engines' fires ---
    let nf = 0;
    for (const s of ships) {
      if (!s.mesh.visible) continue;
      const m = mats.get(s.id)!;
      for (let i = 0; i < s.model.plumes.length; i++) {
        const pl = s.model.plumes[i];
        const at = toWorld(m, pl.at), tip = toWorld(m, add(pl.at, pl.dir)), dir = unit(sub(tip, at));
        const flick = 0.88 + 0.12 * Math.sin(t * 23 + i * 1.7) * Math.sin(t * 7.3 + i);
        q4.setFromUnitVectors(X1, v1.set(dir[0], dir[1], dir[2]));
        const r = pl.r * s.pose.scale;
        m4.compose(v2.set(at[0], at[1], at[2]), q4, s3.set(pl.len * flick * s.pose.scale, r, r));
        fires.setMatrixAt(nf, m4);
        fires.setColorAt(nf, col.setRGB(pl.color[0], pl.color[1], pl.color[2]));
        nf++;
      }
      // blinking lamps
      for (const b of s.model.blinks) {
        if ((((t / b.period + b.phase) % 1) + 1) % 1 > b.duty) continue;
        if (s === war && lightsOut(b.at[1])) continue;
        glow(toWorld(m, b.at), null, 0, b.size * Math.max(0.3, s.pose.scale), b.color, 0.8 + 0.8 * night);
      }
    }
    // the dropships, and their engine pods' fires
    DROPS.forEach((d, i) => {
      const p = dropPose(d, t);
      matrixOf(p, dm);
      drops.setMatrixAt(i, dm);
      for (const sd of [-1, 1]) {
        if (nf >= plumeCount) break;
        const at = toWorld(dm, [-1.7, 0.15, sd * 2.9]), dir = unit(sub(toWorld(dm, [-2.7, -0.4, sd * 2.9]), at));
        q4.setFromUnitVectors(X1, v1.set(dir[0], dir[1], dir[2]));
        m4.compose(v2.set(at[0], at[1], at[2]), q4, s3.set(2.2, 0.32, 0.32));
        fires.setMatrixAt(nf, m4);
        fires.setColorAt(nf, col.setRGB(FIRE_AUG[0], FIRE_AUG[1], FIRE_AUG[2]));
        nf++;
      }
      if ((t * 0.9 + i * 0.3) % 1 < 0.15) glow(toWorld(dm, [0, 1.0, 0]), null, 0, 0.25, [3, 0.4, 0.3], 1);
    });
    drops.count = DROPS.length;
    drops.instanceMatrix.needsUpdate = true;
    fires.count = nf;
    fires.instanceMatrix.needsUpdate = true;
    if (fires.instanceColor) fires.instanceColor.needsUpdate = true;

    // --- the fighters and their tracers ---
    let nr = 0, nw = 0;
    DOGFIGHTS.forEach((d, i) => {
      for (const who of ['quarry', 'hunter'] as const) {
        const tt = who === 'quarry' ? t : t - d.lag;
        const p = dogAt(d, tt), pn = dogAt(d, tt + 0.1), pp = dogAt(d, tt - 0.1);
        const v = unit(sub(pn, p)), vp = unit(sub(p, pp));
        const pose = flying(p, v, vp, 0.1, 1.1, 1.6);
        matrixOf(pose, m4);
        const isRip = (who === 'quarry') === (d.quarry === 'rip');
        if (isRip) rips.setMatrixAt(nr++, m4);
        else wasps.setMatrixAt(nw++, m4);
        glow(toWorld(m4, [-1.5, 0, 0]), v, 0.6, 0.35, isRip ? FIRE_AUG : FIRE_BEL, 0.9);
        if (who === 'hunter') {
          // bursts of four bolts, every few seconds, at where the quarry is going
          const P = 3.1 + (i % 3) * 0.7, k0 = Math.floor((t - i * 0.37) / P);
          for (let kk = k0 - 1; kk <= k0; kk++) {
            for (let b = 0; b < 4; b++) {
              const tf = kk * P + i * 0.37 + b * 0.11, age = t - tf;
              if (age < 0 || age > 0.42) continue;
              const from = dogAt(d, tf - d.lag), aim = dogAt(d, tf + 0.25);
              const miss: V3 = [(hash(kk, b) - 0.5) * 3, (hash(b, kk) - 0.5) * 2, (hash(kk + b, i) - 0.5) * 3];
              const dir = unit(sub(add(aim, miss), from));
              glow(add(from, mul(dir, age * 55)), dir, 1.8, 0.14, isRip ? BOLT_BEL : BOLT_AUG, 1.2);
            }
          }
        }
      }
    });
    rips.count = nr;
    wasps.count = nw;
    rips.instanceMatrix.needsUpdate = true;
    wasps.instanceMatrix.needsUpdate = true;

    // --- railguns between the lines, at each other's engines ---
    shooters.forEach((s, si) => {
      const P = 3.2 + (si % 4) * 0.9, ph = hash(si, 2) * P, k0 = Math.floor((t - ph) / P);
      for (let n = k0 - 2; n <= k0; n++) {
        const tf = n * P + ph;
        if (t - tf > 2.5 || t < tf) continue;
        const foes = enemies(s);
        const foe = foes[Math.floor(hash(n, si) * foes.length)];
        const muzzle = s.model.muzzles[Math.floor(hash(si, n) * s.model.muzzles.length)];
        const engines = foe.model.plumes;
        if (!muzzle || engines.length === 0) continue;
        const from = pointAt(s.id, muzzle, tf);
        const target = engines[Math.floor(hash(n + 3, si) * engines.length)].at;
        const to0 = pointAt(foe.id, add(target, [-1.5, 0, 0]), tf);
        const fl = len(sub(to0, from)) / BOLT_SPEED;
        const to = pointAt(foe.id, add(target, [-1.5, 0, 0]), tf + fl);
        if (!clearLine(from, to, tf, [s.id, foe.id])) continue;
        const u = (t - tf) / fl, dir = unit(sub(to, from)), color = s.side === 'aug' ? BOLT_AUG : s.side === 'bel' ? BOLT_BEL : BOLT_RIM;
        if (u <= 1) {
          const head = lerp3(from, to, u), back = Math.min(14, u * fl * BOLT_SPEED);
          glow(add(head, mul(dir, -back / 2)), dir, back, 0.32, color, 1);
          glow(head, null, 0, 0.7, color, 1.2);
          if (u < 0.06) glow(from, null, 0, 1.4, color, 1.5);
        } else if (u < 1 + 0.3 / fl) {
          // it strikes the engines' shield in a flash: nothing breaks
          const a = (u - 1) * fl;
          glow(to, null, 0, 3.4 * (1 - a / 0.3), [2.4, 2.2, 2.8], 1);
        }
      }
    });

    // --- missiles, and the flak that meets some of them ---
    for (let n = Math.floor(t / 2.3) - 2; n <= Math.floor(t / 2.3); n++) {
      const tf = n * 2.3 + hash(n, 11) * 0.8, age = t - tf, FL = 3.4;
      if (age < 0 || age > FL + 2.2) continue;
      const s = shooters[Math.floor(hash(n, 12) * shooters.length)], foes = enemies(s), foe = foes[Math.floor(hash(n, 13) * foes.length)];
      const from = pointAt(s.id, s.model.muzzles[Math.floor(hash(n, 14) * s.model.muzzles.length)], tf);
      const to = pointAt(foe.id, foe.model.plumes[0]?.at ?? [0, 0, 0], tf + FL);
      const ctrl = add(lerp3(from, to, 0.5), [(hash(n, 15) - 0.5) * 40, 18 + hash(n, 16) * 16, (hash(n, 17) - 0.5) * 40]);
      const at = (u: number): V3 => add(add(mul(from, (1 - u) * (1 - u)), mul(ctrl, 2 * u * (1 - u))), mul(to, u * u));
      const caught = hash(n, 18) < 0.45 ? 0.55 + hash(n, 19) * 0.2 : 2;
      const uNow = Math.min(age / FL, caught);
      if (age / FL < caught && age < FL) {
        const p = at(uNow), dir = unit(sub(at(Math.min(1, uNow + 0.02)), p));
        glow(p, dir, 1.0, 0.45, [3, 2.2, 1.2], 1);
        for (let j = 1; j <= 9; j++) {
          const uj = uNow - j * 0.025;
          if (uj <= 0) break;
          puff(at(uj), 0.25 + j * 0.08, 0.62 - j * 0.03);
        }
      } else if (caught < 1) {
        flak(at(caught), age - caught * FL, 1.1);
      } else if (age > FL && age < FL + 0.4) {
        glow(to, null, 0, 3 * (1 - (age - FL) / 0.4), [2.6, 2.2, 2.8], 1);
      }
    }
    // flak about the lines: every so often a burst near one of the ships
    for (let n = Math.floor(t / 0.55) - 4; n <= Math.floor(t / 0.55); n++) {
      const tf = n * 0.55, age = t - tf;
      const s = ships[Math.floor(hash(n, 21) * (ships.length - 1))];
      const p = poseNow(s.id, tf), b = s.model.box;
      const o: V3 = [(hash(n, 22) - 0.5) * 2 * (b.hx + 8), (hash(n, 23) - 0.5) * 16, (hash(n, 24) < 0.5 ? -1 : 1) * (b.hz + 5 + hash(n, 25) * 8)];
      const hh = p.heading;
      const w: V3 = [p.x + o[0] * Math.cos(hh) - o[2] * Math.sin(hh), p.y + o[1], p.z + o[0] * Math.sin(hh) + o[2] * Math.cos(hh)];
      flak(w, age, 0.9);
    }

    // --- story 11: the leeches, and the flak through which Victra runs ---
    let nl = 0;
    if (play.leeches !== null) {
      const tau = t - play.leeches;
      if (tau >= 0 && tau <= LEECH_LEN) {
        if (tau < LS.run + 1) {
          const vp = poseNow('victra', t);
          for (let n = Math.floor(t / 0.16) - 12; n <= Math.floor(t / 0.16); n++) {
            const tf = n * 0.16, age = t - tf;
            if (tf - play.leeches < 0 || tf - play.leeches > LS.run) continue;
            // round it, but never on it: at least ten from its middle
            let o: V3 = [(hash(n, 31) - 0.5) * 36, (hash(n, 32) - 0.5) * 18, (hash(n, 33) - 0.5) * 36];
            if (len(o) < 10) o = mul(unit(o), 10);
            flak(add([vp.x, vp.y, vp.z], o), age, 1.0);
          }
        }
        const wm = mats.get('warchild')!, vm = mats.get('victra')!;
        for (let i = 0; i < LEECHES; i++) {
          const t0 = LS.launch[0] + (i / LEECHES) * (LS.launch[1] - LS.launch[0]), age = tau - t0;
          if (age < 0) continue;
          const L = latches[i], at = toWorld(wm, L.at), n = unit(sub(toWorld(wm, add(L.at, L.n)), at));
          const rel = tau - LS.release[0] - (i % 7) * 0.5;
          if (rel > 3) continue;
          let p: V3, dir: V3, up: V3 = n;
          if (age < LS.fly) {
            // out of the bay, down a little, then up to its place on the hull
            const bay = toWorld(vm, [BAY.x0 + 2 + (i % 8) * 2.2, BAY.y - 0.5, ((i % 3) - 1) * 1.6]);
            const u = age / LS.fly, c1 = add(bay, [0, -6, 0]), c2 = add(at, mul(n, 9));
            const B = (uu: number): V3 => {
              const a = 1 - uu;
              return add(add(mul(bay, a * a * a), mul(c1, 3 * a * a * uu)), add(mul(c2, 3 * a * uu * uu), mul(at, uu * uu * uu)));
            };
            p = B(u);
            dir = unit(sub(B(Math.min(1, u + 0.02)), p));
            up = [0, 1, 0];
          } else if (rel < 0) {
            p = add(at, mul(n, 0.05));
            dir = unit(sub(toWorld(wm, add(L.at, [1, 0, 0])), at));
            // a spark as it bites
            const sAge = age - LS.fly;
            if (sAge < 0.45) {
              glow(add(p, mul(n, 0.5)), null, 0, 1.8 * (1 - sAge / 0.45), [3.2, 2.8, 1.8], 1);
              for (let j = 0; j < 4; j++) glow(add(p, mul([Math.cos(j * 1.7 + i), 0.6 + Math.sin(j + i) * 0.3, Math.sin(j * 2.3 + i)], 1 + sAge * 9)), null, 0, 0.18, [3, 2.4, 1.4], 1);
            }
          } else {
            // the boarding done, they let go and leave for the Augustan line, dwindling
            const ms = poseNow('morningStar', t);
            dir = unit(sub([ms.x, ms.y, ms.z], at));
            p = add(add(at, mul(n, rel * 3)), mul(dir, rel * rel * 6));
          }
          const sc = rel > 0 ? Math.max(0, 1 - rel / 3) : 1;
          let right = cross(dir, up);
          if (len(right) < 1e-3) right = cross(dir, [1, 0, 0]);
          right = unit(right);
          const up2 = cross(right, dir);
          dm.makeBasis(v1.set(dir[0] * sc, dir[1] * sc, dir[2] * sc), v2.set(up2[0] * sc, up2[1] * sc, up2[2] * sc), s3.set(right[0] * sc, right[1] * sc, right[2] * sc));
          dm.setPosition(p[0], p[1], p[2]);
          leechMesh.setMatrixAt(nl++, dm);
        }
      }
    }
    leechMesh.count = nl;
    leechMesh.instanceMatrix.needsUpdate = true;

    // --- the chase: the Charybdis's bolts at the corvette ---
    if (play.chase !== null) {
      const tau = t - play.chase;
      if (tau >= CH.fire[0] && tau <= CH.fire[1]) {
        const cm = mats.get('charybdis')!;
        for (let n = Math.floor(t / 0.32) - 2; n <= Math.floor(t / 0.32); n++) {
          const tf = n * 0.32, age = t - tf;
          if (age < 0 || age > 0.5 || tf - play.chase < CH.fire[0]) continue;
          const gun = chary.model.muzzles[((n % chary.model.muzzles.length) + chary.model.muzzles.length) % chary.model.muzzles.length], from = toWorld(cm, gun), cp = poseNow('archimedes', tf + 0.3);
          const miss: V3 = [(hash(n, 41) - 0.5) * 5, (hash(n, 42) - 0.5) * 4, (hash(n, 43) - 0.5) * 5];
          const dir = unit(sub(add([cp.x, cp.y, cp.z], miss), from));
          glow(add(from, mul(dir, age * 70)), dir, 2.4, 0.2, [1.0, 2.4, 3.0], 1.3);
        }
      }
    }

    // --- the drones from the depot ---
    let nd = 0;
    for (let i = 0; i < SWARM.n; i++) {
      const p = droneAt(i, t), pn = droneAt(i, t + 0.1);
      if (!p || !pn) continue;
      let dir = sub(pn, p);
      dir = len(dir) > 1e-4 ? unit(dir) : [1, 0, 0];
      if (Math.abs(dir[1]) > 0.97) dir = unit([1, dir[1], 0]);
      const right = unit(cross(dir, [0, 1, 0])), up2 = cross(right, dir);
      dm.makeBasis(v1.set(dir[0], dir[1], dir[2]), v2.set(up2[0], up2[1], up2[2]), s3.set(right[0], right[1], right[2]));
      dm.setPosition(p[0], p[1], p[2]);
      drones.setMatrixAt(nd++, dm);
      if ((t * 2 + i * 0.37) % 1 < 0.5) glow(add(p, mul(dir, 0.45)), null, 0, 0.16, [3, 0.35, 0.25], 1);
    }
    drones.count = nd;
    drones.instanceMatrix.needsUpdate = true;

    fx.count = nFx;
    fx.instanceMatrix.needsUpdate = true;
    if (fx.instanceColor) fx.instanceColor.needsUpdate = true;
    smoke.count = nSmoke;
    smoke.instanceMatrix.needsUpdate = true;
    if (smoke.instanceColor) smoke.instanceColor.needsUpdate = true;

    // --- by night the fires and flashes bloom ---
    fireMat.color.setScalar(1 + 1.1 * night);
    fxMat.color.setScalar(1 + 0.9 * night);
    smokeMat.color.setScalar(1 - 0.55 * night);
    shMat.opacity = 0.52 * (1 - night) + 0.08;

    // --- the shadows, laid on the ground under each ship (every other frame: the ground is slow to change under them) ---
    if (fresh) {
      for (const s of ships) {
        const { nx, nz, v0, pad } = s.grid, p = s.pose, b = s.model.box;
        const hx = (b.hx + pad) * p.scale, hz = (b.hz + pad) * p.scale, c = Math.cos(p.heading), sn = Math.sin(p.heading);
        const lift = 0.14 + s.cell * 0.004;
        for (let j = 0; j <= nz; j++) {
          for (let i = 0; i <= nx; i++) {
            const lx = -hx + (2 * hx * i) / nx, lz = -hz + (2 * hz * j) / nz;
            const rx = p.x + lx * c - lz * sn, rz = p.z + lx * sn + lz * c;
            const x = clamp(rx, -103.9, 103.9), z = clamp(rz, -112.9, 112.9);
            const n = v0 + j * (nx + 1) + i, v = n * 3;
            shPos[v] = x;
            shPos[v + 1] = (p.scale > 0.05 ? landAt(x, z) + lift : -50);
            shPos[v + 2] = z;
            shFade[n * 4 + 3] = x === rx && z === rz ? 1 : 0;
          }
        }
      }
      shPosAttr.needsUpdate = true;
      shFadeAttr.needsUpdate = true;
    }
  }

  let flip = 0, lastNight = 0;
  k.each((dt, time, night) => {
    clock = time;
    lastNight = night;
    flip ^= 1;
    frame(now(), night, flip === 0 || held !== null || dt === 0);
  });

  // ---------------------------------------------------------------------------
  // What the rest of the tile asks
  // ---------------------------------------------------------------------------

  const fleet: Fleet = {
    where(id) {
      const p = poseAt(id, now());
      return { x: p.x, y: p.y, z: p.z, heading: p.heading };
    },
    tubes(id) {
      const s = shipOf.get(id)!;
      const m = matrixOf(poseAt(id, now()), new THREE.Matrix4());
      return s.model.tubes.map((l) => toWorld(m, l));
    },
    leeches() {
      const t = now();
      if (play.leeches !== null && t - play.leeches < LEECH_LEN) return LEECH_LEN - (t - play.leeches);
      play.leeches = t;
      return LEECH_LEN;
    },
    chase() {
      const t = now();
      if (play.chase !== null && t - play.chase < CHASE_LEN) return CHASE_LEN - (t - play.chase);
      const p = archiPose(t + CH.leave[1]);
      play.chaseFrom = [p.x, p.y, p.z];
      play.chase = t;
      return 32;
    },
    hold(t) {
      held = t;
      frame(now(), lastNight, true);
    },
  };

  if (import.meta.env.DEV) {
    (window as unknown as { rrFleet: object }).rrFleet = {
      hold: fleet.hold, leeches: fleet.leeches, chase: fleet.chase, where: fleet.where,
      /** The fleet's clock now, for `hold`. */
      now: () => now(),
      /** The check again, from the console. */
      check: () => checkFleet(),
      /** Where a ship is at a moment, with a story set going at `from` if asked: for looking into the check. */
      pose: (id: string, t: number, story?: 'leeches' | 'chase', from?: number) => {
        const keep = { l: play.leeches, c: play.chase, f: play.chaseFrom };
        if (story === 'leeches') play.leeches = from ?? null;
        if (story === 'chase') { play.chase = from ?? null; const p0 = archiPose((from ?? 0) + CH.leave[1]); play.chaseFrom = [p0.x, p0.y, p0.z]; }
        const p = poseAt(id, t);
        play.leeches = keep.l; play.chase = keep.c; play.chaseFrom = keep.f;
        return p;
      },
      /** How near two ships' surfaces come at a moment, with a story set going at `from` if asked, and where on each the nearest points are. */
      apart: (a: string, b: string, t: number, story?: 'leeches' | 'chase', from?: number) => {
        const keep = { l: play.leeches, c: play.chase, f: play.chaseFrom };
        if (story === 'leeches') play.leeches = from ?? null;
        if (story === 'chase') { play.chase = from ?? null; const p0 = archiPose((from ?? 0) + CH.leave[1]); play.chaseFrom = [p0.x, p0.y, p0.z]; }
        const A = shipOf.get(a)!, B = shipOf.get(b)!, ma = matrixOf(poseAt(a, t), new THREE.Matrix4()), mb = matrixOf(poseAt(b, t), new THREE.Matrix4());
        let best = { d: Infinity, pa: [0, 0, 0] as V3, pb: [0, 0, 0] as V3 };
        const pbs = B.model.samples.map((l) => toWorld(mb, l));
        for (const l of A.model.samples) {
          const p = toWorld(ma, l);
          for (const q of pbs) {
            const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
            if (d < best.d) best = { d, pa: l, pb: q };
          }
        }
        play.leeches = keep.l; play.chase = keep.c; play.chaseFrom = keep.f;
        return best;
      },
      /** Triangles of each ship. */
      triangles: () => Object.fromEntries(Object.entries(models).map(([id, m]) => [id, m.geo.getAttribute('position').count / 3])),
    };
    // on load, only a quick look at the stations; the whole check, laps, pairs and stories, is `rrFleet.check()`
    try {
      quickCheck();
    } catch (e) {
      console.warn('The Iron Rain: the fleet\'s quick check failed.', e);
    }
  }

  /**
   * A quick look at the stations, for every load: a few points of each ship
   * at two dozen moments of its lap, against the board, the shield and the
   * lots. Well under a tenth of a second; it says only what is wrong.
   */
  function quickCheck(): void {
    const t0 = performance.now(), mm = new THREE.Matrix4(), bad: string[] = [];
    for (const s of ships) {
      const T = s.id === 'archimedes' ? ARCHI.T : STATIONS[s.id].T;
      const pts = s.model.samples.filter((_, i) => i % 6 === 0);
      let board = Infinity, shield = Infinity, lot = Infinity;
      for (let i = 0; i < 24; i++) {
        matrixOf(base(s.id, (i / 24) * T), mm);
        for (const l of pts) {
          const q = toWorld(mm, l);
          board = Math.min(board, 104 - Math.abs(q[0]), 113 - Math.abs(q[2]));
          shield = Math.min(shield, shieldGap(q));
          lot = Math.min(lot, lotGap(q).d);
        }
      }
      if (board < 0.5 || shield < 2 || lot < 10) bad.push(`${s.id}: board ${board.toFixed(1)}, shield ${shield.toFixed(1)}, built ${lot.toFixed(1)}`);
    }
    const ms = Math.round(performance.now() - t0);
    if (bad.length) console.warn(`The Iron Rain: the fleet's stations come too near: ${bad.join('; ')} (${ms} ms). rrFleet.check() flies every path whole.`);
    else console.info(`The Iron Rain: the fleet's stations keep clear of the board's edge, the shield and everything built (${ms} ms). rrFleet.check() flies every path whole, with the stories.`);
  }

  // ---------------------------------------------------------------------------
  // The check: every path flown for its whole lap, and both stories from many starts
  // ---------------------------------------------------------------------------

  function checkFleet(): void {
    const t0 = performance.now();
    const keep = { leeches: play.leeches, chase: play.chase, from: play.chaseFrom };
    const mm = new THREE.Matrix4(), inv = new THREE.Matrix4(), pv = new THREE.Vector3();
    /** How near a ship's surface comes to things, over times. */
    const worst = new Map<string, { board: number; shield: number; lot: number; lotId: string; ground: number; at: number; boardAt: number }>();
    let storyStart = 0;
    const reach = (key: string, s: Ship, t: number): void => {
      const p = poseAt(s.id, t);
      if (p.scale < 0.2) return;
      matrixOf(p, mm);
      let w = worst.get(key);
      if (!w) worst.set(key, (w = { board: Infinity, shield: Infinity, lot: Infinity, lotId: '', ground: Infinity, at: 0, boardAt: 0 }));
      for (const l of s.model.samples) {
        const q = toWorld(mm, l);
        const bd = Math.min(104 - Math.abs(q[0]), 113 - Math.abs(q[2]));
        if (bd < w.board) { w.board = bd; w.boardAt = t - storyStart; }
        w.shield = Math.min(w.shield, shieldGap(q));
        w.ground = Math.min(w.ground, q[1] - landAt(q[0], q[2]));
        // a lot can only be nearer than the nearest so far if the point is not that much higher than its top
        if (q[1] - 100 > w.lot) continue;
        const lg = lotGap(q);
        if (lg.d < w.lot) { w.lot = lg.d; w.lotId = lg.id; w.at = t - storyStart; }
      }
    };
    /** How near two ships come: the points of the one with fewer, looked up in the other's field of distances. */
    const fields = new Map<Model, Field3>();
    const fieldOf = (m: Model): Field3 => {
      let f = fields.get(m);
      if (!f) fields.set(m, (f = field3(m.samples)));
      return f;
    };
    const mo = new THREE.Matrix4();
    const apart = (a: Ship, b: Ship, t: number): number => {
      const pa = poseAt(a.id, t), pb = poseAt(b.id, t);
      if (pa.scale < 0.2 || pb.scale < 0.2) return Infinity;
      if (Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z) > Math.hypot(a.model.box.hx, a.model.box.hz) + Math.hypot(b.model.box.hx, b.model.box.hz) + 14) return Infinity;
      const [s, o, ps, po] = a.model.samples.length <= b.model.samples.length ? [a, b, pa, pb] : [b, a, pb, pa];
      matrixOf(ps, mm);
      inv.copy(matrixOf(po, mo)).invert();
      const f = fieldOf(o.model);
      let d = Infinity;
      for (const l of s.model.samples) {
        pv.set(l[0], l[1], l[2]).applyMatrix4(mm).applyMatrix4(inv);
        d = Math.min(d, f.at([pv.x, pv.y, pv.z]) * po.scale);
      }
      return d;
    };
    play.leeches = null;
    play.chase = null;
    // every path for its whole lap
    for (const s of ships) {
      const T = s.id === 'archimedes' ? ARCHI.T : STATIONS[s.id].T;
      for (let t = 0; t < T; t += 1.5) reach(s.id, s, t);
    }
    // every pair, over an hour of their laps together
    const pairs = new Map<string, { d: number; t: number }>();
    for (let t = 0; t < 3600; t += 3) {
      for (let i = 0; i < ships.length; i++) {
        for (let j = i + 1; j < ships.length; j++) {
          const d = apart(ships[i], ships[j], t), key = `${ships[i].id} and ${ships[j].id}`;
          const w = pairs.get(key);
          if (!w || d < w.d) pairs.set(key, { d, t });
        }
      }
    }
    // the stories, each from a dozen starts
    const story = new Map<string, { d: number; with: string; t: number }>();
    const inStory = (who: Ship, t: number, label: string, skip: string[]): void => {
      reach(`${who.id} ${label}`, who, t);
      for (const o of ships) {
        if (o === who || skip.includes(o.id)) continue;
        const d = apart(who, o, t), key = `${who.id} ${label}`, w = story.get(key);
        if (!w || d < w.d) story.set(key, { d, with: o.id, t: t - storyStart });
      }
    };
    for (let k0 = 0; k0 < 6; k0++) {
      const start = 17 + k0 * 113.3;
      storyStart = start;
      play.leeches = start;
      for (let tau = 0; tau <= LEECH_LEN; tau += 0.25) {
        const t = start + tau;
        // Victra comes alongside the Warchild on purpose; the leeches latch on by design
        inStory(victraShip, t, 'in story 11', tau > LS.run - 3 && tau < LS.peel[0] + 3 ? ['warchild'] : []);
        inStory(war, t, 'in story 11', tau > LS.run - 3 && tau < LS.peel[0] + 3 ? ['victra'] : []);
      }
      play.leeches = null;
      play.chase = start;
      const p = archiPose(start + CH.leave[1]);
      play.chaseFrom = [p.x, p.y, p.z];
      for (let tau = 0; tau <= CHASE_LEN; tau += 0.25) {
        const t = start + tau;
        inStory(archi, t, 'in the chase', []);
        inStory(chary, t, 'in the chase', ['archimedes']);
      }
      play.chase = null;
    }
    // what the view the tile opens with loses behind the ships: each stage, over half an hour
    const look: V3 = [0, 28, 4], R: V3 = [0.7431, 0, -0.6691], U: V3 = [-0.4122, 0.788, -0.4577], D: V3 = [0.527, 0.616, 0.586];
    const scr = (p: V3): V3 => {
      const d = sub(p, look);
      return [dot(d, R), dot(d, U), dot(d, D)];
    };
    const hidden = new Map<string, number>();
    let steps = 0;
    for (let t = 0; t < 1800; t += 4) {
      steps++;
      const outlines = ships.map((s) => {
        const p = poseAt(s.id, t), m = matrixOf(p, new THREE.Matrix4()), b = s.model.box;
        const cs: V3[] = [];
        for (const x of [-b.hx, b.hx]) for (const y of [b.y0, b.y1]) for (const z of [-b.hz, b.hz]) cs.push(scr(toWorld(m, [x * 0.92, y * 0.9, z * 0.9])));
        return cs;
      });
      for (const [id, st] of Object.entries(STAGES)) {
        const c = scr([(st.x0 + st.x1) / 2, st.y + 1.5, (st.z0 + st.z1) / 2]);
        const covered = outlines.some((cs) => {
          if (Math.min(...cs.map((v) => v[2])) < c[2]) return false;
          // inside the outline of the box's corners, as seen
          const hull = convex(cs.map((v): P2 => [v[0], v[1]]));
          return insideConvex(hull, c[0], c[1]);
        });
        if (covered) hidden.set(id, (hidden.get(id) ?? 0) + 1);
      }
    }
    play.leeches = keep.leeches;
    play.chase = keep.chase;
    play.chaseFrom = keep.from;

    const f1 = (v: number): string => (Number.isFinite(v) ? v.toFixed(1) : '-');
    const lines: string[] = [];
    for (const [id, w] of worst) lines.push(`${id}: board ${f1(w.board)}${id.includes(' ') ? ` (${f1(w.boardAt)} s in)` : ''}, shield ${f1(w.shield)}, built ${w.lotId ? f1(w.lot) : 'over 24'}${w.lotId ? ` (${w.lotId}${id.includes(' ') ? `, ${f1(w.at)} s in` : ''})` : ''}, ground ${f1(w.ground)}`);
    const pairLines = [...pairs].filter(([, v]) => Number.isFinite(v.d)).sort((a, b) => a[1].d - b[1].d).slice(0, 6).map(([k2, v]) => `${k2} ${f1(v.d)} (at ${v.t} s)`);
    const storyLines = [...story].map(([k2, v]) => `${k2}: ${f1(v.d)} from the ${v.with} (${f1(v.t)} s in)`);
    const hid = [...hidden].map(([id, n]) => `${id} ${Math.round((n / steps) * 100)}%`);
    const least = Math.min(...[...worst.values()].map((w) => Math.min(w.lot, w.shield, w.ground)));
    const leastPair = Math.min(...[...pairs.values()].map((v) => v.d));
    console.info(
      `The Iron Rain: the fleet, every path flown for its whole lap (${Math.round(performance.now() - t0)} ms). Nearest anything built, the ground or the shield: ${f1(least)}; nearest another ship: ${f1(leastPair)}.\n  ` +
      `${lines.join('\n  ')}\n  nearest pairs: ${pairLines.join('; ')}\n  in the stories: ${storyLines.join('; ')}\n  the stages the opening view loses behind a ship: ${hid.length ? hid.join(', ') : 'none'}`,
    );
  }

  frame(0, 0, true);
  return fleet;
}

// ---------------------------------------------------------------------------
// Small sums for the check
// ---------------------------------------------------------------------------

function convex(ps: P2[]): P2[] {
  const p = ps.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const crossZ = (o: P2, a: P2, b: P2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P2[] = [], hi: P2[] = [];
  for (const q of p) {
    while (lo.length >= 2 && crossZ(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of p.reverse()) {
    while (hi.length >= 2 && crossZ(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop();
    hi.push(q);
  }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
function insideConvex(poly: P2[], x: number, y: number): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false;
  }
  return poly.length >= 3;
}
