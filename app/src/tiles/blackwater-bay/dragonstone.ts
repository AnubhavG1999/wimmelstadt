// Dragonstone's castle, its town, its harbour and the old inn on the stone
// pier, on the island at the mouth of the bay, below the Dragonmont.
//
// From the books, as the research notes give them (ACOK ch. 10, ASOS ch. 54,
// and Fire & Blood): a castle of black stone fused into the shapes of dragons
// and not laid block on block. The Windwyrm is a dragon rearing up to roar at
// the sky, the Sea Dragon Tower a calm dragon watching the sea, and the Stone
// Drum the great round keep, named for the booming of its walls in storms,
// with the Chamber of the Painted Table at its top, a round room with four
// tall windows. The Great Hall is a dragon lying on its belly, its doors in
// its open mouth; the kitchens a curled dragon with smoke and steam from its
// nostrils; dragons' wings shelter the armoury and the smithy, and dragons'
// tails make arches and stairs. Aegon's Garden has tall trees, wild roses,
// cranberries in a damp corner and a smell of pine, and the Dragon's Tail is
// an arch. Gargoyles, beasts, wyverns and hellhounds, crouch along the walls in
// place of merlons. Under the castle is a fishing town with taverns and inns,
// and an old inn on a stone pier with a worn gargoyle outside its door.
//
// The castle on a rock with a long stair and a bridge is the television
// series' alone, and is not drawn. Everything here is this tile's own drawing.
//
// The road runs through the castle: in at the east gate, across the yard and
// north out under the Dragon's Tail. So the yard is the road, and the castle
// is built round it: the three dragon towers and the garden along the west
// range, the hall in the north-east, its tail the arch over the north gate,
// and the kitchens and the south wall over the sea at the front.

import * as THREE from 'three';
import { Smoke } from '../../engine/effects';
import { interior, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { area, flat, walls as wallsRound } from '../../engine/ground';
import { archway, lantern, lathe } from '../../engine/parts';
import { face3, gable, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { DARK, DOOR, HOUSE, ROOF, STONE, TIMBER, TIMBER_DARK, TO_VIEW, banner, brazier, doorway, fire, keeper, nameBoard, nameSign } from './look';
import type { Model } from './models';
import { HERO_SPOTS, LANE, ROADS, TURNS, inside, lotOf, type Lot, type P2 } from './plan';
import { MIDDLES } from './roads';
import { open } from './space';

// ---------------------------------------------------------------------------
// Colours of the island's own
// ---------------------------------------------------------------------------

const BLACK = STONE.black, SHADE = STONE.blackShade;
/**
 * The dragons the castle is made of: black stone too, but a little lighter
 * than the walls, their bones and belly plates lighter again and the skin of
 * their wings a dark wine, so that their shapes read against the walls.
 */
const DRAGON = 0x4a4552, BONE = 0x6e6876, BELLY = 0x7b7381, SKIN = 0x56394a, GARG = 0x3a3640, TOOTH = 0xb0a898;
/** The rock the castle stands on where it reaches into the sea, and the stone of the town, the quay and the pier. */
const ROCK = 0x2d2b30, ROCK_TOP = 0x3c3a40, TOWN_STONE = 0x4d4953, TOWN_DARK = 0x3d3a42, QUAY = 0x4a474e, PIER = 0x5a575e, KERB = 0x3e3b42;
const LAWN = 0x557f45, GRAVEL = 0x9c9286, HEDGE = 0x3f6b3a, ROSE = 0xc8325a, ROSE_PALE = 0xe58aa6, BERRY = 0x8a1c2a;
const NET = 0xa89676, HULL = 0x5a4632, HULL_DARK = 0x3a2c20, SLATE = ROOF.slate;
/** The town's daub, weathered greyer than the shared look's, between its black stone and dark timbers. */
const TOWN_DAUB = 0xa99d87;
const EYE = '#ff9a2a', EMBER = '#ff6a2a', WARM = '#ffcf8a';
/** Glass and doorways lit from within: dark and warm by day, and since the engine lights an interior surface as its own colour, glowing warm by night. */
const LIT_GLASS = 0x553620;
/**
 * The castle's arrow loops: the engine's narrow slits (kind 7), dark by day
 * and lit at night, in rows 2.8 high so that every wall ends on a whole row.
 * On the dragons' bodies, whose faces are not walls, they are set one by one.
 */
const LOOP_WIN: WinSpec = { cell: 2.6, storey: 2.8, lit: 0.4, kind: 7 };
const DRUM_WIN: WinSpec = { cell: 2.1, storey: 2.8, lit: 0.45, kind: 7 };
/** Small lit windows of the town's houses, two storeys to 4.4, and of the inn. */
const TOWN_WIN: WinSpec = { cell: 1.4, storey: 2.2, lit: 0.5, kind: 0 };
const COTTAGE_WIN: WinSpec = { cell: 1.4, storey: 3, lit: 0.5, kind: 0 };
const INN_WIN: WinSpec = { cell: 1.3, storey: 2.8, lit: 0.8, kind: 0 };

// ---------------------------------------------------------------------------
// Where things stand: all from the plan
// ---------------------------------------------------------------------------

const CASTLE = lotOf('ds-castle'), WYRM = lotOf('windwyrm'), SEA = lotOf('sea-dragon');
const ROAD = ROADS.dragonstone;
/** The road's north leg runs along x = NX through the castle, and comes in at the east gate along z = GZ. */
const NX = ROAD[2][0], GZ = ROAD[1][1];
/** The road's edges through the castle: the west range stands west of W_EDGE, the north-east block east of E_EDGE. */
const W_EDGE = NX - LANE, E_EDGE = NX + LANE;
/** How high the rock the castle's south-west corner stands on is, and the pier's paving: a hero stands on it. */
const ROCK_Y = 0.5, PIER_Y = HERO_SPOTS.find((s) => s.id === 'pier')?.y ?? 0.04;
/** How thick the curtain walls are, and how high their walks: lower at the front, so that the yard is seen over them. */
const WALL_T = 1.2, WALK_HIGH = 8.4, WALK_LOW = 5.6;
/** How high the walk over the east gate is, between its taller towers: low enough that the yard's road north is seen over it from the side the tile opens on. */
const GATE_TOP = 9.0;
/** How high the raised bed of Aegon's Garden stands, and where the Stone Drum's stair comes down to it. */
const GARDEN_Y = 0.45;

/**
 * The rock under the castle's south-west corner, where the lot runs out into
 * the sea past the island's shore: from a hair inland of the shore, out to the
 * lot's edges and a little past them, as a rock at its foot.
 */
const ROCK_SHAPE: P2[] = (() => {
  // the island's shore through the castle, from where it leaves the lot's west edge to where it leaves its south edge
  const a: P2 = [CASTLE.x0, 2], c: P2 = [44, 9];
  const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz), nx = dz / l, nz = -dx / l;
  return [[a[0] + nx * 0.4, a[1] + nz * 0.4], [c[0] + nx * 0.4, c[1] + nz * 0.4], [c[0] + 0.5, CASTLE.z1 + 1.3], [CASTLE.x0 - 1.2, CASTLE.z1 + 1.4], [CASTLE.x0 - 1.2, a[1] - 0.5]];
})();

/** The stone pier: out from the harbour into the channel, its root clear of the harbour's ring, wide enough for a hero on its east side. */
const PIER_SHAPE: P2[] = (() => {
  const ring = TURNS.harbour, out = ring.r + 2.6 + 0.25, x0 = 63, x1 = 72.35, z1 = 17.5;
  const north = (x: number): number => Math.max(9.05, ring.c[1] + Math.sqrt(Math.max(0, out * out - (x - ring.c[0]) ** 2)));
  const top: P2[] = [];
  for (let i = 0; i <= 8; i++) {
    const x = x0 + ((x1 - x0) * i) / 8;
    top.push([x, north(x)]);
  }
  return [...top, [x1, z1], [x0, z1]];
})();

// ---------------------------------------------------------------------------
// Small solid shapes
// ---------------------------------------------------------------------------

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const centroid = (ps: V3[]): V3 => mul(ps.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / ps.length);
const UP: V3 = [0, 1, 0];

/** The corners of a ring round `p`, across the directions u and v, `ru` and `rv` out along each. */
function ringAt(p: V3, u: V3, v: V3, ru: number, rv: number, sides: number, phase = 0): V3[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = phase + (i / sides) * Math.PI * 2;
    return add(p, add(mul(u, Math.cos(a) * ru), mul(v, Math.sin(a) * rv)));
  });
}

/** A flat polygon closing a ring, facing away from `away`. */
function capRing(b: GeoBuilder, ring: V3[], away: V3, color: number): void {
  const c = centroid(ring);
  let n = unit(cross(sub(ring[1], ring[0]), sub(ring[2], ring[0])));
  if (dot(n, sub(c, away)) < 0) n = mul(n, -1);
  for (let i = 0; i < ring.length; i++) face3(b, c, ring[i], ring[(i + 1) % ring.length], n, color);
}

/**
 * Rings of corners joined into a skin: every ring has as many corners as the
 * others, in the same order round. Each face looks away from the line through
 * the rings' middles. `ends` closes the first ring and the last.
 */
function loft(b: GeoBuilder, rings: V3[][], color: number, o: { ends?: boolean; endColor?: number } = {}): void {
  const n = rings[0].length, mid = rings.map(centroid);
  for (let i = 0; i + 1 < rings.length; i++) {
    const A = rings[i], B = rings[i + 1], axis = mix(mid[i], mid[i + 1], 0.5);
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n, p0 = A[j], p1 = A[j2], p2 = B[j2], p3 = B[j];
      let nn = unit(cross(sub(p2, p0), sub(p3, p1)));
      if (dot(nn, sub(centroid([p0, p1, p2, p3]), axis)) < 0) nn = mul(nn, -1);
      b.quad(p0, p1, p2, p3, nn, color);
    }
  }
  if (o.ends) {
    capRing(b, rings[0], mid[1], o.endColor ?? color);
    capRing(b, rings[rings.length - 1], mid[rings.length - 2], o.endColor ?? color);
  }
}

/**
 * A tube along a line of points, `sides` round: a body, a neck, a tail, a
 * bone. A radius may be one number, or two: out along `ref` and across it.
 * Its rings turn as little as they can from one to the next. Hands back its
 * rings, so that windows can be set in its faces.
 */
function tube(b: GeoBuilder, pts: V3[], radii: (number | [number, number])[], color: number, o: { sides?: number; ref?: V3; ends?: boolean; phase?: number } = {}): V3[][] {
  const n = pts.length, sides = o.sides ?? 6, rings: V3[][] = [];
  let u: V3 = o.ref ?? UP;
  for (let i = 0; i < n; i++) {
    const t = unit(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
    let uu = sub(u, mul(t, dot(u, t)));
    if (Math.hypot(...uu) < 1e-3) uu = sub([1, 0, 0], mul(t, t[0]));
    uu = unit(uu);
    const r = radii[i], [ru, rv] = typeof r === 'number' ? [r, r] : r;
    rings.push(ringAt(pts[i], uu, cross(t, uu), ru, rv, sides, o.phase ?? Math.PI / sides));
    u = uu;
  }
  loft(b, rings, color, { ends: o.ends ?? true });
  return rings;
}

/** A block that tapers from `a` to `c`: `w` across and `h` deep at each end, its depth along `up` as near as it can be. */
function taper(b: GeoBuilder, a: V3, c: V3, up: V3, w0: number, h0: number, w1: number, h1: number, color: number): void {
  const f = unit(sub(c, a));
  let s = cross(f, up);
  if (Math.hypot(...s) < 1e-4) s = cross(f, [1, 0, 0]);
  s = unit(s);
  const u = unit(cross(s, f));
  const ring = (p: V3, w: number, h: number): V3[] => [add(add(p, mul(s, -w)), mul(u, -h)), add(add(p, mul(s, w)), mul(u, -h)), add(add(p, mul(s, w)), mul(u, h)), add(add(p, mul(s, -w)), mul(u, h))];
  loft(b, [ring(a, w0, h0), ring(c, w1, h1)], color, { ends: true });
}

/** A spike from `base` to `tip`, `r` thick at its foot: a horn, a claw, a tooth, a spine. */
function spike(b: GeoBuilder, base: V3, tip: V3, r: number, color: number, sides = 3): void {
  const t = unit(sub(tip, base));
  let u = sub(UP, mul(t, dot(UP, t)));
  if (Math.hypot(...u) < 1e-3) u = sub([1, 0, 0], mul(t, t[0]));
  u = unit(u);
  const ring = ringAt(base, u, cross(t, u), r, r, sides, Math.PI / sides), axis = mix(base, tip, 0.3);
  for (let j = 0; j < sides; j++) {
    const p = ring[j], q = ring[(j + 1) % sides];
    let n = unit(cross(sub(q, p), sub(tip, p)));
    if (dot(n, sub(centroid([p, q, tip]), axis)) < 0) n = mul(n, -1);
    face3(b, p, q, tip, n, color);
  }
}

/** A flat triangle seen from both sides: the skin of a wing. */
function web(b: GeoBuilder, p: V3, q: V3, r: V3, color: number): void {
  const n = unit(cross(sub(q, p), sub(r, p)));
  face3(b, p, q, r, n, color);
  face3(b, p, q, r, mul(n, -1), color);
}

/** A narrow window set into a face given by its four corners: dark by day, lit by night, a hair proud of the face. */
function slitIn(b: GeoBuilder, face: V3[], w: number, h: number, lit: number, out: V3): void {
  const c = centroid(face);
  let n = unit(cross(sub(face[2], face[0]), sub(face[3], face[1])));
  if (dot(n, sub(c, out)) < 0) n = mul(n, -1);
  let up = sub(UP, mul(n, dot(UP, n)));
  up = Math.hypot(...up) < 1e-3 ? unit(sub(face[3], face[0])) : unit(up);
  const s = cross(up, n), p = add(c, mul(n, 0.05));
  const P = (a: number, v: number): V3 => add(p, add(mul(s, a), mul(up, v)));
  b.quad(P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2), n, LIT_GLASS, { win: interior(lit * 3) });
  // a pointed head over it
  face3(b, P(-w / 2, h / 2), P(w / 2, h / 2), P(0, h / 2 + w * 0.6), n, LIT_GLASS, { win: interior(lit * 3) });
}

