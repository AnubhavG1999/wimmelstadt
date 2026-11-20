// What moves on a line of its own: the train on the embankment, with the
// platform it stops at beside Illinois Terminal; a tractor and its wagon on
// the track round the corn; and a crop duster that tows a banner round the
// stadium on game day.
//
// The train is one piece, with a locomotive at each end, as the trains to
// Chicago and Carbondale often run. The engine's trains are made of cars that
// are all alike, and it turns a train end for end where its line ends: a
// train that is the same from both ends can do that where it stands.

import * as THREE from 'three';
import { GeoBuilder, interior, rng, type V3 } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { buildPath, joined } from '../../engine/paths';
import { train } from '../../engine/rail';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { AREAS, BOARD, EMBANKMENT, RAIL, lot, type Model } from './plan';

const DARK = 0x2a2c31, SILVER = 0xc9ced4, NAVY = 0x1b3358, GREY = 0x8f98a3, RED = 0xc8202c, WHITE = 0xf4f3ee, GLASS = 0x26303c;

// ---------------------------------------------------------------------------
// The train
// ---------------------------------------------------------------------------

/** How long a locomotive and a coach are, and the gap between one vehicle and the next. */
const LOCO = 6.0, COACH = 6.6, GAP = 0.35;
const TRAIN = 2 * LOCO + 2 * COACH + 3 * GAP;

/**
 * The whole train, standing on y = 0 along x with its middle at the origin: a
 * locomotive in navy and grey at each end, each with its cab outwards, and two
 * coaches of two decks between them, in silver with a band of navy, red and
 * white. No lettering and no mark.
 */
function trainGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const lit = interior(1.25);

  /** The frame under a vehicle, and a truck with its wheels near each end. */
  const under = (x0: number, x1: number, w: number): void => {
    b.box(x0 + 0.1, 0.42, -w + 0.12, x1 - 0.1, 0.62, w - 0.12, DARK, { faces: 'NESWB' });
    for (const x of [x0 + 1.25, x1 - 1.25]) {
      b.box(x - 0.85, 0.08, -w + 0.08, x + 0.85, 0.46, w - 0.08, DARK, { faces: 'NESWB' });
      for (const d of [-0.45, 0.45]) for (const s of [-1, 1]) b.box(x + d - 0.24, 0, s * (w - 0.1) - 0.05, x + d + 0.24, 0.48, s * (w - 0.1) + 0.05, 0x55595f, { faces: 'NESW' });
    }
  };

  // --- a coach: two decks of windows, lit at night ---
  const coach = (cx: number): void => {
    const x0 = cx - COACH / 2, x1 = cx + COACH / 2, w = 1.3, top = 3.95;
    b.box(x0, 0.6, -w, x1, top, w, SILVER, { faces: 'NESW' });
    b.box(x0 + 0.12, top, -w + 0.2, x1 - 0.12, top + 0.16, w - 0.2, 0xa9afb6);
    // the two bands of windows, with posts between the panes
    for (const [ya, yb] of [[1.25, 1.85], [2.8, 3.4]]) {
      b.box(x0 + 0.7, ya, -w - 0.02, x1 - 0.7, yb, w + 0.02, GLASS, { win: lit, faces: 'NS' });
      for (let x = x0 + 0.7; x <= x1 - 0.69; x += 0.86) b.box(x - 0.09, ya, -w - 0.035, x + 0.09, yb, w + 0.035, SILVER, { faces: 'NS' });
    }
    // the band between the decks: navy, with a line of red and a line of white under it
    b.box(x0, 2.22, -w - 0.02, x1, 2.6, w + 0.02, NAVY, { faces: 'NS' });
    b.box(x0, 2.1, -w - 0.02, x1, 2.2, w + 0.02, RED, { faces: 'NS' });
    b.box(x0, 1.98, -w - 0.02, x1, 2.08, w + 0.02, WHITE, { faces: 'NS' });
    // a door at the lower deck, in the middle
    b.box(cx - 0.38, 0.66, -w - 0.03, cx + 0.38, 2.0, w + 0.03, 0xaab0b7, { faces: 'NS' });
    under(x0, x1, w);
  };

  // --- a locomotive, with its cab towards `way` ---
  const loco = (cx: number, way: number): void => {
    const w = 1.26, top = 3.45, nose = cx + (way * LOCO) / 2, tail = cx - (way * LOCO) / 2;
    const cab = nose - way * 1.5; // where the cab's sloping front meets the roof
    const lo = Math.min(tail, cab), hi = Math.max(tail, cab);
    // the long hood: grey below, navy above
    b.box(lo, 0.6, -w, hi, 1.45, w, GREY, { faces: 'NS' + (way > 0 ? 'W' : 'E') });
    b.box(lo, 1.45, -w, hi, top, w, NAVY, { faces: 'NST' + (way > 0 ? 'W' : 'E') });
    b.box(lo, 1.38, -w - 0.02, hi, 1.52, w + 0.02, RED, { faces: 'NS' });
    // grilles along the hood, and fans on its roof
    for (const f of [0.25, 0.55, 0.8]) {
      const x = tail + way * f * (LOCO - 1.6);
      b.box(x - 0.42, 2.2, -w - 0.02, x + 0.42, 3.05, w + 0.02, 0x3a4a63, { faces: 'NS' });
      b.cyl(x, 0, top, top + 0.14, 0.42, 0.42, 8, GREY);
    }
    // the cab: a nose that slopes back from the buffer to the roof, with the windscreen in the slope
    const P = (x: number, y: number, z: number): V3 => [x, y, z];
    const sill = 2.0, chin = nose - way * 0.25;
    for (const s of [-1, 1]) {
      // the cab's side: a piece under the sill and a piece that follows the slope
      b.quad(P(cab, 0.6, s * w), P(nose, 0.6, s * w), P(nose, sill, s * w), P(cab, sill, s * w), [0, 0, s], GREY);
      b.quad(P(cab, sill, s * w), P(chin, sill, s * w), P(cab, top, s * w), P(cab, top, s * w), [0, 0, s], NAVY);
      // its side window
      b.box(Math.min(cab, cab + way * 0.75), 2.25, s > 0 ? w : -w - 0.02, Math.max(cab, cab + way * 0.75), 2.95, s > 0 ? w + 0.02 : -w, GLASS, { win: lit, faces: s > 0 ? 'S' : 'N' });
    }
    b.quad(P(nose, 0.6, -w), P(nose, 0.6, w), P(nose, sill, w), P(nose, sill, -w), [way, 0, 0], GREY);
    b.quad(P(nose, sill, -w), P(nose, sill, w), P(chin, sill, w), P(chin, sill, -w), [0, 1, 0], GREY);
    b.quad(P(chin, sill, -w), P(chin, sill, w), P(cab, top, w), P(cab, top, -w), [way * (top - sill), Math.abs(chin - cab), 0], NAVY);
    // the windscreen, a hair proud of the slope, and the lamps: two at the buffer and one over the screen
    const t0 = 0.18, t1 = 0.8, slope = (t: number, z: number): V3 => [chin + (cab - chin) * t + way * 0.03, sill + (top - sill) * t + 0.03, z];
    b.quad(slope(t0, -w + 0.2), slope(t0, w - 0.2), slope(t1, w - 0.2), slope(t1, -w + 0.2), [way * (top - sill), Math.abs(chin - cab), 0], GLASS, { win: lit });
    for (const z of [-0.62, 0.62]) b.box(Math.min(nose, nose + way * 0.05), 1.0, z - 0.17, Math.max(nose, nose + way * 0.05), 1.3, z + 0.17, 0xfff4d6, { win: interior(3), faces: way > 0 ? 'E' : 'W' });
    b.box(Math.min(nose, nose + way * 0.05), 0.62, -w + 0.1, Math.max(nose, nose + way * 0.05), 0.86, w - 0.1, RED, { faces: way > 0 ? 'E' : 'W' });
    under(Math.min(tail, nose), Math.max(tail, nose), w);
  };

  const c = COACH / 2 + GAP / 2, l = COACH + GAP * 1.5 + LOCO / 2;
  coach(-c);
  coach(c);
  loco(l, 1);
  loco(-l, -1);
  // the couplings between them
  for (const x of [0, COACH + GAP, -(COACH + GAP)]) b.box(x - GAP / 2 - 0.1, 0.5, -0.14, x + GAP / 2 + 0.1, 0.72, 0.14, DARK, { faces: 'NSTB' });
  return b.build();
}

