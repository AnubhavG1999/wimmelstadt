// The river and the east: the Signature Bridge, the ghats, Akshardham, Bharat
// Mandapam with the Auto Expo, the vintage car rally at the National Stadium,
// and the Buddh circuit's corner.
//
// Akshardham is a place of worship and the river is sacred to many: both are
// drawn plainly and from outside. Nothing stands on Akshardham's lake, nobody
// is on its plinth, and nothing is on show at either. The cars on show are at
// the Auto Expo and at the rally, far from both, and none of them carries a
// maker's name or a badge.

import * as THREE from 'three';
import { GeoBuilder, interior, rng, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { LAWN, area, flat, oval, rect } from '../../engine/ground';
import { buildPath } from '../../engine/paths';
import { figure, lathe, pinnacle, tri, wheel } from '../../engine/parts';
import { mast, standingCar } from '../../engine/props';
import { CONCRETE } from '../../engine/roads';
import { prism, slope3, type XZ } from '../../engine/shapes';
import { DEVANAGARI, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BUFF, BUFF_SHADE, CREAM, GOLD, MARBLE, MARBLE_SHADE, RECESS, RED, RED_DARK, RED_LIGHT, arcade, archThrough, chhatri, dome, drum, niche, steps, type Facing } from './mughal';
import { BUDDH, GROUNDS, RING, WATERS, WEST_BANK, heroPlace, thing, type Thing } from './plan';

export type Model = (k: Build, t: Thing) => void;

/** The river's surface and its bed, as the tile lays them. */
const RIVER_Y = -1.4, RIVER_BED = -2.4;
/** What the street's material is told about a patch of plain paving. */
const PAVED: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

// ---------------------------------------------------------------------------
// Shapes this file needs and the kit lacks
// ---------------------------------------------------------------------------

/** A level rectangle in the air: its middle, and half its size along x and along z. */
interface Section { x: number; y: number; z: number; hx: number; hz: number }

/**
 * A solid between two level rectangles, one above the other: a leg that
 * leans, a mast that tapers. Its four sides, a lid unless `top` is false, and
 * a floor if it is asked for.
 */
function taper(b: GeoBuilder, lo: Section, hi: Section, color: number, o: { top?: number | false; bottom?: boolean; win?: WinSpec } = {}): void {
  const ring = (s: Section): V3[] => [[s.x - s.hx, s.y, s.z - s.hz], [s.x + s.hx, s.y, s.z - s.hz], [s.x + s.hx, s.y, s.z + s.hz], [s.x - s.hx, s.y, s.z + s.hz]];
  const A = ring(lo), C = ring(hi), mx = (lo.x + hi.x) / 2, my = (lo.y + hi.y) / 2, mz = (lo.z + hi.z) / 2;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4, p0 = A[i], p1 = A[j], p2 = C[j], p3 = C[i];
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    // each side faces away from the middle of the solid
    if (nx * ((p0[0] + p2[0]) / 2 - mx) + ny * ((p0[1] + p2[1]) / 2 - my) + nz * ((p0[2] + p2[2]) / 2 - mz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    b.quad(p0, p1, p2, p3, [nx / l, ny / l, nz / l], color, o.win ? { win: o.win } : {});
  }
  if (o.top !== false) b.quad(C[3], C[2], C[1], C[0], [0, 1, 0], o.top ?? color);
  if (o.bottom) b.quad(A[0], A[1], A[2], A[3], [0, -1, 0], color);
}

/**
 * A flat panel on a wall that faces north, east, south or west, standing
 * `proud` of the wall's plane: `a` runs along the wall, as in mughal.ts.
 */
function panel(b: GeoBuilder, f: Facing, plane: number, a0: number, y0: number, a1: number, y1: number, color: number, proud = 0.06, o: QuadOpts = {}): void {
  const s = f === 'N' || f === 'W' ? -1 : 1, p = plane + s * proud, alongX = f === 'N' || f === 'S';
  const at = (a: number, y: number): V3 => (alongX ? [a, y, p] : [p, y, a]);
  b.quad(at(a0, y0), at(a1, y0), at(a1, y1), at(a0, y1), alongX ? [0, 0, s] : [s, 0, 0], color, o);
}

/** An oval on the ground: its middle, and half its size along x and along z. */
interface Oval { cx: number; cz: number; rx: number; rz: number }

/** A place on an oval that is `s` times as large as `o`: the angle `a` is 0 to the east and grows towards the south. */
const onOval = (o: Oval, s: number, a: number, y: number): V3 => [o.cx + Math.cos(a) * o.rx * s, y, o.cz + Math.sin(a) * o.rz * s];

interface OvalOpts { from?: number; to?: number; n?: number; win?: WinSpec }

/**
 * A band of wall round an oval, or round part of one, between two heights.
 * `s0` and `s1` say how large the oval is at the band's foot and at its head,
 * as parts of `o`'s own size: a band that grows as it rises leans outwards.
 * It faces outwards, or inwards if `inward` says so.
 */
function ovalBand(b: GeoBuilder, o: Oval, y0: number, s0: number, y1: number, s1: number, color: number, q: OvalOpts & { inward?: boolean } = {}): void {
  const from = q.from ?? 0, to = q.to ?? Math.PI * 2, n = q.n ?? 28, L = (Math.PI * (o.rx + o.rz) * (s0 + s1)) / 2, dir = q.inward ? -1 : 1;
  const lean = ((s1 - s0) * (o.rx + o.rz)) / 2 / (y1 - y0), l = Math.hypot(1, lean);
  for (let i = 0; i < n; i++) {
    const a0 = from + ((to - from) * i) / n, a1 = from + ((to - from) * (i + 1)) / n, am = (a0 + a1) / 2;
    // the way the wall faces: out from the oval, and down a little where it leans out
    const nx = Math.cos(am) / o.rx, nz = Math.sin(am) / o.rz, nl = Math.hypot(nx, nz) * l;
    b.quad(onOval(o, s0, a0, y0), onOval(o, s0, a1, y0), onOval(o, s1, a1, y1), onOval(o, s1, a0, y1), [(dir * nx) / nl, (-dir * lean) / l, (dir * nz) / nl], color, { win: q.win, L, u0: (L * (a0 - from)) / (Math.PI * 2), u1: (L * (a1 - from)) / (Math.PI * 2) });
  }
}

/** A level oval, or a slice of one, `s` times as large as `o`: it faces the sky, or the ground if `down` says so. */
function ovalFloor(b: GeoBuilder, o: Oval, y: number, s: number, color: number, q: OvalOpts & { down?: boolean } = {}): void {
  const from = q.from ?? 0, to = q.to ?? Math.PI * 2, n = q.n ?? 28;
  for (let i = 0; i < n; i++) {
    tri(b, [o.cx, y, o.cz], onOval(o, s, from + ((to - from) * i) / n, y), onOval(o, s, from + ((to - from) * (i + 1)) / n, y), [0, q.down ? -1 : 1, 0], color, { win: q.win });
  }
}

/** A level ring between two sizes of an oval, or part of one: the tread of a curved step, a kerb round a bend. It faces the sky. */
function ovalRing(b: GeoBuilder, o: Oval, y: number, s0: number, s1: number, color: number, q: OvalOpts = {}): void {
  const from = q.from ?? 0, to = q.to ?? Math.PI * 2, n = q.n ?? 28;
  for (let i = 0; i < n; i++) {
    const a0 = from + ((to - from) * i) / n, a1 = from + ((to - from) * (i + 1)) / n;
    b.quad(onOval(o, s0, a0, y), onOval(o, s0, a1, y), onOval(o, s1, a1, y), onOval(o, s1, a0, y), [0, 1, 0], color, { win: q.win });
  }
}

/** A small dome with a gilt point, for where the kit's own dome would cost too much: the shoulders of a temple's roof, a gate, the corner of a colonnade. Returns the height of its point. */
function cupola(b: GeoBuilder, x: number, y: number, z: number, r: number, color: number, sides = 8): number {
  lathe(b, x, z, [[r, y], [r * 0.9, y + r * 0.42], [r * 0.55, y + r * 0.8], [r * 0.12, y + r * 0.98]], sides, color);
  b.cyl(x, z, y + r * 0.95, y + r * 1.6, r * 0.14, 0.02, 5, GOLD, { cap: false });
  return y + r * 1.6;
}

// ---------------------------------------------------------------------------
// The Signature Bridge
// ---------------------------------------------------------------------------

/**
 * The Signature Bridge's pylon, its cables and its lights. The deck, its
 * abutments and its piers are the tile's.
 *
 * As at Wazirabad, the pylon stands by the east bank and leans back to the
 * east, away from the river: two legs of steel, one either side of the deck,
 * that meet above it and bend like a bow into a mast with a box of glass at
 * its head. The stays fan down to the deck over the water on its west side,
 * and the back-stays go down behind it to the east.
 */
function signatureBridge(k: Build, t: Thing): void {
  const b = k.b, H = t.h, cz = t.z + t.d / 2, road = RING.deck + 0.04;
  const STEEL = 0xf2eee2, TRIM = 0xd6cfbc, CABLE = 0xf7f8f5, GLASS = 0xa9cad8;
  /** Half the deck's width: two carriageways side by side. Traffic passes between the legs, which stand outside this. */
  const half = RING.off + RING.half;
  // (each leg springs from a foot that stands 2.6 above the road, and by the time it leans in over the deck's edge it is 3.5 above it)
  const xb = t.x + 1.5, stance = t.d / 2 - 0.7, foot = road + 2.6;
  // the bow in elevation: how high, and how far it has leant back to the east by then
  const knee = H * 0.445, shoulder = H * 0.85;
  const LEAN: [number, number][] = [[foot, 1.0], [H * 0.27, 4.3], [knee, 7.3], [H * 0.65, 9.1], [shoulder, 10.1], [H, 10.65]];
  const leanAt = (y: number): number => {
    let i = 1;
    while (i < LEAN.length - 1 && LEAN[i][0] < y) i++;
    const [y0, x0] = LEAN[i - 1], [y1, x1] = LEAN[i];
    return xb + x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
  };
  // the mast above the knee: half its depth along the bridge, and half its thickness across it
  const deep = (y: number): number => 2.5 - (0.8 * (y - knee)) / (shoulder - knee), thick = (y: number): number => 1.25 - (0.4 * (y - knee)) / (shoulder - knee);

  // --- two feet of concrete beside the deck, and a leg of steel on each ---
  for (const s of [-1, 1]) {
    const za = cz + s * (stance - 0.8), zb = cz + s * (stance + 0.7);
    b.box(xb - 1.5, RIVER_BED, Math.min(za, zb), xb + 2.3, foot, Math.max(za, zb), CONCRETE, { top: 0xcfc9bc });
    // (the leg at any height: it leans in towards the other one as it rises, and grows deeper)
    const leg = (y: number, more = 0): Section => {
      const u = (y - foot) / (knee - foot), bend = (LEAN[1][0] - foot) / (knee - foot);
      return { x: leanAt(y), y, z: cz + s * (stance - (stance - 0.6) * u), hx: (u < bend ? 1.2 + (0.4 * u) / bend : 1.6 + (0.6 * (u - bend)) / (1 - bend)) + more, hz: 0.6 + more };
    };
    taper(b, leg(foot), leg(LEAN[1][0]), STEEL, { top: false });
    taper(b, leg(LEAN[1][0]), leg(knee), STEEL, { top: false });
    // a band where each length of steel is bolted to the next
    for (const u of [0.24, 0.5, 0.76]) taper(b, leg(foot + (knee - foot) * u - 0.13, 0.06), leg(foot + (knee - foot) * u + 0.13, 0.06), TRIM, { bottom: true });
    k.glows.push({ x: xb - 0.7, y: foot + 0.22, z: cz + s * stance, sx: 0.5, sy: 0.34, sz: 0.7, color: '#fff0c8' });
  }
  // --- the mast, in two lengths, banded like the legs ---
  const shaft = (y: number, more = 0): Section => ({ x: leanAt(y), y, z: cz, hx: deep(y) + more, hz: thick(y) + more });
  taper(b, shaft(knee), shaft(LEAN[3][0]), STEEL, { top: false, bottom: true });
  taper(b, shaft(LEAN[3][0]), shaft(shoulder), STEEL, { top: false });
  for (const u of [0.03, 0.27, 0.51, 0.75]) taper(b, shaft(knee + (shoulder - knee) * u - 0.15, 0.07), shaft(knee + (shoulder - knee) * u + 0.15, 0.07), TRIM, { bottom: true });

  // --- the head: a box of glass with a slanted top, in a frame of steel ---
  {
    const x0 = leanAt(shoulder), x1 = leanAt(H), lit = { win: interior(1.5) };
    const hx0 = deep(shoulder) - 0.08, hz0 = thick(shoulder) - 0.08, hx1 = 1.35, hz1 = 0.65, back = H - 1.5;
    const lo = (sx: number, sz: number): V3 => [x0 + sx * hx0, shoulder, cz + sz * hz0];
    const hi = (sx: number, sz: number): V3 => [x1 + sx * hx1, sx < 0 ? H : back, cz + sz * hz1];
    b.quad(lo(-1, -1), lo(-1, 1), hi(-1, 1), hi(-1, -1), [-1, 0.05, 0], GLASS, lit);
    b.quad(lo(1, 1), lo(1, -1), hi(1, -1), hi(1, 1), [1, 0.05, 0], GLASS, lit);
    for (const s of [-1, 1]) b.quad(lo(-1, s), lo(1, s), hi(1, s), hi(-1, s), [0, 0.03, s], GLASS, lit);
    b.quad(hi(-1, 1), hi(1, 1), hi(1, -1), hi(-1, -1), [0.52, 0.85, 0], STEEL);
    taper(b, shaft(shoulder - 0.2, 0.08), shaft(shoulder + 0.25, 0.08), TRIM, { bottom: true });
    // (two bars of its frame, round the glass)
    for (const u of [0.36, 0.7]) {
      const y = shoulder + (back - shoulder) * u, at = (dy: number): Section => ({ x: x0 + (x1 - x0) * u, y: y + dy, z: cz, hx: hx0 + (hx1 - hx0) * u + 0.05, hz: hz0 + (hz1 - hz0) * u + 0.05 });
      taper(b, at(-0.1), at(0.1), STEEL, { bottom: true });
    }
    // a rod on its highest corner, with a red lamp for aircraft
    b.cyl(x1 - hx1 + 0.25, cz, H - 0.1, H + 1.7, 0.07, 0.03, 4, 0xd7dade, { cap: false });
    k.glows.push({ x: x1 - hx1 + 0.25, y: H + 1.85, z: cz, sx: 0.34, sy: 0.34, sz: 0.34, color: '#ff4a3c' });
  }

  // --- the stays: eight pairs, from the mast's front edge down to the deck's two edges over the river ---
  const wall = road + 0.9, edge = half - 0.22, PAIRS = 8, a0 = WEST_BANK + 2.5, a1 = xb - 2.5, step = (a1 - a0) / (PAIRS - 1);
  // (a girder along each edge of the deck, which the stays are anchored to)
  for (const s of [-1, 1]) b.box(a0 - 0.5, wall, cz + s * edge - 0.14, a1 + 0.5, wall + 0.16, cz + s * edge + 0.14, TRIM);
  for (let i = 0; i < PAIRS; i++) {
    // (the lowest on the mast goes to the nearest place on the deck, as on a harp)
    const y = knee + 2 + (i * (shoulder - knee - 3.2)) / (PAIRS - 1), x = a1 - i * step;
    for (const s of [-1, 1]) b.beam([leanAt(y) - deep(y) + 0.1, y, cz + s * thick(y) * 0.8], [x, wall + 0.1, cz + s * edge], 0.075, 0.075, CABLE);
    if (i % 2 === 0) k.glows.push({ x: leanAt(y + 1.2) - deep(y + 1.2) - 0.06, y: y + 1.2, z: cz, sx: 0.14, sy: 0.9, sz: 0.5, color: '#eaf4ff' });
  }
  // --- the back-stays: three pairs, down to a block of concrete beyond the road's bend on the east bank ---
  {
    // the road turns south behind the pylon, on a bank as high as the deck: the block stands just outside its outer edge
    const turnX = RING.x2 - 10, turnZ = RING.bridgeZ + 10, outer = 10 + half + 0.6;
    const z0 = cz - 3, z1 = cz + 1, x0 = turnX + Math.sqrt(outer * outer - (z1 - turnZ) ** 2), x1 = Math.min(k.board.x1 - 0.5, x0 + 2.3), top = road + 1.8;
    b.box(x0, 0, z0, x1, top - 0.5, z1, CONCRETE);
    b.box(x0 + 0.3, top - 0.5, z0 + 0.4, x1 - 0.3, top, z1 - 0.4, CONCRETE, { top: 0xcfc9bc });
    for (let i = 0; i < 3; i++) {
      const y = knee + 5 + i * ((shoulder - knee - 7) / 2);
      for (const s of [-1, 1]) b.beam([leanAt(y) + deep(y) - 0.1, y, cz + s * thick(y) * 0.8], [(x0 + x1) / 2, top - 0.05, (z0 + z1) / 2 + s * (0.5 + i * 0.3)], 0.075, 0.075, CABLE);
    }
    k.lights.push({ x: x0 - 3, z: cz, r: 12, color: '#fff3dc', k: 0.6 });
  }

  // --- lamps along the deck, on its low walls, and light on the pylon by night ---
  for (const [j, s] of [[0, -1], [3, 1], [6, -1]]) k.lamp(a1 - (j + 0.5) * step, cz + s * edge, (-s * Math.PI) / 2, wall + 0.16);
  k.lights.push({ x: leanAt(knee), z: cz, r: 17, color: '#fff3dc', k: 0.8 }, { x: leanAt(shoulder), z: cz, r: 6, color: '#fff3dc', k: 0.9 }, { x: leanAt(H * 0.65), z: cz, r: 5, color: '#fff3dc', k: 0.9 }, { x: xb, z: cz - stance, r: 8, color: '#fff0c8', k: 0.6 }, { x: xb, z: cz + stance, r: 8, color: '#fff0c8', k: 0.6 });
}

// ---------------------------------------------------------------------------
// The ghats
// ---------------------------------------------------------------------------

const WOOD = 0x8a6238, PLANK = 0xc9a876;

/** The outline of a small boat: `L` and `W` are half its length and half its beam, and its bow is at +x. */
const hull = (L: number, W: number): XZ[] => [[-L, -W * 0.62], [L * 0.35, -W], [L, 0], [L * 0.35, W], [-L, W * 0.62]];

/**
 * A small wooden boat of the river, built at its own middle with its bow
 * along +x and its waterline at y = 0: a painted band round its top, two
 * thwarts, and a boatman with his pole if it is under way.
 */
function riverBoat(b: GeoBuilder, band: number, crew: boolean): void {
  prism(b, hull(2.3, 0.72), -0.3, 0.4, WOOD, { top: PLANK });
  prism(b, hull(2.36, 0.78), 0.22, 0.47, band, { top: false });
  for (const x of [-0.9, 0.5]) b.box(x - 0.14, 0.4, -0.6, x + 0.14, 0.5, 0.6, WOOD, { faces: 'EWT' });
  if (!crew) return;
  figure(b, -1.55, 0, 0.4, { coat: 0xf2efe6, legs: 0x5a6068, hat: 0xd94f4f, hatH: 0.16 });
  b.beam([-1.2, 2.3, 0.42], [-2.9, -0.5, 0.95], 0.05, 0.04, 0xd9c49a);
  // two who are being rowed across, sitting
  for (const [x, coat] of [[0.5, 0xf2c14e], [-0.3, 0x4fa3d8]]) {
    b.box(x - 0.24, 0.5, -0.22, x + 0.24, 1.25, 0.22, coat, { faces: 'NESW' });
    b.box(x - 0.17, 1.25, -0.17, x + 0.17, 1.6, 0.17, 0xe8c4a0);
  }
}

const GHATS = thing('ghats');
/** The round the boats make on the river, off the ghats: its four corners. */
const BOAT_ROUND: XZ[] = [[WEST_BANK + 7, GHATS.z + 8], [WEST_BANK + 11.5, GHATS.z + 8], [WEST_BANK + 11.5, GHATS.z + GHATS.d - 8], [WEST_BANK + 7, GHATS.z + GHATS.d - 8]];
const boatRound = () => buildPath([{ t: 'ring', pts: BOAT_ROUND, y: RIVER_Y, r: 2.2 }], true);

/**
 * The ghats on the Yamuna's west bank: three broad flights of steps down
 * into the water, with platforms of red stone between them, two of them with
 * a chhatri. Boats are tied up at the foot of the steps and two are out on
 * the river. People stand on the steps, and marigolds are sold on the
 * platforms. By night small lamps burn along the water's edge.
 */
function ghats(k: Build, t: Thing): void {
  const b = k.b, x0 = WEST_BANK, rand = rng(70110), MARIGOLD = [0xf59a1c, 0xf2c200], WICKER = 0xa9804e;
  // from north to south: a platform, a flight, a platform with a chhatri, a flight, another, a flight, a platform
  const PARTS: [kind: 'burj' | 'flight', from: number, to: number][] = [['burj', 1, 5], ['flight', 5, 19], ['burj', 19, 24.5], ['flight', 24.5, 39], ['burj', 39, 44.5], ['flight', 44.5, 56], ['burj', 56, 59.5]];
  const TREADS = 6, TREAD = 0.6, top = 0.06, low = -1.8, rise = (top - low) / TREADS;
  let burjs = 0;
  for (const [kind, from, to] of PARTS) {
    const za = t.z + (from / 60) * t.d, zb = t.z + (to / 60) * t.d, zc = (za + zb) / 2;
    if (kind === 'flight') {
      steps(b, 'E', x0, za, zb, low, top, TREADS, TREAD, BUFF);
      // people on the steps, some of them down by the water
      for (let i = 0; i < 5; i++) {
        const tread = Math.floor(rand() * 5);
        k.person(x0 + (tread + 0.5) * TREAD, za + 0.8 + rand() * (zb - za - 1.6), top - tread * rise);
      }
      // a boat tied up at the foot of the flight, and a small lamp at either end of the lowest dry step
      b.moved(x0 + TREADS * TREAD + 0.95, RIVER_Y, zc + (burjs % 2 ? 2.6 : -2.2), Math.PI / 2 + (burjs % 2 ? 0.12 : -0.1), () => riverBoat(b, [0x2f7fb5, 0x3f9a6a, 0xd8432b][burjs % 3], false));
      for (const z of [za + 0.5, zc, zb - 0.5]) k.glows.push({ x: x0 + 3.5 * TREAD, y: top - 3 * rise + 0.12, z, sx: 0.16, sy: 0.16, sz: 0.16, color: '#ffc46a' });
      k.lights.push({ x: x0 + 2, z: zc, r: 9, color: '#ffd9a0', k: 0.5 });
      continue;
    }
    // a platform: red stone from the river's bed, with a floor of buff
    const reach = burjs === 1 || burjs === 2 ? 4.5 : 3.7, y = 0.34;
    b.box(x0, RIVER_BED, za, x0 + reach, y - 0.1, zb, RED_LIGHT);
    b.box(x0 + 0.15, y - 0.1, za + 0.15, x0 + reach - 0.15, y, zb - 0.15, BUFF, { top: BUFF_SHADE });
    if (burjs === 1 || burjs === 2) {
      chhatri(b, x0 + reach - 1.55, y, zc, 1.1, 1.55, BUFF, RED_LIGHT, { kind: 'round' });
      k.lights.push({ x: x0 + reach - 1.5, z: zc, r: 7, color: '#ffd9a0', k: 0.55 });
    }
    // a marigold seller on it: baskets heaped with flowers, orange and yellow
    if (burjs !== 2) {
      const sx = x0 + 1.0, sz = burjs === 1 ? za + 0.75 : zc;
      figure(b, sx, sz, y, { coat: [0xc2356b, 0x2f8f6f, 0x7a3fa0][burjs % 3], legs: 0x5e2a4a, hat: 0x2a211c, hatH: 0.1 });
      [[0.95, -0.3], [1.0, 0.38], [0.15, 0.92]].forEach(([dx, dz], i) => {
        b.cyl(sx + dx, sz + dz, y, y + 0.24, 0.36, 0.44, 6, WICKER, { cap: false });
        b.cyl(sx + dx, sz + dz, y + 0.24, y + 0.52, 0.42, 0.12, 6, MARIGOLD[(i + burjs) % 2], { cap: MARIGOLD[(i + burjs) % 2] });
      });
    }
    burjs++;
  }
  // garlands for sale, hung on a line between two poles on the platform with the first chhatri
  {
    const za = t.z + (19 / 60) * t.d, x = x0 + 0.55;
    for (const z of [za + 2.2, za + 5.0]) b.box(x - 0.05, 0.34, z - 0.05, x + 0.05, 2.3, z + 0.05, 0xd9c49a, { faces: 'NESW' });
    b.box(x - 0.03, 2.2, za + 2.2, x + 0.03, 2.27, za + 5.0, 0xd9c49a, { faces: 'EWT' });
    for (let i = 0; i < 6; i++) b.box(x - 0.07, 1.25 + (i % 2) * 0.2, za + 2.5 + i * 0.44 - 0.09, x + 0.07, 2.2, za + 2.5 + i * 0.44 + 0.09, MARIGOLD[i % 2], { faces: 'NESWB' });
  }

  // --- two boats out on the river, going slowly round ---
  const g = new GeoBuilder();
  riverBoat(g, 0xd8432b, true);
  const geo = g.build(), mat = k.mat.city(), path = boatRound();
  const boats = [0, 0.5].map((at) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = 'river-boat';
    m.castShadow = true;
    k.group.add(m);
    return { m, s: at * path.length };
  });
  const p = new THREE.Vector3(), a = new THREE.Vector3(), c = new THREE.Vector3();
  const place = (time: number): void => {
    boats.forEach((boat, i) => {
      path.at(boat.s, p); path.at(boat.s + 0.6, a); path.at(boat.s - 0.6, c);
      boat.m.position.set(p.x, RIVER_Y + 0.03 * Math.sin(time * 1.3 + i * 2), p.z);
      boat.m.rotation.y = -Math.atan2(a.z - c.z, a.x - c.x);
    });
  };
  place(0);
  k.each((dt, time) => {
    for (const boat of boats) boat.s = (boat.s + 1.5 * dt) % path.length;
    place(time);
  });
}

// ---------------------------------------------------------------------------
// Akshardham
// ---------------------------------------------------------------------------

const PINK = 0xe3b49c, PINK_LIGHT = 0xeec9b6, PINK_DARK = 0xcf977e, PINK_DEEP = 0xb97a62, SHADE = 0x5a4030;

/** An elephant in low relief on a wall, walking the way `dir` points along it: its body, its head and trunk, and two legs. `y` is what it walks on, and `s` its size. */
function elephant(b: GeoBuilder, f: Facing, plane: number, a: number, y: number, dir: number, s: number, color: number): void {
  for (const [a0, y0, a1, y1] of [[-0.36, 0.28, 0.3, 0.74], [0.26, 0.4, 0.52, 0.8], [0.47, 0.05, 0.58, 0.46], [0.1, 0, 0.27, 0.3], [-0.34, 0, -0.17, 0.3]]) {
    panel(b, f, plane, a + dir * a0 * s, y + y0 * s, a + dir * a1 * s, y + y1 * s, color);
  }
}

/**
 * Akshardham: the mandir of pink sandstone on its plinth, as an island in
 * its lake, and the colonnade of red stone round the back and the two flanks
 * of its ground. It is drawn from outside only, and plainly: nobody is on
 * the plinth and nothing is on the water.
 *
 * It looks east, away from the river, as it does in life, so its steps come
 * down towards the edge of the board. The plinth has its band of elephants,
 * who walk round it the way a visitor does, and a terrace of white marble.
 * Nine domes stand on the roof: the great one in the middle, one over each
 * wing and over the porch and the sanctum's back, and four on its shoulders.
 */
function akshardham(k: Build, t: Thing): void {
  const b = k.b, [gx0, gz0, gx1, gz1] = GROUNDS[t.id], lake = WATERS[t.id].at;
  // (the plinth is a little shorter than its lot from north to south, so that the lake is wide enough to be seen as water)
  const x0 = t.x, x1 = t.x + t.w, z0 = t.z + 0.7, z1 = t.z + t.d - 0.7, cz = (z0 + z1) / 2;

  // --- its ground: paving of red stone round the lake, a kerb of marble at the water, and a garden to the south ---
  flat(k.street, rect(gx0, gz0, gx1, gz1), 0.02, 0xd3a48b, { win: PAVED, holes: [rect(...lake)] });
  b.box(lake[0], 0, lake[1] - 0.3, lake[2] + 0.3, 0.14, lake[1], MARBLE_SHADE);
  b.box(lake[0], 0, lake[3], lake[2] + 0.3, 0.14, lake[3] + 0.3, MARBLE_SHADE);
  for (const [a, c] of [[lake[1], cz - 3], [cz + 3, lake[3]]]) b.box(lake[2], 0, a, lake[2] + 0.3, 0.14, c, MARBLE_SHADE);
  const gm = (gx0 + 1 + gx1) / 2, ga = lake[3] + 1.3, gb = gz1 - 2.2;
  for (const [a, c] of [[gx0 + 1.9, gm - 0.9], [gm + 0.9, gx1 - 0.8]]) {
    const mx = (a + c) / 2, mz = (ga + gb) / 2;
    area(k, rect(a, ga, c, gb), LAWN, 0.03);
    // a bed in each lawn: dark red leaves round yellow-green ones
    area(k, oval(mx, mz, 1.7, 2.5, 14), 0x7d3040, 0.04);
    area(k, oval(mx, mz, 1.05, 1.75, 12), 0xb4c35a, 0.05);
    for (const z of [ga + 0.7, gb - 0.7]) for (const x of [a + 0.7, c - 0.7]) k.tree(x, z, 0.42, true);
  }
  for (const [x, z] of [[gm - 0.3, ga + 1.2], [gm + 0.35, ga + 3.4], [gm - 0.2, gb - 1.6], [gm + 2.2, gb + 0.35], [gm - 3.4, gb + 0.4], [gm - 4.6, ga - 0.55], [gm + 4.1, ga - 0.5]]) k.person(x, z);

  // --- the plinth: pink stone out of the water, the band of elephants, and a terrace of white marble ---
  // (the steps are let into its east side, between two wings of it)
  const sx = x1 - 1.8, sa = cz - 2.5, sb = cz + 2.5, P1 = 0.9, P2 = 1.95, T = 2.2, deep = -1.5, IVORY = 0xf3dfd2;
  b.box(x0, deep, z0, sx, P1, z1, PINK_DARK, { faces: 'NSWT' });
  b.box(x0 + 0.2, P1, z0 + 0.2, sx, P2, z1 - 0.2, PINK_DEEP, { faces: 'NSW' });
  b.box(x0 + 0.05, P2, z0 + 0.05, sx, T, z1 - 0.05, MARBLE, { faces: 'NSWTB' });
  for (const [a, c] of [[z0, sa], [sb, z1]]) {
    const north = a === z0;
    b.box(sx, deep, a, x1, P1, c, PINK_DARK, { faces: 'NEST' });
    b.box(sx, P1, north ? a + 0.2 : a, x1 - 0.2, P2, north ? c : c - 0.2, PINK_DEEP, { faces: 'NES' });
    b.box(sx, P2, north ? a + 0.05 : a, x1 - 0.05, T, north ? c : c - 0.05, MARBLE, { faces: 'NESTB' });
  }
  b.box(sx, deep, sa, x1, 0.28, sb, PINK_DARK, { faces: 'E' });
  steps(b, 'E', sx, sa, sb, 0.3, T, 5, 0.36, MARBLE);
  b.box(x1, deep, cz - 3, gx1 - 0.03, 0.3, cz + 3, PINK_DARK, { top: MARBLE_SHADE });
  const row = (f: Facing, plane: number, a0: number, a1: number, dir: number): void => {
    const n = Math.max(1, Math.round((a1 - a0) / 1.7));
    for (let i = 0; i < n; i++) elephant(b, f, plane, a0 + ((i + 0.5) * (a1 - a0)) / n, P1 + 0.08, dir, 1.12, IVORY);
  };
  row('W', x0 + 0.2, z0 + 0.5, z1 - 0.5, -1);
  row('N', z0 + 0.2, x0 + 0.5, x1 - 0.5, 1);
  row('S', z1 - 0.2, x0 + 0.5, x1 - 0.5, -1);
  row('E', x1 - 0.2, z0 + 0.5, sa - 0.2, 1);
  row('E', x1 - 0.2, sb + 0.2, z1 - 0.5, 1);
  // a low rail of marble round the terrace
  for (const [a, c, d, e] of [[x0 + 0.1, z0 + 0.1, x0 + 0.24, z1 - 0.1], [x0 + 0.24, z0 + 0.1, x1 - 0.1, z0 + 0.24], [x0 + 0.24, z1 - 0.24, x1 - 0.1, z1 - 0.1], [x1 - 0.24, z0 + 0.24, x1 - 0.1, sa], [x1 - 0.24, sb, x1 - 0.1, z1 - 0.24]]) {
    b.box(a, T, c, d, T + 0.3, e, MARBLE_SHADE);
  }

  // --- the mandir: a hall in the middle, a wing to the north and one to the south, the sanctum's back to the west and the porch to the east ---
  const W = T + 3.1, R = W + 0.6, xr = x0 + 0.6, xm = xr + 4.0, xf = sx - 0.5, lit = { round: true, lit: 1.3 };
  const roofOver = (ax0: number, az0: number, ax1: number, az1: number, y = W): void => {
    // a deep eave, and a parapet round a roof of marble
    b.box(ax0 - 0.22, y, az0 - 0.22, ax1 + 0.22, y + 0.16, az1 + 0.22, PINK_LIGHT, { faces: 'NESWTB' });
    b.box(ax0, y + 0.16, az0, ax1, y + 0.6, az1, PINK, { top: MARBLE_SHADE });
  };
  const block = (ax0: number, az0: number, ax1: number, az1: number, faces = 'NESW', y = W): void => {
    b.box(ax0, T, az0, ax1, y, az1, PINK, { faces });
    roofOver(ax0, az0, ax1, az1, y);
  };
  block(xm - 2.5, cz - 2.5, xm + 2.5, cz + 2.5);
  block(xr, cz - 2, xm - 2.5, cz + 2, 'NSW');
  arcade(b, 'W', xr, cz - 1.8, cz + 1.8, T + 0.2, 3, 2.3, SHADE, lit);
  for (const s of [-1, 1]) {
    // a wing: arches on its three open sides, and its dome on a drum
    const za = s < 0 ? z0 + 0.7 : cz + 2.5, zb = s < 0 ? cz - 2.5 : z1 - 0.7, end = s < 0 ? za : zb, zw = (za + zb) / 2;
    block(xm - 2.2, za, xm + 2.2, zb, s < 0 ? 'NEW' : 'ESW');
    arcade(b, s < 0 ? 'N' : 'S', end, xm - 1.95, xm + 1.95, T + 0.2, 3, 2.3, SHADE, lit);
    for (const f of ['E', 'W'] as const) arcade(b, f, f === 'E' ? xm + 2.2 : xm - 2.2, Math.min(end - s * 0.15, end - s * 2.25), Math.max(end - s * 0.15, end - s * 2.25), T + 0.2, 2, 2.3, SHADE, lit);
    drum(b, xm, zw, R, R + 0.8, 1.75, PINK, { sides: 10, arches: 10, lit: 0.9 });
    b.cyl(xm, zw, R + 0.8, R + 0.94, 1.95, 1.95, 10, PINK_LIGHT);
    dome(b, xm, R + 0.94, zw, 1.65, PINK_LIGHT, { kind: 'round', sides: 10, finial: 0.9 });
    // a small spire on each of its outer corners
    for (const e of [-1, 1]) pinnacle(b, xm + e * 1.9, end - s * 0.3, R, 1.15, 0.26, PINK_LIGHT);
    // the small shrine in each corner between the wing and the halls, under a spire
    for (const e of [-1, 1]) {
      const px = xm + e * 3.2, pz = cz + s * 3.4, top = T + 2.2;
      block(px - 0.85, pz - 0.85, px + 0.85, pz + 0.85, 'NESW', top);
      niche(b, e < 0 ? 'W' : 'E', px + e * 0.85, pz, T + 0.2, 0.8, 1.6, SHADE, lit);
      niche(b, s < 0 ? 'N' : 'S', pz + s * 0.85, px, T + 0.2, 0.8, 1.6, SHADE, lit);
      pinnacle(b, px, pz, top + 0.6, 1.9, 0.62, PINK_LIGHT);
      // and a dome on each shoulder of the hall's roof
      cupola(b, xm + e * 1.95, R + 0.4, cz + s * 1.95, 0.72, PINK_LIGHT);
      b.box(xm + e * 1.95 - 0.7, R, cz + s * 1.95 - 0.7, xm + e * 1.95 + 0.7, R + 0.4, cz + s * 1.95 + 0.7, PINK);
    }
  }
  // the porch: columns in front of deep shade, under a roof that steps up to a small dome
  panel(b, 'E', xm + 2.5, cz - 2.0, T + 0.05, cz + 2.0, W - 0.6, SHADE, 0.05, { win: interior(1.3) });
  for (const dz of [-2.2, -0.75, 0.75, 2.2]) b.box(xf - 0.42, T, cz + dz - 0.18, xf - 0.06, W - 0.5, cz + dz + 0.18, PINK_LIGHT, { faces: 'NESW' });
  for (const dz of [-2.2, 2.2]) b.box(xm + 3.5, T, cz + dz - 0.18, xm + 3.86, W - 0.5, cz + dz + 0.18, PINK_LIGHT, { faces: 'NESW' });
  b.box(xm + 2.5, W - 0.5, cz - 2.4, xf, W, cz + 2.4, PINK, { faces: 'NESB' });
  roofOver(xm + 2.5, cz - 2.4, xf, cz + 2.4);
  {
    const px = (xm + 2.5 + xf) / 2;
    [[1.0, 1.7], [0.75, 1.2], [0.5, 0.7]].forEach(([hx, hz], i) => b.box(px - hx, R + i * 0.34, cz - hz, px + hx, R + (i + 1) * 0.34 + 0.02, cz + hz, i % 2 ? PINK : PINK_LIGHT));
    cupola(b, px, R + 1.04, cz, 0.6, PINK_LIGHT);
    cupola(b, xr + 0.75, R + 0.34, cz, 0.68, PINK_LIGHT);
    b.box(xr + 0.1, R, cz - 0.8, xr + 1.4, R + 0.34, cz + 0.8, PINK);
  }
  for (const dz of [-2.1, 2.1]) pinnacle(b, xf - 0.3, cz + dz, R, 1.15, 0.26, PINK_LIGHT);
  // the great dome: a drum ringed with arches, an eave, a second drum, the dome, and its pot of gold
  drum(b, xm, cz, R, R + 1.9, 2.3, PINK, { sides: 14, arches: 14, lit: 1.0 });
  b.cyl(xm, cz, R + 1.9, R + 2.08, 2.6, 2.6, 14, PINK_LIGHT);
  b.cyl(xm, cz, R + 2.08, R + 3.0, 2.1, 2.1, 14, PINK, { cap: false });
  const crown = dome(b, xm, R + 3.0, cz, 2.2, PINK_LIGHT, { kind: 'round', sides: 14, tall: 1.08, finial: false });
  b.cyl(xm, cz, crown - 0.12, crown + 0.14, 0.72, 0.72, 10, PINK_DARK);
  lathe(b, xm, cz, [[0.2, crown + 0.14], [0.5, crown + 0.38], [0.52, crown + 0.58], [0.2, crown + 0.86], [0.26, crown + 0.98], [0.03, crown + 1.28]], 6, GOLD);
  // its flag, as temples of this kind fly it: red and white, on a staff above the pot
  b.cyl(xm, cz, crown + 1.2, t.h + 0.3, 0.045, 0.03, 4, 0xd9d2c0, { cap: false });
  for (const side of [-1, 1]) {
    [0xc8202c, 0xf4f1e8, 0xc8202c].forEach((color, i) => b.quad([xm + 0.06, t.h - 0.3 + i * 0.18, cz + side * 0.02], [xm + 0.96, t.h - 0.3 + i * 0.18, cz + side * 0.02], [xm + 0.96, t.h - 0.12 + i * 0.18, cz + side * 0.02], [xm + 0.06, t.h - 0.12 + i * 0.18, cz + side * 0.02], [0, 0, side], color));
  }

  // --- the parikrama: a colonnade of red stone in two tiers, with a row of small spires on its roof ---
  const CH = 2.9, DIM = { win: interior(1.2) };
  /** One arm of it. It is open towards the temple in both tiers: `inner` is the face that looks that way. Its other face has the upper tier's windows, or both tiers if `both` says so. */
  const arm = (ax0: number, az0: number, ax1: number, az1: number, inner: Facing, both = false): void => {
    b.box(ax0, 0, az0, ax1, CH, az1, RED, { faces: 'NESW' });
    b.box(ax0 - 0.14, CH, az0 - 0.14, ax1 + 0.14, CH + 0.18, az1 + 0.14, RED_LIGHT, { faces: 'NESWTB' });
    const long = ax1 - ax0 > az1 - az0, a0 = long ? ax0 : az0, len = long ? ax1 - ax0 : az1 - az0;
    const spires = Math.max(1, Math.round(len / 3)), bays = Math.max(1, Math.round(len / 1.2)), w = len / bays;
    for (let i = 0; i < spires; i++) {
      const a = a0 + ((i + 0.5) * len) / spires;
      b.cyl(long ? a : (ax0 + ax1) / 2, long ? (az0 + az1) / 2 : a, CH + 0.18, CH + 1.0, 0.44, 0.03, 4, CREAM, { phase: Math.PI / 4, cap: false });
    }
    const outer: Facing = inner === 'N' ? 'S' : inner === 'S' ? 'N' : inner === 'E' ? 'W' : 'E';
    for (const f of [inner, outer]) {
      const plane = f === 'N' ? az0 : f === 'S' ? az1 : f === 'W' ? ax0 : ax1;
      for (let i = 0; i < bays; i++) {
        for (let tier = f === inner || both ? 0 : 1; tier < 2; tier++) panel(b, f, plane, a0 + (i + 0.22) * w, 0.3 + tier * 1.4, a0 + (i + 0.78) * w, 1.25 + tier * 1.4, SHADE, 0.04, DIM);
      }
    }
  };
  /** A taller pavilion where an arm ends or turns: a block of the same stone, under a small dome, with a window high on each side. */
  const pavilion = (ax0: number, az0: number, ax1: number, az1: number): void => {
    const mx = (ax0 + ax1) / 2, mz = (az0 + az1) / 2;
    b.box(ax0, 0, az0, ax1, CH + 0.7, az1, RED, { faces: 'NESW' });
    b.box(ax0 - 0.12, CH + 0.7, az0 - 0.12, ax1 + 0.12, CH + 0.9, az1 + 0.12, RED_LIGHT, { faces: 'NESWTB' });
    cupola(b, mx, CH + 0.9, mz, 0.58, CREAM);
    for (const f of ['N', 'E', 'S', 'W'] as const) panel(b, f, f === 'N' ? az0 : f === 'S' ? az1 : f === 'W' ? ax0 : ax1, (f === 'N' || f === 'S' ? mx : mz) - 0.3, 1.9, (f === 'N' || f === 'S' ? mx : mz) + 0.3, 3.0, SHADE, 0.04, DIM);
  };
  // (the two arms end a hair inside the board's edge, eaves and all)
  const ex = gx1 - 0.2, gate = RING.x2;
  pavilion(gx0, gz0, gx0 + 1.5, gz0 + 1.5);
  pavilion(gx0, gz1 - 1.5, gx0 + 1.5, gz1);
  pavilion(ex - 1.5, gz0, ex, gz0 + 1.5);
  pavilion(ex - 1.5, gz1 - 1.5, ex, gz1);
  arm(gx0 + 0.1, gz0 + 1.5, lake[0], gz1 - 1.5, 'E');
  arm(gx0 + 1.5, gz1 - 1.3, ex - 1.5, gz1 - 0.3, 'N', true);
  arm(gx0 + 1.5, gz0 + 0.3, gate - 1.8, gz0 + 1.3, 'S');
  arm(gate + 1.8, gz0 + 0.3, ex - 1.5, gz0 + 1.3, 'S');
  // the gate in the north arm, where the road from the bridge ends: an arched way under three small domes
  {
    const GH = 4.3, za = gz0 + 0.05, zb = gz0 + 1.55;
    for (const s of [-1, 1]) b.box(Math.min(gate + s * 0.85, gate + s * 1.8), 0, za, Math.max(gate + s * 0.85, gate + s * 1.8), GH, zb, RED, { faces: 'NESW' });
    archThrough(b, 'z', gate, (za + zb) / 2, zb - za, 1.7, 0, 2.9, GH, RED, RED_DARK);
    b.box(gate - 1.9, GH, za - 0.04, gate + 1.9, GH + 0.2, zb + 0.1, RED_LIGHT, { faces: 'NESWTB' });
    cupola(b, gate, GH + 0.2, (za + zb) / 2, 0.62, CREAM);
    for (const s of [-1, 1]) cupola(b, gate + s * 1.25, GH + 0.2, (za + zb) / 2, 0.42, CREAM, 6);
    k.glows.push({ x: gate, y: 2.5, z: (za + zb) / 2, sx: 0.3, sy: 0.3, sz: 0.3, color: '#ffd9a0' });
    for (const [x, z] of [[gate - 0.4, zb + 1.2], [gate + 0.5, zb + 0.6], [gate + 3.2, zb + 0.9]]) k.person(x, z);
  }

  // --- by night it is lit warmly from all round ---
  k.lights.push(
    { x: xm, z: cz, r: 13, color: '#ffdca0', k: 0.8 }, { x: x1 + 0.5, z: cz, r: 12, color: '#ffe2ae', k: 0.7 }, { x: xm, z: z1 + 3.5, r: 15, color: '#ffe2ae', k: 0.7 },
    { x: xm, z: z0 - 2.5, r: 12, color: '#ffe2ae', k: 0.6 }, { x: gm, z: (ga + gb) / 2, r: 12, color: '#ffe9c4', k: 0.5 }, { x: gate, z: gz0 + 3, r: 8, color: '#ffd9a0', k: 0.6 },
  );
}

// ---------------------------------------------------------------------------
// Bharat Mandapam, and the Auto Expo
// ---------------------------------------------------------------------------

/** The place for a hero on the Auto Expo's forecourt, and how fast it turns there: `auto-expo` among the plan's places for heroes. */
const EXPO_HERO = { x: heroPlace('auto-expo').x, z: heroPlace('auto-expo').z, turn: heroPlace('auto-expo').turn ?? 0.35 };
/** How high the top of the turntable there is: a hero that stands on it stands at this height. */
const EXPO_TABLE = 0.3;

/** A round table that turns, at its own middle: a low drum with marks round its edge, so that its turning is seen. Its top is at `top`. */
function turntable(g: GeoBuilder, r: number, y0: number, top: number, color: number, mark: number): void {
  g.cyl(0, 0, y0, top, r, r, 24, color);
  for (let i = 0; i < 8; i++) g.moved(0, 0, 0, (i / 8) * Math.PI * 2, () => g.box(r - 1.15, top, -0.16, r - 0.3, top + 0.02, 0.16, mark, { faces: 'T' }));
}

/**
 * Bharat Mandapam, with the Auto Expo in it: an oval hall that grows wider as
 * it rises, in bands of red stone and of glass, on slanting columns. Its
 * south side is cut open towards the forecourt, right up to the red crown, so
 * that the show is seen: two cars turning on low round tables under their
 * lamps, and people looking at them. Out on the forecourt a third table
 * turns, empty: it is kept for a hero. No car carries a maker's name.
 */
function bharatMandapam(k: Build, t: Thing): void {
  const b = k.b, [gx0, , gx1, gz1] = GROUNDS[t.id], H = t.h;
  const o: Oval = { cx: t.x + t.w / 2, cz: t.z + t.d / 2, rx: t.w / 2 - 0.2, rz: t.d / 2 - 0.1 };
  const TERRA = 0xb8563e, TERRA_DARK = 0x9a4530, GLASS = 0x4f6f78, DARK = 0x2c3a40, STONE = 0xe6dfd0, FLOOR = 0xb4bac3, INNER = 0xefe9dc, COLUMN = 0xf7f4ec;
  // how high each band ends: the glass stands in whole storeys, counted from the ground
  const F = 0.5, G1 = H * 0.3, BOWL = H * 0.5, STRIP = H * 0.545, THIN = H * 0.6, PANE = H * 0.8;
  // the hall is open to the south between these two angles, and walled round the rest
  const CUT = Math.PI * 0.1, rest = { from: Math.PI - CUT, to: Math.PI * 2 + CUT, n: 17 }, mouth = { from: CUT, to: Math.PI - CUT, n: 11 };

  // --- a low step all round, the hall's floor, and the wall under the floor where the hall is open ---
  ovalBand(b, o, 0, 0.86, 0.25, 0.86, STONE);
  ovalFloor(b, o, 0.25, 0.86, STONE);
  ovalFloor(b, o, F, 0.8, FLOOR, { win: interior(0.85) });
  ovalBand(b, o, 0.25, 0.8, F, 0.8, STONE, mouth);
  // --- the bands, from the ground up: glass set back, the red bowl, a dark strip, a red band, the tall glass, and the red crown all the way round ---
  ovalBand(b, o, 0.25, 0.8, G1, 0.8, GLASS, { ...rest, win: { cell: 1.3, storey: G1 / 2, lit: 0.8, kind: 1 } });
  ovalBand(b, o, G1, 0.8, BOWL, 0.9, TERRA, rest);
  ovalBand(b, o, BOWL, 0.9, STRIP, 0.915, DARK, rest);
  ovalBand(b, o, STRIP, 0.915, THIN, 0.935, TERRA, rest);
  ovalBand(b, o, THIN, 0.935, PANE, 0.975, GLASS, { ...rest, win: { cell: 1.15, storey: H * 0.2, lit: 0.75, kind: 1 } });
  ovalBand(b, o, PANE, 0.975, H, 1, TERRA);
  ovalBand(b, o, H - 0.5, 0.975, H, 1, TERRA_DARK, { inward: true });
  ovalFloor(b, o, H - 0.5, 0.975, 0xcfc9ba);
  // the roof has a long light of glass in its middle
  ovalBand(b, o, H - 0.5, 0.5, H - 0.08, 0.5, STONE, { n: 20 });
  ovalFloor(b, o, H - 0.08, 0.5, 0x4f6f78, { n: 20, win: interior(0.9) });
  // --- inside: the wall at the back, with a show wall behind each car, and the ceiling ---
  ovalBand(b, o, F, 0.78, PANE, 0.78, INNER, { ...rest, inward: true, win: interior(0.7) });
  for (const [a, color] of [[1.18, 0x2a6fb0], [1.62, 0xc8322b]]) ovalBand(b, o, F + 0.3, 0.772, G1 + 1.6, 0.772, color, { from: Math.PI * a, to: Math.PI * (a + 0.2), n: 3, inward: true, win: interior(1.1) });
  ovalFloor(b, o, PANE, 0.975, 0xf4f1e8, { down: true, win: interior(0.9) });
  // (where the wall is cut, its thickness is seen)
  for (const [a, turn] of [[CUT, 1], [Math.PI - CUT, -1]]) {
    const pts = [[0.78, F], [0.8, 0.25], [0.8, G1], [0.9, BOWL], [0.915, STRIP], [0.935, THIN], [0.975, PANE], [0.78, PANE]].map(([s, y]) => onOval(o, s, a, y));
    for (let i = 1; i + 1 < pts.length; i++) tri(b, pts[0], pts[i], pts[i + 1], [-Math.sin(a) * turn, 0, Math.cos(a) * turn], STONE);
  }
  // --- the slanting columns under the bowl, in pairs, and two that carry the crown across the opening ---
  for (let i = 0; i <= 9; i++) {
    const a = rest.from + ((rest.to - rest.from) * i) / 9;
    for (const lean of [-0.09, 0.09]) {
      if ((i === 0 && lean < 0) || (i === 9 && lean > 0)) continue;
      b.beam(onOval(o, 0.845, a, 0.25), onOval(o, 0.812, a + lean, G1 + 0.25), 0.13, 0.13, COLUMN);
    }
  }
  for (const a of [0.3, 0.7]) b.beam(onOval(o, 0.835, Math.PI * a, 0.25), onOval(o, 0.962, Math.PI * a, PANE), 0.14, 0.14, COLUMN);
  // --- on the crown: the show's banner over the opening, and the hall's own name on the side that looks south-east ---
  {
    const front = (s: number, dx: number): number => o.cz + o.rz * s * Math.sqrt(1 - (dx / (o.rx * s)) ** 2), z = o.cz + o.rz * 0.99 + 0.1;
    b.box(o.cx - 3.35, PANE + 0.3, front(0.98, 3.35) - 0.1, o.cx + 3.35, H - 0.3, z, TERRA_DARK, { faces: 'ESWTB' });
    k.sign('east-auto-expo', o.cx, (PANE + H) / 2, z + 0.03, 0, 1, H - PANE - 0.85, 6.3);
    // (the oval's own way of facing, a quarter of the way round from south to east)
    const a = Math.PI * 0.27, nx = Math.cos(a) / o.rx, nz = Math.sin(a) / o.rz, nl = Math.hypot(nx, nz), [wx, , wz] = onOval(o, 0.988, a, 0), y = (PANE + H) / 2;
    b.obox(wx - (nx / nl) * 0.1, y, wz - (nz / nl) * 0.1, 0.42, 0.62, 2.75, Math.atan2(nz, nx), TERRA_DARK, { faces: 'B' });
    k.sign('east-bharat-mandapam', wx + (nx / nl) * 0.35, y, wz + (nz / nl) * 0.35, nx / nl, nz / nl, 0.78, 5.2);
  }

  // --- the show: two cars turning on low round tables, each under three lamps ---
  const mat = k.mat.city(), turning: { m: THREE.Mesh; rate: number }[] = [];
  [[-3.95, 0xc8202c, 0.9, 0.22], [3.95, 0xf2c200, 2.4, -0.2]].forEach(([dx, body, yaw, rate]) => {
    const g = new GeoBuilder(), x = o.cx + dx, z = o.cz + 0.1;
    turntable(g, 3.7, 0, 0.22, 0xf4f2ec, 0x2a6fb0);
    standingCar({ ...k, b: g, glows: [] }, 0, 0, 0, { body, top: 0x1b1c20, y: 0.22 });
    const m = new THREE.Mesh(g.build(), mat);
    m.name = 'show-car';
    m.position.set(x, F, z);
    m.rotation.y = yaw;
    m.castShadow = true;
    k.group.add(m);
    turning.push({ m, rate });
    for (const [lx, lz] of [[-1.3, -0.6], [1.3, -0.6], [0, 1.2]]) k.glows.push({ x: x + lx, y: PANE - 0.16, z: z + lz, sx: 0.5, sy: 0.22, sz: 0.5, color: '#fff6e0' });
    k.lights.push({ x, z, r: 6.5, color: '#fff6e6', k: 1.0 });
  });
  // people in the hall, between the tables, and more on the step outside, looking in
  for (const [dx, dz] of [[0, 3.4], [-0.9, 4.2], [1.0, 4.0], [0, -3.3], [0.8, -4.0]]) k.person(o.cx + dx, o.cz + dz, F);
  for (const [dx, dz] of [[-5.6, 6.9], [-3.1, 7.3], [-1.6, 6.6], [2.2, 7.1], [4.4, 6.7], [6.3, 7.4], [-7.4, 7.6]]) k.person(o.cx + dx, o.cz + dz);

  // --- the forecourt: the table that is kept for a hero, low lamps along its edges, and banners along its west side ---
  const hx = EXPO_HERO.x, hz = EXPO_HERO.z, YELLOW = 0xf2c81e;
  area(k, oval(hx, hz, 5.5, 5.5, 24), 0xc7bda8, 0.03);
  b.cyl(hx, hz, 0, EXPO_TABLE - 0.06, 4.8, 4.8, 24, YELLOW);
  {
    const g = new GeoBuilder();
    turntable(g, 4.5, EXPO_TABLE - 0.06, EXPO_TABLE, 0xd9d6cf, 0xc8202c);
    const m = new THREE.Mesh(g.build(), mat);
    m.name = 'turntable';
    m.position.set(hx, 0, hz);
    m.receiveShadow = true;
    k.group.add(m);
    turning.push({ m, rate: EXPO_HERO.turn });
  }
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    k.glows.push({ x: hx + Math.cos(a) * 4.65, y: EXPO_TABLE - 0.02, z: hz + Math.sin(a) * 4.65, sx: 0.2, sy: 0.1, sz: 0.2, color: '#fff3c4' });
  }
  k.lights.push({ x: hx, z: hz, r: 11, color: '#fff3dc', k: 0.8 }, { x: o.cx, z: o.cz + 3, r: 13, color: '#fff6e6', k: 0.6 });
  // (whatever turns is turned the way the engine turns a hero on its table)
  k.each((dt) => {
    for (const { m, rate } of turning) m.rotation.y -= rate * dt;
  });
  // (the forecourt is lit by low lamps along its south and east edges: nothing tall stands in front of the hall's opening, or of the hero's table)
  for (const [x, z] of [[gx0 + 3, gz1 - 0.6], [gx0 + 7.5, gz1 - 0.6], [gx0 + 12, gz1 - 0.6], [gx0 + 16.5, gz1 - 0.6], [gx1 - 0.6, gz1 - 3.2], [gx1 - 0.6, gz1 - 7.2], [gx1 - 0.6, gz1 - 11.2]]) {
    b.box(x - 0.12, 0, z - 0.12, x + 0.12, 0.72, z + 0.12, 0x3a3d44);
    k.glows.push({ x, y: 0.8, z, sx: 0.22, sy: 0.16, sz: 0.22, color: '#fff0c8' });
    k.lights.push({ x, z, r: 5, color: '#fff0d6', k: 0.4 });
  }
  [0x2a6fb0, 0xf2c14e, 0xc8322b, 0x2f8f6f].forEach((color, i) => {
    const x = gx0 + 0.7, z = hz - 4.2 + i * 2.8;
    b.box(x - 0.05, 0, z - 0.05, x + 0.05, 4.9, z + 0.05, 0xd7dade, { faces: 'NESW' });
    b.box(x - 0.03, 1.5, z + 0.05, x + 0.03, 4.8, z + 0.7, color, { faces: 'NESWTB' });
  });
  for (const [x, z] of [[hx - 6.2, hz - 1.5], [hx - 6.6, hz + 1.4], [hx - 5.2, hz + 3.9], [hx - 2.4, hz - 5.6], [hx + 1.1, hz - 5.9], [hx - 7.8, hz - 3.6]]) k.person(x, z);
}