/**
 * A dragon's head carved in stone: a skull, a snout, a jaw that may hang
 * open, brows, horns swept back, spines at the cheeks, teeth, and eyes that
 * glow. `f` is the way it looks and `up` the way the top of its skull faces,
 * as near as it can be; `S` is how big it is. Hands back where its nostrils
 * and the inside of its mouth are.
 */
function dragonHead(k: Build, at: V3, f: V3, up: V3, S: number, o: { open?: number; color?: number; glow?: boolean; teeth?: boolean } = {}): { nostrils: V3[]; mouth: V3 } {
  const b = k.b, color = o.color ?? DRAGON, open = o.open ?? 0.05;
  f = unit(f);
  const s = unit(cross(f, up)), u = unit(cross(s, f));
  const P = (a: number, h: number, c: number): V3 => add(add(add(at, mul(f, a * S)), mul(u, h * S)), mul(s, c * S));
  // the lower jaw swings down and back from its hinge
  const jaw = (a: number, h: number): V3 => {
    const ang = open * 0.75, ca = Math.cos(ang), sa = Math.sin(ang);
    return P(-0.1 + (a + 0.1) * ca + h * sa, -0.16 - (a + 0.1) * sa + h * ca, 0);
  };
  taper(b, P(-0.55, 0.04, 0), P(0.22, 0.08, 0), u, 0.36 * S, 0.33 * S, 0.31 * S, 0.29 * S, color);
  taper(b, P(0.12, 0.12, 0), P(1.22, 0.02, 0), u, 0.27 * S, 0.19 * S, 0.12 * S, 0.09 * S, color);
  taper(b, jaw(-0.05, 0), jaw(1.02, -0.04), u, 0.22 * S, 0.08 * S, 0.08 * S, 0.05 * S, color);
  for (const side of [-1, 1]) {
    // brows, horns swept back and up, and spines at the back of the cheeks
    taper(b, P(0.0, 0.3, side * 0.2), P(0.42, 0.24, side * 0.25), u, 0.08 * S, 0.06 * S, 0.04 * S, 0.03 * S, BONE);
    spike(b, P(-0.32, 0.25, side * 0.2), P(-1.3, 0.78, side * 0.52), 0.11 * S, BONE, 4);
    spike(b, P(-0.32, -0.08, side * 0.3), P(-0.85, -0.12, side * 0.62), 0.07 * S, BONE);
    k.glows.push({ ...xyz(P(0.14, 0.2, side * 0.31)), sx: 0.1 * S, sy: 0.07 * S, sz: 0.1 * S, color: EYE });
    if (o.teeth !== false) {
      spike(b, P(1.0, -0.06, side * 0.1), P(1.0, -0.2 - open * 0.15, side * 0.1), 0.035 * S, TOOTH);
      spike(b, jaw(0.85, 0.03), add(jaw(0.85, 0.03), mul(u, 0.14 * S)), 0.03 * S, TOOTH);
    }
  }
  // a crest of spines down the back of the skull
  spike(b, P(-0.45, 0.3, 0), P(-0.9, 0.62, 0), 0.08 * S, BONE);
  const mouth = P(0.55, -0.1 - open * 0.25, 0);
  if (open > 0.2) {
    // the inside of the mouth, which glows
    taper(b, P(0.12, -0.1, 0), P(0.85, -0.12 - open * 0.3, 0), u, 0.16 * S, 0.1 * S, 0.11 * S, 0.06 * S, DARK);
    if (o.glow) k.glows.push({ ...xyz(mouth), sx: 0.18 * S, sy: 0.1 * S, sz: 0.18 * S, color: EMBER });
  }
  return { nostrils: [P(1.2, 0.08, -0.07), P(1.2, 0.08, 0.07)], mouth };
}

const xyz = (p: V3): { x: number; y: number; z: number } => ({ x: p[0], y: p[1], z: p[2] });

/**
 * A wing: the arm from the shoulder by the elbow to the wrist, a claw at the
 * wrist, fingers from the wrist to their tips, and skin between them and back
 * to `root` on the body, its edge scalloped between each two tips as a bat's
 * is, which is what tells a wing from a sail.
 */
function wing(b: GeoBuilder, shoulder: V3, elbow: V3, wrist: V3, tips: V3[], root: V3, r = 0.18, claw?: V3): void {
  tube(b, [shoulder, elbow, wrist], [r, r * 0.8, r * 0.65], BONE, { sides: 4 });
  spike(b, wrist, add(wrist, mul(unit(claw ?? sub(wrist, elbow)), r * 3.5)), r * 0.6, BONE);
  for (const t of tips) tube(b, [wrist, mix(wrist, t, 0.55), t], [r * 0.55, r * 0.4, r * 0.15], BONE, { sides: 3 });
  web(b, shoulder, elbow, wrist, SKIN);
  const edge = [...tips, root];
  for (let i = 0; i + 1 < edge.length; i++) {
    // the skin's edge between two tips is drawn in toward the wrist
    const m = mix(mix(edge[i], edge[i + 1], 0.5), wrist, 0.28);
    web(b, wrist, edge[i], m, SKIN);
    web(b, wrist, m, edge[i + 1], SKIN);
  }
  web(b, wrist, root, shoulder, SKIN);
}

/** A belly of paler plates down the front of a body: a band that stands a little proud of it, from `a` to `c`. */
function belly(b: GeoBuilder, pts: V3[], half: number[], F: V3): void {
  tube(b, pts, half.map((h): [number, number] => [h * 0.42, h]), BELLY, { sides: 6, ref: F });
}

/**
 * A gargoyle crouched on a wall's outer edge and looking out over the drop:
 * a beast, a wyvern with its wings half up, or a hellhound with its ears
 * pricked, by turns. `a` is the way it looks.
 */
function gargoyle(b: GeoBuilder, x: number, y: number, z: number, a: number, kind: number, k = 1): void {
  const ox = Math.cos(a) * k, oz = Math.sin(a) * k, sx = -oz, sz = ox;
  b.obox(x, y + 0.22 * k, z, 0.2 * k, 0.22 * k, 0.17 * k, a, GARG, { top: SHADE });
  b.obox(x + ox * 0.28, y + 0.44 * k, z + oz * 0.28, 0.13 * k, 0.13 * k, 0.12 * k, a, GARG);
  const head: V3 = [x + ox * 0.34, y + 0.56 * k, z + oz * 0.34];
  if (kind % 3 === 0) {
    // a beast: two horns back over its head
    for (const s of [-1, 1]) spike(b, [head[0] + sx * s * 0.07, head[1], head[2] + sz * s * 0.07], [head[0] - ox * 0.18 + sx * s * 0.14, head[1] + 0.26 * k, head[2] - oz * 0.18 + sz * s * 0.14], 0.04 * k, GARG);
  } else if (kind % 3 === 1) {
    // a wyvern: its wings half raised behind it
    for (const s of [-1, 1]) web(b, [x + sx * s * 0.12, y + 0.4 * k, z + sz * s * 0.12], [x - ox * 0.2 + sx * s * 0.4, y + 0.82 * k, z - oz * 0.2 + sz * s * 0.4], [x - ox * 0.25 + sx * s * 0.16, y + 0.32 * k, z - oz * 0.25 + sz * s * 0.16], GARG);
  } else {
    // a hellhound: a long muzzle and pricked ears
    b.obox(x + ox * 0.47, y + 0.4 * k, z + oz * 0.47, 0.09 * k, 0.06 * k, 0.07 * k, a, GARG);
    for (const s of [-1, 1]) spike(b, [head[0] + sx * s * 0.07, head[1] + 0.06 * k, head[2] + sz * s * 0.07], [head[0] - ox * 0.04 + sx * s * 0.09, head[1] + 0.24 * k, head[2] - oz * 0.04 + sz * s * 0.09], 0.035 * k, GARG);
  }
}

// ---------------------------------------------------------------------------
// The road: what is clear of it
// ---------------------------------------------------------------------------

/** The road's middle as roads.ts laid it, rounded at its corners, a point every half unit: filled in once the roads are laid. */
let laid: { k: Build; pts: P2[] } | null = null;
const toSeg = (x: number, z: number, a: P2, c: P2): number => {
  const vx = c[0] - a[0], vz = c[1] - a[1], l = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / l));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
};

/**
 * How far a place is from the middle of Dragonstone's road, by the plan's
 * line and by the line as it was laid; at its two rings, a place is as near
 * as 4 when it is on a ring's paving. Anything of this file's stands where
 * this is 4 or more.
 */
function fromRoad(k: Build, x: number, z: number): number {
  if (!laid || laid.k !== k) laid = { k, pts: (MIDDLES.dragonstone?.pts ?? []).map((p): P2 => [p.x, p.z]) };
  let d = Infinity;
  for (let i = 0; i + 1 < ROAD.length; i++) d = Math.min(d, toSeg(x, z, ROAD[i], ROAD[i + 1]));
  for (let i = 0; i + 1 < laid.pts.length; i++) d = Math.min(d, toSeg(x, z, laid.pts[i], laid.pts[i + 1]));
  for (const t of [TURNS.harbour, TURNS.sowing]) d = Math.min(d, Math.abs(Math.hypot(x - t.c[0], z - t.c[1]) - t.r) + LANE - 2.6);
  return d;
}

/** Warns in the console where something of this file's stands on the road, so that it shows while building. */
function clearOf(k: Build, what: string, pts: P2[], margin = 0): void {
  for (const [x, z] of pts) {
    const d = fromRoad(k, x, z);
    if (d < LANE + margin - 1e-6) console.warn(`Dragonstone: ${what} stands ${(LANE + margin - d).toFixed(2)} into the road at (${x.toFixed(1)}, ${z.toFixed(1)}).`);
  }
}

// ---------------------------------------------------------------------------
// Smoke from the kitchens' nostrils, the forge and the town's chimneys
// ---------------------------------------------------------------------------

interface Plume { at: V3; size: number; shade: number; every: number; due: number; n: number }
const plumes = new WeakMap<Build, Plume[]>();
const DRIFT = new THREE.Vector3(0.7, 0.5, 0.15);

/** A thin plume rising from `at`: one puff every `every` seconds, `shade` 1 for white steam and lower for smoke. */
function plume(k: Build, at: V3, size: number, shade: number, every: number): void {
  let list = plumes.get(k);
  if (!list) {
    const all: Plume[] = [];
    list = all;
    plumes.set(k, all);
    const smoke = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 96);
    k.group.add(smoke.mesh);
    const from = new THREE.Vector3();
    k.each((dt) => {
      for (const p of all) {
        p.due -= dt;
        if (p.due > 0) continue;
        p.due += p.every;
        p.n++;
        smoke.puff(from.set(p.at[0] + 0.08 * Math.sin(p.n * 1.7), p.at[1], p.at[2] + 0.08 * Math.cos(p.n * 2.3)), DRIFT, p.size * (0.85 + 0.2 * Math.sin(p.n * 0.7)), p.shade);
      }
      smoke.update(dt);
    });
  }
  list.push({ at, size, shade, every, due: every * (0.2 + 0.8 * ((list.length * 0.37) % 1)), n: list.length * 3 });
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

/**
 * A stretch of curtain wall from `a` to `c`, `top` high, with loops in both
 * faces, a band of parapet along its walk, and gargoyles in place of merlons
 * along its outer edge, which is on the side `out` (1 to the left of the way
 * from `a` to `c`, as seen from above with north at the top, -1 to the right).
 */
function curtain(k: Build, a: P2, c: P2, top: number, out: 1 | -1, o: { y0?: number; thick?: number; every?: number; first?: number } = {}): void {
  const b = k.b, dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx), t = o.thick ?? WALL_T, y0 = o.y0 ?? 0;
  b.moved((a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, yaw, () => {
    // as a box that is turned and moved, so that its long faces know how long they are and their loops come in a row
    b.box(-len / 2, y0, -t / 2, len / 2, top, t / 2, BLACK, { win: LOOP_WIN, seed: a[0] * 0.13 + a[1] * 0.07, faces: 'NS' });
    b.box(-len / 2, y0, -t / 2, len / 2, top, t / 2, BLACK, { faces: 'EWT', top: SHADE });
    // a low parapet on the inner edge of the walk
    const zi = out > 0 ? t / 2 - 0.22 : -t / 2;
    b.box(-len / 2, top, zi, len / 2, top + 0.42, zi + 0.22, BLACK, { top: SHADE, faces: 'NSTEW' });
  });
  // the outer edge: in the frame above, local z = +1 is the world's (-sin yaw, cos yaw)
  const nx = -Math.sin(yaw) * -out, nz = Math.cos(yaw) * -out, look = Math.atan2(nz, nx);
  const every = o.every ?? 1.55, n = Math.max(1, Math.floor((len - 0.6) / every)), first = o.first ?? 0;
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n;
    gargoyle(b, a[0] + dx * s + nx * (t / 2 - 0.6), top, a[1] + dz * s + nz * (t / 2 - 0.6), look, i + first);
  }
}

