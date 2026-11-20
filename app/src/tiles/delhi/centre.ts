// The centre: Connaught Place and the flag in its park, Jantar Mantar, Agrasen
// ki Baoli, Gurudwara Bangla Sahib, Karol Bagh's car accessory street and the
// statue of Hanuman at Jhandewalan.
//
// Every place and size is taken from the plan: a thing's own lot, the ground it
// is given, the tank that is cut for it, and Connaught Place's circles.
//
// Three of these are places of worship or stand beside one: the gurdwara, the
// statue with its temple, and the small mosque at the stepwell. They are drawn
// plainly, from outside. Nothing drives into them, nobody is shown praying,
// and no sign hangs on them.

import { placed } from '../../engine/build';
import { interior, rng, type GeoBuilder, type V3, type WinSpec } from '../../engine/geo';
import { LAWN, area, flat, oval, rect, walls, type P2 } from '../../engine/ground';
import { figure, lantern, lathe, roundel, tri, twoWheeler } from '../../engine/parts';
import { standingCar } from '../../engine/props';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { CREAM, GOLD, MARBLE, MARBLE_SHADE, RECESS, RED, RED_DARK, RED_LIGHT, RUBBLE, RUBBLE_LIGHT, arcade, archThrough, dome, drum, niche, steps, tiranga } from './mughal';
import { CP, CP_R, GROUNDS, WATERS, heroPlace, type Thing } from './plan';

export type Model = (k: Build, t: Thing) => void;

const DEG = Math.PI / 180, TURN = Math.PI * 2;
/** What the street's material is told about a patch of plain paving. */
const PAVE: WinSpec = { cell: 0, storey: 1, lit: 0, kind: 1 };

const WHITE = 0xf4f1e8, STONE = 0xd8cfbb, STEEL = 0x9aa0a8, DARK = 0x17181d, GRAVEL = 0xc9906f, POOL = 0x7fa6a0;
const SAFFRON = 0xf58a1f, GOLD_DEEP = 0xc49a34;

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

/** A painted board, one line: `px` is how high it is on the sheet. */
const board = (id: string, text: string, color: string, ink: string, px = 72, more: Partial<SignDef> = {}): SignDef => {
  const aspect = Math.max(2.6, text.length * 0.6);
  return { id: `centre-${id}`, lines: [text], color, ink, aspect, size: [Math.round(px * aspect), px], kind: 'board', ...more };
};
/** Lettering that glows on a dark panel. */
const neon = (id: string, text: string, color: string): SignDef => {
  const aspect = Math.max(2.6, text.length * 0.6);
  return { id: `centre-${id}`, lines: [text], color, aspect, size: [Math.round(88 * aspect), 88] };
};

/**
 * The signs this file hangs. All but one say what is sold and not whose shop it
 * is. The one name is Wenger's, the bakery in Connaught Place's A Block, in
 * plain lettering on a plain board.
 */
export const SIGNS: SignDef[] = [
  // over the shops of Connaught Place
  board('opticians', 'OPTICIANS', '#1f3f6b', '#f4f1e8'), board('jewellers', 'JEWELLERS', '#6b1f2a', '#f2d98a'), board('cafe', 'CAFE', '#2f5d3a', '#f4f1e8'),
  board('tailors', 'TAILORS', '#f2efe6', '#2a2a30'), board('chemist', 'CHEMIST', '#f4f1e8', '#1f7a4a'), board('travel', 'TRAVEL AGENTS', '#1f4fa8', '#ffffff'),
  board('emporium', 'EMPORIUM', '#7a3a1c', '#f7e3b0'), board('coffee', 'COFFEE', '#3a2418', '#f2d9a8'), board('cameras', 'CAMERAS', '#1b1b20', '#f2c14e'),
  board('handlooms', 'HANDLOOMS', '#8e2a5e', '#fbe9b7'), board('stationers', 'STATIONERS', '#f2c14e', '#3a2418'), board('sports', 'SPORTS GOODS', '#1f7a4a', '#ffffff'),
  board('luggage', 'LUGGAGE', '#3a3d46', '#f2d98a'),
  board('wengers', "WENGER'S", '#fbf6e6', '#2a1d14', 72, { real: true }),
  // hoardings on its roofs
  board('shoes', 'SHOES', '#c8202c', '#ffffff', 96), board('books', 'BOOKS', '#f2c14e', '#1b1b20', 96),
  board('sarees', 'SAREES', '#7a1f5e', '#fbe9b7', 96), board('watches', 'WATCHES', '#15161c', '#e9e6dc', 96),
  { id: 'centre-suitings', lines: ['SUITINGS', 'SHIRTINGS'], color: '#1f3f6b', ink: '#f2d98a', aspect: 2.5, size: [300, 120], kind: 'board' },
  { id: 'centre-ice-cream', lines: ['ICE', 'CREAM'], color: '#f7c6d9', ink: '#7a1f5e', aspect: 2.2, size: [264, 120], kind: 'board' },
  // the way down to the market under the park
  board('market', 'MARKET', '#1f4fa8', '#ffffff', 56),
  // Karol Bagh
  board('kb-accessories', 'CAR ACCESSORIES', '#f2c81e', '#15161c', 88), board('kb-alloys', 'ALLOY WHEELS', '#c8202c', '#ffffff', 88), board('kb-seats', 'SEAT COVERS', '#1f4fa8', '#ffffff', 88),
  neon('kb-audio', 'CAR AUDIO', '#35e0ff'), neon('kb-led', 'LED LIGHTS', '#ff3d9a'),
  { id: 'centre-kb-roof', lines: ['CAR', 'ACCESSORIES'], color: '#f2c81e', ink: '#15161c', aspect: 3.3, size: [396, 120], kind: 'board' },
];

/** Hangs a sign flat on a dark board that stands at (x, y, z) and faces (nx, nz), and on the board's back too if `both` is set. Returns its width. */
function signBoard(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, maxW: number, both = false): number {
  const r = k.signs.atlas.rects.get(`centre-${id}`);
  if (!r) return 0;
  const w = Math.min(h * r.aspect, maxW), hh = w / r.aspect;
  k.b.obox(x, y, z, 0.07, hh / 2 + 0.07, w / 2 + 0.07, Math.atan2(nz, nx), DARK, { faces: 'B' });
  k.sign(`centre-${id}`, x + nx * 0.1, y, z + nz * 0.1, nx, nz, hh);
  if (both) k.sign(`centre-${id}`, x - nx * 0.1, y, z - nz * 0.1, -nx, -nz, hh);
  return w;
}

/**
 * A builder that marks all that is added through it as lit by night. The
 * tile's shared flag and dome take no light of their own, and both are
 * floodlit in life: the flag over Connaught Place, and a gurdwara's dome.
 */
function floodlit(b: GeoBuilder, lit: number): GeoBuilder {
  const o: GeoBuilder = Object.create(b), win = interior(lit);
  o.quad = (p0, p1, p2, p3, n, color, q = {}) => b.quad(p0, p1, p2, p3, n, color, { ...q, win });
  o.tri = (p0, p1, p2, n, color, q = {}) => b.tri(p0, p1, p2, n, color, { ...q, win });
  return o;
}

/** A small onion dome with a spike, far lighter than the tile's great domes: for the many cupolas of a gurdwara. */
function cupola(b: GeoBuilder, x: number, y: number, z: number, r: number, color: number): void {
  lathe(b, x, z, [[r * 0.8, y], [r, y + r * 0.45], [r * 0.7, y + r * 1.05], [r * 0.2, y + r * 1.45]], 5, color);
  b.cyl(x, z, y + r * 1.45, y + r * 2.1, r * 0.2, 0.02, 4, color, { cap: false });
}

/** The x and z of a point, as a pair and as what a light is given. */
const xz = (p: V3): [number, number] => [p[0], p[2]];
const at2 = (p: V3): { x: number; z: number } => ({ x: p[0], z: p[2] });

// ---------------------------------------------------------------------------
// Connaught Place
// ---------------------------------------------------------------------------

const CP_WALL = 0xece5d3, CP_TRIM = 0xd3ccbc, CP_SHADE = 0x645d54, CP_SOFFIT = 0xcbc4b4, CP_ROOF = 0xc4bdad, TANK = 0x24262b;
/** Six blocks, each built from seven straight pieces, with the first block towards the south-east. Angles are from east, turning by the south. */
const CP_BLOCKS = 6, CP_PIECES = 7, CP_SPAN = 42 * DEG, CP_FIRST = 45 * DEG;

/** What stands on the roofs: a hoarding at so many degrees from a block's middle, which looks at the park or away from it. The first block's roof is left clear for the screen. */
const HOARDINGS: { block: number; id: string; at: number; inward: boolean; w: number }[] = [
  { block: 1, id: 'shoes', at: -15, inward: false, w: 4.6 },
  { block: 2, id: 'suitings', at: 15, inward: true, w: 4.4 },
  { block: 3, id: 'books', at: -10, inward: true, w: 4.0 },
  { block: 3, id: 'ice-cream', at: 10, inward: true, w: 4.0 },
  { block: 4, id: 'sarees', at: -15, inward: true, w: 4.4 },
  { block: 5, id: 'watches', at: 15, inward: false, w: 4.6 },
];
/** The boards over the shops: at so many degrees round the circle, on the front that looks at the park or the one that looks away. */
const SHOP_BOARDS: { id: string; at: number; inward: boolean }[] = [
  { id: 'opticians', at: 36, inward: false }, { id: 'cafe', at: 45, inward: false }, { id: 'jewellers', at: 54, inward: false },
  { id: 'tailors', at: 96, inward: false }, { id: 'chemist', at: 114, inward: false },
  { id: 'emporium', at: 336, inward: false }, { id: 'travel', at: 354, inward: false },
  { id: 'stationers', at: 162, inward: false }, { id: 'sports', at: 228, inward: false }, { id: 'luggage', at: 282, inward: false },
  { id: 'wengers', at: 180, inward: true },
  { id: 'coffee', at: 222, inward: true }, { id: 'cameras', at: 234, inward: true }, { id: 'handlooms', at: 276, inward: true },
];