// ---------------------------------------------------------------------------
// The National Stadium, and the vintage car rally on its forecourt
// ---------------------------------------------------------------------------

/** The place for a hero in the rally's line, and the way it faces there: `vintage-rally` among the plan's places for heroes. */
const RALLY_HERO = { x: heroPlace('vintage-rally').x, z: heroPlace('vintage-rally').z, heading: heroPlace('vintage-rally').heading };
/** The forecourts' paving, as the tile lays it. */
const PLAZA = 0xd9cdb4;

/** What a tourer is painted in: its body, its wings and running boards, the middles of its wheels, and its hood if that is up. */
interface Livery { body: number; wings: number; hubs: number; hood?: number }

/**
 * A tourer of the years between the wars, as a small toy, built at its own
 * middle with its nose along +x: a long bonnet behind an upright radiator,
 * wings over big wheels with a running board between them, an upright
 * windscreen, two big lamps, a spare wheel on its back, and its hood up or
 * folded. It carries no maker's name and no badge.
 */
function tourer(b: GeoBuilder, o: Livery): void {
  const TYRE = 0x1b1c20, CHROME = 0xd3d6da, LEATHER = 0x6a4028;
  // the frame and the two running boards, as one board from side to side
  b.box(-1.0, 0.42, -1.14, 1.4, 0.52, 1.14, o.wings);
  // the bonnet, the radiator, and a lamp either side of it
  b.box(0.8, 0.52, -0.54, 2.85, 1.48, 0.54, o.body);
  b.box(2.85, 0.6, -0.48, 2.98, 1.56, 0.48, CHROME, { faces: 'NEST' });
  for (const s of [-1, 1]) b.box(2.62, 1.0, s * 0.8 - 0.16, 2.88, 1.34, s * 0.8 + 0.16, CHROME, { faces: 'NEST' });
  // the tub with its seats, and the windscreen
  b.box(-2.25, 0.52, -0.88, 0.8, 1.44, 0.88, o.body, { top: LEATHER });
  b.box(0.64, 1.44, -0.84, 0.72, 2.04, 0.84, 0xa9c7d2, { faces: 'EWT' });
  // the hood: up on its frame, or folded down behind the seats
  if (o.hood !== undefined) {
    b.box(-2.3, 1.96, -0.9, 0.68, 2.1, 0.9, o.hood, { faces: 'NESWTB' });
    b.box(-2.3, 1.44, -0.9, -2.18, 1.96, 0.9, o.hood, { faces: 'NSW' });
  } else b.box(-2.45, 1.44, -0.82, -2.0, 1.74, 0.82, 0x2a2420);
  // the spare wheel on its back
  b.box(-2.62, 0.72, -0.52, -2.32, 1.74, 0.52, TYRE, { faces: 'NSWT' });
  // wings over the wheels, and the wheels themselves
  for (const s of [-1, 1]) {
    for (const x of [2.0, -1.65]) {
      b.box(x - 0.82, 1.27, Math.min(s * 0.5, s * 1.16), x + 0.82, 1.37, Math.max(s * 0.5, s * 1.16), o.wings);
      wheel(b, x, 0.62, s * 1.0, 0.62, 0.13, s, TYRE, o.hubs);
    }
  }
}