// ---------------------------------------------------------------------------
// The Windwyrm: a dragon rearing up to roar at the sky
// ---------------------------------------------------------------------------

/**
 * The tallest of the castle: the tower is the dragon's body, reared up on its
 * hind legs over a coil of its tail, its forelegs raised, its wings half
 * spread, up from its shoulders and their skin falling down its sides over
 * the garden and the corner's walls, and its neck flung back so that its head,
 * at the top, roars straight up at the sky with its jaws wide. It faces the
 * yard, and nearly the view the tile opens with, so that it is seen spread.
 */
const windwyrm: Model = (k, l) => {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2, top = l.top;
  // its frame: it faces a little south of east, so its left is the north-north-east
  const a0 = (20 * Math.PI) / 180, F: V3 = [Math.cos(a0), 0, Math.sin(a0)], L: V3 = [F[2], 0, -F[0]], C: V3 = [cx, 0, cz], K = half / 2;
  const at = (f: number, s: number, y: number): V3 => [C[0] + (F[0] * f + L[0] * s) * K, y, C[2] + (F[2] * f + L[2] * s) * K];
  // the rock it rises from
  b.cyl(cx, cz, 0, 0.9, half * 0.98, half * 0.93, 10, ROCK, { cap: SHADE });
  // its tail, coiled round the rock from behind it to its left, its tip curled up before it
  tube(b, [at(-0.6, -0.9, 1.4), at(-1.45, -0.3, 1.0), at(-1.3, 0.75, 0.95), at(-0.5, 1.5, 0.95), at(0.5, 1.6, 1.0), at(1.15, 1.1, 1.25), at(1.45, 0.55, 1.75)], [0.62, 0.58, 0.5, 0.42, 0.32, 0.2, 0.08], DRAGON);
  // the body: the tower itself, reared up and leaning back a little, as high as its shoulders
  const ys = [0.9, 4.2, 7.5, 10.2, 12.0, 12.9], lean = [0.05, 0.15, 0.1, -0.1, -0.25, -0.35];
  const depth = [1.6, 1.6, 1.5, 1.35, 1.15, 0.9], width = [1.72, 1.7, 1.5, 1.38, 1.2, 1.0];
  const axis = (i: number): V3 => at(lean[i], 0, ys[i]);
  const body = tube(b, ys.map((_, i) => axis(i)), ys.map((_, i) => [depth[i] * K, width[i] * K] as [number, number]), DRAGON, { sides: 8, ref: F, phase: Math.PI / 8 });
  // loops lit in its flanks and its back: faces 0 to 7 run round from its front-left; 7 is its belly
  for (const [ring, face] of [[1, 6], [2, 6], [1, 5], [2, 0], [3, 6], [1, 1], [2, 3], [3, 1]]) {
    const r0 = body[ring], r1 = body[ring + 1], j2 = (face + 1) % 8;
    slitIn(b, [r0[face], r0[j2], r1[j2], r1[face]], 0.3, 0.95, 0.9, axis(ring));
  }
  // its belly, paler, down its front from between its legs to its throat
  belly(b, [1, 2, 3, 4].map((i) => add(axis(i), mul(F, depth[i] * K - 0.22))), [0.78, 0.74, 0.62, 0.46], F);
  // spines down its back
  for (let y = 3.5; y < 12.6; y += 1.5) {
    const i = ys.findIndex((v) => v > y) - 1, t = (y - ys[i]) / (ys[i + 1] - ys[i]);
    const d = (depth[i] + (depth[i + 1] - depth[i]) * t) * K, p = add(mix(axis(i), axis(i + 1), t), mul(F, -d + 0.1));
    spike(b, p, add(p, add(mul(F, -0.6), [0, 0.38, 0])), 0.17, BONE);
  }
  for (const s of [-1, 1]) {
    // a hind leg: the haunch, the shin, and the foot with its claws on the rock
    const hip = at(-0.15, s * 1.0, 4.4), knee = at(0.75, s * 1.28, 2.5), ankle = at(0.95, s * 1.12, 1.0);
    tube(b, [hip, knee], [0.85, 0.55], DRAGON, { sides: 6 });
    tube(b, [knee, ankle], [0.45, 0.3], DRAGON, { sides: 5 });
    for (const c of [-0.2, 0, 0.2]) spike(b, add(ankle, [0, -0.05, 0]), at(1.45, s * 1.12 + c, 0.95), 0.1, BONE);
    // a foreleg raised before its chest, its claws curled up
    const shoulder = add(axis(4), add(mul(L, s * 0.95 * K), mul(F, 0.2 * K))), elbow = at(1.0, s * 1.3, 10.3), wrist = at(1.45, s * 0.85, 11.4);
    tube(b, [mix(shoulder, axis(4), 0.3), elbow, wrist], [0.42, 0.32, 0.23], DRAGON, { sides: 5 });
    for (const c of [-0.2, 0, 0.2]) spike(b, wrist, at(1.68, s * 0.85 + c, 12.2), 0.08, BONE);
    // a wing, half spread down its side: out from the shoulder by the elbow to the wrist at the height of
    // the castle's top, and its fingers fanning down from there over the walls' tops and the garden, so that
    // it is spread wide across the view the tile opens with
    const ws = add(axis(4), add(mul(L, s * 0.8 * K), mul(F, -0.3 * K)));
    const we = at(-0.7, s * 1.9, 13.65), ww = at(-0.3, s * 2.85, 13.78);
    const tips = [at(0.35, s * 3.0, 12.6), at(-0.25, s * 3.05, 10.6), at(-0.9, s * 2.8, 9.2), at(-1.5, s * 2.2, 9.6)];
    wing(b, ws, we, ww, tips, at(-0.85, s * 1.0, 6.5), 0.22, [F[0], -0.25, F[2]]);
  }
  // the neck, out of its shoulders in an S, forward and then flung back, and its head thrown back at the top, roaring
  const neck: V3[] = [axis(5), at(0.15, 0, 14.5), at(0.1, 0, 16.3), at(-0.05, 0, 17.9), at(-0.4, 0, 19.1), at(-0.6, 0, 20.0)];
  tube(b, neck, [0.98, 0.86, 0.76, 0.68, 0.62, 0.58], DRAGON, { sides: 6, ref: F });
  for (let i = 1; i < neck.length; i++) spike(b, add(neck[i], mul(F, -0.5)), add(neck[i], add(mul(F, -1.1), [0, 0.25, 0])), 0.14, BONE);
  const hf = unit(add([0, 0.92, 0], mul(F, -0.38))), S = Math.min(2.1, (top - 20.4) / 1.6);
  dragonHead(k, add(neck[5], mul(hf, 0.35)), hf, mul(F, -1), S, { open: 1, glow: true });
};

// ---------------------------------------------------------------------------
// The Sea Dragon Tower: a calm dragon watching the sea
// ---------------------------------------------------------------------------

/**
 * A dragon sitting up on the rock at the castle's south-west corner, out in
 * the water: its haunches folded, its forelegs straight, its wings folded down
 * its sides with the wrists hooked up over its shoulders, its tail round its
 * feet, and its neck raised, its head turned out over the water to the
 * south-west, its jaws shut.
 */
const seaDragon: Model = (k, l) => {
  const b = k.b, cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2, top = l.top, y0 = ROCK_Y;
  // its frame: it sits facing the south, so its left is the east
  const F: V3 = [0, 0, 1], L: V3 = [1, 0, 0], K = half / 2;
  const at = (f: number, s: number, y: number): V3 => [cx + (F[0] * f + L[0] * s) * K, y, cz + (F[2] * f + L[2] * s) * K];
  const ys = [y0, 3.0, 6.0, 8.6, 9.8], lean = [-0.4, -0.3, -0.05, 0.25, 0.35];
  const depth = [1.5, 1.55, 1.45, 1.25, 1.0], width = [1.75, 1.7, 1.5, 1.3, 1.1];
  const axis = (i: number): V3 => at(lean[i], 0, ys[i]);
  const body = tube(b, ys.map((_, i) => axis(i)), ys.map((_, i) => [depth[i] * K, width[i] * K] as [number, number]), DRAGON, { sides: 8, ref: F, phase: Math.PI / 8 });
  // loops lit in its flanks and its back: faces 0 to 7 run round from its front-left; 7 is its belly
  for (const [ring, face] of [[1, 0], [2, 0], [1, 1], [2, 1], [1, 3], [1, 5], [2, 5], [2, 6]]) {
    const r0 = body[ring], r1 = body[ring + 1], j2 = (face + 1) % 8;
    slitIn(b, [r0[face], r0[j2], r1[j2], r1[face]], 0.3, 0.9, 0.9, axis(ring));
  }
  belly(b, [1, 2, 3, 4].map((i) => add(axis(i), mul(F, depth[i] * K - 0.22))), [0.8, 0.74, 0.6, 0.44], F);
  // spines down its back
  for (let y = 2.2; y < 9.6; y += 1.45) {
    const i = ys.findIndex((v) => v > y) - 1, t = (y - ys[i]) / (ys[i + 1] - ys[i]);
    const d = (depth[i] + (depth[i + 1] - depth[i]) * t) * K, p = add(mix(axis(i), axis(i + 1), t), mul(F, -d + 0.1));
    spike(b, p, add(p, add(mul(F, -0.55), [0, 0.35, 0])), 0.16, BONE);
  }
  for (const s of [-1, 1]) {
    // the haunch folded under it, and its hind foot forward on the rock
    tube(b, [at(-0.4, s * 0.95, 2.6), at(0.45, s * 1.32, 1.5), at(0.85, s * 1.18, y0 + 0.3)], [0.85, 0.6, 0.3], DRAGON, { sides: 6 });
    for (const c of [-0.18, 0.05]) spike(b, at(0.85, s * 1.18, y0 + 0.2), at(1.25, s * (1.18 + c), y0 + 0.12), 0.09, BONE);
    // a straight foreleg, its paw on the rock before it
    const sh = at(0.6, s * 0.82, 8.6), el = at(1.1, s * 0.92, 5.5), wr = at(1.38, s * 0.85, 1.6), paw = at(1.48, s * 0.85, y0 + 0.25);
    tube(b, [sh, el, wr, paw], [0.42, 0.34, 0.27, 0.27], DRAGON, { sides: 5 });
    for (const c of [-0.2, 0, 0.2]) spike(b, paw, at(1.8, s * 0.85 + c, y0 + 0.08), 0.08, BONE);
    // a wing folded down its side, the wrist hooked up over the shoulder
    wing(b, at(-0.15, s * 1.05, 8.9), at(-0.55, s * 1.25, 10.2), at(-0.9, s * 1.2, 11.3), [at(-1.45, s * 1.32, 5.8), at(-1.55, s * 1.35, 2.8), at(-1.05, s * 1.5, y0 + 0.6)], at(-0.4, s * 1.25, 4.2), 0.17);
  }
  // its tail, round its feet on the rock
  tube(b, [at(-1.25, 0, 1.0), at(-1.3, 1.0, 0.8), at(-0.4, 1.6, 0.75), at(0.6, 1.5, 0.75), at(1.35, 1.35, 1.0)], [0.55, 0.47, 0.38, 0.26, 0.1], DRAGON);
  // its neck, raised in a long easy S, and its head turned out to sea over the water, level and calm
  const look = unit([-0.62, 0, 0.78]);
  const neck: V3[] = [axis(4), at(0.6, 0, 11.6), at(0.6, -0.02, 13.3), at(0.3, -0.05, 14.8), at(-0.05, -0.08, 16.0)];
  tube(b, neck, [0.95, 0.84, 0.74, 0.66, 0.6], DRAGON, { sides: 6, ref: F });
  for (let i = 1; i < neck.length; i++) spike(b, add(neck[i], [0, 0, -0.55]), add(neck[i], [0.1, 0.25, -1.05]), 0.13, BONE);
  const S = Math.min(1.6, (top - 16.4) / 0.85);
  dragonHead(k, add(neck[4], mul(look, 0.3)), add(look, [0, -0.1, 0]), UP, S, { open: 0.03, teeth: false });
};

// ---------------------------------------------------------------------------
// The Stone Drum and the Chamber of the Painted Table
// ---------------------------------------------------------------------------

/**
 * Where the Stone Drum stands: the middle of its lot, and half the lot's
 * width, which nothing of the drum reaches past at any height. On its own lot,
 * if that is clear of the road. But the plan's lot lies across the road
 * through the castle, so until it is moved the drum stands on the ground this
 * file asks the plan to give it instead: the west range from the castle's
 * west edge to the road's, 5 square, as far south as the swing of what drives
 * round the road's bend at the yard's south-west corner allows, so that it
 * does not stand before the Windwyrm in the view the tile opens with, and the
 * garden lies between the two.
 */
function drumPlace(k: Build, l: Lot): { x: number; z: number; r: number } {
  const x = (l.x0 + l.x1) / 2, z = (l.z0 + l.z1) / 2, r = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2;
  if (fromRoad(k, x, z) >= LANE + r + 0.1) return { x, z, r };
  const rr = (W_EDGE - CASTLE.x0) / 2;
  return { x: CASTLE.x0 + rr, z: SEA.z0 - rr - 1.5, r: rr };
}