/** The platform beside Illinois Terminal, where the train stands: how far along the track it reaches. */
const PLATFORM = { z0: BOARD.z0 + 1, z1: BOARD.z0 + 24.5 };

function amtrak(k: Build): void {
  const b = k.b;
  // the line: from one edge of the board to the other, and back again
  const zA = BOARD.z0 + 0.4, zB = BOARD.z1 - 0.4, count = Math.ceil((zB - zA) / 0.5);
  const out = Array.from({ length: count + 1 }, (_, i) => new THREE.Vector3(RAIL.track, EMBANKMENT.rail, zA + ((zB - zA) * i) / count));
  const run = joined([out, [...out].reverse()], true);
  const far = run.starts[1], stand = TRAIN / 2 + 0.15;
  train(k, run.path, {
    cars: 1, car: { geometry: trainGeometry(), length: TRAIN }, speed: 15, dwell: 10, turnDwell: 10,
    ends: [far, 0],
    // it stands at the south edge for a while, and at the north one beside the platform
    stops: [far - stand, 2 * far - stand],
    from: 2 * far - stand - 40,
  });

  // the platform: a slab on the embankment's east side, with a yellow line along its edge
  // (a low platform, as this railway's are: a step up into the train, and level with the bridge from the terminal)
  const top = EMBANKMENT.top, deck = top + 0.18, x0 = RAIL.track + 1.58, x1 = RAIL.x1 - 0.02;
  const { z0, z1 } = PLATFORM;
  b.box(x0, top, z0, x1, deck, z1, 0xbdb8ae, { faces: 'NESWT' });
  b.box(x0 + 0.05, deck, z0 + 0.1, x0 + 0.33, deck + 0.02, z1 - 0.1, 0xe9c94a, { faces: 'T' });
  // a roof over the south of it, on posts along its east edge, with lamps under it. It begins south of the
  // terminal, so that the bridge from the terminal's upper floor is under the open sky and can be seen.
  const r0 = lot('terminal').z1 + 0.8, r1 = z1 - 2, roof = deck + 3.5;
  b.box(x0 + 0.1, roof, r0, x1 + 0.35, roof + 0.22, r1, 0xe9e3d6, { faces: 'NESWTB', top: 0x3f5f58 });
  const posts = 5;
  for (let i = 0; i <= posts; i++) {
    const z = r0 + 0.4 + (i / posts) * (r1 - r0 - 0.8);
    b.box(x1 - 0.32, deck, z - 0.1, x1 - 0.12, roof, z + 0.1, 0x6f747c, { faces: 'NESW' });
    k.glows.push({ x: (x0 + x1) / 2, y: roof - 0.12, z, sx: 0.5, sy: 0.12, sz: 0.5, color: '#fff3dc' });
  }
  k.lights.push({ x: RAIL.x1 + 1.5, z: (r0 + r1) / 2, r: 9, color: '#fff3dc', k: 0.4 });
  // two benches, and the town's name on a board under the roof, once for the tile and once for the train
  for (const z of [r0 + 2.2, r1 - 2.6]) {
    b.box(x1 - 0.75, deck + 0.35, z - 0.8, x1 - 0.4, deck + 0.48, z + 0.8, 0x8d6b4a, { faces: 'NESWTB' });
    for (const d of [-0.65, 0.65]) b.box(x1 - 0.7, deck, z + d - 0.05, x1 - 0.45, deck + 0.35, z + d + 0.05, 0x6f747c);
  }
  const sz = r1 - 4;
  b.box(x1 - 0.14, roof - 1.0, sz - 3.3, x1 - 0.06, roof - 0.15, sz + 3.3, NAVY, { faces: 'NESWTB' });
  k.sign('moving-station', x1 - 0.03, roof - 0.575, sz, 1, 0, 0.7, 6.4);
  k.sign('moving-station', x1 - 0.17, roof - 0.575, sz, -1, 0, 0.7, 6.4);
  // people waiting, well back from the edge
  const rand = rng(6018);
  for (let i = 0; i < 7; i++) k.person(x0 + 0.9 + rand() * (x1 - x0 - 1.6), r0 + 0.6 + rand() * (r1 - r0 - 1.2), deck);
}