/** A line of small flags between two points in the air. */
function bunting(b: GeoBuilder, a: V3, c: V3, colors: number[]): void {
  const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], len = Math.hypot(dx, dz), n = Math.max(1, Math.floor(len / 0.8));
  b.beam(a, c, 0.025, 0.025, 0xe9e6dc);
  const at = (u: number, drop = 0): V3 => [a[0] + dx * u, a[1] + dy * u - drop, a[2] + dz * u];
  for (let i = 0; i < n; i++) {
    for (const s of [-1, 1]) tri(b, at((i + 0.2) / n), at((i + 0.8) / n), at((i + 0.5) / n, 0.5), [(-dz / len) * s, 0, (dx / len) * s], colors[i % colors.length]);
  }
}

/**
 * The National Stadium's entrance pavilion, the vintage car rally lined up
 * on its forecourt, and one curved end of the stadium itself.
 *
 * The pavilion is of red brick dressed in cream stone, as the stadium's old
 * front is: five round arches, a deep eave, a stepped parapet with its name,
 * and four small canopies on its roof. In front of it five tourers of the
 * years between the wars stand side by side with their noses to the road,
 * and one bay among them is kept for a hero. South of the forecourt is the
 * stadium's end: green seats in a curve round the blue pitch that its hockey
 * is played on.
 */
