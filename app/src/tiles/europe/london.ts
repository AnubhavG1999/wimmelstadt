// London's river: the Houses of Parliament with Big Ben, Westminster Bridge,
// Tower Bridge and the London Eye. Each is a toy version, a few dozen boxes,
// cylinders and bars: enough for the silhouette. They are written where they
// stand, since each is fitted to the river and to the street that crosses it.
//
// London is turned a quarter on this tile: the Thames runs north to south, and
// Parliament's river front looks east across it.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import { GeoBuilder, interior, type V3, type WinSpec } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { bigBen } from './landmarks';
import { D, Q, lantern, pinnacle, tri, unionFlag } from '../../engine/parts';
import { EMBANKMENT_X, SOUTH_BANK_X, STRAND_X, THAMES_X, TOWER_Z, WATER_DROP, WESTMINSTER_Z } from './plan';

/** The bed of the river, as far down as anything that stands in it needs to go. */
const BED = -(WATER_DROP + 0.6);
/** The two banks of the Thames, where its bridges begin and end. */
const WEST = THAMES_X - 10, EAST = THAMES_X + 10;

// ---------------------------------------------------------------------------
// The Houses of Parliament, and Big Ben
// ---------------------------------------------------------------------------

/**
 * The Palace of Westminster, along the water south of Westminster Bridge: the
 * long river front with its pinnacles, the spire over the middle, the Victoria
 * Tower at the far end and the clock tower at the bridge.
 */