function connaughtPlace(k: Build, t: Thing): void {
  const b = k.b, [cx, cz] = CP, rand = rng(40438);
  // from the park outwards: the inner front, its columns, the shops' two walls, the outer columns and the outer front
  const R0 = CP_R.block0 + 0.04, R1 = CP_R.block1 - 0.03, Rci = R0 + 0.42, Rsi = R0 + 1.75, Rso = R1 - 1.75, Rco = R1 - 0.42;
  // up a block: the columns, the band the boards hang on, the wall with its windows, the cornice and the parapet
  const H = t.h, yCol = H * 0.42, yBand = yCol + 0.7, yCornice = H - 0.65, yLip = H - 0.45, yRoof = H - 0.38, storey = (yBand + yCornice) / 3.02;
  const pt = (a: number, r: number, y: number): V3 => [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
  const chord = (r: number): number => 2 * r * Math.sin(CP_SPAN / CP_PIECES / 2);

  // the paving under the blocks and across the ways between them
  flat(k.street, oval(cx, cz, CP_R.block1, CP_R.block1, 60), 0.026, 0xddd6c6, { win: PAVE, holes: [oval(cx, cz, CP_R.block0, CP_R.block0, 60)] });

  /** A band of wall along a curved front, in straight pieces: `out` is 1 for a front that looks away from the park and -1 for one that looks at it. */
  const run = (as: number[], r: number, y0: number, y1: number, out: number, color: number, o: { win?: WinSpec; seed?: number } = {}): void => {
    for (let i = 0; i + 1 < as.length; i++) {
      const am = (as[i] + as[i + 1]) / 2;
      b.quad(pt(as[i], r, y0), pt(as[i + 1], r, y0), pt(as[i + 1], r, y1), pt(as[i], r, y1), [out * Math.cos(am), 0, out * Math.sin(am)], color, { ...o, L: 2 * r * Math.sin((as[i + 1] - as[i]) / 2) });
    }
  };
  /** The same across the end of a block: `side` is -1 at the end its angles begin at, and 1 at the other. */
  const end = (a: number, side: number, r0: number, r1: number, y0: number, y1: number, color: number, o: { win?: WinSpec; seed?: number } = {}): void =>
    b.quad(pt(a, r0, y0), pt(a, r1, y0), pt(a, r1, y1), pt(a, r0, y1), [-Math.sin(a) * side, 0, Math.cos(a) * side], color, { ...o, L: r1 - r0 });
  /** A level strip between two radii, which looks up or down. */
  const level = (as0: number[], r0: number, as1: number[], r1: number, y: number, up: number, color: number, win?: WinSpec): void => {
    for (let i = 0; i + 1 < as0.length; i++) b.quad(pt(as0[i], r0, y), pt(as0[i + 1], r0, y), pt(as1[i + 1], r1, y), pt(as1[i], r1, y), [0, up, 0], color, { win });
  };

  for (let n = 0; n < CP_BLOCKS; n++) {
    const mid = CP_FIRST + (n * TURN) / CP_BLOCKS, a0 = mid - CP_SPAN / 2, a1 = mid + CP_SPAN / 2, seed = 0.11 + n * 0.17;
    const as = Array.from({ length: CP_PIECES + 1 }, (_, i) => a0 + (CP_SPAN * i) / CP_PIECES);

    // the shops, in the shade behind the columns: a window to each piece of the front, lit by night
    const shop = (len: number): WinSpec => ({ cell: len * 0.98, storey: yCol, lit: 0.5, kind: 2 });
    run(as, Rso, 0, yCol, 1, CP_SHADE, { win: shop(chord(Rso)), seed });
    run(as, Rsi, 0, yCol, -1, CP_SHADE, { win: shop(chord(Rsi)), seed: seed + 0.4 });
    end(a0, -1, Rsi, Rso, 0, yCol, CP_SHADE, { win: shop((Rso - Rsi) / 2), seed: seed + 0.2 });
    end(a1, 1, Rsi, Rso, 0, yCol, CP_SHADE, { win: shop((Rso - Rsi) / 2), seed: seed + 0.3 });

    // the colonnades: a round column where two pieces meet, and a square pier at each corner of the block
    for (const r of [Rco, Rci]) {
      as.forEach((a, i) => {
        if (i > 0 && i < CP_PIECES) { b.cyl(cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0, yCol, 0.27, 0.24, 6, WHITE, { cap: false }); return; }
        const c = a + ((i === 0 ? 1 : -1) * 0.32) / r;
        b.obox(cx + Math.cos(c) * r, yCol / 2, cz + Math.sin(c) * r, 0.3, yCol / 2, 0.3, c, WHITE);
      });
    }
    // their ceilings, which are looked up at from low down, and glow a little by night
    level(as, Rso, as, R1, yCol, -1, CP_SOFFIT, interior(0.5));
    level(as, R0, as, Rsi, yCol, -1, CP_SOFFIT, interior(0.5));

    // the floor above: the band over the columns, a row of tall windows, the cornice and the parapet
    const upper = (cell: number): WinSpec => ({ cell, storey, lit: 0.4, kind: 0 });
    const bands: [number, number, number, boolean][] = [[yCol, yBand, WHITE, false], [yBand, yCornice, CP_WALL, true], [yCornice, yLip, CP_TRIM, false], [yLip, H, WHITE, false]];
    for (const [y0, y1, color, glazed] of bands) {
      run(as, R1, y0, y1, 1, color, glazed ? { win: upper(chord(R1) / 2), seed } : {});
      run(as, R0, y0, y1, -1, color, glazed ? { win: upper(chord(R0)), seed: seed + 0.5 } : {});
      end(a0, -1, R0, R1, y0, y1, color, glazed ? { win: upper((R1 - R0) / 6), seed: seed + 0.6 } : {});
      end(a1, 1, R0, R1, y0, y1, color, glazed ? { win: upper((R1 - R0) / 6), seed: seed + 0.7 } : {});
    }

    // the flat roof inside its parapet
    const thick = 0.28, Ro = R1 - thick, Ri = R0 + thick;
    const inset = (r: number): number[] => as.map((a, i) => (i === 0 ? a + thick / r : i === CP_PIECES ? a - thick / r : a));
    const aso = inset(Ro), asi = inset(Ri);
    level(asi, Ri, aso, Ro, yRoof, 1, CP_ROOF);
    level(as, R1, aso, Ro, H, 1, WHITE);
    level(as, R0, asi, Ri, H, 1, WHITE);
    run(aso, Ro, yRoof, H, -1, CP_TRIM);
    run(asi, Ri, yRoof, H, 1, CP_TRIM);
    for (const [i, side] of [[0, -1], [CP_PIECES, 1]]) {
      b.quad(pt(as[i], R0, H), pt(as[i], R1, H), pt(aso[i], Ro, H), pt(asi[i], Ri, H), [0, 1, 0], WHITE);
      b.quad(pt(asi[i], Ri, yRoof), pt(aso[i], Ro, yRoof), pt(aso[i], Ro, H), pt(asi[i], Ri, H), [Math.sin(as[i]) * side, 0, -Math.cos(as[i]) * side], CP_TRIM);
    }

    // what stands on the roof: the head of the stairs, two water tanks and the hoardings. The south-east block's roof is kept clear.
    if (n > 0) {
      const sa = mid + 4 * DEG, sr = (R0 + R1) / 2 + 0.6;
      b.obox(cx + Math.cos(sa) * sr, yRoof + 0.85, cz + Math.sin(sa) * sr, 0.9, 0.85, 1.25, sa, 0xe6dfcf, { top: CP_ROOF });
      for (const [da, dr] of [[-5, -1.2], [-9.5, -0.2]]) {
        const [x, , z] = pt(mid + da * DEG, (R0 + R1) / 2 + dr, 0);
        b.cyl(x, z, yRoof, yRoof + 1.05, 0.5, 0.5, 8, TANK, { cap: 0x34363d });
      }
    }
    for (const h of HOARDINGS.filter((q) => q.block === n)) {
      const a = mid + h.at * DEG, r = h.inward ? Ri + 0.5 : Ro - 0.5, face = h.inward ? -1 : 1, nx = Math.cos(a) * face, nz = Math.sin(a) * face;
      const [x, , z] = pt(a, r, 0), y = yRoof + 1.8;
      const w = signBoard(k, h.id, x, y, z, nx, nz, 1.9, h.w, true);
      for (const s of [-1, 1]) b.cyl(x - nz * w * 0.34 * s, z + nx * w * 0.34 * s, yRoof, y - 0.3, 0.09, 0.09, 4, STEEL, { cap: false });
      k.lights.push({ x: x + nx * 3, z: z + nz * 3, r: 7, color: '#fff0d6', k: 0.4 });
    }

    // people under the colonnades, lamps hung from their ceilings, and a pool of light before each front
    for (let i = 0; i < 4; i++) k.person(...xz(pt(a0 + (0.06 + (i + rand() * 0.8) * 0.22) * CP_SPAN, (Rso + Rco) / 2 - 0.08, 0)));
    for (let i = 0; i < 3; i++) k.person(...xz(pt(a0 + (0.08 + (i + rand() * 0.8) * 0.28) * CP_SPAN, (Rsi + Rci) / 2 + 0.08, 0)));
    for (let i = 0; i < CP_PIECES; i += 2) {
      const a = (as[i] + as[i + 1]) / 2;
      for (const r of [(Rso + R1) / 2, (R0 + Rsi) / 2]) {
        const [x, , z] = pt(a, r, 0);
        k.glows.push({ x, y: yCol - 0.2, z, sx: 0.24, sy: 0.2, sz: 0.24, color: '#ffe2ae' });
      }
    }
    k.lights.push({ ...at2(pt(mid, R1 + 0.5, 0)), r: 11, color: '#ffe2b4', k: 0.55 }, { ...at2(pt(mid, R0 - 0.5, 0)), r: 9, color: '#ffe2b4', k: 0.5 });

    // the way through to the next block: a tree in it, where it does not stand between the park and the opening view
    const way = a1 + (TURN / CP_BLOCKS - CP_SPAN) / 2;
    if (n >= 1 && n <= 4) k.tree(...xz(pt(way, (R0 + R1) / 2 + 1.2, 0)), 0.42);
    k.person(...xz(pt(way + (rand() - 0.5) * 6 * DEG, R0 + 1 + rand() * 5, 0)));
  }

  // boards over the shops, on the band above the columns
  for (const s of SHOP_BOARDS) {
    const a = s.at * DEG, face = s.inward ? -1 : 1, r = s.inward ? R0 - 0.1 : R1 + 0.1;
    signBoard(k, s.id, cx + Math.cos(a) * r, (yCol + yBand) / 2, cz + Math.sin(a) * r, Math.cos(a) * face, Math.sin(a) * face, yBand - yCol - 0.14, 2.5);
  }
}

// ---------------------------------------------------------------------------
// The flag, in the park in the middle of Connaught Place
// ---------------------------------------------------------------------------

function flagInThePark(k: Build, t: Thing): void {
  const b = k.b, x = t.x + t.w / 2, z = t.z + t.d / 2, R = CP_R.park, PATH = 0xd9bf9e, MOUND = 0x4f8a45;
  const pol = (deg: number, r: number): P2 => [x + Math.cos(deg * DEG) * r, z + Math.sin(deg * DEG) * r];

  // a walk round the edge of the lawn, a round of paving at the mast's foot, and four paths between the two
  flat(k.street, oval(x, z, R - 0.08, R - 0.08, 24), 0.045, PATH, { win: PAVE, holes: [oval(x, z, R - 1, R - 1, 24)] });
  area(k, oval(x, z, 1.9, 1.9, 20), PATH, 0.045);
  for (const deg of [45, 135, 225, 315]) {
    const [ax, az] = pol(deg, 1.8), [cx, cz] = pol(deg, R - 0.9), px = -Math.sin(deg * DEG) * 0.45, pz = Math.cos(deg * DEG) * 0.45;
    area(k, [[ax - px, az - pz], [ax + px, az + pz], [cx + px, cz + pz], [cx - px, cz - pz]], PATH, 0.058);
    lantern(k, ...pol(deg + 12, R - 1.7), 0, 2.5, 0x4d5a50);
  }

  // the mast on its two steps, and the flag, lit by night as it is in life
  b.cyl(x, z, 0, 0.3, 1.25, 1.25, 12, STONE);
  b.cyl(x, z, 0.3, 0.6, 0.8, 0.8, 12, MARBLE);
  tiranga(floodlit(b, 0.85), x, z, 0.6, t.h - 0.6, 5, 10 / 3);
  for (const deg of [30, 150, 270]) {
    const [lx, lz] = pol(deg, 1.05);
    b.box(lx - 0.14, 0.3, lz - 0.14, lx + 0.14, 0.5, lz + 0.14, 0x3a3d42);
    k.glows.push({ x: lx, y: 0.58, z: lz, sx: 0.2, sy: 0.12, sz: 0.2, color: '#fff3dc' });
  }
  k.lights.push({ x, z, r: 14, color: '#fff1d8', k: 0.7 });

  // a small fountain, north of the mast
  {
    const [fx, fz] = pol(270, 3.45);
    b.cyl(fx, fz, 0, 0.36, 1.05, 1.05, 10, STONE);
    b.cyl(fx, fz, 0.36, 0.42, 0.86, 0.86, 10, POOL);
    lathe(b, fx, fz, [[0.16, 0.4], [0.2, 0.95], [0.56, 1.15]], 8, STONE);
    b.cyl(fx, fz, 1.1, 1.15, 0.5, 0.5, 8, POOL);
    b.cyl(fx, fz, 1.15, 1.9, 0.09, 0.02, 5, 0xf4f8fb, { cap: false });
    k.lights.push({ x: fx, z: fz, r: 6, color: '#cfe6ff', k: 0.5 });
  }

  // the mound of the market under the park, at the lawn's west edge: grass over its roof, the way down, and two air vents
  {
    const [mx, mz] = pol(176, 3.55);
    b.cyl(mx, mz, 0, 0.16, 1.55, 1.55, 10, STONE, { cap: false });
    b.cyl(mx, mz, 0.16, 0.6, 1.5, 1.05, 10, MOUND, { cap: false });
    b.cyl(mx, mz, 0.6, 0.95, 1.05, 0.42, 10, MOUND);
    b.box(mx + 0.55, 0, mz - 0.66, mx + 1.6, 1.4, mz + 0.66, 0xd6cfbf);
    b.box(mx + 1.6, 0.04, mz - 0.46, mx + 1.62, 1.02, mz + 0.46, 0x2b2622, { faces: 'E', win: interior(1.3) });
    signBoard(k, 'market', mx + 1.68, 1.21, mz, 1, 0, 0.22, 1.2);
    for (const [dx, dz] of [[-0.5, -0.55], [-0.35, 0.65]]) {
      b.cyl(mx + dx, mz + dz, 0.6, 1.3, 0.18, 0.18, 5, 0xc9ced3, { cap: false });
      b.cyl(mx + dx, mz + dz, 1.3, 1.46, 0.36, 0.36, 5, 0xc9ced3);
    }
    k.lights.push({ x: mx + 2.2, z: mz, r: 5, color: '#ffe2ae', k: 0.5 });
  }

  // a few trees on the lawn, and people on the paths
  for (const [deg, r] of [[215, 4.5], [300, 4.4], [80, 4.4]]) k.tree(...pol(deg, r), 0.4);
  for (const [deg, r] of [[318, 3.4], [228, 2.9], [10, 5.45], [262, 5.5]]) k.person(...pol(deg, r));
}

// ---------------------------------------------------------------------------
// Jantar Mantar
// ---------------------------------------------------------------------------

/**
 * The observatory's instruments in their garden, laid out as they stand from
 * north to south: the Misra Yantra in the north-west, the great Samrat Yantra
 * in the middle with its two quadrants, the two bowls of the Jai Prakash
 * south of it, and the two drums of the Ram Yantra. Places are given in
 * twelfths of the lot's width and fourteenths of its depth.
 */
function jantarMantar(k: Build, t: Thing): void {
  const b = k.b, X = (u: number): number => t.x + (u * t.w) / 12, Z = (v: number): number => t.z + (v * t.d) / 14, H = t.h, s = t.w / 12;
  const lit = interior(0.25);

  // the garden: lawn, gravel paths, a low wall round it with a gate in the south
  area(k, rect(t.x, t.z, t.x + t.w, t.z + t.d), LAWN);
  area(k, rect(X(6.55), Z(9.6), X(7.45), Z(14)), GRAVEL, 0.045);
  area(k, rect(X(3.75), Z(9.75), X(11.5), Z(10.4)), GRAVEL, 0.058);
  area(k, rect(X(3.75), Z(4.6), X(4.25), Z(9.9)), GRAVEL, 0.045);
  for (const [x0, z0, x1, z1] of [[0, 0, 12, 0.22], [0, 0.22, 0.22, 13.78], [11.78, 0.22, 12, 13.78], [0, 13.78, 6.2, 14], [7.8, 13.78, 12, 14]]) b.box(X(x0), 0, Z(z0), X(x1), 0.32, Z(z1), RED_DARK, { top: STONE });

  // --- the Samrat Yantra: a great triangle that points at the pole, with a stair up its slope ---
  const gx0 = X(6.5), gx1 = X(7.5), zN = Z(1), zS = Z(9.4), run = zS - zN, hyp = Math.hypot(run, H), sinA = H / hyp, cosA = run / hyp;
  tri(b, [gx1, 0, zS], [gx1, 0, zN], [gx1, H, zN], [1, 0, 0], RED, { win: lit });
  tri(b, [gx0, 0, zS], [gx0, 0, zN], [gx0, H, zN], [-1, 0, 0], RED, { win: lit });
  b.quad([gx1, 0, zN], [gx0, 0, zN], [gx0, H, zN], [gx1, H, zN], [0, 0, -1], RED);
  // the two pale edges of its slope, which are its scales, and the stair between them
  const rim = 0.22 * s, up: V3 = [0, cosA, sinA];
  for (const [a, c] of [[gx0, gx0 + rim], [gx1 - rim, gx1]]) b.quad([a, 0, zS], [c, 0, zS], [c, H, zN], [a, H, zN], up, CREAM, { win: lit });
  for (const x of [gx0 + rim, gx1 - rim]) b.quad([x, -0.4, zS], [x, 0, zS], [x, H, zN], [x, H - 0.4, zN], [x < (gx0 + gx1) / 2 ? 1 : -1, 0, 0], RED_DARK);
  const STEPS = 16;
  for (let i = 1; i < STEPS; i++) b.box(gx0 + rim, ((i - 1) * H) / STEPS, zS - ((i + 1) * run) / STEPS, gx1 - rim, (i * H) / STEPS, zS - (i * run) / STEPS, RED_LIGHT, { faces: 'ST' });
  // arched ways through the foot of the triangle
  for (const [v, w, h] of [[1.75, 1.2, 3.4], [4.5, 1.0, 2.3], [6.3, 0.8, 1.3]]) {
    niche(b, 'E', gx1, Z(v), 0.05, w * s, (h * H) / 7, RECESS, { round: true, lit: 0.5 });
    niche(b, 'W', gx0, Z(v), 0.05, w * s, (h * H) / 7, RECESS, { round: true, lit: 0.5 });
  }
  // its two quadrants: each a quarter of a ring that lies square to the triangle's slope, on masonry of its own
  {
    const R = 3.8 * s, half = 0.4 * s, hc = R * cosA + 0.3, zc = zS - (hc * run) / H;
    for (const side of [-1, 1]) {
      const x0 = side > 0 ? gx1 : gx0;
      const on = (a: number, along: number): V3 => [x0 + side * R * Math.sin(a), hc - R * Math.cos(a) * cosA + along * sinA, zc - R * Math.cos(a) * sinA - along * cosA];
      const N = 5;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * (Math.PI / 2), c = ((i + 1) / N) * (Math.PI / 2), m = (a + c) / 2;
        const A = on(a, half), B = on(c, half), C = on(c, -half), D = on(a, -half), low = (p: V3): V3 => [p[0], 0, p[2]];
        b.quad(A, B, C, D, [-side * Math.sin(m), Math.cos(m) * cosA, Math.cos(m) * sinA], CREAM, { win: lit });
        b.quad(low(A), low(B), B, A, [0, 0, -1], RED);
        b.quad(low(D), low(C), C, D, [0, 0, 1], RED);
      }
      const A = on(Math.PI / 2, half), D = on(Math.PI / 2, -half);
      b.quad([A[0], 0, A[2]], [D[0], 0, D[2]], D, A, [side, 0, 0], RED);
    }
  }

  // --- the Misra Yantra: a stair wall between two pairs of half rings, which make the shape of a heart ---
  {
    const mx = X(2.7), mz = Z(1.6), base = 1.3, top = H * 0.6, hw = 1.5 * s, hd = 1.2 * s;
    b.box(mx - hw, 0, mz - hd, mx + hw, base, mz + hd, RED, { top: RED_LIGHT });
    arcade(b, 'S', mz + hd, mx - hw + 0.15, mx + hw - 0.15, 0.08, 3, base - 0.3, RECESS, { round: true, lit: 0.5 });
    // the stair wall, rising to the north
    const w = 0.28 * s, zs = mz + hd, zn = mz - hd, rise = top - base;
    for (const side of [-1, 1]) tri(b, [mx + side * w, base, zs], [mx + side * w, base, zn], [mx + side * w, top, zn], [side, 0, 0], RED);
    b.quad([mx + w, base, zn], [mx - w, base, zn], [mx - w, top, zn], [mx + w, top, zn], [0, 0, -1], RED);
    for (let i = 1; i <= 6; i++) b.box(mx - w, base + ((i - 1) * rise) / 6, zs - ((i + 1) * 2 * hd) / 7, mx + w, base + (i * rise) / 6, zs - (i * 2 * hd) / 7, RED_LIGHT, { faces: 'ESWT' });
    // the half rings: on either side a great one, which stands on the wall's two ends, and a smaller one inside it. They lean back as the stair does, and their outer edges are raised, like a butterfly's wings
    const len = Math.hypot(2 * hd, rise), sb = rise / len, cb = (2 * hd) / len, lift = Math.sin(0.22), out = Math.cos(0.22);
    for (const side of [-1, 1]) {
      for (const R of [len / 2, len * 0.31]) {
        const pts = Array.from({ length: 7 }, (_, i): V3 => {
          const a = (i / 6) * Math.PI, c = Math.cos(a) * R, q = Math.sin(a) * R;
          return [mx + side * (w + q * out), base + rise / 2 + c * sb + q * lift * cb, mz - c * cb + q * lift * sb];
        });
        b.sweep(pts, pts.map(() => 0.2 * s), RED_LIGHT);
      }
    }
  }

  // --- the Ram Yantra: two drums of twelve standing panels, open to the sky, each round a pillar ---
  for (const [u, v] of [[2, 11.85], [2, 8.05]]) {
    const x = X(u), z = Z(v), r = 1.5 * s, wallH = H * 0.33;
    b.cyl(x, z, 0, 0.22, r + 0.22, r + 0.22, 12, RED_DARK, { cap: RED_LIGHT });
    for (let i = 0; i < 12; i++) {
      const a = ((i + 0.5) / 12) * TURN;
      b.obox(x + Math.cos(a) * r, 0.22 + wallH / 2, z + Math.sin(a) * r, 0.14, wallH / 2, r * Math.tan(Math.PI / 12) * 0.56, a, RED);
      // the floor is cut into sectors: every other one is drawn
      if (i % 2) continue;
      const c = a + TURN / 24, e = a - TURN / 24, p = (ang: number, rr: number): V3 => [x + Math.cos(ang) * rr, 0.25, z + Math.sin(ang) * rr];
      b.quad(p(e, 0.3), p(c, 0.3), p(c, r - 0.25), p(e, r - 0.25), [0, 1, 0], CREAM);
    }
    b.cyl(x, z, 0.22, 0.22 + wallH, 0.2, 0.2, 6, RED, { cap: CREAM });
  }

  // --- the Jai Prakash: two bowls, each cut into sectors with gaps between them ---
  for (const u of [5.2, 8.9]) {
    const x = X(u), z = Z(12), r = 1.2 * s, rimY = 0.7, rings: [number, number][] = [[r - 0.2, rimY], [r * 0.7, 0.38], [r * 0.38, 0.17], [0, 0.1]];
    b.cyl(x, z, 0, rimY, r, r, 12, RED, { cap: false });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TURN, c = ((i + 1) / 12) * TURN, m = (a + c) / 2, p = (ang: number, rr: number, y: number): V3 => [x + Math.cos(ang) * rr, y, z + Math.sin(ang) * rr];
      b.quad(p(a, r, rimY), p(c, r, rimY), p(c, r - 0.2, rimY), p(a, r - 0.2, rimY), [0, 1, 0], CREAM);
      for (let j = 0; j + 1 < rings.length; j++) {
        const [r0, y0] = rings[j], [r1, y1] = rings[j + 1], slope = (y0 - y1) / (r0 - r1), nl = Math.hypot(1, slope);
        const n: V3 = [(-Math.cos(m) * slope) / nl, 1 / nl, (-Math.sin(m) * slope) / nl], color = i % 2 ? RED_DARK : 0xe2c9b0;
        if (r1 > 0) b.quad(p(a, r0, y0), p(c, r0, y0), p(c, r1, y1), p(a, r1, y1), n, color);
        else tri(b, p(a, r0, y0), p(c, r0, y0), p(0, 0, y1), n, color);
      }
    }
  }

  // tall palms at the edges, a few visitors on the paths, and light on the great triangle by night
  for (const [u, v] of [[11.2, 0.9], [11.3, 2.7], [0.7, 5.3], [11.3, 13.2]]) k.tree(X(u), Z(v), 0.5, true);
  for (const [u, v] of [[7, 12.7], [9, 10.05], [4, 7.6], [10.7, 10.1]]) k.person(X(u), Z(v));
  k.lights.push({ x: X(9.8), z: Z(7), r: 13, color: '#ffe2ae', k: 0.7 }, { x: X(3.5), z: Z(9), r: 12, color: '#ffe2ae', k: 0.6 });
  for (const [u, v] of [[9.4, 8.9], [4.9, 8.9], [2.7, 3.3]]) k.glows.push({ x: X(u), y: 0.14, z: Z(v), sx: 0.26, sy: 0.14, sz: 0.26, color: '#fff0c8' });
}