function nationalStadium(k: Build, t: Thing): void {
  const b = k.b, fore = GROUNDS[t.id], field = GROUNDS['national-stadium'], H = t.h, STONE = 0xd8cfbb;
  const x0 = t.x + 0.45, x1 = t.x + t.w - 0.45, z0 = t.z + 0.2, zf = t.z + 3.2, cx = t.x + t.w / 2;

  // --- the pavilion ---
  const G = 0.3, S1 = H * 0.49, S2 = H * 0.7, P = H * 0.765, bay = (x1 - x0 - 0.7) / 5;
  b.box(x0 - 0.2, 0, z0 - 0.1, x1 + 0.2, G, zf + 0.2, CREAM);
  b.box(x0, G, z0, x1, S1, zf, RED, { faces: 'NESW' });
  arcade(b, 'S', zf, x0 + 0.35, x1 - 0.35, G, 5, S1 - G - 0.55, RECESS, { round: true, lit: 1.0 });
  for (const f of ['E', 'W'] as const) niche(b, f, f === 'E' ? x1 : x0, (z0 + zf) / 2, G, 1.0, S1 - G - 0.55, RECESS, { round: true, lit: 1.0 });
  arcade(b, 'N', z0, x0 + 0.35 + bay, x1 - 0.35 - bay, G, 3, S1 - G - 0.55, RECESS, { round: true });
  b.box(x0 - 0.35, S1, z0 - 0.1, x1 + 0.35, S1 + 0.14, zf + 0.42, CREAM, { faces: 'NESWTB' });
  b.box(x0, S1 + 0.14, z0, x1, S2, zf, RED, { faces: 'NESW' });
  for (let i = 0; i <= 5; i++) {
    // a strip of cream stone between each two arches, from the ground to the parapet, and a small window over each arch
    const x = x0 + 0.35 + i * bay;
    panel(b, 'S', zf, x - 0.1, G, x + 0.1, S2, CREAM, 0.08);
    if (i < 5) panel(b, 'S', zf, x + bay / 2 - 0.26, S1 + 0.45, x + bay / 2 + 0.26, S2 - 0.3, RECESS, 0.05, { win: interior(0.8) });
  }
  b.box(x0 - 0.12, S2, z0 - 0.12, x1 + 0.12, P, zf + 0.12, CREAM, { top: 0xcfc4ae });
  b.box(cx - 2.45, P, zf - 0.7, cx + 2.45, P + 0.85, zf + 0.12, CREAM, { top: 0xcfc4ae });
  b.box(cx - 1.5, P + 0.85, zf - 0.6, cx + 1.5, P + 1.15, zf + 0.12, CREAM, { top: RED });
  k.sign('east-national-stadium', cx, (S2 + P + 0.85) / 2 + 0.02, zf + 0.15, 0, 1, 1.05, 4.6);
  for (const [x, z] of [[x0 + 0.5, z0 + 0.5], [x1 - 0.5, z0 + 0.5], [x0 + 0.5, zf - 0.5], [x1 - 0.5, zf - 0.5]]) {
    // a small canopy on each corner of the roof
    b.box(x - 0.3, P, z - 0.3, x + 0.3, P + 0.72, z + 0.3, CREAM, { faces: 'NESW' });
    for (const f of ['N', 'E', 'S', 'W'] as const) {
      const alongX = f === 'N' || f === 'S';
      panel(b, f, (alongX ? z : x) + (f === 'N' || f === 'W' ? -0.3 : 0.3), (alongX ? x : z) - 0.16, P + 0.1, (alongX ? x : z) + 0.16, P + 0.6, RECESS, 0.03);
    }
    b.box(x - 0.46, P + 0.72, z - 0.46, x + 0.46, P + 0.82, z + 0.46, CREAM, { faces: 'NESWTB' });
    cupola(b, x, P + 0.82, z, 0.38, RED_LIGHT, 6);
  }
  steps(b, 'S', zf + 0.2, cx - 2.9, cx + 2.9, 0, G, 2, 0.35, STONE);
  k.lights.push({ x: cx, z: zf + 3, r: 12, color: '#ffe2ae', k: 0.75 });

  // --- the rally: five tourers side by side, with a bay among them for a hero, and its banner behind them ---
  area(k, rect(fore[0], fore[3], fore[2], field[1]), PLAZA, 0.02);
  const { x: hx, z: hz, heading } = RALLY_HERO, MAROON = 0x6e1f2a, BLACK = 0x1b1c20, IVORY = 0xeadfc4, WIRE = 0xd9d2bf;
  // (each stands a little further west than the one north of it, and the hero's bay is wider on its south side, so that its neighbour there hides none of it from the south-east)
  const LINE: [bay: number, livery: Livery][] = [
    [-1, { body: MAROON, wings: BLACK, hubs: WIRE, hood: 0xc9b48a }],
    [1, { body: IVORY, wings: MAROON, hubs: MAROON }],
    [2, { body: BLACK, wings: BLACK, hubs: 0xa32a2a, hood: 0x3a3632 }],
    [3, { body: 0x1f4a34, wings: BLACK, hubs: WIRE }],
    [4, { body: IVORY, wings: BLACK, hubs: WIRE, hood: MAROON }],
  ];
  for (const [n, livery] of LINE) b.moved(hx - n * 0.35, 0, n < 0 ? hz + n * 3.4 : hz + 4.0 + (n - 1) * 2.95, heading, () => tourer(b, livery));
  k.lights.push({ x: hx, z: hz + 1.5, r: 13, color: '#fff0d6', k: 0.75 }, { x: hx - 1, z: hz + 10, r: 11, color: '#fff0d6', k: 0.65 });
  const bx = fore[0] + 0.3;
  for (const z of [hz - 3.6, hz + 3.6]) b.box(bx - 0.08, 0, z - 0.08, bx + 0.08, 5.2, z + 0.08, 0xd7dade, { faces: 'NESW' });
  b.box(bx - 0.07, 3.95, hz - 3.6, bx + 0.07, 5.15, hz + 3.6, 0x1b1c20, { faces: 'NESWTB' });
  k.sign('east-vintage-rally', bx + 0.1, 4.55, hz, 1, 0, 1.0, 7);
  k.sign('east-vintage-rally', bx - 0.1, 4.55, hz, -1, 0, 1.0, 7);
  // bunting across the pavilion's front and down the forecourt's west side, on three poles
  {
    const FLAGS = [0xd8432b, 0xf2c14e, 0x2a6fb0, 0xf4f1e8, 0x2f8f6f, 0xf08a24], nw: V3 = [fore[0] + 0.35, 5.8, zf + 2.0], ne: V3 = [fore[2] - 0.35, 4.7, zf + 2.0], sw: V3 = [fore[0] + 0.2, 5.8, fore[3] + 0.5];
    for (const p of [nw, ne, sw]) b.box(p[0] - 0.07, 0, p[2] - 0.07, p[0] + 0.07, p[1] + 0.1, p[2] + 0.07, 0xd7dade, { faces: 'NESW' });
    bunting(b, nw, ne, FLAGS);
    bunting(b, nw, sw, FLAGS);
  }
  // people on the pavilion's steps and at the far end of the line, and the man who flags the cars away
  for (const [x, z, y] of [[cx - 1.3, zf + 0.5, G], [cx + 0.7, zf + 0.45, G], [cx + 2.3, zf + 0.75, G / 2], [fore[2] - 0.6, zf + 1.4, 0], [hx - 5.4, hz + 9.6, 0], [hx - 5.9, hz + 11.4, 0], [hx - 5.2, hz + 12.5, 0], [hx - 6.8, hz + 10.3, 0]]) k.person(x, z, y);
  figure(b, hx + 3.3, hz - 1.5, 0, { coat: 0xf4f1e8, legs: 0x3a3d46, hat: 0x2a211c, hatH: 0.1 });
  b.box(hx + 3.72, 0, hz - 1.54, hx + 3.78, 3.0, hz - 1.48, 0xd9c49a, { faces: 'NESW' });
  for (const s of [-1, 1]) b.quad([hx + 3.75 + s * 0.02, 2.3, hz - 1.54], [hx + 3.75 + s * 0.02, 2.3, hz - 2.26], [hx + 3.75 + s * 0.02, 2.95, hz - 2.26], [hx + 3.75 + s * 0.02, 2.95, hz - 1.54], [s, 0, 0], 0x2f8f4f);

  // --- one end of the stadium: seats in a curve, the pitch of blue, a goal, and its lamps ---
  // The stand is lower at its west end, where it lies in the line along which Khan Market's place for a hero is looked
  // at: three rows and a walk behind them there, five rows and a higher wall round the rest.
  const C: Oval = { cx: field[0] + 7.6, cz: field[3] - 0.4, rx: 1, rz: 1 }, R0 = 4.2, DEEP = 0.6, RISE = 0.55, RW = R0 + 5 * DEEP;
  const SEATS = [0x2f9a6a, 0x43ad7c], CONC = 0xd9d3c4, STEP_AT = (Math.PI * 4) / 3, LOW = 3 * RISE + 0.55, HIGH = 5 * RISE + 0.65;
  /** One length of the stand: so many rows, and a wall behind them as high as `wall`. `end` says which end of the stand it is cut off at: -1 the west, 1 the east. */
  const stand = (from: number, to: number, n: number, rows: number, wall: number, end: number): void => {
    const arc = { from, to, n }, back = rows * RISE, walk = R0 + rows * DEEP;
    // (where the stand is cut off, its steps are seen from the side)
    const cut = (r0: number, r1: number, y: number, color: number): void => b.quad([C.cx + end * r0, 0, C.cz], [C.cx + end * r1, 0, C.cz], [C.cx + end * r1, y, C.cz], [C.cx + end * r0, y, C.cz], [0, 0, 1], color);
    for (let i = 0; i < rows; i++) {
      const r = R0 + i * DEEP, y = (i + 1) * RISE;
      ovalBand(b, C, y - RISE, r, y, r, CONC, { ...arc, inward: true });
      ovalRing(b, C, y, r, r + DEEP, SEATS[i % 2], arc);
      cut(r, r + DEEP, y, CONC);
    }
    if (walk < RW - 0.01) {
      // a walk behind the rows, where the wall stands further back than they reach
      ovalRing(b, C, back, walk, RW, CONC, arc);
      cut(walk, RW, back, CONC);
    }
    ovalBand(b, C, back, RW, wall, RW, CONC, { ...arc, inward: true });
    ovalRing(b, C, wall, RW, RW + 0.3, CREAM, arc);
    ovalBand(b, C, 0, RW + 0.3, wall, RW + 0.3, RED, arc);
    cut(RW, RW + 0.3, wall, CREAM);
    for (let i = 0; i < n; i++) {
      // a round of dark arches in its outer wall
      const d = (to - from) / n, a0 = from + (i + 0.22) * d, a1 = from + (i + 0.78) * d, am = (a0 + a1) / 2, top = Math.min(2.5, wall - 0.5);
      b.quad(onOval(C, RW + 0.33, a0, 0.3), onOval(C, RW + 0.33, a1, 0.3), onOval(C, RW + 0.33, a1, top), onOval(C, RW + 0.33, a0, top), [Math.cos(am), 0, Math.sin(am)], RECESS, { win: interior(0.8) });
    }
  };
  stand(Math.PI, STEP_AT, 4, 3, LOW, -1);
  stand(STEP_AT, Math.PI * 2, 8, 5, HIGH, 1);
  {
    // where the two lengths meet, the end of the higher one is seen above the lower
    const face = (r0: number, r1: number, y0: number, y1: number, color: number): void => b.quad(onOval(C, r0, STEP_AT, y0), onOval(C, r1, STEP_AT, y0), onOval(C, r1, STEP_AT, y1), onOval(C, r0, STEP_AT, y1), [Math.sin(STEP_AT), 0, -Math.cos(STEP_AT)], color);
    face(R0 + 3 * DEEP, R0 + 4 * DEEP, 3 * RISE, 4 * RISE, CONC);
    face(R0 + 4 * DEEP, RW, 3 * RISE, 5 * RISE, CONC);
    face(RW, RW + 0.3, LOW, HIGH, CREAM);
  }
  area(k, Array.from({ length: 13 }, (_, i): [number, number] => [C.cx + Math.cos(Math.PI + (i / 12) * Math.PI) * (R0 - 0.02), C.cz + Math.sin(Math.PI + (i / 12) * Math.PI) * (R0 - 0.02)]), 0x2c6fcf, 0.03);
  {
    // the back line, the goal on it, and the circle a goal is shot from
    const gz = C.cz - 3.36, WHITE = 0xf4f1e8, D = (r: number, i: number): [number, number] => [C.cx + Math.cos((i / 10) * Math.PI) * r, gz + Math.sin((i / 10) * Math.PI) * r];
    area(k, rect(C.cx - 2.5, gz - 0.08, C.cx + 2.5, gz), WHITE, 0.04);
    area(k, [...Array.from({ length: 11 }, (_, i) => D(2.0, i)), ...Array.from({ length: 11 }, (_, i) => D(1.9, 10 - i))], WHITE, 0.04);
    for (const s of [-1, 1]) b.box(C.cx + s * 0.6 - 0.05, 0, gz - 0.14, C.cx + s * 0.6 + 0.05, 0.75, gz - 0.04, WHITE, { faces: 'NESW' });
    b.box(C.cx - 0.65, 0.75, gz - 0.14, C.cx + 0.65, 0.85, gz - 0.04, WHITE, { faces: 'NESWTB' });
    b.box(C.cx - 0.65, 0, gz - 0.5, C.cx + 0.65, 0.32, gz - 0.44, 0x2a2c31);
  }
  // (those who play and those who watch are all clear of the line that Khan Market's place is looked at along)
  for (const [dx, dz] of [[-0.6, -1.6], [0.9, -2.2], [1.9, -0.8], [0.3, -0.6]]) k.person(C.cx + dx, C.cz + dz);
  for (const [a, tier] of [[1.37, 1], [1.43, 3], [1.52, 2], [1.7, 4], [1.86, 2]]) {
    const r = R0 + (tier + 0.5) * DEEP;
    k.person(C.cx + Math.cos(Math.PI * a) * r, C.cz + Math.sin(Math.PI * a) * r, (tier + 1) * RISE);
  }
  // Its one tall mast stands at the stand's east end, and the rest of its lamps are low ones on the higher wall's top:
  // nothing tall stands in the line Khan Market's place is looked at along, or between the line of cars and the view.
  mast(k, C.cx + RW + 1.0, C.cz - 0.7, 9.5, '#f4f8ff', 14);
  for (const a of [1.45, 1.62, 1.8]) {
    const [x, , z] = onOval(C, RW + 0.15, Math.PI * a, 0);
    b.box(x - 0.16, HIGH, z - 0.16, x + 0.16, HIGH + 0.3, z + 0.16, 0x5d6168);
    k.glows.push({ x, y: HIGH + 0.38, z, sx: 0.3, sy: 0.16, sz: 0.3, color: '#f4f8ff' });
  }
  k.lights.push({ x: C.cx, z: C.cz - 2, r: 9, color: '#eef4ff', k: 0.7 });
  for (const [x, z] of [[field[0] + 7.2, field[1] + 1.3], [field[0] + 9.5, field[1] + 1.0]]) k.tree(x, z, 0.55);
}