// ---------------------------------------------------------------------------
// The tractor and its wagon, on the track round the corn
// ---------------------------------------------------------------------------

/** A tractor with a wagon of bales behind it, along x with its nose towards +x and its middle at the origin. */
function tractorGeometry(): { geometry: THREE.BufferGeometry; length: number } {
  const b = new GeoBuilder();
  const GREEN = 0x3f8f4a, YELLOW = 0xf2c230, TYRE = 0x1e1f23, WOOD = 0x9c7a4f, STRAW = 0xe3c56a;
  const wheel = (x: number, r: number, half: number, off: number): void => {
    for (const s of [-1, 1]) {
      const z = s * off;
      b.box(x - r * 0.72, 0, z - half, x + r * 0.72, r * 2, z + half, TYRE, { faces: 'NESWTB' });
      b.box(x - r * 0.4, r * 0.6, s > 0 ? z + half : z - half - 0.03, x + r * 0.4, r * 1.4, s > 0 ? z + half + 0.03 : z - half, YELLOW, { faces: s > 0 ? 'S' : 'N' });
    }
  };
  // the tractor, from x = 1.0 to x = 4.2: a long bonnet, a cab of glass, big wheels behind and small ones in front
  b.box(2.3, 0.85, -0.42, 4.2, 1.7, 0.42, GREEN, { faces: 'NESWTB' });
  b.box(4.2, 1.0, -0.36, 4.26, 1.55, 0.36, 0x2a2c31, { faces: 'E' });
  b.cyl(3.7, 0.0, 1.7, 2.35, 0.07, 0.07, 6, 0x4a4d54, { cap: false });
  b.box(1.1, 0.7, -0.62, 2.4, 1.5, 0.62, GREEN, { faces: 'NESWTB' });
  b.box(1.2, 1.5, -0.55, 2.3, 2.5, 0.55, 0x9fc0d4, { win: interior(0.6), faces: 'NESW' });
  b.box(1.1, 2.5, -0.65, 2.4, 2.62, 0.65, GREEN, { faces: 'NESWTB' });
  wheel(1.65, 0.78, 0.24, 0.86);
  wheel(3.75, 0.46, 0.17, 0.66);
  // the drawbar, and the wagon behind, from x = -4.2 to x = 0.4: a flat bed with a rack at each end, and bales on it
  b.box(0.3, 0.55, -0.06, 1.2, 0.67, 0.06, 0x4a4d54, { faces: 'NSTB' });
  b.box(-4.2, 0.72, -0.95, 0.4, 0.9, 0.95, WOOD, { faces: 'NESWTB' });
  for (const x of [-4.2, 0.28]) b.box(x, 0.9, -0.95, x + 0.12, 2.1, 0.95, WOOD, { faces: 'NESWT' });
  for (const [x, y, z] of [[-3.5, 0.9, -0.45], [-3.5, 0.9, 0.45], [-2.3, 0.9, -0.45], [-2.3, 0.9, 0.45], [-1.1, 0.9, -0.45], [-1.1, 0.9, 0.45], [-2.9, 1.52, 0], [-1.7, 1.52, 0]]) {
    b.box(x - 0.55, y, z - 0.42, x + 0.55, y + 0.6, z + 0.42, STRAW, { faces: 'NESWT' });
  }
  wheel(-3.2, 0.4, 0.15, 0.82);
  wheel(-0.6, 0.4, 0.15, 0.82);
  return { geometry: b.build(), length: 8.6 };
}