// ---------------------------------------------------------------------------
// Agrasen ki Baoli
// ---------------------------------------------------------------------------

/**
 * The stepwell, turned a quarter so that it lies east and west as its lot
 * does. Its way in and the small mosque beside it are at the west end, the
 * long flight goes down towards the east between walls of arched niches in
 * three tiers, and the well itself is beyond the wall at the deep end.
 */
function agrasenKiBaoli(k: Build, t: Thing): void {
  const b = k.b, [x0, z0, x1, z1] = WATERS['agrasen-ki-baoli'].at, len = x1 - x0, zc = (z0 + z1) / 2;
  const DEEP = 2.4, top = 0.03, wall = 0.45, thick = 0.4, FLOOR = 0xa89e8c, CAP = 0xc4baa6;
  // along it, from the west: the platform at the head of the steps, the flight, the floor, the wall at the deep end, and the well
  const xp = x0 + len * 0.2, tread = len * 0.036, STEPS = 11, rise = 0.2, xs = xp + STEPS * tread, xw = x1 - len * 0.21, xe = xw + 0.5;
  // the tiers: the walls step in twice on the way down, and each step in leaves a ledge
  const tier = DEEP / 3, ledge = 0.3, x2 = xp + 4 * tread, x3 = xp + 8 * tread;
  // the mosque's plan, at the west end and north of the way in: three bays between two side walls
  const bay = 0.7, pier = 0.2, side = 0.3, mx0 = Math.max(t.x + 0.2, x0 - 0.8), mx1 = x0 + 1.1, mz0 = Math.max(t.z + 0.3, z0 - 0.5), mz1 = mz0 + 2 * side + 3 * bay + 2 * pier;

  // the platform, the flight and the floor
  b.box(x0, -DEEP, z0, xp, top, z1, CAP, { faces: 'ET' });
  for (let i = 0; i < STEPS; i++) b.box(xp + i * tread, -DEEP, z0, xp + (i + 1) * tread, -(i + 1) * rise, z1, i % 2 ? RUBBLE_LIGHT : CAP, { faces: 'ET' });
  b.box(xs, -DEEP, z0, xw, -DEEP + 0.05, z1, FLOOR, { faces: 'T' });

  // the two long walls, with the low wall round the top as their heads, and the ledges of the lower tiers
  for (const [zo, zi, f, out] of [[z0 - thick, z0, 'S', 1], [z1 + thick, z1, 'N', -1]] as const) {
    const west = f === 'S' ? mx1 + 0.35 : x0 + 1.8; // the mosque stands at the north wall's west end, and the way in is at the south wall's
    b.box(west, -DEEP, Math.min(zo, zi), x1 + thick, wall, Math.max(zo, zi), RUBBLE, { faces: 'NSEWT', top: CAP });
    b.box(x2, -DEEP, Math.min(zi, zi + out * ledge), xe, -tier, Math.max(zi, zi + out * ledge), RUBBLE, { faces: `${f}WT`, top: CAP });
    b.box(x3, -DEEP, Math.min(zi + out * ledge, zi + out * 2 * ledge), xe, -2 * tier, Math.max(zi + out * ledge, zi + out * 2 * ledge), RUBBLE, { faces: `${f}WT`, top: CAP });
    // arched niches along each tier, wherever the steps have gone down far enough to bare it
    const row = (from: number, plane: number, y: number, lit: number): void => {
      const n = Math.floor((xw - from - 0.2) / 0.6);
      for (let i = 0; i < n; i++) niche(b, f, plane, xw - 0.42 - i * 0.6, y, 0.42, tier - 0.18, RECESS, { lit });
    };
    row(x2, zi, -tier + 0.06, 0.45);
    row(x3, zi + out * ledge, -2 * tier + 0.06, 0.3);
    row(xs - 0.1, zi + out * 2 * ledge, -DEEP + 0.11, 0.2);
  }
  // the low wall at the east end and at the west, and the wall across the deep end with three arches to each tier
  b.box(x1, top, z0, x1 + thick, wall, z1, RUBBLE, { faces: 'EWT', top: CAP });
  b.box(x0 - thick, 0, mz1 + 0.1, x0, wall, z1 + thick, RUBBLE, { faces: 'NSEWT', top: CAP });
  b.box(xw, -DEEP, z0, xe, wall, z1, RUBBLE, { faces: 'EWT', top: CAP });
  for (let j = 0; j < 3; j++) {
    const inset = j * ledge + 0.25, span = z1 - z0 - 2 * inset;
    for (let i = 0; i < 3; i++) niche(b, 'W', xw, z0 + inset + ((i + 0.5) * span) / 3, -(j + 1) * tier + 0.08, span / 3 - 0.2, tier - 0.2, RECESS, { lit: 0.4 });
  }

  // the well: a round shaft beyond the deep end, with a low wall round its mouth
  {
    const wx = (xe + x1) / 2, r = (x1 - xe) / 2 - 0.3, ring = oval(wx, zc, r + 0.2, r + 0.2, 10), bore = oval(wx, zc, r, r, 10);
    flat(b, rect(xe, z0, x1, z1), top, CAP, { holes: [ring] });
    walls(b, bore, -DEEP, wall, RUBBLE, { inward: true });
    walls(b, ring, top, wall, RUBBLE);
    flat(b, ring, wall, CAP, { holes: [bore] });
    flat(b, bore, -DEEP + 0.06, 0x2d2823);
  }

  // the small mosque at the west end, north of the way in: three arches that look east, and no roof left over it
  {
    const y0 = 0.3, y1 = 3.3, STONEWORK = RUBBLE_LIGHT;
    b.box(mx0 - 0.1, 0, mz0 - 0.1, mx1 + 0.35, y0, mz1 + 0.1, CAP);
    b.box(mx0, y0, mz0, mx0 + side, y1, mz1, STONEWORK);
    b.box(mx0 + side, y0, mz0, mx1, y1, mz0 + side, STONEWORK, { faces: 'NSET' });
    b.box(mx0 + side, y0, mz1 - side, mx1, y1, mz1, STONEWORK, { faces: 'NSET' });
    b.box(mx1 - side, y1 - 0.02, mz0 + side, mx1, y1, mz1 - side, STONEWORK, { faces: 'T' });
    niche(b, 'E', mx0 + side, (mz0 + mz1) / 2, y0 + 0.05, 0.6, 1.6, RECESS);
    for (let i = 0; i < 3; i++) {
      const c = mz0 + side + bay / 2 + i * (bay + pier);
      archThrough(b, 'x', mx1 - side / 2, c, side, bay, y0, 2.3, y1, STONEWORK, RUBBLE);
      if (i < 2) b.box(mx1 - side, y0, c + bay / 2, mx1, y1, c + bay / 2 + pier, RED, { faces: 'EW' });
    }
    k.lights.push({ x: mx1 + 1.2, z: (mz0 + mz1) / 2, r: 6, color: '#ffe2ae', k: 0.5 });
  }

  // a few visitors at the top: the steps themselves are empty
  for (const [dx, dz] of [[0.7, -0.75], [1.45, -1.5], [1.1, 0.1]]) k.person(x0 + dx, z1 + dz, top);
  k.person((xe + x1) / 2 + 0.1, z0 + 0.75, top);
  k.lights.push({ x: (xp + xw) / 2, z: zc, r: 9, color: '#ffdcae', k: 0.65 });
}