/** A tall window with a round head on a face of a tower that looks out along `a`, `d` out from its middle. */
function tallWindow(b: GeoBuilder, cx: number, cz: number, d: number, a: number, y0: number, w: number, h: number, lit: number): void {
  const nx = Math.cos(a), nz = Math.sin(a), sx = -nz, sz = nx, n: V3 = [nx, 0, nz];
  const P = (s: number, y: number, o: number): V3 => [cx + nx * (d + o) + sx * s, y, cz + nz * (d + o) + sz * s];
  // its stone frame, and the dark glass within
  b.quad(P(-w / 2 - 0.12, y0 - 0.12, 0.03), P(w / 2 + 0.12, y0 - 0.12, 0.03), P(w / 2 + 0.12, y0 + h, 0.03), P(-w / 2 - 0.12, y0 + h, 0.03), n, BONE);
  for (let i = 0; i < 5; i++) {
    const a0 = (Math.PI * i) / 5, a1 = (Math.PI * (i + 1)) / 5, r = w / 2 + 0.12;
    face3(b, P(0, y0 + h, 0.03), P(Math.cos(a0) * r, y0 + h + Math.sin(a0) * r, 0.03), P(Math.cos(a1) * r, y0 + h + Math.sin(a1) * r, 0.03), n, BONE);
  }
  b.quad(P(-w / 2, y0, 0.06), P(w / 2, y0, 0.06), P(w / 2, y0 + h, 0.06), P(-w / 2, y0 + h, 0.06), n, LIT_GLASS, { win: interior(lit * 3) });
  for (let i = 0; i < 5; i++) {
    const a0 = (Math.PI * i) / 5, a1 = (Math.PI * (i + 1)) / 5, r = w / 2;
    face3(b, P(0, y0 + h, 0.06), P(Math.cos(a0) * r, y0 + h + Math.sin(a0) * r, 0.06), P(Math.cos(a1) * r, y0 + h + Math.sin(a1) * r, 0.06), n, LIT_GLASS, { win: interior(lit * 3) });
  }
}

const stoneDrum: Model = (k, l) => {
  const b = k.b, { x, z, r } = drumPlace(k, l), top = l.top, ph = -Math.PI / 12, rs = r * 0.9;
  clearOf(k, 'the Stone Drum', [[x + r * 0.93, z], [x, z + r * 0.93], [x, z - r * 0.93]]);
  // a battered foot, the drum itself with its loops, and three hoops of stone round it, as round a drum
  b.cyl(x, z, 0, 2.8, r * 0.93, rs, 12, BLACK, { cap: false, phase: ph });
  b.cyl(x, z, 2.8, 16.8, rs, rs, 12, BLACK, { win: DRUM_WIN, seed: 1.7, cap: false, phase: ph });
  for (const y of [2.75, 8.32, 13.92]) b.cyl(x, z, y, y + 0.2, r * 0.94, r * 0.94, 12, SHADE, { cap: SHADE, phase: ph });
  const ap = rs * Math.cos(Math.PI / 12);
  // the corbelled top, and on it the Chamber of the Painted Table: a round room with four tall windows, to the north, east, south and west
  b.cyl(x, z, 16.8, 17.4, rs, r * 0.97, 12, SHADE, { cap: false, phase: ph });
  const rc = r * 0.95, roof = top - 1.6, apo = rc * Math.cos(Math.PI / 12);
  b.cyl(x, z, 17.4, roof, rc, rc, 12, BLACK, { cap: SHADE, phase: ph });
  for (let i = 0; i < 4; i++) tallWindow(b, x, z, apo, (i * Math.PI) / 2, 17.75, 0.62, 1.75, 1.7);
  // warm light behind them, seen at night
  for (let i = 0; i < 4; i++) k.glows.push({ x: x + Math.cos((i * Math.PI) / 2) * (apo - 0.25), y: 18.7, z: z + Math.sin((i * Math.PI) / 2) * (apo - 0.25), sx: 0.3, sy: 1.2, sz: 0.3, color: '#ffb35c' });
  // the parapet round its roof, and gargoyles crouched on it looking out
  const po = r * 0.99, pi = r * 0.86;
  for (let i = 0; i < 12; i++) {
    const a0 = ph + (i / 12) * Math.PI * 2, a1 = ph + ((i + 1) / 12) * Math.PI * 2, am = (a0 + a1) / 2;
    const P = (rr: number, a: number, y: number): V3 => [x + Math.cos(a) * rr, y, z + Math.sin(a) * rr];
    b.quad(P(po, a0, roof), P(po, a1, roof), P(po, a1, roof + 0.62), P(po, a0, roof + 0.62), [Math.cos(am), 0, Math.sin(am)], BLACK);
    b.quad(P(pi, a1, roof), P(pi, a0, roof), P(pi, a0, roof + 0.62), P(pi, a1, roof + 0.62), [-Math.cos(am), 0, -Math.sin(am)], BLACK);
    b.quad(P(pi, a0, roof + 0.62), P(pi, a1, roof + 0.62), P(po, a1, roof + 0.62), P(po, a0, roof + 0.62), UP, SHADE);
    b.quad(P(rc, a0, roof), P(rc, a1, roof), P(po, a1, roof), P(po, a0, roof), [0, -1, 0], SHADE);
    // beasts and wyverns by turns, small, so that they sit on the parapet within the drum's width
    if (i % 2 === 0) gargoyle(b, x + Math.cos(am) * (po - 0.27), roof + 0.62, z + Math.sin(am) * (po - 0.27), am, (i / 2) % 2, 0.6);
  }
  // its banner flies east, so its staff stands on the west of the roof, and the flag stays over the drum
  banner(b, x - r * 0.55, z - r * 0.2, roof, 'targaryen', 3.2, 0.75);
  brazier(k, x + r * 0.3, z + r * 0.3, roof);
  k.person(x + r * 0.25, z - r * 0.45, roof);
  // its door, high in its north face over the garden, and the stair down to the garden: steps on the back of a
  // dragon's tail, whose ridge runs down beside them as their rail and curls up at their foot
  const dx = x, dz = z - ap, dy = 2.95;
  doorway(b, dx, dy, dz, 0, -1, 0.95, 1.75, 4, LIT_GLASS);
  const steps = 6, run = 0.42, rise = (dy - GARDEN_Y) / steps;
  for (let i = 0; i < steps; i++) {
    const y1 = dy - i * rise, z1 = dz - i * run;
    b.box(dx - 0.5, 0, z1 - run - 0.02, dx + 0.5, y1, z1 + 0.02, DRAGON, { top: BONE, faces: 'NESWT' });
  }
  const sx = dx + 0.68;
  tube(b, [[sx, dy + 0.45, dz + 0.15], [sx, dy - 0.25, dz - 0.9], [sx + 0.05, 1.5, dz - 2.0], [sx + 0.25, 0.95, dz - 2.7], [sx + 0.75, 0.85, dz - 2.95], [sx + 0.95, 1.05, dz - 2.55]], [0.32, 0.3, 0.27, 0.22, 0.16, 0.08], DRAGON);
  for (let i = 0; i < 4; i++) {
    const p: V3 = [sx, dy + 0.35 - i * 0.62, dz - 0.1 - i * 0.6];
    spike(b, p, add(p, [0.05, 0.38, 0.12]), 0.08, BONE);
  }
};

// ---------------------------------------------------------------------------
// The castle: its rock, walls and gates, the Great Hall, the kitchens, the garden
// ---------------------------------------------------------------------------

/** The rock under the castle's south-west corner: a level top, and its sides down into the sea, with boulders at its foot. */
function rock(k: Build): void {
  const b = k.b;
  flat(b, ROCK_SHAPE, ROCK_Y, ROCK_TOP);
  wallsRound(b, ROCK_SHAPE, -1.6, ROCK_Y, ROCK);
  const pts: [number, number, number][] = [[31.0, 3.4, 0.7], [30.9, 6.2, 0.55], [31.4, 9.0, 0.6], [34.2, 9.55, 0.5], [37.5, 9.5, 0.65], [40.6, 9.55, 0.5], [43.6, 9.45, 0.55]];
  pts.forEach(([x, z, r], i) => b.cyl(x, z, -1.2, 0.15 + (i % 3) * 0.12, r, r * 0.55, 5, ROCK, { cap: ROCK_TOP, phase: i * 0.7 }));
}

/**
 * The east gate, where the road comes in from the town: a round arch 9 wide
 * through a gatehouse between two square towers, a dragon's head carved over
 * the keystone looking down the road, torches either side, and gargoyles
 * along its top.
 */
function eastGate(k: Build): void {
  // the gatehouse is set back between its towers, so that the head and the gargoyles over its arch stay on the castle's ground
  const b = k.b, x1 = CASTLE.x1, x0 = x1 - 1.5, xf = x1 - 0.6, zn = GZ - 4.5, zs = GZ + 4.5, top = GATE_TOP, tower = 10.6;
  clearOf(k, 'the east gate', [[x0, zn], [x0, zs]], 0.45);
  // the towers either side, their cornices flush with the lot's edge on the east; loops in their sides, and their banners low on their fronts
  for (const [z0, z1] of [[zn - 1.8, zn], [zs, CASTLE.z1]]) {
    b.box(x0, 0, z0, x1, tower - 0.8, z1, BLACK, { win: LOOP_WIN, seed: z0, faces: 'NESW' });
    b.box(x0 - 0.12, tower - 0.8, z0 - 0.12, x1, tower, Math.min(z1 + 0.12, CASTLE.z1), BLACK, { top: SHADE, faces: 'NESWTB' });
    gargoyle(b, x1 - 0.62, tower, (z0 + z1) / 2, 0, z0 > 0 ? 1 : 2);
    hungBanner(b, x1, 7.85, (z0 + z1) / 2, 1, 0, 1.0, 2.6);
  }
  // the arch: the wall over it and its vault, built along x and turned to stand along z
  const spring = 3.7, w = zs - zn;
  b.moved(0, 0, 0, Math.PI / 2, () => archway(b, (zn + zs) / 2, -xf, -x0, w, spring, top, BLACK, SHADE, 10));
  // the portcullis, drawn up into the gatehouse, its iron teeth showing under the vault
  const px = (x0 + xf) / 2, py = spring + Math.sqrt(Math.max(0, (w / 2) ** 2 - 1.7 ** 2)) - 0.12;
  b.box(px - 0.06, py - 0.14, GZ - 1.7, px + 0.06, py, GZ + 1.7, IRON_LIGHT, { faces: 'NESWTB' });
  for (let i = 0; i < 7; i++) spike(b, [px, py - 0.12, GZ - 1.5 + i * 0.5], [px, py - 0.65, GZ - 1.5 + i * 0.5], 0.06, IRON_LIGHT, 4);
  // its walk: a parapet on the inner edge, gargoyles along the outer
  b.box(x0, top, zn, x0 + 0.22, top + 0.36, zs, BLACK, { top: SHADE, faces: 'NESWT' });
  b.box(x0, top - 0.02, zn, xf, top, zs, SHADE, { faces: 'T' });
  for (let i = 0; i < 5; i++) gargoyle(b, xf - 0.5, top, zn + (w * (i + 0.5)) / 5, 0, i);
  // a dragon's head over the keystone, looking down at whoever comes in from the town
  dragonHead(k, [xf - 0.15, spring + w / 2 + 0.6, (zn + zs) / 2], [0.5, -0.87, 0], [0.87, 0.5, 0], 1.0, { open: 0.15 });
  for (const z of [zn - 0.9, zs + 0.75]) {
    b.box(x1, 3.6, z - 0.12, x1 + 0.38, 3.95, z + 0.12, IRON_LIGHT);
    fire(k, x1 + 0.3, 4.25, z, 0.26, 8);
  }
  k.lights.push({ x: x1 + 2, z: GZ, r: 11, color: WARM, k: 0.55 });
}
const IRON_LIGHT = 0x8a8d92;

/**
 * A banner hung down a wall that faces (nx, nz), from a pole along its top:
 * the Targaryens' black with its red band down the middle, in the colours
 * `banner` flies them in, cut in a swallowtail at its foot. For where a flag
 * on a staff, which flies east, would fly out over another's ground.
 */
function hungBanner(b: GeoBuilder, x: number, y: number, z: number, nx: number, nz: number, w: number, h: number): void {
  const [field, band] = HOUSE.targaryen, sx = -nz, sz = nx, n: V3 = [nx, 0, nz];
  const P = (s: number, v: number, o: number): V3 => [x + nx * o + sx * s, y + v, z + nz * o + sz * s];
  b.quad(P(-w / 2, 0.35 - h, 0.05), P(w / 2, 0.35 - h, 0.05), P(w / 2, 0, 0.05), P(-w / 2, 0, 0.05), n, field);
  b.quad(P(-w * 0.16, 0.35 - h, 0.07), P(w * 0.16, 0.35 - h, 0.07), P(w * 0.16, 0, 0.07), P(-w * 0.16, 0, 0.07), n, band);
  face3(b, P(-w / 2, 0.35 - h, 0.05), P(0, 0.35 - h, 0.05), P(-w / 2, -h, 0.05), n, field);
  face3(b, P(w / 2, 0.35 - h, 0.05), P(w / 2, -h, 0.05), P(0, 0.35 - h, 0.05), n, field);
  b.beam(P(-w / 2 - 0.12, 0.06, 0.12), P(w / 2 + 0.12, 0.06, 0.12), 0.05, 0.05, IRON_LIGHT);
}