/** The track round the corn, as far in from the field's edge as this. */
const HEADLAND = 1.25;

function tractor(k: Build): void {
  const corn = AREAS.find((a) => a.id === 'corn');
  if (!corn) return;
  const x0 = corn.x0 + HEADLAND, z0 = corn.z0 + HEADLAND, x1 = corn.x1 - HEADLAND, z1 = corn.z1 - HEADLAND;
  // a track of bare earth along the four sides, a hair above the field
  const EARTH = 0x9b8560, half = 1.15;
  area(k, rect(x0 - half, z0 - half, x1 + half, z0 + half), EARTH, 0.035);
  area(k, rect(x0 - half, z1 - half, x1 + half, z1 + half), EARTH, 0.035);
  area(k, rect(x0 - half, z0 + half, x0 + half, z1 - half), EARTH, 0.035);
  area(k, rect(x1 - half, z0 + half, x1 + half, z1 - half), EARTH, 0.035);
  const path = buildPath([{ t: 'ring', pts: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y: 0.04, r: 2.2 }], true);
  train(k, path, { cars: 1, car: tractorGeometry(), speed: 3.4, from: 6 });
}

// ---------------------------------------------------------------------------
// The crop duster with its banner
// ---------------------------------------------------------------------------

/**
 * What the banner says: the two halves of the chant that one side of the
 * stadium calls to the other. Plain letters of straight strokes, the first
 * half in orange and the second in navy. A plain capital I here is one upright
 * bar with nothing on it: the university's own letter I is a mark, and this is
 * not it.
 */
const CHANT: [string, number][] = [['I-L-L', 0xf26a21], ['I-N-I', 0x13294b]];

/**
 * A little crop duster, a biplane in yellow with blue trim, and the banner on
 * a line behind it. Nose along +x, its middle at the origin.
 */
function planeGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const YELLOW = 0xf6c832, TRIM = 0x23406a, CREAM = 0xfff3dc, STRUT = 0xd9dde2;
  const lit = interior(0.5); // seen at night as if the lamps below lit it
  // the body, with the hopper's hump before the cockpit, the round engine at the nose, and the tail
  b.box(-1.7, -0.32, -0.36, 1.35, 0.4, 0.36, YELLOW, { faces: 'NESWTB', win: lit });
  b.box(0.1, 0.4, -0.3, 1.2, 0.62, 0.3, YELLOW, { faces: 'NESWT', win: lit });
  b.box(-0.75, 0.4, -0.24, -0.05, 0.72, 0.24, 0x9fc0d4, { faces: 'NESWT' });
  b.box(1.35, -0.4, -0.44, 1.8, 0.48, 0.44, TRIM, { faces: 'NESWTB' });
  b.box(1.8, -0.75, -0.75, 1.84, 0.83, 0.75, 0xd9dde2, { faces: 'EW' });
  b.box(-3.0, -0.12, -0.17, -1.7, 0.24, 0.17, YELLOW, { faces: 'NSWTB', win: lit });
  b.box(-3.0, 0.14, -1.1, -2.35, 0.22, 1.1, YELLOW, { faces: 'NESWTB', win: lit });
  b.box(-3.0, 0.22, -0.05, -2.25, 1.05, 0.05, TRIM, { faces: 'NESWTB' });
  // two wings, the upper a little longer and a little further forward, with blue tips and struts between them
  const wing = (x0: number, x1: number, y: number, half: number): void => {
    b.box(x0, y, -half, x1, y + 0.12, half, YELLOW, { faces: 'NESWTB', win: lit });
    b.box(x0, y, -half, x1, y + 0.125, -half + 0.5, TRIM, { faces: 'NEWTB' });
    b.box(x0, y, half - 0.5, x1, y + 0.125, half, TRIM, { faces: 'SEWTB' });
  };
  wing(0.15, 1.25, 1.15, 3.3);
  wing(-0.25, 0.85, -0.3, 2.9);
  for (const z of [-2.2, 2.2]) for (const x of [0.0, 0.75]) b.box(x, -0.18, z - 0.04, x + 0.08, 1.15, z + 0.04, STRUT, { faces: 'NESW' });
  for (const z of [-0.33, 0.33]) b.box(0.55, 0.4, z - 0.03, 0.63, 1.15, z + 0.03, STRUT, { faces: 'NESW' });
  // the bar it sprays from, under the lower wing, with its nozzles
  b.box(-0.42, -0.5, -2.7, -0.34, -0.44, 2.7, STRUT, { faces: 'NESWTB' });
  for (let z = -2.4; z <= 2.41; z += 0.8) b.box(-0.44, -0.62, z - 0.04, -0.32, -0.5, z + 0.04, 0x8d9198, { faces: 'NESWB' });
  // the wheels
  for (const z of [-0.7, 0.7]) {
    b.box(0.55, -0.85, z - 0.04, 0.65, -0.3, z + 0.04, TRIM, { faces: 'NESW' });
    b.box(0.35, -1.08, z - 0.1, 0.85, -0.68, z + 0.1, 0x1e1f23, { faces: 'NESWTB' });
  }
  b.box(-2.9, -0.4, -0.05, -2.7, -0.12, 0.05, 0x1e1f23, { faces: 'NESWTB' });

  // the line, and the banner on it: cream, with a band of orange along its top and of navy along its foot
  b.box(-6.2, 0.02, -0.02, -3.0, 0.06, 0.02, 0xc9ccd2, { faces: 'NSTB' });
  const bx0 = -18.2, bx1 = -6.2, by0 = -0.95, by1 = 1.05;
  b.box(bx0, by0, -0.03, bx1, by1, 0.03, CREAM, { faces: 'NESWTB', win: lit });
  b.box(bx1 - 0.08, by0, -0.07, bx1, by1, 0.07, 0xc9ccd2, { faces: 'NESWTB' });
  for (const s of [-1, 1]) {
    const face = s > 0 ? 'S' : 'N', za = s > 0 ? 0.03 : -0.05, zb = s > 0 ? 0.05 : -0.03;
    b.box(bx0, by1 - 0.2, za, bx1, by1, zb, 0xf26a21, { faces: face, win: lit });
    b.box(bx0, by0, za, bx1, by0 + 0.2, zb, 0x13294b, { faces: face, win: lit });
    // The lettering, read from left to right from whichever side it is seen. Seen from its right-hand side the
    // aeroplane flies to the right, so the words begin at the banner's tail. Seen from its left they begin at the line.
    const dir = s; // which way along x is "to the right" for whoever looks at this face
    const cell = 0.9, gap = 1.5, w = 0.27, t = 0.17, lo = -0.52, hi = 0.62;
    const total = 10 * cell + gap, start = (bx0 + bx1) / 2 - (dir * total) / 2;
    let u = 0;
    for (const [word, color] of CHANT) {
      for (const ch of word) {
        const ox = start + dir * (u + cell / 2);
        /** A stroke of the letter, from (u0, v0) to (u1, v1) in the letter's own frame, where u is to the reader's right. */
        const bar = (u0: number, v0: number, u1: number, v1: number): void => {
          const xa = ox + dir * u0, xb = ox + dir * u1;
          b.box(Math.min(xa, xb), v0, za, Math.max(xa, xb), v1, zb + s * 0.005, color, { faces: face, win: lit });
        };
        if (ch === 'I') bar(-t / 2, lo, t / 2, hi);
        else if (ch === '-') bar(-w + 0.04, 0.05 - t / 2, w - 0.04, 0.05 + t / 2);
        else if (ch === 'L') {
          bar(-w, lo, -w + t, hi);
          bar(-w, lo, w, lo + t);
        } else if (ch === 'N') {
          bar(-w, lo, -w + t, hi);
          bar(w - t, lo, w, hi);
          const z = s > 0 ? zb + 0.005 : za - 0.005;
          b.quad([ox + dir * -w, hi, z], [ox + dir * (-w + t * 1.2), hi, z], [ox + dir * w, lo, z], [ox + dir * (w - t * 1.2), lo, z], [0, 0, s], color, { win: lit });
        }
        u += cell;
      }
      u += gap;
    }
  }
  return b.build();
}