// ---------------------------------------------------------------------------
// Gurudwara Bangla Sahib
// ---------------------------------------------------------------------------

/** What the people who walk round the sarovar wear: the head of every one of them is covered. */
const PILGRIMS: { coat: number; legs: number; hat: number; hatH: number; hatR: number }[] = [
  { coat: 0xf2efe6, legs: 0xe9e4d6, hat: SAFFRON, hatH: 0.26, hatR: 0.34 },
  { coat: 0xd9578f, legs: 0xf2efe6, hat: 0xf2c14e, hatH: 0.1, hatR: 0.31 },
  { coat: 0x3f6fb5, legs: 0x2f3440, hat: 0x1f3f8f, hatH: 0.26, hatR: 0.34 },
  { coat: 0x4fa36b, legs: 0xe9e4d6, hat: 0xe86fa0, hatH: 0.1, hatR: 0.31 },
  { coat: 0xe9e2cf, legs: 0x6a5f52, hat: 0xf2efe6, hatH: 0.26, hatR: 0.34 },
  { coat: 0xe8b23a, legs: 0xf2efe6, hat: 0x7fd0c8, hatH: 0.1, hatR: 0.31 },
  { coat: 0x8a4fb5, legs: 0xe9e4d6, hat: 0x8e2a2a, hatH: 0.26, hatR: 0.34 },
];