/**
 * The Great Hall, a dragon lying on its belly in the north-east of the castle:
 * its flank is the castle's east wall, its head lies between its forelegs at
 * the yard's corner, and its open mouth is the hall's door, lit within. Its
 * west wing is held half open over the armoury and the smithy, which shelter
 * under it, and its tail rises off its back and arches over the north gate to
 * lie along the wall beyond: the Dragon's Tail.
 */
function greatHall(k: Build): void {
  const b = k.b, x1 = CASTLE.x1 - 0.12, x0 = E_EDGE + 1.4, hx = (x0 + x1) / 2, half = (x1 - x0) / 2;
  const zr = CASTLE.z0 + 1.2, zc = GZ - LANE - 2.45, zm = GZ - LANE - 0.45;
  // the body, a long ridged back: rings of eight, with upright sides where its windows are
  const ring = (z: number, rx: number, ry: number, ya: number): V3[] => Array.from({ length: 8 }, (_, i) => {
    const t = ((22.5 + 45 * i) * Math.PI) / 180;
    return [hx + Math.sin(t) * rx, ya + Math.cos(t) * ry, z];
  });
  const sx = half / 0.924;
  const rings = [ring(zr, sx * 0.78, 4.0, 2.3), ring(zr + 1.6, sx * 0.97, 4.5, 2.8), ring((zr + zc) / 2 + 0.3, sx, 4.8, 3.0), ring(zc - 0.4, sx * 0.9, 4.4, 2.8), ring(zc + 0.2, sx * 0.66, 3.6, 2.6)];
  loft(b, rings, DRAGON, { ends: true });
  // tall windows in its sides, lit within
  for (let i = 0; i < 3; i++) for (const face of [1, 5]) slitIn(b, [rings[i][face], rings[i][face + 1], rings[i + 1][face + 1], rings[i + 1][face]], 0.42, 2.0, 1.1, [hx, 3, (rings[i][0][2] + rings[i + 1][0][2]) / 2]);
  // spines along its back, tallest over its shoulders
  for (let z = zr + 0.4; z < zc - 0.3; z += 0.72) {
    const t = (z - zr) / (zc - zr), h = 0.45 + 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.15)), y = 2.6 + 4.6 * 0.924 + 0.25 * Math.sin(Math.PI * t);
    spike(b, [hx, y - 0.2, z], [hx, y + h, z - 0.25], 0.22, BONE);
  }
  // the east wing, folded flat along the flank that is the castle's wall
  const ex = x1 - 0.01;
  wing(b, [ex, 5.4, zc - 0.6], [ex, 6.7, zc - 2.6], [ex, 6.4, zr + 1.2], [[ex, 1.4, zr + 0.4], [ex, 1.2, zr + 2.4], [ex, 1.5, zc - 1.6]], [ex, 3.0, zc - 0.4], 0.18);
  // the west wing, held half open as a roof over the armoury and the smithy; its arm close in along the body, so that
  // the road out of the north gate is seen over it from the side the tile opens on
  const wx = E_EDGE + 0.62;
  wing(b, [x0 + 0.1, 5.5, zc - 0.5], [x0 + 0.15, 6.4, zc - 2.5], [x0 - 0.2, 6.0, zr + 1.2], [[wx, 3.3, zr + 0.2], [wx, 3.25, zr + 2.4], [wx, 3.3, zc - 1.6]], [x0 + 0.05, 4.4, zc - 0.2], 0.18);
  clearOf(k, "the Great Hall's west wing", [[wx, zr + 0.2], [wx, zc - 1.6], [x0, zm]], 0.05);
  // under it: racks of spears and shields at the north end, and the smithy's forge at the south
  const lx = (wx + x0) / 2;
  for (let i = 0; i < 5; i++) {
    const z = zr + 0.9 + i * 0.32;
    b.beam([lx - 0.2, 0, z], [lx - 0.05, 2.6, z], 0.035, 0.03, 0x9a8a72);
    b.cyl(lx - 0.18, z, 2.55, 2.85, 0.06, 0, 4, 0xc9ced3, { cap: false });
  }
  for (let i = 0; i < 3; i++) b.cyl(x0 - 0.1, zr + 3.0 + i * 0.75, 1.0, 1.7, 0.32, 0.32, 8, i === 1 ? 0xb3141c : 0x5d5146, { cap: 0x8a8d92 });
  const fz = zc - 1.1;
  b.box(lx - 0.35, 0, fz - 0.45, lx + 0.3, 0.9, fz + 0.45, 0x3a3532, { top: 0x2a1a14 });
  k.glows.push({ x: lx - 0.02, y: 0.98, z: fz, sx: 0.5, sy: 0.12, sz: 0.7, color: EMBER });
  b.box(lx - 0.15, 0, fz - 1.35, lx + 0.15, 0.62, fz - 0.95, IRON_LIGHT, { top: 0x9aa0a6 });
  k.lights.push({ x: lx, z: fz, r: 6, color: '#ff8a4a', k: 0.55 });
  plume(k, [lx, 3.9, fz + 0.2], 0.35, 0.55, 0.45);
  k.person(lx + 0.05, fz - 1.9);
  keeper(b, lx + 0.05, zr + 2.6, 0, 180);
  // the forelegs: the left before its chest by the yard's corner, the right in the gate's tower
  const fl = x0 - 0.35;
  tube(b, [[x0 + 0.2, 3.6, zc - 0.5], [fl, 1.8, zc + 0.2], [fl, 0.35, zm - 0.75]], [0.45, 0.36, 0.3], DRAGON, { sides: 5 });
  for (const c of [-0.18, 0.05, 0.25]) spike(b, [fl, 0.3, zm - 0.75], [fl + c, 0.1, zm - 0.3], 0.09, BONE);
  // the head, between its forelegs: its lower jaw a step on the ground, its upper jaw over the door, the door within
  const gx0 = x0 + 0.05, gx1 = Math.min(x1, CASTLE.x1 - 1.5) - 0.15, cx = (gx0 + gx1) / 2, hw = (gx1 - gx0) / 2, back = zc - 0.4;
  b.box(gx0, 0, back, gx1, 0.42, zm - 0.05, DRAGON, { top: BONE, faces: 'NESWT' });
  b.box(gx0, 0.42, back, gx0 + 0.25, 2.45, zm - 1.0, DRAGON, { faces: 'NESW' });
  b.box(gx1 - 0.25, 0.42, back, gx1, 2.45, zm - 1.0, DRAGON, { faces: 'NESW' });
  b.quad([cx - hw + 0.25, 0.42, back + 0.25], [cx + hw - 0.25, 0.42, back + 0.25], [cx + hw - 0.25, 2.45, back + 0.25], [cx - hw + 0.25, 2.45, back + 0.25], [0, 0, 1], LIT_GLASS, { win: interior(5) });
  taper(b, [cx, 2.95, back - 0.1], [cx, 2.85, zm], UP, hw, 0.52, hw * 0.86, 0.4, DRAGON);
  taper(b, [cx, 3.85, back - 0.3], [cx, 3.7, zm - 1.2], UP, hw * 1.02, 0.55, hw * 0.88, 0.42, DRAGON);
  for (const s of [-1, 1]) {
    // brows, eyes, horns laid back along its neck, fangs at the corners of its mouth, and teeth on its lower jaw
    taper(b, [cx + s * hw * 0.7, 4.0, zm - 1.6], [cx + s * hw * 0.95, 4.15, zm - 1.05], UP, 0.16, 0.1, 0.08, 0.06, BONE);
    k.glows.push({ x: cx + s * (hw + 0.02), y: 3.75, z: zm - 1.25, sx: 0.12, sy: 0.12, sz: 0.2, color: EYE });
    spike(b, [cx + s * hw * 0.55, 4.25, back], [cx + s * hw * 0.8, 5.3, back - 2.0], 0.16, BONE, 4);
    spike(b, [cx + s * (hw - 0.22), 2.45, zm - 0.18], [cx + s * (hw - 0.24), 1.65, zm - 0.2], 0.1, TOOTH);
    spike(b, [cx + s * (hw - 0.22), 0.42, zm - 0.2], [cx + s * (hw - 0.24), 1.0, zm - 0.22], 0.09, TOOTH);
  }
  tube(b, [[cx, 3.6, back - 0.2], [hx, 4.6, zc - 0.8]], [0.9, 1.05], DRAGON, { sides: 6 });
  // the warm light of the hall within, out over the yard's corner
  k.glows.push({ x: cx, y: 1.3, z: back + 0.5, sx: 1.0, sy: 0.9, sz: 0.3, color: '#ffb064' });
  k.lights.push({ x: cx, z: zm + 1.0, r: 7, color: WARM, k: 0.6 });
  plume(k, [cx - 0.25, 3.3, zm - 0.05], 0.25, 0.92, 1.3);
  clearOf(k, "the Great Hall's head", [[gx0, zm], [gx1, zm], [fl - 0.3, zm - 0.75]]);
  // the Dragon's Tail: up off its back, over the north gate, and down along the wall walk west of it, its tip a spade
  const tz = CASTLE.z0 + 0.88, north = WALK_HIGH + 0.45;
  const tail: V3[] = [[hx, 4.4, zr + 0.3], [hx - 0.9, 5.4, zr - 0.15], [E_EDGE + 0.55, 7.5, tz + 0.1], [E_EDGE - 1.6, 9.2, tz], [NX, 9.75, tz], [W_EDGE + 1.6, 9.25, tz], [W_EDGE - 0.15, north + 0.18, tz - 0.05], [W_EDGE - 1.6, north + 0.08, tz - 0.1], [W_EDGE - 2.9, north + 0.12, tz - 0.05]];
  tube(b, tail, [0.84, 0.8, 0.74, 0.66, 0.6, 0.54, 0.47, 0.4, 0.16], DRAGON, { sides: 6 });
  for (let i = 1; i < tail.length - 1; i++) spike(b, add(tail[i], [0, 0.45, 0]), add(tail[i], [0.2, 1.1 - i * 0.06, 0]), 0.17, BONE);
  const tip = tail[tail.length - 1];
  web(b, tip, [tip[0] - 0.55, tip[1] + 0.1, tip[2] - 0.32], [tip[0] - 1.05, tip[1] + 0.05, tip[2]], BONE);
  web(b, tip, [tip[0] - 1.05, tip[1] + 0.05, tip[2]], [tip[0] - 0.55, tip[1] + 0.1, tip[2] + 0.32], BONE);
  // the hall's own corner of the north wall, under where its tail leaves it, clear of what swings round the bend outside
  b.box(x0 + 0.5, 0, CASTLE.z0 + 0.62, x1, 3.4, zr + 0.2, BLACK, { top: SHADE, faces: 'NEWT' });
  gargoyle(b, (x0 + x1) / 2 + 1, 3.4, CASTLE.z0 + 0.8, -Math.PI / 2, 2);
}

/** The kitchens: a curled dragon set in the south wall over the sea, its body coiled round a round kitchen, its head on its coils, smoke and steam from its nostrils. */
function kitchens(k: Build): { east: number } {
  // in the corner between the Sea Dragon and the road's bend, out of the reach of what swings round it
  const b = k.b, R = 1.25, x = SEA.x1 + 0.9, z = CASTLE.z1 - R, y0 = ROCK_Y;
  clearOf(k, 'the kitchens', [[x + R, z], [x + R * 0.7, z - R * 0.7], [x, z - R]]);
  b.cyl(x, z, y0, y0 + 2.6, 0.8, 0.76, 10, BLACK, { cap: false, win: { cell: 1.2, storey: 1.3, lit: 0.7, kind: 7 } });
  lathe(b, x, z, [[0.82, y0 + 2.6], [0.62, y0 + 3.05], [0.32, y0 + 3.3], [0.05, y0 + 3.38]], 10, SHADE);
  // the dragon's coil round it, rising as it goes, from its tail's tip to its neck
  const coil: V3[] = [], radii: number[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, a = Math.PI * 0.35 + t * Math.PI * 2 * 1.25;
    coil.push([x + Math.cos(a) * (R - 0.3), y0 + 0.28 + t * 1.9, z + Math.sin(a) * (R - 0.3)]);
    radii.push(0.1 + 0.25 * Math.min(1, t * 1.6));
  }
  tube(b, coil, radii, DRAGON, { sides: 6 });
  // its neck up over the kitchen's dome, and its head laid on top, looking out over the wall to the harbour, its nostrils smoking
  const end = coil[coil.length - 1], top: V3 = [x - 0.1, y0 + 3.5, z - 0.25];
  tube(b, [end, [x + (end[0] - x) * 0.55, y0 + 3.0, z + (end[2] - z) * 0.55], top], [0.36, 0.33, 0.3], DRAGON, { sides: 6 });
  const look = unit([0.55, -0.12, 0.83]);
  const { nostrils } = dragonHead(k, add(top, mul(look, 0.2)), look, UP, 1.05, { open: 0.0, teeth: false });
  plume(k, add(nostrils[0], [0, 0.05, 0]), 0.55, 0.97, 0.32);
  plume(k, add(nostrils[1], [0, 0.05, 0]), 0.5, 0.6, 0.4);
  // a cook at the door, and the kitchen's light
  doorway(b, x + 0.75, y0, z - 0.29, 0.93, -0.36, 0.55, 1.2, 4, LIT_GLASS);
  k.person(x + R + 0.55, z - 0.6);
  k.lights.push({ x: x + 1.2, z: z - 1.0, r: 5, color: WARM, k: 0.45 });
  return { east: x + R };
}