// ---------------------------------------------------------------------------
// The Buddh circuit's corner
// ---------------------------------------------------------------------------

/** Half the width of the circuit's track, as the tile lays it. */
const TRACK_HALF = 2.75;

/**
 * What makes the oval at the east bank's south end a race circuit: red and
 * white kerbs on its two bends, a banked edge round the outside of the south
 * one, gravel and a wall of tyres outside the north one, a marshal's post, a
 * pit wall with its stand on the strip in the middle, and a gantry over the
 * straight that says where the circuit really is. The track is the tile's,
 * and nothing here stands on it.
 */
function buddh(k: Build, t: Thing): void {
  const b = k.b, [gx0, gz0, gx1, gz1] = GROUNDS[t.id], Q = BUDDH, KERB = [0xd0312d, 0xf4f1e8];
  const cx = (Q.x0 + Q.x1) / 2, zn = Q.z0 + Q.r, zs = Q.z1 - Q.r, inner = Q.r - TRACK_HALF, outer = Q.r + TRACK_HALF;
  const N: Oval = { cx, cz: zn, rx: 1, rz: 1 }, S: Oval = { cx, cz: zs, rx: 1, rz: 1 }, north = { from: Math.PI, to: Math.PI * 2 }, south = { from: 0, to: Math.PI };
  /** A kerb round part of a bend: blocks of red and of white, a hair above the ground. */
  const kerb = (o: Oval, r0: number, r1: number, q: { from: number; to: number }, n: number): void => {
    for (let i = 0; i < n; i++) ovalRing(b, o, 0.07, r0, r1, KERB[i % 2], { from: q.from + ((q.to - q.from) * i) / n, to: q.from + ((q.to - q.from) * (i + 1)) / n, n: 1 });
  };
  kerb(N, inner - 0.55, inner, north, 8);
  kerb(S, inner - 0.55, inner, south, 8);
  kerb(N, outer, outer + 0.6, north, 14);
  kerb(S, outer, outer + 0.5, south, 14);

  // --- outside the north bend: a trap of gravel, and a wall of tyres round it ---
  const trap: Oval = { cx, cz: zn, rx: outer + 0.65, rz: zn - gz0 - 1.3 };
  area(k, [...Array.from({ length: 13 }, (_, i): [number, number] => [cx + Math.cos(Math.PI * (1 + i / 12)) * (outer + 0.6), zn + Math.sin(Math.PI * (1 + i / 12)) * (outer + 0.6)]),
    ...Array.from({ length: 13 }, (_, i): [number, number] => [cx + Math.cos(Math.PI * (2 - i / 12)) * trap.rx, zn + Math.sin(Math.PI * (2 - i / 12)) * trap.rz])], 0xd9c9a0, 0.035);
  for (let i = 0; i < 22; i++) {
    // (each stack of tyres is painted: black, red, white)
    const [x, , z] = onOval(trap, 1.035, Math.PI * (1.14 + (i * 0.72) / 21), 0);
    b.cyl(x, z, 0, 0.78, 0.37, 0.37, 6, [0x25262b, 0xd0312d, 0xf4f1e8][i % 3], { cap: 0x3a3b40 });
  }

  // --- outside the south bend: the banking, which rises towards the board's edge, and its wall ---
  {
    const rim: Oval = { cx, cz: zs, rx: (gx1 - gx0) / 2 - 0.1, rz: gz1 - zs - 0.4 }, foot = outer + 0.5, n = 14, TOP = 1.8;
    const high = (a: number): number => 0.07 + TOP * Math.sin(a) ** 1.5;
    const at = (a: number, u: number): V3 => {
      // from the kerb's edge (u = 0) out to the rim (u = 1)
      const p = onOval(S, foot, a, 0.07), q = onOval(rim, 1, a, high(a));
      return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
    };
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI, am = (a0 + a1) / 2;
      // tarmac below, and a band of red and white blocks along its top
      for (const [u0, u1, color] of [[0, 0.68, 0x5f6167], [0.68, 1, KERB[i % 2]]]) {
        slope3(b, at(a0, u0), at(a1, u0), at(a1, u1), color);
        slope3(b, at(a0, u0), at(a1, u1), at(a0, u1), color);
      }
      const nx = Math.cos(am) * rim.rz, nz = Math.sin(am) * rim.rx, nl = Math.hypot(nx, nz);
      b.quad(onOval(rim, 1, a0, 0), onOval(rim, 1, a1, 0), onOval(rim, 1, a1, high(a1)), onOval(rim, 1, a0, high(a0)), [nx / nl, 0, nz / nl], CONCRETE);
    }
  }

  // --- the strip in the middle: the pit lane, its wall, and the stand the crews watch from ---
  area(k, rect(cx - inner + 0.05, zn, cx + inner - 0.05, zs), 0x8f9299, 0.035);
  const wx = cx - inner + 0.12;
  b.box(wx, 0, zn + 0.6, wx + 0.26, 0.85, zs - 0.6, CONCRETE, { top: 0xd0312d });
  {
    const z = zs - 3.2;
    for (const dz of [-1, 1]) b.box(wx + 0.02, 0.85, z + dz - 0.05, wx + 0.12, 2.5, z + dz + 0.05, 0xd7dade, { faces: 'NESW' });
    b.box(wx - 0.08, 2.5, z - 1.25, wx + 1.3, 2.62, z + 1.25, 0xd0312d, { faces: 'NESWTB' });
    for (const [x, zz] of [[wx + 0.75, z - 0.5], [wx + 0.8, z + 0.5], [wx + 1.3, zs - 6.2], [wx + 1.5, zn + 3.3]]) k.person(x, zz);
    for (const [x, zz, color] of [[wx + 1.7, zs - 1.4, 0x25262b], [wx + 1.75, zs - 2.1, 0x25262b], [wx + 1.6, zn + 1.5, 0xd0312d]]) b.cyl(x, zz, 0, 0.7, 0.32, 0.32, 6, color);
  }

  // --- a marshal's post at the north bend: a hut on legs, and the marshal with a yellow flag ---
  {
    const mx = gx0 + 1.5, mz = gz0 + 1.7, ORANGE = 0xf08a24;
    for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]) b.box(mx + dx - 0.05, 0, mz + dz - 0.05, mx + dx + 0.05, 2.5, mz + dz + 0.05, 0xd7dade, { faces: 'NESW' });
    b.box(mx - 0.7, 0.9, mz - 0.7, mx + 0.7, 1.0, mz + 0.7, 0xf4f1e8, { faces: 'NESWTB' });
    b.box(mx - 0.7, 1.0, mz - 0.7, mx + 0.7, 1.75, mz - 0.62, ORANGE);
    b.box(mx - 0.7, 1.0, mz - 0.62, mx - 0.62, 1.75, mz + 0.7, ORANGE);
    b.box(mx - 0.85, 2.5, mz - 0.85, mx + 0.85, 2.62, mz + 0.85, ORANGE, { faces: 'NESWTB' });
    figure(b, mx + 0.1, mz + 0.1, 1.0, { coat: ORANGE, legs: 0x3a3d46, hat: 0xf4f1e8, hatH: 0.2 });
    b.beam([mx + 0.5, 2.0, mz + 0.35], [mx + 1.15, 2.75, mz + 0.9], 0.03, 0.03, 0xd9c49a);
    for (const s of [-1, 1]) tri(b, [mx + 0.85, 2.4, mz + 0.64], [mx + 1.15, 2.75, mz + 0.9], [mx + 1.3, 2.25, mz + 1.05], [s * 0.64, 0, -s * 0.77], 0xf2c81e);
  }

  // --- the gantry over the straight, with the board that says where this circuit is ---
  {
    const z = zn + 4.5, xa = Q.x0 - TRACK_HALF - 0.3, xb = wx + 0.13, mid = Q.x0, TOP = 6.3, STEEL = 0x8a9098;
    for (const x of [xa, xb]) b.box(x - 0.15, 0, z - 0.15, x + 0.15, TOP, z + 0.15, STEEL, { faces: 'NESW' });
    b.box(xa - 0.15, TOP - 0.5, z - 0.2, xb + 0.15, TOP, z + 0.2, STEEL, { faces: 'NESWTB' });
    b.box(mid - 2.7, TOP - 1.75, z - 0.08, mid + 2.7, TOP - 0.5, z + 0.08, 0x1d4f38, { faces: 'NESWB' });
    k.sign('east-greater-noida', mid, TOP - 1.12, z + 0.11, 0, 1, 1.0, 5.2);
    k.sign('east-greater-noida', mid, TOP - 1.12, z - 0.11, 0, -1, 1.0, 5.2);
    k.lights.push({ x: mid, z: z + 2, r: 9, color: '#fff3dc', k: 0.6 });
  }
  k.lights.push({ x: cx, z: zn - 2, r: 11, color: '#fff3dc', k: 0.55 }, { x: cx, z: zs + 3, r: 12, color: '#fff3dc', k: 0.6 }, { x: Q.x1, z: (zn + zs) / 2, r: 9, color: '#fff3dc', k: 0.5 });
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