function banglaSahib(k: Build, t: Thing): void {
  const b = k.b, [gx0, gz0, gx1, gz1] = GROUNDS['bangla-sahib'], [tx0, tz0, tx1, tz1] = WATERS['bangla-sahib'].at, zc = (tz0 + tz1) / 2;
  const gold = floodlit(b, 0.6), PAVING = 0xe6e1d6;

  // the marble walk round the tank, over the whole of the gurdwara's ground
  flat(k.street, rect(gx0, gz0, gx1, gz1), 0.02, PAVING, { win: PAVE, holes: [rect(tx0, tz0, tx1, tz1)] });

  // --- the sarovar: a marble kerb, and two steps down to the water on every side ---
  const kerb = 0.3;
  b.box(tx0 - kerb, 0, tz0 - kerb, tx1 + kerb, 0.14, tz0 + 0.05, MARBLE);
  b.box(tx0 - kerb, 0, tz1 - 0.05, tx1 + kerb, 0.14, tz1 + kerb, MARBLE);
  b.box(tx0 - kerb, 0, tz0 + 0.05, tx0 + 0.05, 0.14, tz1 - 0.05, MARBLE, { faces: 'EWT' });
  b.box(tx1 - 0.05, 0, tz0 + 0.05, tx1 + kerb, 0.14, tz1 - 0.05, MARBLE, { faces: 'EWT' });
  for (const [i, y, color] of [[0, -0.32, MARBLE], [1, -0.62, MARBLE_SHADE]] as const) {
    const a = i * 0.45, c = a + 0.45;
    b.box(tx0 + a, -1.1, tz0 + a, tx1 - a, y, tz0 + c, color, { faces: 'ST' });
    b.box(tx0 + a, -1.1, tz1 - c, tx1 - a, y, tz1 - a, color, { faces: 'NT' });
    b.box(tx0 + a, -1.1, tz0 + c, tx0 + c, y, tz1 - c, color, { faces: 'ET' });
    b.box(tx1 - c, -1.1, tz0 + c, tx1 - a, y, tz1 - c, color, { faces: 'WT' });
  }
  // (the wall of the tank above its first step, faced in marble on all four sides)
  b.box(tx0 + 0.04, -0.32, tz0 + 0.04, tx1 - 0.04, 0, tz0 + 0.05, MARBLE, { faces: 'S' });
  b.box(tx0 + 0.04, -0.32, tz1 - 0.05, tx1 - 0.04, 0, tz1 - 0.04, MARBLE, { faces: 'N' });
  b.box(tx0 + 0.04, -0.32, tz0 + 0.05, tx0 + 0.05, 0, tz1 - 0.05, MARBLE, { faces: 'E' });
  b.box(tx1 - 0.05, -0.32, tz0 + 0.05, tx1 - 0.04, 0, tz1 - 0.05, MARBLE, { faces: 'W' });

  // --- the colonnade along the tank's north side, with a small white dome at each end: a wall of arches at the edge of the ground, and the walk before it ---
  const cz1 = gz0 + 0.6;
  {
    const cx0 = tx0 - kerb, cx1 = tx1 + kerb, cz0 = gz0 + 0.1, h = 2.9;
    b.box(cx0, 0, cz0, cx1, h, cz1, MARBLE, { top: MARBLE_SHADE });
    arcade(b, 'S', cz1, cx0 + 0.25, cx1 - 0.25, 0.05, 9, 2.25, RECESS, { lit: 0.8, gap: 0.26 });
    b.box(cx0 - 0.15, h, cz0, cx1 + 0.15, h + 0.14, cz1 + 0.28, MARBLE_SHADE, { faces: 'NESWTB' });
    b.box(cx0, h + 0.14, cz0, cx1, h + 0.46, cz1, MARBLE, { top: MARBLE_SHADE });
    for (const x of [cx0 + 0.5, cx1 - 0.5]) {
      b.cyl(x, (cz0 + cz1) / 2, h + 0.46, h + 0.66, 0.34, 0.34, 6, MARBLE, { cap: false });
      cupola(b, x, h + 0.66, (cz0 + cz1) / 2, 0.42, MARBLE);
    }
    k.lights.push({ x: (cx0 + cx1) / 2, z: cz1 + 1.5, r: 10, color: '#fff0d0', k: 0.55 });
  }

  // --- the gurdwara, on a terrace of marble west of the tank, looking east across the water ---
  const px0 = gx0 + 0.3, px1 = tx0 - 2.0, pz0 = gz0 + 0.3, pz1 = gz1 - 0.3, P = 0.5;
  b.box(px0, 0, pz0, px1, P, pz1, MARBLE, { top: PAVING });
  steps(b, 'E', px1, zc - 3, zc + 3, 0, P, 2, 0.3, MARBLE_SHADE);
  const hx0 = px0 + 0.1, hx1 = px1 - 1.0, hz0 = zc - 3.8, hz1 = zc + 3.8, hcx = (hx0 + hx1) / 2;
  const y1 = P + 3.1, y2 = t.h * 0.525, yTop = y2 + 0.5; // the floor between its two storeys, its eave, and the top of its parapet
  b.box(hx0, P, hz0, hx1, y2, hz1, MARBLE);
  b.box(hx0 - 0.07, y1 - 0.12, hz0 - 0.07, hx1 + 0.07, y1 + 0.08, hz1 + 0.07, MARBLE_SHADE, { faces: 'NESW' });
  b.box(hx0 - 0.35, y2, hz0 - 0.35, hx1 + 0.35, y2 + 0.12, hz1 + 0.35, MARBLE_SHADE, { faces: 'NESWTB' });
  b.box(hx0, y2 + 0.12, hz0, hx1, yTop, hz1, MARBLE, { top: MARBLE_SHADE });
  // the frontispiece, with the tall arch of the way in
  const fw = 1.4, fx = hx1 + 0.6;
  b.box(hx1 - 0.2, P, zc - fw, fx, yTop + 0.7, zc + fw, MARBLE, { top: MARBLE_SHADE });
  niche(b, 'E', fx, zc, P + 0.05, 1.8, 4.5, GOLD_DEEP, { proud: 0.03 });
  niche(b, 'E', fx, zc, P + 0.05, 1.5, 4.2, RECESS, { lit: 1.0, proud: 0.07 });
  cupola(gold, fx - 0.4, yTop + 0.7, zc, 0.48, GOLD);
  // arches below and windows above, on the front either side of it, and on the other three sides
  const bays = (f: 'N' | 'E' | 'S' | 'W', plane: number, a0: number, a1: number, n: number): void => {
    arcade(b, f, plane, a0, a1, P + 0.05, n, 2.35, RECESS, { lit: 0.8 });
    arcade(b, f, plane, a0, a1, y1 + 0.45, n, 1.55, RECESS, { lit: 0.6, gap: ((a1 - a0) / n) * 0.42 });
  };
  bays('E', hx1, hz0 + 0.6, zc - fw - 0.05, 2);
  bays('E', hx1, zc + fw + 0.05, hz1 - 0.6, 2);
  bays('S', hz1, hx0 + 0.3, hx1 - 0.6, 3);
  bays('N', hz0, hx0 + 0.3, hx1 - 0.6, 3);
  bays('W', hx0, hz0 + 0.6, hz1 - 0.6, 3);
  // a turret at each front corner, and a cupola at each back one
  for (const z of [hz0, hz1]) {
    b.cyl(hx1, z, P, yTop + 0.4, 0.5, 0.5, 8, MARBLE, { cap: false });
    b.cyl(hx1, z, yTop + 0.4, yTop + 0.52, 0.68, 0.68, 8, MARBLE_SHADE);
    cupola(gold, hx1, yTop + 0.52, z, 0.5, GOLD);
    cupola(gold, hx0 + 0.45, yTop, z + (z === hz0 ? 0.45 : -0.45), 0.42, GOLD);
  }
  // the great golden dome: a square stage, a drum with a ring of arches, a collar of gold and the fluted dome
  const stage = Math.min((hx1 - hx0) / 2 - 0.1, 2.2), dr = stage * 0.89;
  b.box(hcx - stage, yTop - 0.2, zc - stage, hcx + stage, yTop + 0.4, zc + stage, MARBLE, { top: MARBLE_SHADE });
  drum(b, hcx, zc, yTop + 0.4, yTop + 1.3, dr * 0.92, MARBLE, { sides: 12, arches: 12, lit: 0.8 });
  gold.cyl(hcx, zc, yTop + 1.3, yTop + 1.52, dr * 0.92, dr * 1.06, 12, GOLD_DEEP, { cap: false });
  dome(gold, hcx, yTop + 1.52, zc, dr, GOLD, { sides: 12, stripe: GOLD_DEEP, finial: 0.9 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cupola(gold, hcx + sx * (stage - 0.36), yTop + 0.4, zc + sz * (stage - 0.36), 0.36, GOLD);

  // --- the Nishan Sahib, at the terrace's north-east corner: a very tall mast clad in saffron, with a saffron pennant ---
  {
    const nx = px1 - 0.55, nz = pz0 + 0.55, lit = interior(0.6), mast = t.h + 1, y = mast - 0.35;
    b.box(nx - 0.4, P, nz - 0.4, nx + 0.4, P + 0.4, nz + 0.4, MARBLE);
    b.box(nx - 0.28, P + 0.4, nz - 0.28, nx + 0.28, P + 0.75, nz + 0.28, MARBLE_SHADE);
    b.cyl(nx, nz, P + 0.75, mast, 0.17, 0.13, 6, SAFFRON, { cap: false, win: lit });
    b.cyl(nx, nz, mast, mast + 0.08, 0.3, 0.3, 6, 0xd9dde2);
    b.cyl(nx, nz, mast + 0.08, mast + 0.75, 0.1, 0.01, 4, 0xd9dde2, { cap: false });
    for (const side of [-1, 1]) tri(b, [nx + 0.14, y, nz + side * 0.03], [nx + 0.14, y - 1.5, nz + side * 0.03], [nx + 2.3, y - 1.05, nz + side * 0.03], [0, 0, side], SAFFRON, { win: lit });
  }

  // --- a low wall round the precinct on its south and east sides, with the gate in the east ---
  b.box(px1, 0, gz1 - 0.22, gx1, 0.45, gz1 - 0.04, MARBLE);
  for (const [a, c] of [[gz0 + 0.1, zc - 1.3], [zc + 1.3, gz1 - 0.22]]) b.box(gx1 - 0.22, 0, a, gx1 - 0.04, 0.45, c, MARBLE);
  for (const z of [zc - 1.55, zc + 1.55]) {
    b.box(gx1 - 0.5, 0, z - 0.25, gx1 - 0.02, 1.7, z + 0.25, MARBLE);
    gold.cyl(gx1 - 0.26, z, 1.7, 2.15, 0.33, 0.02, 4, GOLD, { phase: Math.PI / 4, cap: false });
  }

  // --- people with covered heads, walking slowly round the water, and lamps at the tank's corners ---
  // (most of them on the north side and the north ends of the east and west sides: the rest of the walk lies behind North Block in the opening view)
  const sw = (gz1 - 0.22 + tz1 + kerb) / 2, ew = (gx1 - 0.22 + tx1 + kerb) / 2, ww = (px1 + 0.6 + tx0 - kerb) / 2, nw = (cz1 + tz0 - kerb) / 2;
  const walk: [number, number, number][] = [
    [tx0 + 1.2, nw, 0], [tx0 + 4.7, nw, 0], [tx1 - 1.5, nw, 0], [ew, tz0 + 1.3, 0], [ww, tz0 + 1.5, 0], [tx0 + 3.1, sw, 0], [px1 - 0.5, zc - 2.3, P],
  ];
  walk.forEach(([x, z, y], i) => figure(b, x, z, y, PILGRIMS[i % PILGRIMS.length]));
  for (const [x, z] of [[tx0 - kerb - 0.2, tz1 + kerb + 0.2], [tx1 + kerb + 0.2, tz1 + kerb + 0.2], [tx0 - kerb - 0.25, tz0 - kerb - 0.2]]) lantern(k, x, z, 0, 2.2, 0xf3efe6);
  k.lights.push({ x: px1 + 0.5, z: zc, r: 15, color: '#fff0d0', k: 0.75 }, { x: hcx, z: zc, r: 12, color: '#ffe9b8', k: 0.6 });
}

// ---------------------------------------------------------------------------
// Karol Bagh's car accessory street
// ---------------------------------------------------------------------------

/** The place kept for a hero on the forecourt, as `index.ts` declares it: `karol-bagh`, facing east. */
const HERO_BAY = { x: heroPlace('karol-bagh').x, z: heroPlace('karol-bagh').z, half: 3.9, wide: 1.55 };
const ALLOYS = [0xc9ced3, 0xd9dde2, 0x5a5f66, 0xc9ced3, 0xa8763a, 0xd9dde2];

/** An alloy wheel in its tyre, hung flat on a wall that looks south. */
function hungWheel(b: GeoBuilder, x: number, y: number, z: number, r: number, alloy: number): void {
  roundel(b, [x, y, z], r, 'S', 0x17171a, {}, 8);
  roundel(b, [x, y, z + 0.03], r * 0.68, 'S', alloy, {}, 6);
}

function karolBagh(k: Build, t: Thing): void {
  const b = k.b, x0 = t.x, zb = t.z, zf = t.z + t.d, zs = GROUNDS['karol-bagh'][3];
  const storey = (t.h - 0.4) / 3, top = 3 * storey, ROOF = 0xb8ad9a, INSIDE = 0x3a332d, TILE = 0xcfcabd;
  // five buildings in a row, each with its shop: how much of the row it takes, how far its front stands back, the colour of its walls, and its sign
  const row: { f: number; back: number; wall: number; trim: number; sign: string; deep: number }[] = [
    { f: 0.2, back: 0.3, wall: 0xe6c9a4, trim: 0xc98a5a, sign: 'kb-seats', deep: 2.2 },
    { f: 0.22, back: 0, wall: 0xcfd6d0, trim: 0x7f9aa6, sign: 'kb-accessories', deep: 2.2 },
    { f: 0.18, back: 0.35, wall: 0xe9dcc4, trim: 0xb9785a, sign: 'kb-alloys', deep: 6.8 },
    { f: 0.21, back: 0, wall: 0xe3b9b0, trim: 0x9c4a4a, sign: 'kb-audio', deep: 2.2 },
    { f: 0.19, back: 0.25, wall: 0xd8c4a2, trim: 0x6f8f6a, sign: 'kb-led', deep: 2.2 },
  ];
  let xa = x0;
  row.forEach((s, i) => {
    const xb = xa + s.f * t.w, front = zf - s.back, room = front - s.deep, mid = (xa + xb) / 2, seed = 0.23 + i * 0.19, pier = 0.28;
    // two floors of flats and stores over the shop, with a parapet round the roof
    b.box(xa, storey, zb, xb, top, front, s.wall, { win: { cell: 1.9, storey, lit: 0.36, kind: 0 }, seed, top: ROOF });
    b.box(xa, top, front - 0.25, xb, t.h, front, s.wall);
    b.box(xa, top, zb, xb, t.h, zb + 0.25, s.wall);
    b.box(xa, top, zb + 0.25, xa + 0.25, t.h, front - 0.25, s.wall, { faces: 'EWT' });
    b.box(xb - 0.25, top, zb + 0.25, xb, t.h, front - 0.25, s.wall, { faces: 'EWT' });
    // the ground floor: solid behind, and in front a room that is open to the street, lit inside
    b.box(xa, 0, zb, xb, storey, room, s.wall, { win: { cell: 2.2, storey, lit: 0.3, kind: 4 }, seed: seed + 0.1, faces: 'NEW' });
    b.box(xa, 0, room, xa + pier, storey, front, s.wall, { faces: 'ESW' });
    b.box(xb - pier, 0, room, xb, storey, front, s.wall, { faces: 'ESW' });
    b.box(xa + pier, 0, room - 0.05, xb - pier, storey, room, INSIDE, { faces: 'S', win: interior(2.4) });
    b.box(xa + pier, 0, room, xb - pier, 0.07, front, TILE, { faces: 'ST', win: interior(1.0) });
    b.quad([xa + pier, storey - 0.02, room], [xb - pier, storey - 0.02, room], [xb - pier, storey - 0.02, front], [xa + pier, storey - 0.02, front], [0, -1, 0], 0xd8d2c4, { win: interior(0.6) });
    // a band of colour under the first floor's windows, and the shop's board on it
    b.box(xa, storey, front, xb, storey + 0.16, front + 0.14, s.trim, { faces: 'ESWTB' });
    signBoard(k, s.sign, mid, storey + 0.86, front + 0.08, 0, 1, 1.0, xb - xa - 0.7);
    // on the roof: a black water tank or two, kept to the south of it, so that the statue behind is seen over the row
    for (const dx of i % 2 ? [-0.9] : [-1.1, 0.4]) b.cyl(mid + dx, front - 2.2, top, top + 1.0, 0.48, 0.48, 8, TANK, { cap: 0x34363d });
    k.lights.push({ x: mid, z: front + 1.6, r: 9, color: ['#ffe2ae', '#fff0d6', '#eaf4ff', '#bfefff', '#ffc4e2'][i], k: 0.6 });

    if (i === 0) {
      // seat covers: four seats on show before the shop, and rolls of cloth on its shelves
      const sets: [number, number][] = [[0xb3202a, 0x1b1b20], [0xd9c7a0, 0x7a5a3c], [0x2a3f6b, 0xb9bcc2], [0x1b1b20, 0xf2c81e]];
      sets.forEach(([cloth, piping], j) => {
        const x = xa + 0.9 + j * ((xb - xa - 1.8) / 3), z = front + 0.4;
        b.box(x - 0.3, 0, z - 0.05, x + 0.3, 0.5, z + 0.4, 0x4a4d52, { faces: 'ESWT' });
        b.box(x - 0.3, 0.5, z - 0.05, x + 0.3, 0.72, z + 0.45, cloth);
        b.box(x - 0.3, 0.72, z - 0.07, x + 0.3, 1.62, z + 0.09, cloth);
        b.box(x - 0.18, 1.62, z - 0.05, x + 0.18, 1.92, z + 0.07, piping);
      });
      for (let j = 0; j < 5; j++) b.box(xa + 0.6 + j * 0.9, 0.9, room + 0.02, xa + 1.2 + j * 0.9, 2.3, room + 0.4, [0x8e2a5e, 0xd9c7a0, 0x2f5d3a, 0xc8202c, 0x3f6fb5][j], { faces: 'ESWT', win: interior(0.7) });
    }
    if (i === 1) {
      // car accessories: alloy wheels hung in two rows across the front, tyres stacked before it, and the big board on the roof
      b.box(xa + pier, storey - 1.0, front - 0.14, xb - pier, storey, front - 0.05, 0x1d1e22, { faces: 'NSB' });
      for (let j = 0; j < 6; j++) hungWheel(b, xa + 0.85 + j * ((xb - xa - 1.7) / 5), storey - 0.5, front - 0.03, 0.4, ALLOYS[j]);
      for (let j = 0; j < 5; j++) hungWheel(b, xa + 1.1 + j * ((xb - xa - 2.2) / 4), 1.25, room + 0.03, 0.42, ALLOYS[(j + 2) % ALLOYS.length]);
      for (const [dx, n] of [[0.75, 3], [1.75, 2]]) {
        b.cyl(xa + dx, front + 0.6, 0, n * 0.3, 0.42, 0.42, 8, 0x17171a, { cap: 0x2a2b30 });
        b.cyl(xa + dx, front + 0.6, n * 0.3, n * 0.3 + 0.01, 0.2, 0.2, 6, 0x0c0c0e);
      }
      const w = signBoard(k, 'kb-roof', mid, t.h + 1.75, front - 0.6, 0, 1, 1.6, xb - xa - 0.5, true);
      for (const side of [-1, 1]) b.cyl(mid + side * w * 0.36, front - 0.6, top, t.h + 0.9, 0.1, 0.1, 4, STEEL, { cap: false });
    }
    if (i === 2) {
      // the fitting bay: a car up on two ramps, wheels along the back wall, a rolled shutter, and a worker kneeling at a wheel
      const cx = mid - 0.2, cz = front - 2.35, up = 0.46;
      b.box(xa + pier, storey - 0.42, front - 0.3, xb - pier, storey, front - 0.04, 0x8a8f96, { faces: 'NSB' });
      for (const side of [-1, 1]) {
        const rx = cx + side * 1.25;
        b.box(rx - 0.34, 0.07, cz - 3.3, rx + 0.34, up, cz + 2.9, 0xd8a21c);
        b.quad([rx - 0.34, 0.07, cz + 4.1], [rx + 0.34, 0.07, cz + 4.1], [rx + 0.34, up, cz + 2.9], [rx - 0.34, up, cz + 2.9], [0, 0.94, 0.33], 0xd8a21c);
      }
      standingCar(k, cx, cz, Math.PI / 2, { body: 0xd9dbe0, y: up });
      for (let j = 0; j < 8; j++) hungWheel(b, xa + 0.95 + (j % 4) * ((xb - xa - 1.9) / 3), j < 4 ? 2.45 : 1.45, room + 0.03, 0.4, ALLOYS[(j * 5 + 1) % ALLOYS.length]);
      // the worker, on one knee beside the front wheel on the side the view sees, with a wheel and his tools on the ground
      const wx = cx + 2.0, wz = cz + 2.15;
      b.box(wx - 0.27, 0.07, wz - 0.3, wx + 0.27, 0.5, wz + 0.42, 0x2f3d5a);
      b.box(wx - 0.36, 0.5, wz - 0.22, wx + 0.2, 1.3, wz + 0.22, 0x4f6f8f);
      b.box(wx - 0.62, 0.86, wz - 0.16, wx - 0.3, 1.08, wz + 0.16, 0x4f6f8f, { faces: 'NSWTB' });
      b.box(wx - 0.26, 1.3, wz - 0.2, wx + 0.14, 1.68, wz + 0.2, 0xa9744f, { faces: 'NESW' });
      b.box(wx - 0.3, 1.66, wz - 0.24, wx + 0.18, 1.8, wz + 0.24, 0xc8202c);
      b.cyl(wx + 0.75, wz + 0.75, 0, 0.26, 0.42, 0.42, 8, 0x17171a, { cap: 0xc9ced3 });
      b.box(wx - 0.3, 0, wz + 0.6, wx + 0.3, 0.3, wz + 0.92, 0xc8202c);
    }
    if (i === 3) {
      // car audio: speakers stacked inside the door, a shelf of sets that glow, and a strip of light over the front
      for (const side of [-1, 1]) {
        for (let j = 0; j < 2; j++) {
          const x = (side < 0 ? xa + pier + 0.5 : xb - pier - 0.5), y = 0.07 + j * 0.8;
          b.box(x - 0.4, y, front - 1.05, x + 0.4, y + 0.78, front - 0.4, 0x1b1c20);
          roundel(b, [x, y + 0.42, front - 0.38], 0.27, 'S', 0x6a6f78, {}, 8);
          roundel(b, [x, y + 0.42, front - 0.36], 0.1, 'S', 0x1b1c20, {}, 6);
        }
      }
      for (let j = 0; j < 4; j++) b.box(xa + 1.5 + j * 0.8, 1.2 + (j % 2) * 0.7, room + 0.02, xa + 2.1 + j * 0.8, 1.5 + (j % 2) * 0.7, room + 0.2, ['#35e0ff', '#ff3d9a', '#7dff9b', '#ffd23f'].map((c) => parseInt(c.slice(1), 16))[j], { faces: 'ESWT', win: interior(2.2) });
      k.glows.push({ x: mid, y: storey - 0.12, z: front + 0.02, sx: xb - xa - 0.7, sy: 0.1, sz: 0.1, color: '#35e0ff' });
      for (const x of [xa + 0.14, xb - 0.14]) k.glows.push({ x, y: storey / 2, z: front + 0.02, sx: 0.1, sy: storey - 0.3, sz: 0.1, color: '#35e0ff' });
    }
    if (i === 4) {
      // lights: bars of every colour on the back wall, and strips round the whole front
      ['#ff3d9a', '#ffd23f', '#7dff9b', '#35e0ff', '#b98cff'].forEach((color, j) => {
        b.box(xa + 0.8, 0.7 + j * 0.45, room + 0.02, xb - 0.8, 0.84 + j * 0.45, room + 0.12, parseInt(color.slice(1), 16), { faces: 'ESWT', win: interior(2.4) });
      });
      k.glows.push({ x: mid, y: storey - 0.12, z: front + 0.02, sx: xb - xa - 0.7, sy: 0.1, sz: 0.1, color: '#ff3d9a' }, { x: mid, y: storey + 1.5, z: front + 0.16, sx: xb - xa - 0.5, sy: 0.08, sz: 0.08, color: '#7dff9b' });
      for (const x of [xa + 0.14, xb - 0.14]) k.glows.push({ x, y: storey / 2, z: front + 0.02, sx: 0.1, sy: storey - 0.3, sz: 0.1, color: '#ffd23f' });
    }
    if (i === 0 || i === 2) {
      // a balcony on the second floor
      b.box(xa + 0.5, 2 * storey - 0.12, front, xb - 0.5, 2 * storey, front + 0.85, s.trim, { faces: 'ESWTB' });
      b.box(xa + 0.5, 2 * storey, front + 0.75, xb - 0.5, 2 * storey + 0.8, front + 0.85, s.wall, { faces: 'NSEWT' });
      for (const x of [xa + 0.5, xb - 0.6]) b.box(x, 2 * storey, front, x + 0.1, 2 * storey + 0.8, front + 0.75, s.wall, { faces: 'EWT' });
    }
    xa = xb;
  });

  // --- the forecourt: the bay painted for a hero, which is kept empty, and nothing tall to the south-east of it ---
  const { x: hx, z: hz, half, wide } = HERO_BAY, line = 0.14, PAINT = 0xf2c81e;
  area(k, rect(hx - half, hz - wide, hx + half, hz + wide), 0x9d988f, 0.032);
  area(k, rect(hx - half, hz - wide, hx + half, hz - wide + line), PAINT, 0.044);
  area(k, rect(hx - half, hz + wide - line, hx + half, hz + wide), PAINT, 0.044);
  area(k, rect(hx - half, hz - wide + line, hx - half + line, hz + wide - line), PAINT, 0.044);
  area(k, rect(hx + half - line, hz - wide + line, hx + half, hz + wide - line), PAINT, 0.044);
  // scooters and customers, at the west end of the forecourt, away from the bay
  twoWheeler(b, x0 + 1.4, zs - 1.3, -Math.PI / 2, 0xc8202c, true);
  twoWheeler(b, x0 + 2.5, zs - 1.25, -Math.PI / 2, 0x2a2b30);
  for (const [dx, dz] of [[3.2, 0.9], [4.6, 1.5], [8.9, 1.0], [10.2, 1.6], [11.3, 0.7], [16.1, 1.3], [17.4, 0.7]]) k.person(x0 + dx, zf + dz);
  // and two more inside the shops that the bay stands before
  k.person(hx - 2.2, zf - 1.0, 0.07);
  k.person(hx + 3.4, zf - 1.3, 0.07);
}

// ---------------------------------------------------------------------------
// The statue of Hanuman at Jhandewalan
// ---------------------------------------------------------------------------

/**
 * The great statue, standing on its temple: saffron, crowned, his arms at his
 * chest and his mace against his left shoulder. It is turned to look at the
 * opening view. A place of worship: it is drawn plainly, and the temple's
 * doorway is a plain arch.
 */
function hanuman(k: Build, t: Thing): void {
  const BODY = 0xee7a22, TAIL = 0xdc6c1c, MUZZLE = 0xf6a35c, CLOTH = 0xe9b93c, SASH = 0xb3202a, PINK = 0xf0d9c4, OCHRE = 0xc8553a;
  const lit = interior(0.42), glow = { win: lit };
  placed(k, t.x + t.w * 0.475, t.z + t.d * 0.425, -35, (q) => {
    // the height of the temple, one unit of the figure, and one unit of the temple's plan: its hall is 5.4 of them wide, in a lot of 8
    const b = q.b, base = t.h * 0.24, u = (t.h - base) / 11.4, m = Math.min(t.w, t.d) / 8, hw = 2.7 * m, zb = -2.0 * m, zf = 1.6 * m;
    const Y = (y: number): number => base + y * u;

    // the temple under his feet: a plain hall, a band of ochre round its head, and the doorway in a porch on its front
    b.box(-hw, 0, zb, hw, base, zf, PINK, { top: 0xd9c9b4 });
    b.box(-hw - 0.12, base - 0.5, zb - 0.12, hw + 0.12, base - 0.18, zf + 0.12, OCHRE, { faces: 'NESWTB' });
    b.box(-hw - 0.12, 0, zb - 0.12, hw + 0.12, 0.3, zf + 0.12, 0xd9c2a4);
    b.box(-1.15 * m, 0.3, zf, 1.15 * m, base - 0.5, zf + 0.3, PINK, { faces: 'ESWT', top: OCHRE });
    niche(b, 'S', zf + 0.3, 0, 0.3, 1.9 * m, base - 1.05, OCHRE, { proud: 0.03 });
    niche(b, 'S', zf + 0.3, 0, 0.3, 1.5 * m, base - 1.35, RECESS, { lit: 1.1, proud: 0.07 });
    steps(b, 'S', zf + 0.3, -1.1 * m, 1.1 * m, 0, 0.3, 2, 0.28, STONE);
    for (const x of [-2.0 * m, 2.0 * m]) niche(b, 'S', zf, x, 0.75, 0.7 * m, 1.5, RECESS, { lit: 0.5 });
    for (const x of [-hw + 0.25, hw - 0.25]) {
      // a saffron pennant at each corner of the roof
      b.cyl(x, zf - 0.3, base, base + 2.2, 0.06, 0.05, 4, 0xd9dde2, { cap: false });
      for (const side of [-1, 1]) tri(b, [x, base + 2.15, zf - 0.3 + side * 0.02], [x, base + 1.55, zf - 0.3 + side * 0.02], [x + 0.85, base + 1.75, zf - 0.3 + side * 0.02], [0, 0, side], SAFFRON, glow);
    }

    // the figure: feet, legs, the cloth round his hips, chest and shoulders
    b.cyl(0, -0.2, base, Y(0.45), 1.7 * u, 1.55 * u, 10, GOLD_DEEP, { ...glow, cap: GOLD });
    for (const s of [-1, 1]) {
      b.box(s * 0.62 * u - 0.42 * u, Y(0.45), -0.75 * u, s * 0.62 * u + 0.42 * u, Y(0.9), 0.95 * u, BODY, glow);
      b.cyl(s * 0.62 * u, -0.2, Y(0.9), Y(3.9), 0.5 * u, 0.62 * u, 6, BODY, { ...glow, cap: false });
      b.cyl(s * 0.62 * u, -0.2, Y(0.95), Y(1.2), 0.6 * u, 0.6 * u, 6, GOLD, { ...glow, cap: false });
    }
    b.cyl(0, -0.2, Y(3.5), Y(4.9), 1.28 * u, 1.14 * u, 8, CLOTH, { ...glow, cap: false });
    b.box(-0.3 * u, Y(2.9), 0.85 * u, 0.3 * u, Y(4.7), 1.08 * u, SASH, glow);
    b.cyl(0, -0.2, Y(4.8), Y(5.08), 1.2 * u, 1.2 * u, 8, GOLD, { ...glow, cap: false });
    b.cyl(0, -0.2, Y(5.0), Y(7.1), 1.05 * u, 1.5 * u, 8, BODY, { ...glow, cap: false });
    b.cyl(0, -0.2, Y(7.1), Y(7.7), 1.5 * u, 1.2 * u, 8, BODY, glow);
    b.box(-0.72 * u, Y(6.75), 1.0 * u, 0.72 * u, Y(7.4), 1.3 * u, GOLD, glow);
    // his arms: the right hand on his chest, the left holding the mace
    const P = (x: number, y: number, z: number): V3 => [x * u, Y(y), z * u - 0.2];
    for (const s of [-1, 1]) {
      b.beam(P(s * 1.62, 7.3, 0), P(s * 1.86, 5.5, 0.38), 0.44 * u, 0.38 * u, BODY, glow);
      b.cyl(s * 1.72 * u, -0.2 + 0.14 * u, Y(6.25), Y(6.55), 0.5 * u, 0.5 * u, 6, GOLD, { ...glow, cap: false });
    }
    b.beam(P(-1.86, 5.5, 0.38), P(-0.4, 6.45, 1.35), 0.38 * u, 0.3 * u, BODY, glow);
    b.beam(P(1.86, 5.5, 0.38), P(1.95, 6.2, 1.05), 0.38 * u, 0.3 * u, BODY, glow);
    // his head: a monkey's muzzle, ears, a mark on his brow, and the crown
    b.cyl(0, -0.2, Y(7.7), Y(8.0), 0.5 * u, 0.5 * u, 6, BODY, { ...glow, cap: false });
    b.cyl(0, -0.2, Y(8.0), Y(9.5), 0.82 * u, 0.86 * u, 8, BODY, glow);
    b.box(-0.44 * u, Y(8.1), 0.5 * u, 0.44 * u, Y(8.8), 0.92 * u, MUZZLE, glow);
    b.box(-0.07 * u, Y(8.95), 0.58 * u, 0.07 * u, Y(9.4), 0.64 * u, SASH, { faces: 'S' });
    for (const s of [-1, 1]) b.box(s * 0.95 * u - 0.14 * u, Y(8.5), -0.42 * u, s * 0.95 * u + 0.14 * u, Y(9.1), 0.02 * u, BODY, glow);
    lathe(b, 0, -0.2, [[0.98 * u, Y(9.5)], [0.9 * u, Y(9.95)], [0.78 * u, Y(10.0)], [0.5 * u, Y(10.8)], [0.2 * u, Y(11.2)], [0.03, Y(11.55)]], 8, GOLD, glow);
    // the mace, upright against his left shoulder
    b.cyl(1.95 * u, 0.9 * u - 0.2, Y(4.9), Y(8.5), 0.13 * u, 0.13 * u, 5, GOLD_DEEP, { ...glow, cap: false });
    lathe(b, 1.95 * u, 0.9 * u - 0.2, [[0.13 * u, Y(8.5)], [0.6 * u, Y(8.75)], [0.9 * u, Y(9.5)], [0.76 * u, Y(10.2)], [0.3 * u, Y(10.65)], [0.03, Y(10.95)]], 8, GOLD, glow);
    // his tail, which swings out behind him on his right and curls over at its tip
    const tail: V3[] = [P(-0.4, 4.4, -0.9), P(-1.4, 3.6, -1.6), P(-2.4, 3.7, -1.9), P(-3.0, 4.8, -1.9), P(-3.05, 6.2, -1.7), P(-2.6, 7.1, -1.5), P(-2.15, 6.8, -1.4)];
    b.sweep(tail, tail.map((_, i) => (0.26 - i * 0.022) * u), TAIL, glow);

    // lamps either side of the steps, and a few people before the temple
    for (const x of [-1.9 * m, 1.9 * m]) lantern(q, x, zf + 0.9, 0, 2.3, 0x6a4a32);
    for (const [x, z] of [[-0.6, 1.5], [0.9, 1.8], [2.6, 1.4]]) q.person(x * m, zf + z);
    q.lights.push({ x: 0, z: zf + 1.6, r: 13, color: '#ffe2ae', k: 0.8 }, { x: 0, z: -0.2, r: 9, color: '#ffd9a0', k: 0.6 });
  });
}

// ---------------------------------------------------------------------------
// What this file hands over
// ---------------------------------------------------------------------------

/** What this file builds, by the id of the thing in the plan. */
export const MODELS: Record<string, Model> = {
  'connaught-place': connaughtPlace,
  flag: flagInThePark,
  'jantar-mantar': jantarMantar,
  'agrasen-ki-baoli': agrasenKiBaoli,
  'bangla-sahib': banglaSahib,
  'karol-bagh': karolBagh,
  hanuman,
};

/** Lines that something moves along, as [x, y, z] points, for the check that nothing crosses a road on the level. Nothing of this file's moves. */
export const RAILS: Record<string, [number, number, number][]> = {};

/** Whatever this file builds that is not one of the plan's things. */
export function extras(_k: Build): void {}