/** A rose bush: a low green mound with flowers on it. */
function roseBush(b: GeoBuilder, x: number, z: number, y: number, s = 1, pale = false): void {
  b.cyl(x, z, y, y + 0.42 * s, 0.4 * s, 0.22 * s, 6, HEDGE, { cap: HEDGE });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + x, r = 0.26 * s;
    b.box(x + Math.cos(a) * r - 0.07, y + 0.26 * s + (i % 2) * 0.1, z + Math.sin(a) * r - 0.07, x + Math.cos(a) * r + 0.07, y + 0.4 * s + (i % 2) * 0.1, z + Math.sin(a) * r + 0.07, pale && i % 2 ? ROSE_PALE : ROSE);
  }
}

/**
 * Aegon's Garden, in the west range between the Windwyrm and the Stone Drum,
 * whose stair comes down into it: a bed of lawn behind a hedge on the yard's
 * side, with a gap in the hedge for the path; tall pines; wild roses along the
 * walls; cranberries in its damp corner, in the shadow of the Windwyrm by the
 * west wall; a bench; and someone walking in it.
 */
function garden(k: Build, drum: { x: number; z: number; r: number }): void {
  const b = k.b, x0 = CASTLE.x0 + WALL_T + 0.05, x1 = W_EDGE - 0.25, z0 = WYRM.z1 + 0.15, z1 = drum.z - drum.r - 0.15, y = GARDEN_Y;
  b.box(x0, 0, z0, x1, y, z1, KERB, { top: LAWN, faces: 'NESWT' });
  // a path in from the yard to the foot of the drum's stair
  const pz = z0 + 1.2, foot = drum.z - drum.r * 0.87 - 2.6;
  area(k, [[x1 - 0.02, pz - 0.38], [x1 - 0.02, pz + 0.38], [drum.x + 0.6, foot + 0.4], [drum.x - 0.5, foot + 0.35], [drum.x - 0.5, foot - 0.3]], GRAVEL, y + 0.02);
  // the hedge along the yard, with a gap for the path
  b.box(x1 - 0.3, y, z0 + 0.05, x1, y + 0.7, pz - 0.5, HEDGE, { faces: 'NESWT' });
  b.box(x1 - 0.3, y, pz + 0.5, x1, y + 0.7, z1 - 0.05, HEDGE, { faces: 'NESWT' });
  // tall pines by the hedge, and roses along the walls and at the stair's foot
  k.tree(x1 - 0.85, z0 + 0.75, 1.0, true, y);
  k.tree(x1 - 0.7, z1 - 0.9, 0.95, true, y);
  for (const [px, pz2, s, pale] of [[x0 + 0.42, z0 + 1.6, 1, false], [x0 + 0.4, z1 - 0.5, 0.9, true], [drum.x + 1.35, z1 - 0.55, 0.8, true], [x1 - 1.9, z0 + 0.45, 0.85, false], [drum.x - 1.05, foot + 0.1, 0.75, false]] as [number, number, number, boolean][]) {
    roseBush(b, px, pz2, y, s, pale);
  }
  // cranberries in the damp corner under the wall
  for (let i = 0; i < 7; i++) {
    const cx = x0 + 0.3 + (i % 4) * 0.28, cz = z0 + 0.3 + Math.floor(i / 4) * 0.3;
    b.box(cx - 0.12, y, cz - 0.12, cx + 0.12, y + 0.14, cz + 0.12, i % 3 === 0 ? 0x355a30 : BERRY);
  }
  // a stone bench under the wall, and someone in the garden
  b.box(x0 + 0.1, y, z1 - 1.9, x0 + 0.5, y + 0.45, z1 - 1.0, BONE, { top: GRAVEL, faces: 'NESWT' });
  k.person(x1 - 1.6, pz + 0.3, y);
  k.lights.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, r: 6, color: WARM, k: 0.35 });
}

const castle: Model = (k, l) => {
  const b = k.b;
  rock(k);
  const drum = drumPlace(k, lotOf('stone-drum'));
  // the west range's walls: by the Windwyrm, high; along the garden and from the drum to the Sea Dragon, lower,
  // so that the garden has light and its pines are seen; and the north wall west of the Dragon's Tail
  const wx = l.x0 + WALL_T / 2, meet = Math.sqrt(Math.max(0, (drum.r * 0.93) ** 2 - (drum.x - l.x0 - WALL_T) ** 2)) - 0.3;
  curtain(k, [wx, WYRM.z0 + 0.1], [wx, WYRM.z1], WALK_HIGH, -1, { first: 1 });
  curtain(k, [wx, WYRM.z1], [wx, drum.z - meet], WALK_LOW, -1, { first: 2 });
  curtain(k, [l.x0, l.z0 + WALL_T / 2 + 0.02], [W_EDGE - 0.3, l.z0 + WALL_T / 2 + 0.02], WALK_HIGH, 1, { first: 2 });
  curtain(k, [wx, drum.z + meet], [wx, SEA.z0 + 0.8], WALK_LOW, -1, { first: 0 });
  // the north-west corner: a turret over the meeting of the walls
  b.cyl(l.x0 + 0.97, l.z0 + 0.97, 0, WALK_HIGH + 1.4, 0.95, 0.95, 8, BLACK, { win: LOOP_WIN, seed: 7, cap: SHADE });
  gargoyle(b, l.x0 + 0.62, WALK_HIGH + 1.4, l.z0 + 0.62, (-3 * Math.PI) / 4, 0);
  eastGate(k);
  const kit = kitchens(k);
  // the south wall, over the sea at the front, from the kitchens to the gate, with the Targaryens' banners hung on it
  curtain(k, [kit.east - 0.2, l.z1 - 0.5], [l.x1 - 1.5, l.z1 - 0.5], WALK_LOW, -1, { thick: 1.0, first: 1 });
  for (const x of [43.2, 46.4]) hungBanner(b, x, WALK_LOW - 0.3, l.z1, 0, 1, 0.95, 2.5);
  greatHall(k);
  garden(k, drum);
  // the yard: braziers and folk at its edges, guards on the walks, and light
  brazier(k, l.x1 - 2.4, l.z1 - 0.5, WALK_LOW);
  brazier(k, 40.6, l.z1 - 0.5, WALK_LOW);
  brazier(k, l.x0 + 0.6, WYRM.z0 + 1.6, WALK_HIGH);
  for (const [x, z, y] of [[43.8, l.z1 - 0.5, WALK_LOW], [46.9, l.z1 - 0.45, WALK_LOW], [l.x0 + 0.62, (WYRM.z0 + WYRM.z1) / 2 + 0.6, WALK_HIGH], [l.x1 - 0.85, GZ + 1.2, GATE_TOP], [l.x0 + 0.6, drum.z + drum.r + 0.9, WALK_LOW], [l.x0 + 0.6, (WYRM.z1 + drum.z - drum.r) / 2, WALK_LOW]] as [number, number, number][]) {
    k.person(x, z, y);
  }
  k.person(E_EDGE + 1.9, GZ - LANE - 0.3);
  k.person(E_EDGE + 0.8, GZ - LANE - 0.25);
  // torches either side of the Dragon's Tail, on the hall's corner and the north wall's end, and its light
  for (const [x, z, nx, y] of [[E_EDGE + 1.9, l.z0 + 1.5, -1, 2.9], [W_EDGE - 0.3, l.z0 + 0.6, 1, 5.6]] as [number, number, number, number][]) {
    b.box(Math.min(x, x + nx * 0.3), y - 0.4, z - 0.08, Math.max(x, x + nx * 0.3), y - 0.25, z + 0.08, IRON_LIGHT, { faces: 'NESWTB' });
    fire(k, x + nx * 0.25, y, z, 0.24, 7);
  }
  k.lights.push({ x: NX, z: l.z0 + 1.5, r: 8, color: WARM, k: 0.45 });
  k.lights.push({ x: NX + 2, z: GZ - 1, r: 11, color: WARM, k: 0.5 }, { x: NX, z: (l.z0 + GZ) / 2 - 2, r: 9, color: WARM, k: 0.45 });
};

// ---------------------------------------------------------------------------
// The town
// ---------------------------------------------------------------------------

interface HouseOpts {
  /** How high its walls stand, and its ridge. A house with walls over 3 has a storey of daub and timber over one of stone. */
  eaves: number; ridge: number;
  /** Which way its ridge runs. */
  along: 'x' | 'z';
  /** Which side its door is in. */
  door: 'N' | 'E' | 'S' | 'W';
  stone?: number; seed?: number; chimney?: boolean; lit?: number;
}

/**
 * A house of the town: a storey of black stone, and over it, on the taller
 * ones, a storey of daub between dark timbers that juts a little over the
 * street; a steep slate roof with its eaves seen from below, a door, and a
 * chimney.
 */
function house(k: Build, x0: number, z0: number, x1: number, z1: number, o: HouseOpts): V3 | null {
  const b = k.b, stone = o.stone ?? TOWN_STONE, seed = o.seed ?? x0, two = o.eaves > 3.1;
  const win = two ? TOWN_WIN : COTTAGE_WIN, low = two ? 2.2 : o.eaves;
  b.box(x0, 0, z0, x1, low, z1, stone, { win: { ...win, lit: o.lit ?? win.lit }, faces: 'NESW', seed });
  // the upper storey, jutting out over the door's side
  let [ux0, uz0, ux1, uz1] = [x0, z0, x1, z1];
  if (two) {
    const j = 0.2;
    if (o.door === 'S') uz1 += j; else if (o.door === 'N') uz0 -= j; else if (o.door === 'E') ux1 += j; else ux0 -= j;
    b.box(ux0, low, uz0, ux1, o.eaves, uz1, TOWN_DAUB, { win: { ...win, lit: o.lit ?? win.lit }, faces: 'NESWB', seed: seed + 3 });
    // timbers: the posts at its corners and the beam under its eaves, on its door's side
    const posts: P2[] = o.door === 'S' || o.door === 'N' ? [[ux0, o.door === 'S' ? uz1 : uz0], [(ux0 + ux1) / 2, o.door === 'S' ? uz1 : uz0], [ux1, o.door === 'S' ? uz1 : uz0]] : [[o.door === 'E' ? ux1 : ux0, uz0], [o.door === 'E' ? ux1 : ux0, (uz0 + uz1) / 2], [o.door === 'E' ? ux1 : ux0, uz1]];
    for (const [px, pz] of posts) b.box(px - 0.08, low, pz - 0.08, px + 0.08, o.eaves, pz + 0.08, TIMBER_DARK, { faces: 'NESW' });
  }
  const over = 0.32, wall = two ? TOWN_DAUB : stone;
  gable(b, ux0, uz0, ux1, uz1, o.eaves, o.ridge - o.eaves, SLATE, wall, o.along, over);
  // the eaves' undersides, along the two sides the roof slopes down to
  if (o.along === 'x') {
    for (const [a, c] of [[uz0 - over, uz0], [uz1, uz1 + over]]) b.quad([ux0 - over, o.eaves - 0.02, a], [ux1 + over, o.eaves - 0.02, a], [ux1 + over, o.eaves - 0.02, c], [ux0 - over, o.eaves - 0.02, c], [0, -1, 0], TIMBER_DARK);
  } else {
    for (const [a, c] of [[ux0 - over, ux0], [ux1, ux1 + over]]) b.quad([a, o.eaves - 0.02, uz0 - over], [c, o.eaves - 0.02, uz0 - over], [c, o.eaves - 0.02, uz1 + over], [a, o.eaves - 0.02, uz1 + over], [0, -1, 0], TIMBER_DARK);
  }
  // the door, lit within at night on most
  const dx = (x0 + x1) / 2, dz = (z0 + z1) / 2, lit = seed % 3 < 2 ? 1.2 : 0;
  if (o.door === 'S') doorway(b, dx, 0, z1, 0, 1, 0.8, 1.6, lit, DOOR);
  else if (o.door === 'N') doorway(b, dx, 0, z0, 0, -1, 0.8, 1.6, lit, DOOR);
  else if (o.door === 'E') doorway(b, x1, 0, dz, 1, 0, 0.8, 1.6, lit, DOOR);
  else doorway(b, x0, 0, dz, -1, 0, 0.8, 1.6, lit, DOOR);
  if (!o.chimney) return null;
  // a chimney of stone at one end of the ridge, no higher than the lot
  const top = Math.min(o.ridge + 0.55, 6);
  const [cx, cz] = o.along === 'x' ? [x1 - 0.55, (z0 + z1) / 2] : [(x0 + x1) / 2, z0 + 0.55];
  b.box(cx - 0.28, o.eaves, cz - 0.28, cx + 0.28, top, cz + 0.28, TOWN_DARK, { top: 0x2a2729 });
  return [cx, top + 0.1, cz];
}

/** A sign that hangs from a bracket out over the street, read from both ways along it: two boards back to back. */
function hangingSign(k: Build, id: string, x: number, y: number, z: number, along: 'x' | 'z', h = 0.6): void {
  const b = k.b, [nx, nz] = along === 'x' ? [1, 0] : [0, 1];
  const w = k.sign(id, x + nx * 0.035, y, z + nz * 0.035, nx, nz, h, 1.4);
  k.sign(id, x - nx * 0.035, y, z - nz * 0.035, -nx, -nz, h, 1.4);
  b.box(x - (along === 'x' ? 0.025 : w / 2 + 0.05), y - h / 2 - 0.05, z - (along === 'x' ? w / 2 + 0.05 : 0.025), x + (along === 'x' ? 0.025 : w / 2 + 0.05), y + h / 2 + 0.05, z + (along === 'x' ? w / 2 + 0.05 : 0.025), TIMBER_DARK, { faces: 'NESWTB' });
}