/** (while it is being built: says in the console how many triangles each thing adds) */
const counted = (id: string, fn: Model): Model => (k, t) => {
  const n = k.b.triangles + k.street.triangles + k.deck.triangles;
  fn(k, t);
  if (import.meta.env.DEV) console.info(`east: ${id} ${k.b.triangles + k.street.triangles + k.deck.triangles - n} triangles`);
};

/** What this file builds, by the id of the thing in the plan. */
export const MODELS: Record<string, Model> = {
  'signature-bridge': counted('signature-bridge', signatureBridge),
  ghats: counted('ghats', ghats),
  akshardham: counted('akshardham', akshardham),
  'bharat-mandapam': counted('bharat-mandapam', bharatMandapam),
  'vintage-rally': counted('vintage-rally', nationalStadium),
  buddh: counted('buddh', buddh),
};

/** The signs this file hangs. Each is small on the sheet, so that the tile's many signs fit on it. */
export const SIGNS: SignDef[] = [
  // (the hall's own name, as it is lettered over its entrance: plain letters on its red stone)
  { id: 'east-bharat-mandapam', lines: ['भारत मंडपम', 'BHARAT MANDAPAM'], color: '#9a4530', ink: '#fff3dc', aspect: 8.2, size: [984, 120], kind: 'board', real: true, font: DEVANAGARI },
  // (the show's own name, in plain letters)
  { id: 'east-auto-expo', lines: ['AUTO EXPO'], color: '#ffd23f', ink: '#15161c', aspect: 5.2, size: [520, 100], kind: 'box', real: true },
  // (the stadium's own name, as it is lettered on its front: plain letters on its cream stone)
  { id: 'east-national-stadium', lines: ['MAJOR DHYAN CHAND', 'NATIONAL STADIUM'], color: '#eadfc4', ink: '#8a3324', aspect: 4.2, size: [403, 96], kind: 'board', real: true },
  { id: 'east-vintage-rally', lines: ['VINTAGE CAR RALLY'], color: '#6e1f2a', ink: '#f6e7c1', aspect: 7.2, size: [576, 80], kind: 'board' },
  // (a board over a road, as the tile's others are: white on green)
  { id: 'east-greater-noida', lines: ['ग्रेटर नोएडा', 'GREATER NOIDA'], color: '#12784a', ink: '#ffffff', aspect: 6, size: [720, 120], kind: 'board', real: true, font: DEVANAGARI },
];

/** Lines that something moves along, as [x, y, z] points, for the check that nothing crosses a road on the level. */
export const RAILS: Record<string, [number, number, number][]> = (() => {
  const path = boatRound(), p = new THREE.Vector3(), pts: [number, number, number][] = [];
  for (let s = 0; s < path.length; s += 1) {
    path.at(s, p);
    pts.push([p.x, p.y, p.z]);
  }
  return { 'east-boats': pts };
})();

/** Whatever this file builds that is not one of the plan's things. */
export function extras(_k: Build): void {}
