// The Wangan, the Bayshore Route: its ramp out of the avenue, the first bridge,
// Daikoku with its ramps and its parking area, the Bay Bridge, and Tatsumi's
// parking area on the loop at its west end. The lines it follows are in
// plan.ts.

import { interior } from '../../engine/geo';
import { area, rect, type P2 } from '../../engine/ground';
import { buildPath } from '../../engine/paths';
import { CONCRETE, roadDeck, type DeckOpts } from '../../engine/roads';
import type { Build } from '../../engine/tile';
import { sample, toSegs, type Piece } from '../../engine/lines';
import {
  AVENUE, DAIKOKU, DAIKOKU_BAYS, DAIKOKU_BYPASS, DAIKOKU_RING, ROTARY, SHORE, TATSUMI, TATSUMI_LOOP, TOKYO, WANGAN, WANGAN_NORTH, WANGAN_WEST, WATER,
} from './plan';
import { dekotora, mast, standingCar, vending } from '../../engine/props';

const WHITE = 0xf1eee6, PAINT = 0xf2efe6;
const SODIUM = '#ffb866';

/** Whether a point lies inside a shape. */
export function inside(shape: P2[], x: number, z: number): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [xi, zi] = shape[i], [xj, zj] = shape[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

export function buildWangan(k: Build): void {
  const b = k.b;
  const deck = (pieces: Piece[], hw: number, o: Partial<DeckOpts> = {}): void =>
    roadDeck(k, buildPath(toSegs(pieces), false), hw, { thick: 0.9, wall: 0.9, lanes: 2, lift: 0.05, ...o });

  /** Columns under a road, one every so often, wherever `ok` says one may stand. */
  const piers = (pieces: Piece[], hw: number, every: number, ok: (x: number, z: number) => boolean = () => true, thick = 0.9): void => {
    const pts = sample(pieces, 1);
    let s = 0, next = every / 2;
    for (let i = 1; i + 1 < pts.length; i++) {
      s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
      if (s < next) continue;
      const [x, y, z] = pts[i];
      const base = inside(WATER, x, z) ? -1.7 : 0, top = y - thick + 0.05;
      // too low for a column, or something is in the way: try again a little further on
      if (top - base < 2.2 || !ok(x, z)) {
        next = s + 1.5;
        continue;
      }
      next = s + every;
      const across = Math.atan2(pts[i + 1][2] - pts[i - 1][2], pts[i + 1][0] - pts[i - 1][0]) + Math.PI / 2;
      b.obox(x, (top + base) / 2, z, 0.7, (top - base) / 2, 0.7, across, CONCRETE);
      b.obox(x, top - 0.5, z, Math.max(1, hw - 1), 0.5, 0.9, across, CONCRETE, { faces: 'B' });
    }
  };

  /** A string of sodium lamps along both edges of a road. */
  const lamps = (pieces: Piece[], hw: number, every = 9): void => {
    const pts = sample(pieces, 1);
    for (let i = Math.round(every / 2); i + 1 < pts.length; i += every) {
      const tx = pts[i + 1][0] - pts[i - 1][0], tz = pts[i + 1][2] - pts[i - 1][2], l = Math.hypot(tx, tz) || 1;
      for (const side of [-1, 1]) {
        k.glows.push({ x: pts[i][0] - (tz / l) * (hw - 0.22) * side, y: pts[i][1] + 1.35, z: pts[i][2] + (tx / l) * (hw - 0.22) * side, sx: 0.4, sy: 0.4, sz: 0.4, color: SODIUM });
      }
    }
  };

  /** How high a line of pieces is where it passes nearest to a point. */
  const heightOn = (pieces: Piece[]): ((x: number, z: number) => number) => {
    const pts = sample(pieces, 1);
    return (x, z) => pts.reduce((best, p) => (Math.hypot(p[0] - x, p[2] - z) < Math.hypot(best[0] - x, best[2] - z) ? p : best))[1];
  };
  const northY = heightOn(WANGAN_NORTH), westY = heightOn(WANGAN_WEST);

  // -------------------------------------------------------------------------
  // The road itself
  // -------------------------------------------------------------------------

  // the ramp out of the avenue, round to the first bridge, and down that to Daikoku
  deck(WANGAN_NORTH.slice(1, 2), WANGAN.rampHalf, { skirt: 3.3, step: 1.5 });
  deck(WANGAN_NORTH.slice(2), WANGAN.half);
  lamps(WANGAN_NORTH.slice(1, 2), WANGAN.rampHalf);
  lamps(WANGAN_NORTH.slice(2), WANGAN.half);
  // the ramp's columns keep out of the street that crosses under it; the first bridge hangs from its tower
  piers(WANGAN_NORTH.slice(1, 4), 4, 13, (x, z) => Math.abs(x - TOKYO.mid) > 8 && z < SHORE.arm.z - 2);
  // on Daikoku: down the east side, through the parking area, up the west side
  deck(DAIKOKU_RING, WANGAN.slip, { lanes: 1, skirt: 2.4, step: 1.5, wall: 0.7, thick: 0.7 });
  piers(DAIKOKU_RING, WANGAN.slip, 11, undefined, 0.7);
  deck(DAIKOKU_BYPASS, WANGAN.slip, { lanes: 1, lift: 0.08, wall: 0.7, thick: 0.7 });
  // the bypass's columns stand clear of the rest house and of the bays
  piers(DAIKOKU_BYPASS, WANGAN.slip, 12, (x) => x < 59 || x > 75, 0.7);
  lamps(DAIKOKU_RING, WANGAN.slip, 11);
  lamps(DAIKOKU_BYPASS, WANGAN.slip, 11);
  // the Bay Bridge, and the loop at Tatsumi
  deck(WANGAN_WEST, WANGAN.half);
  deck(TATSUMI_LOOP, WANGAN.slip, { lanes: 1, wall: 0.7, thick: 0.7 });
  piers(TATSUMI_LOOP, WANGAN.slip, 9, undefined, 0.7);
  piers(WANGAN_WEST.slice(1), 5, 8, (x) => x < SHORE.pier.x1 - 1);
  lamps(WANGAN_WEST, WANGAN.half);
  lamps(TATSUMI_LOOP, WANGAN.slip, 7);

  // -------------------------------------------------------------------------
  // The two bridges. Both are cable-stayed: the deck hangs from towers by fans of cables.
  // -------------------------------------------------------------------------

  const lit = interior(0.5);
  {
    // The Bay Bridge: two towers, each a pair of legs with the road between
    // them, joined below the road and near the top, like a letter H.
    const z = 72, top = 47, out = WANGAN.half + 2.4;
    for (const x of [13, 37]) {
      for (const side of [-1, 1]) {
        const lz = z + side * out;
        b.box(x - 1.25, -1.7, lz - 1.25, x + 1.25, westY(x, z) - 1, lz + 1.25, WHITE, { win: lit });
        b.box(x - 1.0, westY(x, z) - 1, lz - 1.0, x + 1.0, top, lz + 1.0, WHITE, { win: lit });
        b.box(x - 1.2, top, lz - 1.2, x + 1.2, top + 1.1, lz + 1.2, 0xdfe6ee, { win: lit });
        // a fan of cables to the edge of the deck, to either side of the leg
        for (const way of [-1, 1]) {
          for (let n = 1; n <= 5; n++) {
            const dx = way * (1.6 + n * 2.05);
            b.beam([x, top - 0.6 - n * 2.1, lz - side * 0.95], [x + dx, westY(x + dx, z) + 0.95, z + side * (WANGAN.half - 0.2)], 0.11, 0.11, WHITE, { win: lit });
          }
        }
        k.glows.push({ x, y: top + 1.6, z: lz, sx: 0.7, sy: 0.7, sz: 0.7, color: '#ff3b3b' });
      }
      b.box(x - 0.95, westY(x, z) - 3.2, z - out, x + 0.95, westY(x, z) - 1.2, z + out, WHITE, { faces: 'NESWTB', win: lit });
      b.box(x - 0.9, top - 6.5, z - out, x + 0.9, top - 4.3, z + out, WHITE, { faces: 'NESWTB', win: lit });
      k.lights.push({ x, z, r: 18, color: '#dfeaff', k: 0.55 });
    }
    // a white girder along each edge of the span, from one shore to the other
    for (const side of [-1, 1]) {
      const gz = z + side * (WANGAN.half + 0.3);
      for (let x = SHORE.pier.x1; x < DAIKOKU.x0 - 2; x += 4) {
        const y0 = westY(x, z), y1 = westY(x + 4, z);
        b.quad([x, y0 - 2.1, gz], [x + 4, y1 - 2.1, gz], [x + 4, y1 + 0.2, gz], [x, y0 + 0.2, gz], [0, 0, side], 0xdfe6ee);
      }
    }
  }
  {
    // The first bridge: one tower astride the road, its two legs leaning in to
    // meet above it, and a single fan of cables down to the road's middle.
    const x = 96, z = (SHORE.arm.z + DAIKOKU.z0) / 2 - 1, top = 43, out = WANGAN.half + 2.8;
    for (const side of [-1, 1]) {
      b.beam([x + side * out, -1.7, z], [x + side * 0.8, top - 8, z], 1.25, 0.85, WHITE, { win: lit });
      for (const way of [-1, 1]) {
        for (let n = 1; n <= 4; n++) {
          const dz = way * (1.5 + n * 3.1);
          b.beam([x + side * 0.45, top - 2.5 - n * 2.2, z], [x + side * 0.5, northY(x, z + dz) + 0.6, z + dz], 0.11, 0.11, WHITE, { win: lit });
        }
      }
    }
    b.box(x - 1.05, top - 9, z - 1.05, x + 1.05, top, z + 1.05, WHITE, { win: lit });
    b.box(x - out, northY(x, z) - 3.2, z - 0.95, x + out, northY(x, z) - 1.2, z + 0.95, WHITE, { faces: 'NESWTB', win: lit });
    k.glows.push({ x, y: top + 0.6, z, sx: 0.7, sy: 0.7, sz: 0.7, color: '#ff3b3b' });
    k.lights.push({ x, z, r: 18, color: '#dfeaff', k: 0.55 });
  }

  // -------------------------------------------------------------------------
  // Signs over the road: green boards, as on every expressway in Japan
  // -------------------------------------------------------------------------

  /** A beam across the road on two posts, with a board that faces each way. `yaw` is the way the road runs. */
  const gantry = (x: number, z: number, yaw: number, y: number, hw: number, ahead: string, behind: string): void => {
    const rx = -Math.sin(yaw), rz = Math.cos(yaw), POST = 0x6b7076;
    // its posts stand on the road's low walls
    for (const side of [-1, 1]) b.obox(x + rx * (hw - 0.23) * side, y + 3.3, z + rz * (hw - 0.23) * side, 0.2, 3.3, 0.2, yaw, POST);
    b.obox(x, y + 6.5, z, 0.2, 0.25, hw, yaw, POST, { faces: 'B' });
    const fx = Math.cos(yaw), fz = Math.sin(yaw);
    // the board that traffic coming along the road reads faces back down it
    k.sign(ahead, x - fx * 0.26, y + 5.3, z - fz * 0.26, -fx, -fz, 2.5, hw * 1.7);
    k.sign(behind, x + fx * 0.26, y + 5.3, z + fz * 0.26, fx, fz, 2.5, hw * 1.7);
    b.obox(x, y + 5.3, z, 0.18, 1.35, hw * 0.86, yaw, 0x1d2a24);
  };
  gantry(8, 72, Math.PI, westY(8, 72), WANGAN.half, 'g-tatsumi', 'g-daikoku');
  gantry(96, 27, Math.PI / 2, northY(96, 27), WANGAN.half, 'g-daikoku', 'g-tokyo');
  gantry(70, AVENUE.z, 0, northY(70, AVENUE.z), WANGAN.rampHalf, 'g-daikoku', 'g-tokyo');

  // -------------------------------------------------------------------------
  // The toll gate, where the ramp leaves the avenue
  // -------------------------------------------------------------------------

  {
    const x = ROTARY.rampFrom + 5.5, z = AVENUE.z, y = northY(x, z), ROOF = 0xe9e6df;
    // three islands, a booth on each, and a roof over the two lanes
    for (const dz of [-WANGAN.rampHalf - 0.9, 0, WANGAN.rampHalf + 0.9]) {
      const base = dz === 0 ? y : 0;
      b.box(x - 1.6, base, z + dz - 0.45, x + 1.6, y + 0.5, z + dz + 0.45, 0xcfc8b8);
      b.box(x - 0.9, y + 0.5, z + dz - 0.42, x + 0.9, y + 2.5, z + dz + 0.42, 0xf2f0ea, { win: interior(0.9) });
      b.box(x - 0.14, y + 2.5, z + dz - 0.14, x + 0.14, y + 5.3, z + dz + 0.14, 0x6b7076);
    }
    b.box(x - 2.3, y + 5.3, z - WANGAN.rampHalf - 2, x + 2.3, y + 5.9, z + WANGAN.rampHalf + 2, ROOF, { top: 0x2f7a5a });
    b.box(x - 2.2, y + 5.25, z - WANGAN.rampHalf - 1.9, x + 2.2, y + 5.3, z + WANGAN.rampHalf + 1.9, 0xffffff, { faces: 'B', win: interior(0.9) });
    // which lane is which: the one for cars with a card, and the one for the rest
    for (const [dz, id] of [[-2.5, 'etc'], [2.5, 'ippan']] as const) {
      k.sign(id, x - 2.36, y + 4.5, z + dz, -1, 0, 1.25);
      k.sign(id, x + 2.36, y + 4.5, z + dz, 1, 0, 1.25);
    }
    k.lights.push({ x, z, r: 12, color: '#eafff2', k: 0.6 });
  }

  // -------------------------------------------------------------------------
  // Daikoku parking area
  // -------------------------------------------------------------------------

  {
    const d = DAIKOKU, bays = DAIKOKU_BAYS;
    area(k, rect(d.x0 + 1, d.z0 + 1, d.x1 - 0.4, d.z1 - 1), 0x5d5f66);
    // the lines between the bays of each row
    const line = (x0: number, z0: number, x1: number, z1: number): void => area(k, rect(x0, z0, x1, z1), PAINT, 0.045);
    for (const row of bays.rows) {
      for (let i = row.from; i <= row.to + 1; i++) line(bays.x0 + (i - 0.5) * bays.pitch - 0.09, row.z - 3.7, bays.x0 + (i - 0.5) * bays.pitch + 0.09, row.z + 3.7);
      line(bays.x0 + (row.from - 0.5) * bays.pitch, row.z - 3.79, bays.x0 + (row.to + 0.5) * bays.pitch, row.z - 3.61);
    }
    // a low wall along the water, on the two sides the road does not take
    b.box(d.x0 + 0.3, 0, d.z0 + 0.3, d.x0 + 0.8, 0.9, d.z1 - 0.3, CONCRETE);
    b.box(d.x0 + 0.8, 0, d.z1 - 0.8, d.x1 - 0.5, 0.9, d.z1 - 0.3, CONCRETE);

    // The rest house: a long low building with a deep roof, vending machines
    // along its front, and the place's name over it.
    const h = bays.house;
    b.box(h.x0, 0, h.z0, h.x1, 4.6, h.z1, 0xe9e3d6, { win: { cell: 2.6, storey: 4.6, lit: 0.9, kind: 2 }, seed: 0.31 });
    b.box(h.x0 - 0.8, 4.6, h.z0 - 0.5, h.x1 + 0.8, 5.3, h.z1 + 1.6, 0x4f6f78, { top: 0x3f5f68 });
    b.box(h.x0 - 0.7, 4.55, h.z1, h.x1 + 0.7, 4.6, h.z1 + 1.5, 0xffffff, { faces: 'B', win: interior(0.8) });
    const cx = (h.x0 + h.x1) / 2;
    k.sign('daikoku-pa', cx, 6.7, h.z1 + 1.55, 0, 1, 2.3);
    b.box(cx - 4.4, 5.3, h.z1 + 1.35, cx + 4.4, 7.95, h.z1 + 1.5, 0x1d2a24);
    k.sign('daikoku-pa', h.x1 + 0.85, 6.7, (h.z0 + h.z1) / 2, 1, 0, 2.3, h.z1 - h.z0);
    vending(k, h.x0 + 3.2, h.z1 + 0.6, Math.PI / 2, 4);
    k.lights.push({ x: cx, z: h.z1 + 4, r: 16, color: '#fff0d6', k: 0.6 });

    // tall masts light the bays
    for (const [x, z] of [[d.x0 + 9.6, 86.2], [77, 86.2], [93.6, 86.2], [77, 74.6]]) mast(k, x, z, 13, '#fff0d6', 24);

    // the meet's two fixtures: a dekotora with every lamp lit, and a patrol car keeping an eye on things
    dekotora(k, bays.x0 + 8 * bays.pitch + 0.4, bays.rows[0].z - 0.6, Math.PI / 2);
    standingCar(k, 93.2, 87, Math.PI, { body: 0x1c1d22, top: 0xf2f0ea, beacon: '#ff3b3b' });
    // (black at its nose and tail and white between, as a patrol car is)
    k.b.obox(93.2, 1.0, 87, 1.2, 0.5, 1.56, Math.PI, 0xf2f0ea);
  }

  // -------------------------------------------------------------------------
  // Tatsumi parking area: a deck beside the loop, up in the air, with the city behind it
  // -------------------------------------------------------------------------

  {
    const t = TATSUMI, y = WANGAN.tatsumi;
    b.box(t.x0, y - 0.7, t.z0, t.x1, y, t.z1, CONCRETE, { faces: 'NESWB' });
    area(k, rect(t.x0, t.z0, t.x1, t.z1), 0x5d5f66, y + 0.01);
    // a low wall on the three sides away from the road
    b.box(t.x0, y, t.z0, t.x1, y + 0.9, t.z0 + 0.4, CONCRETE);
    b.box(t.x0, y, t.z0 + 0.4, t.x0 + 0.4, y + 0.9, t.z1, CONCRETE);
    b.box(t.x1 - 0.4, y, t.z0 + 0.4, t.x1, y + 0.9, t.z1, CONCRETE);
    for (const [x, z] of [[t.x0 + 1.5, t.z0 + 1.5], [t.x1 - 1.5, t.z0 + 1.5], [t.x0 + 1.5, t.z1 - 1.2], [t.x1 - 1.5, t.z1 - 1.2]]) {
      b.box(x - 0.6, 0, z - 0.6, x + 0.6, y - 0.7, z + 0.6, CONCRETE);
    }
    for (let i = 0; i <= 3; i++) area(k, rect(t.x0 + 1.1 + i * 3.9, t.z0 + 1, t.x0 + 1.28 + i * 3.9, t.z0 + 8), PAINT, y + 0.03);
    k.sign('tatsumi-pa', (t.x0 + t.x1) / 2, y + 3.4, t.z0 + 0.2, 0, 1, 1.8);
    b.box((t.x0 + t.x1) / 2 - 3.3, y + 2.4, t.z0 + 0.02, (t.x0 + t.x1) / 2 + 3.3, y + 4.4, t.z0 + 0.16, 0x1d2a24);
    for (const dx of [-3, 3]) b.box((t.x0 + t.x1) / 2 + dx - 0.12, y + 0.9, t.z0 + 0.04, (t.x0 + t.x1) / 2 + dx + 0.12, y + 2.4, t.z0 + 0.28, 0x6b7076);
    vending(k, t.x1 - 1.3, t.z0 + 4.4, Math.PI, 2, y);
    k.glows.push({ x: t.x0 + 0.6, y: y + 5.2, z: t.z1 - 1.2, sx: 0.7, sy: 0.22, sz: 0.7, color: '#fff0d6' });
    b.box(t.x0 + 0.45, y, t.z1 - 1.35, t.x0 + 0.75, y + 5.3, t.z1 - 1.05, 0x5d6168);
    k.lights.push({ x: (t.x0 + t.x1) / 2, z: (t.z0 + t.z1) / 2, r: 13, color: '#fff0d6', k: 0.6 });
  }
}