/** Nets hung to dry between two poles. */
function netRack(b: GeoBuilder, a: P2, c: P2, h = 2.0): void {
  for (const [x, z] of [a, c]) b.cyl(x, z, 0, h, 0.07, 0.06, 4, TIMBER, { cap: false });
  const m: P2 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  web(b, [a[0], h - 0.1, a[1]], [c[0], h - 0.1, c[1]], [m[0], h * 0.38, m[1]], NET);
  web(b, [a[0], h - 0.1, a[1]], [m[0], h * 0.38, m[1]], [a[0], h * 0.55, a[1]], NET);
  web(b, [c[0], h - 0.1, c[1]], [c[0], h * 0.55, c[1]], [m[0], h * 0.38, m[1]], NET);
}

/** A barrel standing on `y`. */
function barrel(b: GeoBuilder, x: number, z: number, y = 0, r = 0.3): void {
  b.cyl(x, z, y, y + r * 2.4, r, r, 7, 0x7a5638, { cap: 0x5b4634 });
}

/**
 * A small open boat: a hull with a pointed bow, its inside dark, a thwart, and
 * on some a short mast. It floats on the water, or lies drawn up on a beach if
 * `y` is the ground's. Its bow points along `yaw`.
 */
function boat(b: GeoBuilder, x: number, z: number, yaw: number, len: number, wid: number, y = -0.9, mast = 0, color = HULL): void {
  b.moved(x, 0, z, yaw, () => {
    const h = len / 2, w = wid / 2, keel = y - 0.12, rail = y + 0.42;
    const plan: P2[] = [[h, 0], [h * 0.45, w], [-h * 0.7, w * 0.95], [-h, w * 0.6], [-h, -w * 0.6], [-h * 0.7, -w * 0.95], [h * 0.45, -w]];
    plan.forEach((p, i) => {
      const q = plan[(i + 1) % plan.length], len2 = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      let nx = (q[1] - p[1]) / len2, nz = -(q[0] - p[0]) / len2;
      if (nx * (p[0] + q[0]) + nz * (p[1] + q[1]) < 0) { nx = -nx; nz = -nz; }
      b.quad([p[0] * 0.82, keel, p[1] * 0.72], [q[0] * 0.82, keel, q[1] * 0.72], [q[0], rail, q[1]], [p[0], rail, p[1]], [nx, -0.35, nz], color);
    });
    // its inside, a little below the rail, and a thwart across it
    flat(b, plan.map(([px, pz]): P2 => [px * 0.92, pz * 0.86]), rail - 0.08, HULL_DARK);
    b.box(-0.12, rail - 0.2, -w * 0.88, 0.12, rail - 0.05, w * 0.88, TIMBER);
    if (mast > 0) b.cyl(h * 0.2, 0, rail - 0.2, rail + mast, 0.07, 0.05, 4, TIMBER_DARK, { cap: false });
  });
}

/**
 * The town's north row, between the castle's gate and the camp of the
 * Sowing: a tavern at its west end with its sign, and houses close together
 * along the street, with nets, barrels, a cart and folk before them.
 */
const townNorth: Model = (k, l) => {
  const b = k.b, z1 = l.z1;
  // the tavern, set back behind a yard where the board for the castle's name stands
  const tx1 = l.x0 + 3.9;
  const tch = house(k, l.x0 + 0.3, l.z0, tx1, l.z0 + 2.7, { eaves: 4.4, ridge: 5.9, along: 'x', door: 'S', seed: 2, chimney: true, lit: 0.65 });
  if (tch) plume(k, tch, 0.4, 0.62, 0.7);
  hangingSign(k, 'dragonstone-ale', tx1 - 0.9, 2.65, l.z0 + 2.7 + 0.75, 'x', 0.55);
  b.beam([tx1 - 0.9, 3.1, l.z0 + 2.95], [tx1 - 0.9, 3.1, l.z0 + 3.55], 0.05, 0.05, TIMBER_DARK);
  barrel(b, l.x0 + 0.7, l.z0 + 3.2);
  barrel(b, l.x0 + 1.35, l.z0 + 3.05);
  b.box(l.x0 + 1.5, 0.75, l.z0 + 3.7, l.x0 + 3.0, 0.9, l.z0 + 4.4, TIMBER, { faces: 'NESWTB' });
  for (const x of [l.x0 + 1.6, l.x0 + 2.9]) b.box(x - 0.06, 0, l.z0 + 3.95, x + 0.06, 0.75, l.z0 + 4.15, TIMBER_DARK, { faces: 'NESW' });
  k.person(l.x0 + 1.2, l.z0 + 4.1);
  // the houses along the street
  const rows: [number, number, number, HouseOpts][] = [
    [l.x0 + 4.5, l.x0 + 7.3, 0.4, { eaves: 4.4, ridge: 6.0, along: 'z', door: 'S', seed: 7 }],
    [l.x0 + 7.5, l.x0 + 10.7, 0.3, { eaves: 3.0, ridge: 5.6, along: 'x', door: 'S', seed: 11, chimney: true }],
    [l.x0 + 10.9, l.x0 + 13.6, 0.6, { eaves: 4.4, ridge: 6.0, along: 'z', door: 'S', seed: 13, stone: TOWN_DARK }],
    [l.x0 + 13.8, l.x0 + 15.9, 0.4, { eaves: 3.0, ridge: 5.2, along: 'z', door: 'S', seed: 17 }],
    [l.x0 + 16.1, l.x1, 0.8, { eaves: 4.4, ridge: 5.9, along: 'x', door: 'S', seed: 19, chimney: true }],
  ];
  for (const [x0, x1, back, o] of rows) {
    const chim = house(k, x0, l.z0 + back, x1, z1 - 0.3, o);
    if (chim && o.seed === 11) plume(k, chim, 0.42, 0.6, 0.55);
  }
  // nets drying before the cottage, barrels, a handcart, and folk in the street
  netRack(b, [l.x0 + 7.8, z1 + 1.1], [l.x0 + 10.2, z1 + 1.1], 1.9);
  barrel(b, l.x0 + 13.95, z1 + 0.35);
  barrel(b, l.x0 + 14.5, z1 + 0.5, 0, 0.27);
  b.box(l.x0 + 11.2, 0.45, z1 + 0.9, l.x0 + 12.9, 0.95, z1 + 1.9, TIMBER, { faces: 'NESWTB' });
  for (const s of [0, 1]) b.cyl(l.x0 + 12.05, z1 + 0.82 + s * 1.16, 0, 0.9, 0.45, 0.45, 8, TIMBER_DARK, { cap: 0x4a3826 });
  for (const [x, z] of [[l.x0 + 6.0, z1 + 1.4], [l.x0 + 9.2, z1 + 1.9], [l.x0 + 15.1, z1 + 1.5], [l.x0 + 16.7, z1 + 1.1]] as P2[]) k.person(x, z);
  // the street's well, in the open ground between the row and the road, if there is room for it
  const wx = l.x0 + 5.4, wz = z1 + 2.3;
  if (open(wx, wz, 0.7)) {
    b.cyl(wx, wz, 0, 0.8, 0.62, 0.62, 8, TOWN_STONE, { cap: 0x1f2a30 });
    for (const s of [-1, 1]) b.box(wx + s * 0.55 - 0.07, 0.8, wz - 0.07, wx + s * 0.55 + 0.07, 2.2, wz + 0.07, TIMBER_DARK, { faces: 'NESW' });
    gable(b, wx - 0.75, wz - 0.5, wx + 0.75, wz + 0.5, 2.2, 0.45, SLATE, TIMBER_DARK, 'x', 0.1);
    b.cyl(wx + 0.2, wz + 0.1, 1.0, 1.35, 0.17, 0.2, 6, 0x6e5a3e, { cap: 0x2a2420 });
    k.person(wx + 0.95, wz + 0.2);
  }
  k.lights.push({ x: l.x0 + 3, z: z1 + 1.5, r: 9, color: WARM, k: 0.5 }, { x: l.x0 + 12, z: z1 + 1.5, r: 10, color: WARM, k: 0.45 });
};

/** The town's east row, by the shore: houses, a smokehouse for fish, nets on racks, a boat on trestles, and boats drawn up on the beach. */
const townEast: Model = (k, l) => {
  const b = k.b;
  // a tavern for the fishermen, its sign hung out over the door to its yard
  house(k, l.x0 + 0.2, l.z0, l.x0 + 3.3, l.z0 + 3.6, { eaves: 4.4, ridge: 6.0, along: 'z', door: 'S', seed: 23, lit: 0.65 });
  b.beam([l.x0 + 2.75, 3.15, l.z0 + 3.8], [l.x0 + 2.75, 3.15, l.z0 + 4.45], 0.05, 0.05, TIMBER_DARK);
  hangingSign(k, 'dragonstone-ale', l.x0 + 2.75, 2.7, l.z0 + 4.25, 'x', 0.5);
  barrel(b, l.x0 + 0.6, l.z0 + 4.1);
  barrel(b, l.x0 + 1.15, l.z0 + 4.0, 0, 0.27);
  const chim = house(k, l.x0 + 3.6, l.z0 + 0.1, l.x0 + 6.6, l.z0 + 3.1, { eaves: 3.0, ridge: 5.4, along: 'x', door: 'S', seed: 29, chimney: true });
  if (chim) plume(k, chim, 0.4, 0.62, 0.6);
  // the smokehouse at the shore end: dark timber, with smoke from the louvre in its ridge
  const sx0 = l.x0 + 5.3, sz0 = l.z0 + 3.9, sx1 = l.x0 + 7.2, sz1 = l.z1 - 0.3;
  b.box(sx0, 0, sz0, sx1, 2.4, sz1, TIMBER_DARK, { faces: 'NESW' });
  gable(b, sx0, sz0, sx1, sz1, 2.4, 1.3, SLATE, TIMBER_DARK, 'z', 0.2);
  b.box((sx0 + sx1) / 2 - 0.25, 3.5, (sz0 + sz1) / 2 - 0.35, (sx0 + sx1) / 2 + 0.25, 4.05, (sz0 + sz1) / 2 + 0.35, TIMBER_DARK, { top: SLATE });
  doorway(b, sx0, 0, (sz0 + sz1) / 2, -1, 0, 0.8, 1.6, 0.8, DOOR);
  plume(k, [(sx0 + sx1) / 2, 4.15, (sz0 + sz1) / 2], 0.45, 0.5, 0.5);
  // before the tavern: nets on a rack, a boat on trestles being mended, and the fishermen at it
  netRack(b, [l.x0 + 3.3, l.z0 + 4.0], [l.x0 + 5.0, l.z0 + 4.4], 2.0);
  for (const x of [l.x0 + 1.6, l.x0 + 3.4]) {
    for (const s of [-1, 1]) b.beam([x + s * 0.3, 0, l.z1 - 0.9], [x, 0.75, l.z1 - 0.9], 0.05, 0.05, TIMBER);
  }
  boat(b, l.x0 + 2.5, l.z1 - 0.9, 0, 3.0, 1.2, 0.65, 0, 0x6a5038);
  k.person(l.x0 + 4.4, l.z1 - 0.7);
  k.person(l.x0 + 0.7, l.z1 - 0.6);
  // boats drawn up on the beach below the row, where there is room
  for (const [x, z, yaw] of [[l.x0 + 4.2, l.z1 + 1.7, 0.4], [l.x0 + 6.4, l.z1 + 1.0, 0.9]] as [number, number, number][]) {
    if (open(x, z, 0.4)) boat(b, x, z, yaw, 3.2, 1.25, 0.12);
  }
  k.lights.push({ x: (l.x0 + l.x1) / 2, z: l.z1 - 0.5, r: 9, color: WARM, k: 0.45 });
};

// ---------------------------------------------------------------------------
// The harbour, the old inn, and the stone pier
// ---------------------------------------------------------------------------

/**
 * The harbour's quay along the south shore, between the castle's gate and the
 * pier: paving from the road's edge to the water, a quay wall with bollards on
 * its edge, steps down to the water, barrels, crates, nets and a fish stall,
 * and boats tied up below it.
 */