function bannerPlane(k: Build): void {
  const stadium = lot('stadium');
  // Its round is a long oval over the stadium's south end, Kirby Avenue and the fields beyond, and not very
  // high. Seen from where the tile is first looked at, a thing in the air stands further north-west than it
  // is, so from there the oval is seen over the stadium, and nowhere on it does the aeroplane seem to fly out
  // over the edge of the board. It keeps well west of the grove and its cemetery, in fact and to the eye.
  const cx = (stadium.x0 + stadium.x1) / 2 + 18, cz = stadium.z1 + 5, RX = 32, RZ = 14, Y = 24, speed = 10;
  const craft = new THREE.Group();
  craft.name = 'crop duster';
  craft.matrixAutoUpdate = false;
  craft.add(new THREE.Mesh(planeGeometry(), k.mat.city()));
  // its lamps: red on the left wingtip, green on the right
  const lamp = (color: number, z: number): THREE.MeshBasicMaterial => {
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), mat);
    m.position.set(0.7, 1.3, z);
    craft.add(m);
    return mat;
  };
  const red = lamp(0xff2a2a, -3.32), green = lamp(0x2aff5a, 3.32);
  k.group.add(craft);

  // round the oval for ever, clockwise as seen from above, leaning into the turn at each end
  let a = 2.2, lean = 0;
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), flat = new THREE.Vector3(), pos = new THREE.Vector3();
  k.each((dt, _time, night) => {
    const dx = -Math.sin(a) * RX, dz = Math.cos(a) * RZ, len = Math.hypot(dx, dz) || 1;
    a += (speed / len) * dt;
    pos.set(cx + Math.cos(a) * RX, Y + Math.sin(a * 2) * 1.0, cz + Math.sin(a) * RZ);
    fwd.set(dx / len, 0, dz / len);
    // its right-hand side is towards the middle of the oval. It leans that way in the tight turns at the ends.
    flat.set(-fwd.z, 0, fwd.x);
    const want = 0.5 * Math.pow(Math.abs(Math.cos(a)), 3);
    lean += (want - lean) * Math.min(1, dt * 2);
    up.set(0, 1, 0);
    right.copy(flat).multiplyScalar(Math.cos(lean)).addScaledVector(up, -Math.sin(lean));
    up.crossVectors(right, fwd).normalize();
    craft.matrix.makeBasis(fwd, up, right).setPosition(pos);
    craft.matrixWorldNeedsUpdate = true;
    const shine = 0.9 + 3.4 * night;
    red.color.setRGB(1, 0.16, 0.16).multiplyScalar(shine);
    green.color.setRGB(0.16, 1, 0.35).multiplyScalar(shine);
  });
}

export const SIGNS: SignDef[] = [
  // the station's name, as the railway writes it: white on navy
  { id: 'moving-station', lines: ['CHAMPAIGN-URBANA'], color: '#1b3358', ink: '#f4f3ee', aspect: 9.6, kind: 'board', real: true, size: [499, 52] },
];

export const MODELS: Record<string, Model> = {};

export function extras(k: Build): void {
  amtrak(k);
  tractor(k);
  bannerPlane(k);
}