export function parliament(k: Build): void {
  const b = k.b;
  const STONE = 0xc9b584, SHADE = 0xb7a273, SLATE = 0x4a4f55;
  const storey = 3.6, h = storey * 3;
  const win: WinSpec = { cell: 1.1, storey, lit: 0.55, kind: 6 };
  const x0 = -58.6, x1 = -48.2, z0 = -15.0, z1 = 7.0, xr = (x0 + x1) / 2;

  // --- the river front: three storeys, a slate roof, and a pinnacle on every pier ---
  b.box(x0, 0, z0, x1, h, z1, STONE, { win, seed: 0.31, top: SHADE });
  const eave = h + 0.02, ridge = h + 2.8, in0 = x0 + 0.7, in1 = x1 - 0.7;
  b.quad([in1, eave, z1 - 0.4], [in1, eave, z0 + 0.4], [xr, ridge, z0 + 0.4], [xr, ridge, z1 - 0.4], [0.6, 0.8, 0], SLATE);
  b.quad([in0, eave, z0 + 0.4], [in0, eave, z1 - 0.4], [xr, ridge, z1 - 0.4], [xr, ridge, z0 + 0.4], [-0.6, 0.8, 0], SLATE);
  tri(b, [in0, eave, z0 + 0.4], [in1, eave, z0 + 0.4], [xr, ridge, z0 + 0.4], [0, 0, -1], SLATE);
  tri(b, [in1, eave, z1 - 0.4], [in0, eave, z1 - 0.4], [xr, ridge, z1 - 0.4], [0, 0, 1], SLATE);
  for (let z = z0 + 1.1; z < z1 - 0.5; z += 2.2) {
    for (const x of [x1, x0]) {
      const out = x === x1 ? 1 : -1;
      // a buttress up the wall, and a pinnacle where it ends
      b.box(x + (out > 0 ? 0 : -0.16), 0, z - 0.14, x + (out > 0 ? 0.16 : 0), h + 0.5, z + 0.14, SHADE);
      pinnacle(b, x - out * 0.22, z, h, 2.5, 0.2, STONE);
    }
  }
  // the pavilions at the two ends of the front stand a little proud of it, and higher
  for (const [za, zb] of [[z0 - 0.02, z0 + 2.7], [z1 - 2.7, z1 + 0.02]]) {
    b.box(x1 - 2.6, 0, za, x1 + 0.34, h + 2.6, zb, STONE, { win, seed: 0.5 + za * 0.01, top: SHADE });
    for (const x of [x1 - 2.4, x1 + 0.12]) for (const z of [za + 0.22, zb - 0.22]) pinnacle(b, x, z, h + 2.6, 3.4, 0.24, STONE);
  }

  // --- the terrace on the river, with the members' marquees: green for the Commons, red for the Lords ---
  const bank = THAMES_X - 10 - 0.25;
  b.box(x1, 0, z0 + 2.9, bank, 0.7, z1 - 2.9, SHADE);
  for (let i = 0; i < 6; i++) {
    const z = z0 + 4.2 + i * 2.3;
    b.box(x1 + 0.3, 0.7, z, bank - 0.3, 1.9, z + 1.7, i < 3 ? 0x3f7a52 : 0xa8323a, { top: 0xf2efe6 });
  }

  // --- the spire over the middle of it ---
  const cz = -4;
  b.cyl(xr, cz, ridge - 1.4, ridge + 3.4, 1.9, 1.9, 8, STONE, { win: { cell: 0.75, storey: 3.2, lit: 0.6, kind: 6 }, seed: 0.2, cap: SHADE });
  b.cyl(xr, cz, ridge + 3.4, ridge + 15.5, 1.75, 0.06, 8, STONE, { win: interior(0.3), cap: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    pinnacle(b, xr + Math.cos(a) * 1.75, cz + Math.sin(a) * 1.75, ridge + 3.4, 2.3, 0.16, STONE);
  }

  // --- the Victoria Tower: square, with a turret at each corner and the flag over it ---
  const tx = -55.4, tz = z1 + 3.4, th = 3.3, top = 37.8;
  const tStorey = top / 9;
  b.box(tx - th, 0, tz - th, tx + th, top, tz + th, STONE, { win: { cell: 1.1, storey: tStorey, lit: 0.4, kind: 6 }, seed: 0.63, top: SHADE });
  b.box(tx - th - 0.14, top - 0.9, tz - th - 0.14, tx + th + 0.14, top + 0.7, tz + th + 0.14, SHADE, { faces: 'NESW' });
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = tx + sx * th, z = tz + sz * th;
    b.cyl(x, z, 0, top + 2.2, 0.82, 0.82, 8, STONE, { cap: SHADE });
    b.cyl(x, z, top + 2.2, top + 6.2, 0.9, 0.04, 8, STONE, { win: interior(0.3), cap: false });
  }
  // the flagstaff, and the flag
  unionFlag(b, tx, tz, top, 10.5);

  // --- the clock tower, at the bridge ---
  placed(k, -51, -18.5, 0, (q) => bigBen(q, 56));

  for (const z of [z0 + 4, (z0 + z1) / 2, z1 - 4]) k.lights.push({ x: x1 + 3, z, r: 11, color: '#ffdca0', k: 0.5 });
  k.lights.push({ x: tx, z: tz, r: 12, color: '#ffdca0', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Westminster Bridge
// ---------------------------------------------------------------------------

/** Westminster Bridge: low and green, on stone piers, with an iron rib under every span and lanterns along both sides. */
export function westminsterBridge(k: Build): void {
  const b = k.b;
  const GREEN = 0x4f8a5b, STONE = 0xcfc6b2, DARK = 0x2f4f3a;
  const z0 = WESTMINSTER_Z - 7.5, z1 = WESTMINSTER_Z + 7.5, x0 = WEST - 0.4, x1 = EAST + 0.4;
  b.box(x0, -0.7, z0, x1, 0, z1, STONE, { faces: 'NESWTB' });
  const spans = 5, span = (EAST - WEST) / spans;
  for (let i = 0; i < spans; i++) {
    const xa = WEST + i * span, xb = xa + span;
    if (i > 0) {
      // a pier, rounded at both ends against the current
      b.box(xa - 0.6, BED, z0 - 0.5, xa + 0.6, -0.7, z1 + 0.5, STONE, { faces: 'NESWT' });
      for (const z of [z0 - 0.5, z1 + 0.5]) b.cyl(xa, z, BED, -0.9, 0.6, 0.6, 8, STONE);
    }
    for (const z of [z0 - 0.22, z1 + 0.22]) {
      // the rib under the span: low at the piers, and up to the deck in the middle
      const rib: V3[] = [];
      for (let j = 0; j <= 6; j++) {
        const u = j / 6;
        rib.push([xa + 0.6 + u * (span - 1.2), -1.5 + 0.72 * Math.sin(u * Math.PI), z]);
      }
      b.sweep(rib, rib.map(() => 0.13), GREEN);
      lantern(k, (xa + xb) / 2, z + (z < WESTMINSTER_Z ? 0.4 : -0.4), 1.2, 2.0, DARK);
    }
  }
  // the green parapets, with a pale rail along the top
  for (const z of [z0 - 0.08, z1 - 0.42]) {
    b.box(x0, -0.75, z, x1, 1.05, z + 0.5, GREEN, { faces: 'NESW' });
    b.box(x0, 1.05, z - 0.04, x1, 1.2, z + 0.54, 0xe9e3d0);
  }
  for (let i = 0; i < 9; i++) k.person(WEST + 1.5 + k.rand() * 17, (i % 2 ? z0 + 1.3 : z1 - 1.3) + (k.rand() - 0.5) * 0.6);
}

// ---------------------------------------------------------------------------
// Tower Bridge
// ---------------------------------------------------------------------------

/**
 * Tower Bridge: two stone towers astride the road, the walkways between their
 * tops, the lifting span between their feet, and the blue chains that carry
 * the spans to either bank. Its lifting span stays down, since the traffic
 * cannot be made to wait.
 */
export function towerBridge(k: Build): void {
  const b = k.b;
  const STONE = 0xbfb39a, SHADE = 0xa89c84, PIER = 0xa9a08c, ROOF = 0x56657a, BLUE = 0x4f86b8, WHITE = 0xf2f2f2, GOLD = 0xd9b24a;
  const cx = THAMES_X, cz = TOWER_Z;
  /** How far each tower stands from the middle of the river, half its depth along the road, and half its width across it. */
  const off = 4.7, hd = 1.8, hw = 7.6, leg = 5.3;
  const body = 9, eaves = 27, peak = 35;
  const lit = interior(0.42);
  const storey = (eaves - body) / 5;
  const slits: WinSpec = { cell: 1.2, storey, lit: 0.6, kind: 6 };

  // the deck, from bank to bank
  b.box(WEST - 0.4, -0.8, cz - 7.5, EAST + 0.4, 0, cz + 7.5, 0x8d8f94, { faces: 'NESWTB' });

  for (const side of [-1, 1]) {
    const tx = cx + side * off;
    // the pier it stands on, rounded against the current
    b.box(tx - hd - 1.0, BED, cz - hw - 1.2, tx + hd + 1.0, -0.2, cz + hw + 1.2, PIER, { faces: 'NESWT' });
    for (const z of [cz - hw - 1.2, cz + hw + 1.2]) b.cyl(tx, z, BED, -0.4, hd + 1.0, hd + 1.0, 10, PIER);
    // two legs, with the road between them, and the body of the tower above the road
    for (const s of [-1, 1]) {
      const za = cz + s * leg, zb = cz + s * hw;
      b.box(tx - hd, -0.2, Math.min(za, zb), tx + hd, body, Math.max(za, zb), STONE, { win: { cell: 1.2, storey: body + 0.2, lit: 0.3, kind: 6 }, seed: 0.2 + s * 0.1 });
    }
    b.box(tx - hd, body, cz - hw, tx + hd, eaves, cz + hw, STONE, { win: slits, seed: 0.4 + side * 0.1, faces: 'NESWB' });
    // the head of the archway: two slopes that meet over the middle of the road
    for (const s of [-1, 1]) {
      b.quad([tx - hd - 0.02, body - 2.6, cz + s * leg], [tx + hd + 0.02, body - 2.6, cz + s * leg], [tx + hd + 0.02, body + 0.02, cz + s * 1.2], [tx - hd - 0.02, body + 0.02, cz + s * 1.2], [0, -0.85, -s * 0.5], SHADE);
      for (const x of [tx - hd - 0.03, tx + hd + 0.03]) {
        b.tri([x, body - 2.6, cz + s * leg], [x, body + 0.02, cz + s * leg], [x, body + 0.02, cz + s * 1.2], [x < tx ? -1 : 1, 0, 0], STONE);
        b.tri([x, body + 0.02, cz + s * leg], [x, body - 2.6, cz + s * leg], [x, body + 0.02, cz + s * 1.2], [x < tx ? -1 : 1, 0, 0], STONE);
      }
    }
    // courses round it where each stage begins
    for (const y of [body, body + storey * 2.5, eaves]) b.box(tx - hd - 0.16, y - 0.3, cz - hw - 0.16, tx + hd + 0.16, y + 0.3, cz + hw + 0.16, SHADE, { faces: 'NESWTB' });
    // a turret at each corner, capped with a spike
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = tx + sx * hd, z = cz + sz * hw;
      b.cyl(x, z, -0.2, eaves + 3, 1.05, 1.05, 8, STONE, { win: lit, cap: SHADE });
      b.cyl(x, z, eaves + 3, eaves + 7.6, 1.2, 0.05, 8, ROOF, { cap: false });
      b.cyl(x, z, eaves + 7.6, eaves + 8.2, 0.14, 0.14, 4, GOLD, { win: interior(0.8) });
    }
    // the steep roof between them, with its ridge across the road
    const e = eaves + 0.3, rz = hw - 3.4;
    b.quad([tx + hd, e, cz + hw], [tx + hd, e, cz - hw], [tx, peak, cz - rz], [tx, peak, cz + rz], [0.9, 0.4, 0], ROOF);
    b.quad([tx - hd, e, cz - hw], [tx - hd, e, cz + hw], [tx, peak, cz + rz], [tx, peak, cz - rz], [-0.9, 0.4, 0], ROOF);
    tri(b, [tx - hd, e, cz - hw], [tx + hd, e, cz - hw], [tx, peak, cz - rz], [0, 0.5, -0.87], ROOF);
    tri(b, [tx + hd, e, cz + hw], [tx - hd, e, cz + hw], [tx, peak, cz + rz], [0, 0.5, 0.87], ROOF);
    for (const z of [cz - rz, cz + rz]) b.cyl(tx, z, peak, peak + 2.4, 0.2, 0.03, 4, GOLD, { win: interior(0.8), cap: false });

    // the chains to the bank: down from the tower in a curve, with rods to the deck, and a small tower where they come to ground
    const shore = side < 0 ? WEST : EAST, from = tx + side * hd;
    for (const z of [cz - 7.8, cz + 7.8]) {
      const chain: V3[] = [];
      for (let i = 0; i <= 7; i++) {
        const u = i / 7;
        chain.push([from + (shore - from) * u, 20 - 15 * u + 3.4 * (u * u - u), z]);
      }
      b.sweep(chain, chain.map(() => 0.26), BLUE, { win: lit });
      for (let i = 1; i < 7; i++) b.box(chain[i][0] - 0.07, 1.1, z - 0.07, chain[i][0] + 0.07, chain[i][1], z + 0.07, WHITE, { faces: 'NESW' });
      b.box(shore - 1.0, -0.2, z - 1.0, shore + 1.0, 6.2, z + 1.0, STONE, { win: { cell: 1, storey: 6.4, lit: 0.4, kind: 6 }, seed: 0.7 });
      b.cyl(shore, z, 6.2, 8.6, 1.0 * D, 0.05, 4, ROOF, { phase: Q, cap: false });
      k.lights.push({ x: shore, z, r: 8, color: '#ffe2ae', k: 0.4 });
    }
    k.lights.push({ x: tx, z: cz, r: 14, color: '#ffe9c4', k: 0.6 });
  }

  // the two walkways high up between the towers, and the blue girders of the lifting span below them
  for (const z of [cz - 4.6, cz + 4.6]) {
    const xa = cx - off + hd, xb = cx + off - hd;
    b.box(xa, 24.2, z - 0.75, xb, 26.6, z + 0.75, BLUE, { win: lit, faces: 'NSTB' });
    for (const y of [24.05, 26.6]) b.box(xa, y, z - 0.85, xb, y + 0.15, z + 0.85, WHITE, { faces: 'NSTB' });
    k.glows.push({ x: cx, y: 25.4, z: z + (z < cz ? -0.8 : 0.8), sx: xb - xa - 0.6, sy: 0.16, sz: 0.12, color: '#cfe8ff' });
  }
  for (const z of [cz - 7.58, cz + 7.1]) {
    b.box(WEST - 0.4, -0.85, z, EAST + 0.4, 1.1, z + 0.48, BLUE, { win: lit, faces: 'NESW' });
    b.box(WEST - 0.4, 1.1, z - 0.04, EAST + 0.4, 1.24, z + 0.52, WHITE);
  }
  // people on the lifting span, between the towers
  for (let i = 0; i < 8; i++) k.person(cx - 2.6 + k.rand() * 5.2, cz + (i % 2 ? -6.2 : 6.2) + (k.rand() - 0.5) * 0.5);
}

// ---------------------------------------------------------------------------
// The London Eye
// ---------------------------------------------------------------------------

/** The London Eye: a great wheel that hangs over the water's edge from two legs on the bank, and turns. */
export function londonEye(k: Build): void {
  const WHITE = 0xf2f2f2, STEEL = 0xd4d7da, GLASS = 0xbfe0ee;
  const hub: V3 = [EAST - 1.4, 24.5, -61], R = 20;
  const [hx, hy, hz] = hub;

  // --- the wheel: a mesh of its own, since it turns ---
  const w = new GeoBuilder();
  for (const x of [-0.5, 0.5]) {
    const rim: V3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      rim.push([x, Math.sin(a) * R, Math.cos(a) * R]);
    }
    w.sweep(rim, rim.map(() => 0.24), WHITE, { win: interior(0.35) });
  }
  const pods = 24;
  for (let i = 0; i < pods; i++) {
    const a = (i / pods) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    // a strut across the rim, two cables to the hub, and a capsule on the outside of the rim
    w.beam([-0.5, s * R, c * R], [0.5, s * R, c * R], 0.14, 0.14, WHITE);
    for (const x of [-0.5, 0.5]) w.beam([x * 2.2, 0, 0], [x, s * R, c * R], 0.05, 0.05, STEEL);
    const py = s * (R + 1.5), pz = c * (R + 1.5);
    w.box(-0.75, py - 0.75, pz - 1.0, 0.75, py + 0.75, pz + 1.0, GLASS, { win: interior(1.3), faces: 'NESWTB' });
  }
  w.box(-1.5, -0.9, -0.9, 1.5, 0.9, 0.9, STEEL, { faces: 'NESWTB' });
  const wheel = new THREE.Group();
  wheel.name = 'london-eye';
  wheel.position.set(hx, hy, hz);
  const frame = new THREE.Mesh(w.build(), k.mat.city());
  frame.castShadow = true;
  wheel.add(frame);
  // a line of light round the rim, which shows at night
  const light = new THREE.MeshBasicMaterial({ color: 0x7fb8ff, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.3, 0.1, 4, 72).rotateY(Math.PI / 2), light);
  wheel.add(ring);
  k.group.add(wheel);
  k.each((dt, _time, night) => {
    wheel.rotation.x += dt * 0.07;
    light.color.setRGB(0.5, 0.72, 1).multiplyScalar(0.25 + 3.2 * night);
  });

  // --- what holds it up: two legs on the bank that lean out to the hub, the spindle, and the stays behind ---
  const b = k.b;
  const apex: V3 = [hx + 2.6, hy, hz];
  for (const s of [-1, 1]) {
    b.beam([hx + 7.4, 0, hz + s * 8.5], apex, 0.62, 0.42, WHITE, { win: interior(0.3) });
    b.beam([hx + 11.2, 0, hz + s * 2.2], [hx + 3.4, hy - 1.2, hz + s * 0.4], 0.09, 0.09, STEEL);
    b.box(hx + 6.6, 0, hz + s * 8.5 - 0.9, hx + 8.2, 0.5, hz + s * 8.5 + 0.9, 0xb9b6ae);
  }
  b.box(hx + 1.5, hy - 0.5, hz - 0.5, hx + 3.0, hy + 0.5, hz + 0.5, STEEL, { faces: 'NESWTB' });
  // the landing stage under the wheel, where the capsules are boarded
  b.box(hx - 2.6, BED, hz - 7.5, hx + 1.4, 0.45, hz + 7.5, 0xb9b6ae, { faces: 'NSWT' });
  b.box(hx - 2.6, 0.45, hz - 7.5, hx - 2.4, 1.35, hz + 7.5, WHITE, { faces: 'NESWT' });
  // people on the landing stage, and more waiting on the bank
  for (let i = 0; i < 6; i++) k.person(hx - 1.8 + k.rand() * 2.8, hz - 6.5 + k.rand() * 13, 0.45);
  for (let i = 0; i < 9; i++) k.person(EAST + 0.8 + k.rand() * 4.4, hz - 13 + k.rand() * 26);
  k.lights.push({ x: hx + 2, z: hz, r: 16, color: '#bcd8ff', k: 0.55 });
}

// ---------------------------------------------------------------------------
// The lamps of the two streets that cross the river
// ---------------------------------------------------------------------------

/**
 * Street lamps along the streets that lead to the two bridges, on the land
 * only: on the bridges themselves a lamp would stand in a tower's leg, or
 * where the bridge has lanterns of its own.
 */
export function bridgeStreetLamps(k: Build): void {
  for (const z of [TOWER_Z, WESTMINSTER_Z]) {
    const stops: [number, number][] = [[STRAND_X + 16, EMBANKMENT_X - 8], [SOUTH_BANK_X - 8, SOUTH_BANK_X - 7]];
    for (const [xa, xb] of stops) {
      let n = 0;
      for (let x = xa; x <= xb + 0.01; x += 11) {
        const side = n++ % 2 ? 1 : -1;
        k.lamp(x, z + side * 6.3, side > 0 ? -Math.PI / 2 : Math.PI / 2);
      }
    }
  }
}