const quay: Model = (k, l) => {
  const b = k.b;
  // the shore under the quay, as the plan draws the island's
  const shoreZ = (x: number): number => 9 + ((x - 44) / 22) * 1.5;
  const xa = CASTLE.x1 + 0.6, xb = l.x1 - 1.0;
  const roadZ = (x: number): number => GZ + ((x - CASTLE.x1) / (ROAD[0][0] - CASTLE.x1)) * (ROAD[0][1] - GZ) + LANE + 0.45;
  area(k, [[xa, roadZ(xa)], [xb, roadZ(xb)], [xb, shoreZ(xb) - 0.05], [xa, shoreZ(xa) - 0.05]], QUAY, 0.045);
  clearOf(k, 'the quay', [[xa, roadZ(xa)], [xb, roadZ(xb)]], 0.4);
  // its wall along the water, and its coping
  const yaw = Math.atan2(1.5, 22), len = (xb - xa + 0.6) / Math.cos(yaw), mx = (xa + xb) / 2, mz = shoreZ(mx);
  b.obox(mx, -0.64, mz + 0.12, len / 2, 0.96, 0.24, yaw, QUAY, { top: KERB });
  b.obox(mx, 0.12, mz - 0.05, len / 2, 0.08, 0.3, yaw, KERB);
  // steps down to the water, out from the quay's edge
  const sx = (xa + xb) / 2 + 0.6, sz = shoreZ(sx);
  for (let i = 0; i < 5; i++) b.box(sx - 0.6, -1.4, sz + 0.2 + i * 0.4, sx + 0.6, 0.1 - i * 0.24, sz + 0.62 + i * 0.4, KERB, { top: QUAY, faces: 'NESWT' });
  // bollards on the edge
  for (const x of [xa + 0.8, xa + 3.6, sx + 1.6, xb - 0.6]) b.cyl(x, shoreZ(x) - 0.2, 0.2, 0.75, 0.17, 0.14, 6, 0x232126, { cap: 0x3a373d });
  // barrels and crates, nets, a fish stall under an awning with its sign
  for (const [x, z, r] of [[xa + 1.2, 8.15, 0.3], [xa + 1.8, 8.4, 0.3], [xa + 1.45, 8.75, 0.28], [xb - 1.8, 8.6, 0.3]] as [number, number, number][]) barrel(b, x, z, 0.05, r);
  b.box(xb - 1.2, 0.05, 8.2, xb - 0.4, 0.75, 8.95, 0x8a6a46, { top: 0x9c7b52 });
  b.box(xb - 1.1, 0.75, 8.3, xb - 0.5, 1.3, 8.85, 0x7d6040, { top: 0x93734c });
  netRack(b, [sx - 2.4, 8.1], [sx - 0.6, 8.3], 1.8);
  const fx = xa + 3.4, fz = 7.75;
  b.box(fx - 0.9, 0.7, fz - 0.4, fx + 0.9, 0.85, fz + 0.4, TIMBER, { faces: 'NESWTB' });
  for (const s of [-1, 1]) b.box(fx + s * 0.8 - 0.06, 0, fz - 0.06, fx + s * 0.8 + 0.06, 2.2, fz + 0.06, TIMBER_DARK, { faces: 'NESW' });
  b.box(fx - 1.0, 2.2, fz - 0.65, fx + 1.0, 2.3, fz + 0.55, 0xb3141c, { faces: 'NESWTB' });
  for (let i = 0; i < 5; i++) b.box(fx - 0.7 + i * 0.32, 0.85, fz - 0.15, fx - 0.5 + i * 0.32, 0.95, fz + 0.2, 0xb8c2c8);
  k.sign('dragonstone-fish', fx, 1.9, fz + 0.58, 0, 1, 0.42);
  // boats tied up below the quay, with their lines to the bollards
  boat(b, xa + 2.6, shoreZ(xa + 2.6) + 1.7, 0.08, 3.6, 1.35, -0.9, 0, 0x4f6a72);
  boat(b, sx + 2.4, shoreZ(sx + 2.4) + 2.1, -0.12, 4.0, 1.5, -0.9, 3.2);
  b.beam([xa + 3.6, 0.6, shoreZ(xa + 3.6) - 0.2], [xa + 3.9, -0.5, shoreZ(xa + 3.6) + 1.4], 0.03, 0.03, 0xd8cfbf);
  b.beam([sx + 1.6, 0.6, shoreZ(sx + 1.6) - 0.2], [sx + 1.7, -0.5, shoreZ(sx + 1.6) + 1.6], 0.03, 0.03, 0xd8cfbf);
  // a hand crane by the steps, swinging a basket of fish up out of a boat
  const cx = sx + 1.05, cz = shoreZ(sx + 1.05) - 0.4;
  b.cyl(cx, cz, 0.05, 2.9, 0.12, 0.1, 6, TIMBER_DARK, { cap: TIMBER });
  b.beam([cx, 2.7, cz], [cx + 0.2, 2.85, cz + 1.9], 0.07, 0.05, TIMBER);
  b.beam([cx - 0.02, 1.2, cz], [cx + 0.1, 2.6, cz + 1.2], 0.05, 0.04, TIMBER);
  b.beam([cx + 0.2, 2.8, cz + 1.9], [cx + 0.2, 1.25, cz + 1.9], 0.025, 0.025, 0xd8cfbf);
  b.cyl(cx + 0.2, cz + 1.9, 0.75, 1.25, 0.32, 0.4, 7, 0x8a7350, { cap: 0xb8c2c8 });
  // pots for crabs, stacked, and a handcart
  for (let i = 0; i < 5; i++) b.box(xb - 2.9 + (i % 3) * 0.5, 0.05 + Math.floor(i / 3) * 0.42, 9.05 - (i % 2) * 0.1, xb - 2.5 + (i % 3) * 0.5, 0.45 + Math.floor(i / 3) * 0.42, 9.45 - (i % 2) * 0.1, 0x6e5a3e, { top: 0x8a7350 });
  b.box(xa + 6.4, 0.45, 8.0, xa + 7.4, 0.85, 8.6, TIMBER, { faces: 'NESWTB' });
  b.cyl(xa + 6.9, 7.95, 0.05, 0.75, 0.35, 0.35, 8, TIMBER_DARK, { cap: 0x4a3826 });
  b.beam([xa + 6.4, 0.7, 8.3], [xa + 5.7, 0.95, 8.3], 0.04, 0.04, TIMBER_DARK);
  // sailors and fishwives, a lamp, and the quay's light
  for (const [x, z] of [[xa + 2.4, 8.5], [fx - 0.2, fz + 1.05], [fx + 1.0, fz + 1.2], [sx - 1.0, 9.1], [xb - 2.3, 9.0], [cx - 0.5, cz + 0.1]] as P2[]) k.person(x, z, 0.045);
  lantern(k, sx + 0.1, shoreZ(sx + 0.1) - 0.55, 0.045, 2.8, 0x3a3532);
  k.lights.push({ x: xa + 2.5, z: 8.5, r: 8, color: WARM, k: 0.4 });
};

/**
 * The old inn on the stone pier, on its west side: low walls of weathered
 * stone, a steep slate roof, a chimney, windows warm at night, its door at the
 * end that looks down the pier to the channel, its sign hung over the door,
 * and beside the door the worn old gargoyle.
 */
const inn: Model = (k, l) => {
  const b = k.b, y = PIER_Y, x0 = l.x0 + 0.1, x1 = l.x1 - 0.1, z0 = l.z0 + 0.1, z1 = l.z1 - 0.1, eaves = 2.8, ridge = Math.min(l.top - 0.25, 4.75);
  b.box(x0, y, z0, x1, eaves, z1, 0x56525a, { win: INN_WIN, faces: 'NESW', seed: 5 });
  gable(b, x0, z0, x1, z1, eaves, ridge - eaves, 0x515b5a, 0x56525a, 'z', 0.35);
  for (const [a, c] of [[x0 - 0.35, x0], [x1, x1 + 0.35]]) b.quad([a, eaves - 0.02, z0 - 0.35], [c, eaves - 0.02, z0 - 0.35], [c, eaves - 0.02, z1 + 0.35], [a, eaves - 0.02, z1 + 0.35], [0, -1, 0], TIMBER_DARK);
  const cx = x0 + 1.0;
  b.box(cx - 0.32, eaves, z0 + 0.5, cx + 0.32, l.top, z0 + 1.14, 0x46424a, { top: 0x2a2729 });
  plume(k, [cx, l.top + 0.1, z0 + 0.82], 0.38, 0.62, 0.7);
  // a dormer in the roof's east slope, over the pier
  const mz = (z0 + z1) / 2;
  b.box(x1 - 1.35, eaves, mz - 0.6, x1 - 0.45, 3.85, mz + 0.6, 0x56525a, { win: INN_WIN, faces: 'NESW', seed: 9 });
  gable(b, x1 - 1.35, mz - 0.6, x1 - 0.45, mz + 0.6, 3.85, 0.5, 0x515b5a, 0x56525a, 'x', 0.15);
  // the door at the south end under a little slate porch on two posts, a lantern by it, and its sign hung out over the pier
  const dx = (x0 + x1) / 2 + 0.5;
  doorway(b, dx, y, z1, 0, 1, 0.9, 1.75, 4, LIT_GLASS);
  slab(b, [dx, 2.5, z1 + 0.02], [dx, 2.2, z1 + 1.05], 0.95, 0.08, 0x515b5a, { under: TIMBER_DARK });
  for (const s of [-1, 1]) b.box(dx + s * 0.85 - 0.06, y, z1 + 0.92, dx + s * 0.85 + 0.06, 2.2, z1 + 1.04, TIMBER_DARK, { faces: 'NESW' });
  b.box(x1, 2.42, z1 - 0.64, x1 + 0.85, 2.5, z1 - 0.56, TIMBER_DARK, { faces: 'NESWTB' });
  hangingSign(k, 'dragonstone-inn', x1 + 0.55, 2.12, z1 - 0.6, 'z', 0.5);
  fire(k, dx - 0.75, 2.0, z1 + 0.12, 0.18, 6);
  // the worn gargoyle beside the door, weathered almost shapeless, on its block
  const gx = dx - 1.35, gz = z1 + 0.55;
  b.box(gx - 0.32, y, gz - 0.32, gx + 0.32, y + 0.55, gz + 0.32, 0x5f5a62, { top: 0x6e6870 });
  b.cyl(gx, gz, y + 0.55, y + 1.2, 0.3, 0.22, 6, 0x726c74, { cap: false, phase: 0.3 });
  b.cyl(gx + 0.06, gz + 0.12, y + 1.15, y + 1.5, 0.2, 0.08, 5, 0x7a747c, { cap: 0x7a747c, phase: 0.9 });
  // a bench, a barrel, and two at the door
  b.box(x1 - 0.95, y, z1 + 0.15, x1 - 0.1, y + 0.42, z1 + 0.5, TIMBER, { faces: 'NESWT' });
  barrel(b, x1 + 0.45, z1 - 0.6, y, 0.28);
  k.person(dx + 0.3, z1 + 0.95, y);
  k.person(x1 - 0.5, z1 + 0.85, y);
  k.lights.push({ x: dx, z: z1 + 1.2, r: 6, color: WARM, k: 0.6 });
};

/** The stone pier, out from the harbour into the channel: paved, a kerb along its edges, bollards, a lamp at its end, and a boat alongside. */
function pier(k: Build): void {
  const b = k.b, x0 = PIER_SHAPE[0][0], x1 = PIER_SHAPE[8][0], z1 = PIER_SHAPE[9][1];
  wallsRound(b, PIER_SHAPE, -1.6, PIER_Y, PIER);
  area(k, PIER_SHAPE, PIER, PIER_Y);
  clearOf(k, 'the pier', PIER_SHAPE.slice(0, 9));
  // a kerb along its west edge and its end; a low one on its east edge, beside the hero's place
  const zw = PIER_SHAPE[0][1];
  b.box(x0, PIER_Y, zw + 0.2, x0 + 0.32, PIER_Y + 0.25, z1, KERB, { faces: 'NESWT' });
  b.box(x0, PIER_Y, z1 - 0.32, x0 + 5.6, PIER_Y + 0.25, z1, KERB, { faces: 'NESWT' });
  b.box(x1 - 0.22, PIER_Y, PIER_SHAPE[8][1] + 0.3, x1, PIER_Y + 0.1, z1, KERB, { faces: 'NESWT' });
  for (const z of [zw + 1.6, zw + 4.2, zw + 6.6]) b.cyl(x0 + 0.17, z, PIER_Y + 0.25, PIER_Y + 0.75, 0.15, 0.12, 6, 0x232126, { cap: 0x3a373d });
  b.cyl(x0 + 4.6, z1 - 0.17, PIER_Y + 0.25, PIER_Y + 0.75, 0.15, 0.12, 6, 0x232126, { cap: 0x3a373d });
  lantern(k, x0 + 0.6, z1 - 0.6, PIER_Y + 0.25, 2.6, 0x3a3532);
  // a fishing boat lying alongside, west of the inn
  boat(b, x0 - 1.0, zw + 4.6, Math.PI / 2, 3.6, 1.3, -0.9, 2.8, 0x5a4a3a);
  b.beam([x0 + 0.17, PIER_Y + 0.7, zw + 4.2], [x0 - 0.55, -0.5, zw + 3.4], 0.03, 0.03, 0xd8cfbf);
  k.person(x0 + 1.2, z1 - 0.8, PIER_Y);
  k.lights.push({ x: x0 + 3, z: z1 - 1, r: 8, color: WARM, k: 0.4 });
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

export const MODELS: Record<string, Model> = {
  'ds-castle': castle,
  'stone-drum': stoneDrum,
  windwyrm,
  'sea-dragon': seaDragon,
  'ds-town-n': townNorth,
  'ds-town-e': townEast,
  'ds-quay': quay,
  'ds-inn': inn,
};

export const COVERS: string[] = [];

const hung = (id: string, text: string): SignDef => ({ id, lines: [text], color: '#3a2a1c', ink: '#ead9ad', aspect: 1.7, kind: 'board', size: [104, 60] });
export const SIGNS: SignDef[] = [nameSign('dragonstone-name', 'Dragonstone'), hung('dragonstone-inn', 'INN'), hung('dragonstone-ale', 'ALE'), hung('dragonstone-fish', 'FISH')];

export function extras(k: Build): void {
  pier(k);
  // the castle's name, beside the road outside its east gate, where the opening view reads it
  nameBoard(k, 'dragonstone-name', CASTLE.x1 + 3.6, GZ - LANE - 2.6, 0, TO_VIEW, 1.1);
}

export function heightAt(x: number, z: number): number {
  if (inside(ROCK_SHAPE, x, z)) return ROCK_Y;
  if (inside(PIER_SHAPE, x, z)) return PIER_Y;
  return 0;
}
