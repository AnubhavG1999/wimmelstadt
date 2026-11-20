// Campustown, on the south side of Green Street: The Red Lion and its beer
// garden, two rows of shops with flats over them, 309 Green, the Tower at
// Third, the bar and grill at Fourth Street, and Joe's Brewery behind it.
//
// Their fronts face north, onto Green Street, so the opening view sees their
// backs first: the backs, the east sides and the roofs are built to be looked
// at, and every real name is hung twice, on the front and where that view
// reads it. The two towers are seen from all round: 309 Green has a pool on
// its roof, a screen round its plant and a glass corner that rises to a red
// lamp; the Tower at Third, a hotel of 1972, keeps the glazed top floor where
// its restaurant was, lit all round at night.

import { interior, rng, type V3, type WinSpec } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { lantern, parasol, rad } from '../../engine/parts';
import { beacon, slab } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { BASE, BRICK, DARK, FELT, GLASS, HALL, HALL_NARROW, IRON, LIMESTONE, STOREY, TRIM, awning, chimney } from './look';
import { lot, type LotDef, type Model } from './plan';

// --- colours of this file's own (worth moving to look.ts if another file wants them) ---

/** Dark metal of shopfronts, the wood of fences and tables, the paving of a beer garden, the felt-grey of rooftop plant. */
const FRAME = 0x3d424a, WOOD = 0x9a7048, WOOD_DARK = 0x5e4430, PAVER = 0x9d8f7e, PLANT = 0xb4b8bc;
/** A shopfront's stone, and a door lit from within. */
const STONE = 0xd9cfbd, DOOR = 0x2c3037;
/** Wires and posts for strings of lamps, painted light because thin bars come out dark. */
const WIRE = 0xd6d0c4, POLE = 0x8c9198;
/** 309 Green: its brick, its buff precast, and its glass. The Tower at Third: its concrete, and its bronze glass. */
const BRICK_309 = 0x8a4a3a, BUFF_309 = 0xd9ceb6, GLASS_309 = 0x7fa6c2, CONCRETE = 0xd2cab9, BRONZE_GLASS = 0x5d5648;
/** The water of a pool, and the warm white of a bulb. */
const POOL = 0x4fb3d6, BULB = '#ffd58a';

/** How far a front on Green Street stands back from the sidewalk, so that there is paving to stand on. */
const SET = 1.0;
/** The way the opening view looks from. */
const VIEW = rad(42), VX = Math.sin(VIEW), VZ = Math.cos(VIEW);

// ---------------------------------------------------------------------------
// Signs
// ---------------------------------------------------------------------------

const neon = (id: string, text: string, color: string, w: number, real = false): SignDef =>
  ({ id, lines: [text], color, aspect: w / 64, size: [w, 64], real });
const cloth = (id: string, text: string, color: string, ink = '#f4efe0', real = false): SignDef =>
  ({ id, lines: [text], color, ink, aspect: 4.2, kind: 'board', size: [218, 52], real });
const plain = (id: string, text: string, color = '#f3f0e7', ink = '#2a2d33', real = true): SignDef => {
  const aspect = Math.max(2, text.length * 0.62);
  return { id, lines: [text], color, ink, aspect, kind: 'board', real, size: [Math.round(52 * aspect), 52] };
};

export const SIGNS: SignDef[] = [
  // The Red Lion: red neon on Green Street, and again over its garden
  neon('campustown-red-lion', 'RED LION', '#ff3b3b', 300, true),
  neon('campustown-beer-garden', 'BEER GARDEN', '#ffb347', 300),
  // the first row: what is sold
  cloth('campustown-tacos', 'TACOS', '#b8432a'),
  { id: 'campustown-bubble-tea', lines: ['BUBBLE TEA'], color: '#f3c6d8', ink: '#5a2148', aspect: 5, kind: 'box', size: [260, 52] },
  cloth('campustown-barber', 'BARBER', '#27405f'),
  // the second row: two real names, as plain lettering, and a trade between them
  { id: 'campustown-cracked', lines: ['CRACKED'], color: '#f3efe2', ink: '#2a2d33', aspect: 5, kind: 'box', size: [240, 52], real: true },
  cloth('campustown-shawarma', 'SHAWARMA', '#2f5d46'),
  cloth('campustown-mia-zas', "MIA ZA'S", '#3a3f47', '#f4efe0', true),
  plain('campustown-cracked-roof', 'CRACKED'),
  plain('campustown-mia-zas-wall', "MIA ZA'S"),
  // the bar and grill at Fourth Street
  neon('campustown-bar-grill', 'BAR & GRILL', '#ffb02e', 320),
  neon('campustown-sports', 'SPORTS', '#4fd2ff', 200),
  // the towers' names, plain, and the shops in 309 Green's foot
  plain('campustown-309', '309 GREEN'),
  plain('campustown-tower-third', 'THE TOWER AT THIRD'),
  { id: 'campustown-coffee', lines: ['COFFEE'], color: '#e9dcc4', ink: '#3b2a1e', aspect: 4.4, kind: 'box', size: [228, 52] },
  { id: 'campustown-bikes', lines: ['BIKES'], color: '#d8e6ef', ink: '#1f3d5a', aspect: 4.4, kind: 'box', size: [228, 52] },
  // Joe's: neon over its door, and its name painted large on the brick of its east wall
  neon('campustown-joes', "JOE'S BREWERY", '#ffcf5a', 380, true),
  plain('campustown-joes-wall', "JOE'S BREWERY", '#8a3e2e', '#f3e6c8'),
  // the yard of food trucks behind the Red Lion's garden: its name, and what each truck sells
  neon('campustown-food-trucks', 'FOOD TRUCKS', '#7ff0a8', 320),
  cloth('campustown-truck-waffles', 'WAFFLES', '#c9861c'),
  cloth('campustown-truck-bbq', 'BBQ', '#7a2f22'),
  cloth('campustown-truck-dumplings', 'DUMPLINGS', '#2f5d8a'),
];

/** A board on a wall that faces (nx, nz): a thin box proud of the wall, and the sign 0.03 in front of it. */
function plate(k: Build, id: string, x: number, y: number, z: number, nx: number, nz: number, h: number, w: number, color = TRIM): void {
  const d = 0.1, hw = w / 2 + 0.12, hh = h / 2 + 0.08;
  if (nz !== 0) k.b.box(x - hw, y - hh, nz > 0 ? z : z - d, x + hw, y + hh, nz > 0 ? z + d : z, color, { faces: nz > 0 ? 'SEWTB' : 'NEWTB' });
  else k.b.box(nx > 0 ? x : x - d, y - hh, z - hw, nx > 0 ? x + d : x, y + hh, z + hw, color, { faces: nx > 0 ? 'ENSTB' : 'WNSTB' });
  k.sign(id, x + nx * (d + 0.03), y, z + nz * (d + 0.03), nx, nz, h, w);
}

/** A board on two posts on a roof at `y0`, turned to face the opening view. */
function roofBoard(k: Build, id: string, x: number, y0: number, z: number, w: number, h: number, frame: number): void {
  const b = k.b, by = y0 + 0.45 + h / 2;
  b.obox(x, by, z, w / 2 + 0.1, h / 2 + 0.1, 0.06, -VIEW, frame);
  k.sign(id, x + VX * 0.09, by, z + VZ * 0.09, VX, VZ, h, w);
  for (const s of [-1, 1]) {
    const px = x + s * Math.cos(VIEW) * (w / 2 - 0.4) - VX * 0.12, pz = z - s * Math.sin(VIEW) * (w / 2 - 0.4) - VZ * 0.12;
    b.box(px - 0.07, y0, pz - 0.07, px + 0.07, by - h / 2, pz + 0.07, PLANT, { faces: 'NESW' });
  }
}

/** A picnic table along x, with a bench each side, standing on ground at `y`. */
function picnic(k: Build, x: number, z: number, y: number, along: 'x' | 'z' = 'x'): void {
  const b = k.b;
  const bx = (a0: number, y0: number, c0: number, a1: number, y1: number, c1: number, faces: string): void => {
    if (along === 'x') b.box(x + a0, y + y0, z + c0, x + a1, y + y1, z + c1, WOOD, { faces, top: 0xb08a5e });
    else b.box(x + c0, y + y0, z + a0, x + c1, y + y1, z + a1, WOOD, { faces, top: 0xb08a5e });
  };
  bx(-0.9, 0.7, -0.38, 0.9, 0.78, 0.38, 'NESWTB');
  bx(-0.9, 0.4, 0.6, 0.9, 0.47, 0.88, 'NESWT');
  bx(-0.9, 0.4, -0.88, 0.9, 0.47, -0.6, 'NESWT');
  bx(-0.06, 0, -0.7, 0.06, 0.7, 0.7, 'NESW');
}

/** A string of lamps between two points: a light wire, and bulbs along it that glow. */
function lampString(k: Build, a: V3, c: V3, n: number): void {
  k.b.beam(a, c, 0.03, 0.03, WIRE);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    k.glows.push({ x: a[0] + (c[0] - a[0]) * t, y: a[1] + (c[1] - a[1]) * t - 0.09, z: a[2] + (c[2] - a[2]) * t, sx: 0.17, sy: 0.17, sz: 0.17, color: BULB });
  }
}

/** A rooftop unit of plant: a grey box with a dark grille on its top. */
function unit(k: Build, x: number, z: number, y: number, w = 1.1, d = 0.8, h = 0.7): void {
  k.b.box(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, PLANT, { top: 0x7d8288 });
}

// ---------------------------------------------------------------------------
// The Red Lion
// ---------------------------------------------------------------------------

/** Its brick, painted a deep red-brown, and the dark wood of its front. */
const RL_BRICK = 0x6b3229, RL_TRIM = 0x2e2220;

function redLion(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, x1, z1, h } = l, f = l.z0 + 0.6, cx = (x0 + x1) / 2, cz = (f + z1) / 2;
  const WALL = h - 0.65, ROOF = WALL + 0.3;

  // one tall storey of painted brick, a dark base, a dark cornice that is the edge of its flat roof
  b.box(x0, 0, f, x1, WALL, z1, RL_BRICK, { faces: 'NESW' });
  b.box(x0 - 0.06, 0, f - 0.06, x1 + 0.06, 0.5, z1 + 0.06, 0x3a3634, { faces: 'NESWT' });
  b.box(x0 - 0.15, WALL, f - 0.15, x1 + 0.15, ROOF, z1 + 0.15, RL_TRIM, { faces: 'NESWTB', top: FELT });
  // a low parapet on the two street sides
  b.box(x0 - 0.15, ROOF, f - 0.15, x1 + 0.15, h, f + 0.1, RL_TRIM, { faces: 'NESWT' });
  b.box(x0 - 0.15, ROOF, f + 0.1, x0 + 0.1, h, z1 + 0.15, RL_TRIM, { faces: 'ESWT' });

  // the front on Green Street: a frontage of dark wood, a pair of doors under a canopy, two windows glowing red
  b.box(x0 + 0.3, 0, f - 0.12, x1 - 0.3, 3.3, f, WOOD_DARK, { faces: 'NEWT' });
  b.box(cx - 0.75, 0.03, f - 0.17, cx + 0.75, 2.4, f - 0.12, DOOR, { faces: 'N', win: interior(1.6) });
  b.box(cx - 1.3, 2.55, f - 1.0, cx + 1.3, 2.7, f - 0.12, RL_TRIM, { faces: 'NESWTB' });
  for (const x of [x0 + 1.6, x1 - 1.6]) {
    b.box(x - 1.0, 0.9, f - 0.17, x + 1.0, 2.6, f - 0.12, 0x5a1c1c, { faces: 'N', win: interior(1.4) });
    // a short black awning over each, and a lamp on the wall beside it
    slab(b, [x, 3.05, f - 0.12], [x, 2.75, f - 0.75], 1.1, 0.06, 0x1d1d22);
    k.glows.push({ x: x + (x < cx ? -1.25 : 1.25), y: 2.9, z: f - 0.22, sx: 0.18, sy: 0.3, sz: 0.16, color: '#ffcf8a' });
  }
  plate(k, 'campustown-red-lion', cx, 4.2, f, 0, -1, 1.0, 4.4, 0x15151c);
  k.glows.push({ x: cx, y: 2.45, z: f - 0.6, sx: 1.6, sy: 0.08, sz: 0.1, color: '#ffe2ae' });
  k.lights.push({ x: cx, z: f - 2.2, r: 9, color: '#ff9a7a', k: 0.55 });
  // a doorman and two waiting to go in
  k.person(cx - 1.4, f - 0.4);
  k.person(cx + 1.7, l.z0 + 0.25);
  k.person(cx + 2.4, l.z0 + 0.35);

  // the east side, onto the garden: two wide doors open, and its name again in neon, where the opening view reads it
  for (const z of [f + 1.6, z1 - 2.0]) {
    b.box(x1, 0.03, z - 0.9, x1 + 0.05, 2.5, z + 0.9, DOOR, { faces: 'E', win: interior(1.7) });
    b.box(x1, 2.5, z - 1.0, x1 + 0.12, 2.65, z + 1.0, RL_TRIM, { faces: 'ENSTB' });
  }
  plate(k, 'campustown-red-lion', x1, 4.1, cz, 1, 0, 0.95, 4.2, 0x15151c);
  // the bar that serves the garden, along that wall, with its taps lit
  b.box(x1 + 0.05, 0, cz - 1.3, x1 + 0.75, 1.1, cz + 1.3, WOOD_DARK, { top: 0x2b2b2b });
  k.glows.push({ x: x1 + 0.4, y: 1.22, z: cz, sx: 0.12, sy: 0.12, sz: 1.6, color: '#ffe2ae' });

  // the back, on the south: the kitchen door with a lamp over it, the bins, a stair up to the roof
  b.box(x0 + 1.2, 0.03, z1, x0 + 2.2, 2.2, z1 + 0.05, 0x5a5f66, { faces: 'S' });
  k.glows.push({ x: x0 + 1.7, y: 2.5, z: z1 + 0.14, sx: 0.3, sy: 0.14, sz: 0.14, color: '#ffe2ae' });
  b.box(x0 + 2.8, 0, z1 + 0.15, x0 + 4.3, 1.0, z1 + 1.0, 0x3f5d4a, { top: 0x2f4a3a });
  b.box(x0 + 4.5, 0, z1 + 0.2, x0 + 5.1, 0.95, z1 + 0.8, 0x2f3540);
  // (a ladder in a cage, up the back wall)
  for (const x of [x1 - 0.85, x1 - 0.35]) b.box(x - 0.05, 0.4, z1 + 0.05, x + 0.05, h + 0.4, z1 + 0.15, 0xa9aeb4, { faces: 'NESWT' });
  for (const y of [2.2, 3.4, 4.6]) b.box(x1 - 1.0, y, z1 + 0.05, x1 - 0.2, y + 0.08, z1 + 0.6, 0xa9aeb4, { faces: 'ESWTB' });
  // up on the roof: the units that cool the dance floor, and a vent
  unit(k, x0 + 2.2, cz - 1.0, ROOF, 1.6, 1.1, 0.9);
  unit(k, x1 - 2.4, cz + 1.4, ROOF);
  b.cyl(x0 + 2.0, z1 - 1.2, ROOF, ROOF + 0.9, 0.22, 0.22, 6, PLANT);
}

/** The Red Lion's beer garden, on the open ground east of it, between it and the first row of shops. */
function beerGarden(k: Build): void {
  const b = k.b, rl = lot('red-lion'), s1 = lot('shops-s1');
  const gx0 = rl.x1 + 0.05, gx1 = s1.x0 - 0.5, gz0 = rl.z0 + 0.2, gz1 = rl.z1 - 0.5;
  const y = 0.035, R = rng(21173);
  area(k, rect(gx0, gz0, gx1, gz1), PAVER, y);

  // a fence of boards round it, with a gate onto Green Street at its west end
  const FH = 1.25, T = 0.12, gate = gx0 + 2.6;
  b.box(gate, 0, gz0, gx1, FH, gz0 + T, WOOD, { top: 0xb08a5e });
  b.box(gx1 - T, 0, gz0 + T, gx1, FH, gz1, WOOD, { faces: 'EWT', top: 0xb08a5e });
  b.box(gx0 + 0.75, 0, gz1 - T, gx1 - T, FH, gz1, WOOD, { faces: 'NSWT', top: 0xb08a5e });
  // a lamp on the gatepost
  lantern(k, gate + 0.15, gz0 + 0.06, 0, 1.9, IRON);

  // posts along the east fence, and strings of lamps from the Red Lion's wall to them, crossing over the tables
  const posts = [gz0 + 0.5, (gz0 + gz1) / 2, gz1 - 0.5];
  for (const z of posts) b.box(gx1 - 0.45, 0, z - 0.07, gx1 - 0.31, 3.3, z + 0.07, POLE, { faces: 'NESW' });
  const wall = rl.x1 + 0.1, hy = 3.7, py = 3.2;
  lampString(k, [wall, hy, gz0 + 0.8], [gx1 - 0.38, py, posts[1]], 7);
  lampString(k, [wall, hy, posts[1]], [gx1 - 0.38, py, posts[0]], 7);
  lampString(k, [wall, hy, posts[1]], [gx1 - 0.38, py, posts[2]], 7);
  lampString(k, [wall, hy, gz1 - 0.6], [gx1 - 0.38, py, posts[1]], 7);
  // its own name over the gate, inside the fence, facing the opening view
  plate(k, 'campustown-beer-garden', (gx0 + gx1) / 2 + 0.6, 2.35, gz1 - 0.05, 0, 1, 0.55, 2.6, 0x15151c);
  b.box((gx0 + gx1) / 2 - 0.95, 0, gz1 - 0.14, (gx0 + gx1) / 2 - 0.81, 2.0, gz1 - 0.02, POLE, { faces: 'NESW' });
  b.box((gx0 + gx1) / 2 + 2.01, 0, gz1 - 0.14, (gx0 + gx1) / 2 + 2.15, 2.0, gz1 - 0.02, POLE, { faces: 'NESW' });

  // picnic tables in two rows, and two high tables under red parasols by the bar
  const tx = [gx0 + 3.2, gx0 + 6.0], tz = [gz0 + 2.4, gz0 + 5.0];
  for (const x of tx) for (const z of tz) picnic(k, x, z, y);
  parasol(b, gx0 + 1.4, gz1 - 1.3, 0xb3302a, y);
  parasol(b, gx0 + 1.4, gz0 + 1.6, 0xe8e2d2, y);
  // people: at the tables, at the bar, and standing about
  for (const x of tx) for (const z of tz) {
    k.person(x - 0.5, z + 0.95, y);
    k.person(x + 0.4, z - 0.95, y);
    if (R() > 0.4) k.person(x + 0.6 + R() * 0.3, z + 0.95, y);
  }
  for (const [dx, dz] of [[0.95, -0.6], [1.0, 0.6], [1.05, 1.6], [2.2, -1.9], [0.6, 2.6]]) k.person(rl.x1 + dx, (rl.z0 + rl.z1) / 2 + dz, y);
  k.person(gx0 + 0.9, gz1 - 0.7, y);
  k.person(gx0 + 2.0, gz1 - 1.6, y);
  k.person(gx0 + 2.0, gz0 + 1.2, y);
  // the garden's own light by night, and a warm pool on the paving at its gate
  k.lights.push({ x: (gx0 + gx1) / 2, z: (gz0 + gz1) / 2, r: 9, color: '#ffd9a0', k: 0.7 });
  k.lights.push({ x: gx0 + 2, z: gz0 - 1.0, r: 6, color: '#ffd9a0', k: 0.4 });
}

// ---------------------------------------------------------------------------
// The rows of shops with flats over them
// ---------------------------------------------------------------------------

interface Shop {
  sign: string;
  /** The awning's cloth, or the colour of a fascia's frame. */
  cloth: number;
  brick: number;
  /** How high its parapet stands. */
  top: number;
  front: 'awning' | 'fascia';
}

/**
 * A row of shops along Green Street, its fronts on the north: a ground floor
 * of shops, a storey of flats over each in a brick of its own, each parapet
 * at a height of its own, and the backs, with the flats' doors and their
 * stairs, the bins and the plant, on the south.
 */
function row(k: Build, l: LotDef, shops: Shop[], seed: number): { f: number; bays: [number, number][] } {
  const b = k.b;
  const { x0, x1, z1 } = l, f = l.z0 + SET, n = shops.length, w = (x1 - x0) / n, U = 2 * STOREY;
  const bays: [number, number][] = shops.map((_, i) => [x0 + i * w, x0 + (i + 1) * w]);

  // the ground floor, in one stone skin, which the shopfronts are set in
  b.box(x0, 0, f, x1, STOREY, z1, STONE, { faces: 'NESW' });
  b.box(x0 - 0.05, 0, f + 0.2, x1 + 0.05, 0.45, z1 + 0.05, BASE, { faces: 'ESWT' });

  shops.forEach((s, i) => {
    const [xa, xb] = bays[i], cx = (xa + xb) / 2;
    const prev = shops[i - 1], next = shops[i + 1];
    // the flats: a storey of brick with windows, and a parapet over it, each its own height
    b.box(xa, STOREY, f, xb, U, z1, s.brick, { win: HALL_NARROW, seed: seed + i * 0.17, faces: 'NS' + (i === 0 ? 'W' : '') + (i === n - 1 ? 'E' : '') });
    const sides = (!prev || s.top > prev.top ? 'W' : '') + (!next || s.top > next.top ? 'E' : '');
    b.box(xa, U, f, xb, s.top - 0.15, z1, s.brick, { faces: 'NST' + sides, top: FELT });
    // a coping of stone along the front and the back of the roof
    for (const [za, zb] of [[f - 0.06, f + 0.25], [z1 - 0.25, z1 + 0.06]]) b.box(xa - 0.04, s.top - 0.15, za, xb + 0.04, s.top + 0.12, zb, LIMESTONE, { faces: 'NESWT' });
    // a cornice where the parapet begins, a little different on each
    b.box(xa + 0.02, U - 0.02, f - 0.14, xb - 0.02, U + 0.2 + i * 0.04, f, TRIM, { faces: 'NEWTB' });

    // the shopfront: a riser, a window lit from within, a door at its east end
    const door = xb - 0.95;
    b.box(xa + 0.25, 0, f - 0.1, xb - 0.25, 0.45, f, FRAME, { faces: 'NEWT' });
    b.box(xa + 0.35, 0.45, f - 0.05, door - 0.6, 2.35, f, GLASS, { faces: 'N', win: interior(1.25) });
    b.box(door - 0.45, 0.03, f - 0.05, door + 0.45, 2.3, f, DOOR, { faces: 'N', win: interior(1.5) });
    if (s.front === 'awning') {
      const v = awning(b, 'N', xa + 0.3, xb - 0.3, f, 3.25, 0.95, 0.35, 0.5, s.cloth);
      k.sign(s.sign, v.x, v.y, v.z, v.nx, v.nz, 0.42, xb - xa - 1.0);
      k.glows.push({ x: cx, y: 2.75, z: f - 0.45, sx: xb - xa - 1.2, sy: 0.08, sz: 0.1, color: '#ffe2ae' });
    } else {
      // a lit box across the head of the window
      b.box(xa + 0.3, 2.5, f - 0.22, xb - 0.3, 3.15, f, s.cloth, { faces: 'NEWTB' });
      k.sign(s.sign, cx, 2.82, f - 0.25, 0, -1, 0.5, xb - xa - 0.8);
    }
    k.lights.push({ x: cx, z: f - 2.2, r: 6.5, color: '#ffe9c4', k: 0.5 });

    // the back: the shop's door and the flat's, each with a lamp over it
    b.box(cx - 1.0, 0.03, z1, cx - 0.2, 2.15, z1 + 0.05, 0x5a5f66, { faces: 'S' });
    b.box(cx + 0.4, 0.03, z1, cx + 1.2, 2.15, z1 + 0.05, 0x6a4a3a, { faces: 'S' });
    k.glows.push({ x: cx + 0.2, y: 2.45, z: z1 + 0.13, sx: 0.28, sy: 0.12, sz: 0.12, color: '#ffe2ae' });
    // and on the roof, each flat's cooling unit
    unit(k, cx + (i % 2 ? 0.8 : -0.8), z1 - 1.6, s.top - 0.15);
  });
  // piers of brick between the shops
  for (const [xa] of [...bays, [x1, x1] as [number, number]]) b.box(xa - 0.16, 0, f - 0.15, xa + 0.16, STOREY + 0.05, f, shops[0].brick, { faces: 'NEWT' });
  // a steel stair from the yard up to the flats, at the back of the middle shop, and the row's bins
  const mid = (bays[1][0] + bays[1][1]) / 2;
  slab(b, [mid - 2.0, 0.05, z1 + 0.65], [mid + 0.3, STOREY - 0.1, z1 + 0.65], 0.45, 0.1, IRON);
  b.beam([mid - 2.0, 0.95, z1 + 1.08], [mid + 0.3, STOREY + 0.8, z1 + 1.08], 0.04, 0.04, 0xa9aeb4);
  b.box(mid - 2.05, 0, z1 + 1.03, mid - 1.95, 0.95, z1 + 1.13, 0xa9aeb4, { faces: 'NESW' });
  b.box(mid + 0.3, STOREY - 0.2, z1 + 0.05, mid + 1.4, STOREY - 0.05, z1 + 1.1, IRON, { faces: 'NESWTB' });
  b.box(mid + 0.3, STOREY - 0.05, z1 + 1.0, mid + 1.4, STOREY + 0.85, z1 + 1.1, 0xa9aeb4, { faces: 'NESWT' });
  b.box(x0 + 0.5, 0, z1 + 0.2, x0 + 1.9, 1.0, z1 + 1.0, 0x3f5d4a, { top: 0x2f4a3a });
  return { f, bays };
}

function shopsS1(k: Build, l: LotDef): void {
  const { f, bays } = row(k, l, [
    { sign: 'campustown-tacos', cloth: 0xb8432a, brick: BRICK.red, top: l.h, front: 'awning' },
    { sign: 'campustown-bubble-tea', cloth: 0x5a2148, brick: BRICK.buff, top: l.h - 0.6, front: 'fascia' },
    { sign: 'campustown-barber', cloth: 0x27405f, brick: BRICK.brown, top: l.h - 0.25, front: 'awning' },
  ], 0.61);
  // the barber's pole, by its door
  const [, xb] = bays[2];
  k.b.cyl(xb - 0.3, f - 0.35, 1.2, 2.3, 0.13, 0.13, 6, 0xf4f1e8, { cap: 0xc8202c });
  k.b.box(xb - 0.38, 1.45, f - 0.43, xb - 0.22, 2.05, f - 0.26, 0xc8202c, { faces: 'NESW' });
  k.glows.push({ x: xb - 0.3, y: 2.45, z: f - 0.35, sx: 0.2, sy: 0.16, sz: 0.2, color: '#fff4e0' });
  // a queue at the taco shop, and someone with a cup of tea
  const [ta] = bays[0];
  k.person(ta + 1.2, l.z0 + 0.35);
  k.person(ta + 1.9, l.z0 + 0.25);
  k.person((bays[1][0] + bays[1][1]) / 2, l.z0 + 0.45);
  k.person(l.x1 - 1.5, l.z1 + 0.9);
}

function shopsS2(k: Build, l: LotDef): void {
  const { f, bays } = row(k, l, [
    { sign: 'campustown-cracked', cloth: 0xe0c24a, brick: 0x9c4a3a, top: l.h, front: 'fascia' },
    { sign: 'campustown-shawarma', cloth: 0x2f5d46, brick: BRICK.buff, top: l.h - 0.45, front: 'awning' },
    { sign: 'campustown-mia-zas', cloth: 0x3a3f47, brick: 0x7c4a3a, top: l.h - 0.15, front: 'awning' },
  ], 0.83);
  // Cracked's name again, on a board over its roof where the opening view reads it
  const [ca, cb] = bays[0];
  roofBoard(k, 'campustown-cracked-roof', (ca + cb) / 2 + 0.2, l.h, l.z1 - 1.0, 2.8, 0.6, 0x5a5f66);
  // Mia Za's on its east wall, over Wright Street, which the opening view sees
  plate(k, 'campustown-mia-zas-wall', l.x1, 4.35, (f + l.z1) / 2, 1, 0, 0.6, 3.2, 0x3a3f47);
  // a table outside Mia Za's, and people on the paving
  const mx = (bays[2][0] + bays[2][1]) / 2;
  k.person(mx - 1.0, l.z0 + 0.35);
  k.person(mx + 0.2, l.z0 + 0.45);
  k.person((ca + cb) / 2 - 0.6, l.z0 + 0.4);
  k.person((bays[1][0] + bays[1][1]) / 2 + 0.5, l.z0 + 0.3);
  k.lights.push({ x: l.x1 + 1.2, z: (f + l.z1) / 2, r: 7, color: '#ffe9c4', k: 0.4 });
}

// ---------------------------------------------------------------------------
// 309 Green
// ---------------------------------------------------------------------------

/** Twenty-three floors of flats over the shops, lower than the campus's storey, so that the tower reads as tall as it is. */
const FLATS_309: WinSpec = { cell: 1.15, storey: 1.0, lit: 0.45, kind: 0 };
const CORNER_309: WinSpec = { cell: 1.1, storey: 1.0, lit: 0.7, kind: 1 };

function green309(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, x1, z1, h } = l, f = l.z0 + SET, cx = (x0 + x1) / 2;
  const POD = 3, A_TOP = 24, B_TOP = 26;
  const tx0 = x0 + 0.5, tx1 = x1 - 0.5, tz0 = f + 0.4, tz1 = z1 - 0.6, split = cx - 0.5;

  // the foot: a storey of shops and the lobby, in brick, the whole lot
  b.box(x0 + 0.2, 0, f, x1 - 0.2, POD, z1 - 0.2, BRICK_309, { faces: 'ESW' });
  b.box(x0 + 0.05, POD, f - 0.15, x1 - 0.05, POD + 0.3, z1 - 0.05, LIMESTONE, { faces: 'NESWTB', top: FELT });
  // the west mass: brick, up to its roof at the 24th floor's sill
  b.box(tx0, POD + 0.3, tz0, split, A_TOP, tz1, BRICK_309, { win: FLATS_309, seed: 0.27, faces: 'NSWT', top: FELT });
  b.box(tx0 - 0.1, A_TOP, tz0 - 0.1, split, A_TOP + 0.3, tz1 + 0.1, LIMESTONE, { faces: 'NSWB', top: FELT });
  // a slit of glass up the middle of its west face, where the stairs are
  b.box(tx0 - 0.05, POD + 0.8, (tz0 + tz1) / 2 - 0.3, tx0, A_TOP - 0.6, (tz0 + tz1) / 2 + 0.3, GLASS_309, { faces: 'W', win: interior(0.7) });
  // the east mass: buff, two floors higher, with bands of stone every eighth floor
  b.box(split, POD + 0.3, tz0, tx1, B_TOP, tz1, BUFF_309, { win: FLATS_309, seed: 0.71, faces: 'NESW' });
  for (const y of [11, 19]) b.box(split - 0.02, y - 0.08, tz0 - 0.08, tx1 + 0.08, y + 0.08, tz1 + 0.08, LIMESTONE, { faces: 'NESTB' });
  b.box(split - 0.1, B_TOP, tz0 - 0.1, tx1 + 0.1, B_TOP + 0.25, tz1 + 0.1, LIMESTONE, { faces: 'NESWTB', top: 0xc9c3b6 });
  // the glass corner at the south-east, which runs up past the roof to the red lamp
  const c = 2.2, gx = tx1 - c, gz = tz1 - c;
  b.box(gx, POD + 0.3, gz, tx1 + 0.25, 28, tz1 + 0.25, GLASS_309, { win: CORNER_309, seed: 0.4, faces: 'NESW' });
  b.box(gx - 0.1, 28, gz - 0.1, tx1 + 0.35, 28.3, tz1 + 0.35, LIMESTONE, { faces: 'NESWTB' });
  b.box(tx1 + 0.05, 28.3, tz1 + 0.05, tx1 + 0.35, h, tz1 + 0.35, PLANT, { faces: 'NESWT' });
  beacon(k, tx1 + 0.2, h + 0.35, tz1 + 0.2, 0.5);
  // white frames up the corner, at each face
  b.box(gx + c / 2 - 0.05, POD + 0.3, tz1 + 0.25, gx + c / 2 + 0.05, 28, tz1 + 0.32, TRIM, { faces: 'SEW' });
  b.box(tx1 + 0.25, POD + 0.3, gz + c / 2 - 0.05, tx1 + 0.32, 28, gz + c / 2 + 0.05, TRIM, { faces: 'ENS' });

  // on the roof of the east mass: the pool and its deck, behind a rail of glass
  const ry = B_TOP + 0.25;
  b.box(split + 0.8, ry, tz0 + 0.8, gx - 0.5, ry + 0.1, tz1 - 1.0, POOL, { faces: 'NESWT', win: interior(0.9) });
  b.box(split, ry, tz0 - 0.1, tx1 + 0.1, ry + 0.85, tz0 + 0.02, GLASS, { faces: 'NESWT' });
  b.box(tx1 - 0.02, ry, tz0 + 0.02, tx1 + 0.1, ry + 0.85, gz - 0.1, GLASS, { faces: 'ESWT' });
  for (const [x, z] of [[split + 1.0, tz1 - 0.6], [split + 2.0, tz1 - 0.55]]) b.box(x - 0.3, ry, z - 0.45, x + 0.3, ry + 0.3, z + 0.45, 0xf2efe6);
  k.person(split + 1.4, tz0 + 0.5, ry);
  k.person(gx - 0.2, tz0 + 0.6, ry);
  // on the roof of the west mass: the plant and the lifts' overrun, behind a screen of louvres, lit along its top at night
  const sy = A_TOP, sz0 = tz0 + 0.4, sz1 = tz1 - 0.4;
  b.box(tx0 + 0.3, sy, sz0, split - 0.1, 28.2, sz1, 0x9aa0a6, { faces: 'NESWT', top: 0x7d8288 });
  for (const y of [25.4, 26.6]) b.box(tx0 + 0.25, y - 0.06, sz0 - 0.05, split - 0.05, y + 0.06, sz1 + 0.05, PLANT, { faces: 'NSWTB' });
  k.glows.push({ x: (tx0 + split) / 2, y: 28.05, z: sz1 + 0.04, sx: split - tx0 - 0.6, sy: 0.12, sz: 0.06, color: '#fff1d6' });
  k.glows.push({ x: (tx0 + split) / 2, y: 28.05, z: sz0 - 0.04, sx: split - tx0 - 0.6, sy: 0.12, sz: 0.06, color: '#fff1d6' });
  k.glows.push({ x: tx0 + 0.26, y: 28.05, z: (sz0 + sz1) / 2, sx: 0.06, sy: 0.12, sz: sz1 - sz0, color: '#fff1d6' });
  // and a band of light round the top of the east mass
  k.glows.push({ x: (split + gx) / 2, y: B_TOP + 0.12, z: tz1 + 0.12, sx: gx - split, sy: 0.1, sz: 0.06, color: '#fff1d6' });
  k.glows.push({ x: tx1 + 0.12, y: B_TOP + 0.12, z: (tz0 + gz) / 2, sx: 0.06, sy: 0.1, sz: gz - tz0, color: '#fff1d6' });
  // balconies up the east face, on every other floor, each with a rail of glass
  for (let y = 5; y <= 23; y += 2) {
    const ba = tz0 + 0.7, bb = gz - 0.5;
    b.box(tx1, y - 0.12, ba, tx1 + 0.55, y, bb, LIMESTONE, { faces: 'NESWTB' });
    b.box(tx1 + 0.5, y, ba, tx1 + 0.55, y + 0.55, bb, GLASS, { faces: 'ENS' });
  }
  // fins of louvres down the plant screen's two faces that look south and east
  for (let i = 1; i <= 3; i++) {
    const x = tx0 + 0.3 + ((split - tx0 - 0.4) * i) / 4;
    b.box(x - 0.07, sy + 0.4, sz1, x + 0.07, 28.2, sz1 + 0.16, PLANT, { faces: 'SEW' });
  }
  // a canopy of glass over the lobby's back door on the south
  b.box(cx - 1.4, 2.5, z1 - 0.2, cx + 1.4, 2.62, z1 + 0.7, GLASS, { faces: 'NESWTB' });
  // its name, high on the east face, which the opening view and the campus see, and over the lobby door on Green Street
  plate(k, 'campustown-309', tx1 + 0.02, 24.9, (tz0 + gz) / 2, 1, 0, 0.75, 3.6, TRIM);

  // the front on Green Street: the coffee shop, the lobby in the middle under a canopy, and the bike shop round the corner
  const lw = 1.1, la = cx - lw + 0.3, lb = cx + lw + 0.3;
  const front = (xa: number, xb: number, sign: string, cloth: number): void => {
    b.box(xa + 0.15, 0, f - 0.1, xb - 0.15, 0.4, f, FRAME, { faces: 'NEWT' });
    b.box(xa + 0.2, 0.4, f - 0.05, xb - 0.2, 2.4, f, GLASS, { faces: 'N', win: interior(1.25) });
    b.box(xa + 0.15, 2.5, f - 0.2, xb - 0.15, 3.0, f, cloth, { faces: 'NEWTB' });
    k.sign(sign, (xa + xb) / 2, 2.75, f - 0.23, 0, -1, 0.42, xb - xa - 0.6);
  };
  b.box(x0 + 0.2, 0, f - 0.02, x1 - 0.2, POD, f, BRICK_309, { faces: 'N' });
  front(x0 + 0.3, la - 0.15, 'campustown-coffee', 0x3b2a1e);
  front(lb + 0.15, x1 - 0.3, 'campustown-bikes', 0x1f3d5a);
  b.box(la, 0.03, f - 0.06, lb, 2.5, f - 0.02, DOOR, { faces: 'N', win: interior(1.6) });
  b.box(la - 0.3, 2.6, f - 0.95, lb + 0.3, 2.78, f - 0.02, FRAME, { faces: 'NESWTB' });
  plate(k, 'campustown-309', (la + lb) / 2, 3.0 + 0.9, f - 0.15, 0, -1, 0.5, 2.3, TRIM);
  // the bike shop's window runs round onto the east side
  b.box(x1 - 0.2, 0.4, f + 0.4, x1 - 0.15, 2.4, f + 4.2, GLASS, { faces: 'E', win: interior(1.2) });
  b.box(x1 - 0.2, 0, f + 4.6, x1 - 0.15, 2.3, f + 5.6, DOOR, { faces: 'E', win: interior(1.2) });
  // the back: a loading door and the bins
  b.box(cx - 1.2, 0.03, z1 - 0.2, cx + 1.2, 2.6, z1 - 0.15, 0x8a8d91, { faces: 'S' });
  b.box(x0 + 0.6, 0, z1 - 0.15, x0 + 2.0, 1.0, z1 + 0.6, 0x3f5d4a, { top: 0x2f4a3a });
  k.lights.push({ x: cx, z: f - 2.2, r: 10, color: '#ffe9c4', k: 0.6 });
  k.lights.push({ x: x1 + 1.5, z: (f + z1) / 2, r: 9, color: '#ffe2ae', k: 0.45 });
  k.person(la - 0.4, l.z0 + 0.3);
  k.person(lb + 0.6, l.z0 + 0.45);
  k.person(x0 + 1.3, l.z0 + 0.35);
}

// ---------------------------------------------------------------------------
// The Tower at Third
// ---------------------------------------------------------------------------

/** Nineteen floors of rooms over the lobby, and the glazed top floor where its restaurant was. */
const ROOMS: WinSpec = { cell: 1.0, storey: 1.0, lit: 0.42, kind: 0 };
const LOBBY: WinSpec = { cell: 1.4, storey: 3.0, lit: 0.6, kind: 1 };

function towerAtThird(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l, cx = (x0 + x1) / 2;
  const POD = 3, BODY = 22, TOPF = 22.9, ROOF = 23.1;
  const tx0 = x0 + 1, tx1 = x1 - 1, tz0 = z0 + 1.5, tz1 = z1 - 1.5;

  // the lobby: a storey of bronze glass the width of the lot, under a deep band of concrete
  b.box(x0 + 0.3, 0, z0 + 0.3, x1 - 0.3, POD, z1 - 0.3, BRONZE_GLASS, { win: LOBBY, seed: 0.55, faces: 'NESW' });
  b.box(x0 + 0.1, POD, z0 + 0.1, x1 - 0.1, POD + 0.45, z1 - 0.1, CONCRETE, { faces: 'NESWTB', top: FELT });
  // the tower of rooms, and concrete fins up all four faces between its bays
  b.box(tx0, POD + 0.45, tz0, tx1, BODY, tz1, CONCRETE, { win: ROOMS, seed: 0.33, faces: 'NESW' });
  const FINS = 6;
  for (let i = 0; i <= FINS; i++) {
    const x = tx0 + ((tx1 - tx0) * i) / FINS, z = tz0 + ((tz1 - tz0) * i) / FINS;
    b.box(x - 0.12, POD + 0.45, tz1 - 0.04, x + 0.12, BODY + 0.2, tz1 + 0.22, 0xe4ddcf, { faces: 'SEW' });
    b.box(x - 0.12, POD + 0.45, tz0 - 0.22, x + 0.12, BODY + 0.2, tz0 + 0.04, 0xe4ddcf, { faces: 'NEW' });
    if (i > 0 && i < FINS) {
      b.box(tx1 - 0.04, POD + 0.45, z - 0.12, tx1 + 0.22, BODY + 0.2, z + 0.12, 0xe4ddcf, { faces: 'ENS' });
      b.box(tx0 - 0.22, POD + 0.45, z - 0.12, tx0 + 0.04, BODY + 0.2, z + 0.12, 0xe4ddcf, { faces: 'WNS' });
    }
  }
  // a band of concrete round the tower at every seventh floor
  for (const y of [9, 16]) b.box(tx0 - 0.3, y - 0.1, tz0 - 0.3, tx1 + 0.3, y + 0.1, tz1 + 0.3, 0xe4ddcf, { faces: 'NESWTB' });
  // planters round the lobby's roof, at its south and east edges
  for (const [x, z] of [[x0 + 0.8, z1 - 0.7], [cx - 2.2, z1 - 0.7], [cx + 2.2, z1 - 0.7], [x1 - 0.7, z1 - 0.7], [x1 - 0.7, (z0 + z1) / 2], [x1 - 0.7, z0 + 0.8]]) {
    b.box(x - 0.35, POD + 0.45, z - 0.35, x + 0.35, POD + 0.85, z + 0.35, CONCRETE, { faces: 'NESWT', top: 0x5f8f4e });
  }
  // the top floor, where the hotel's restaurant looked out over the town: glass all round, set back, lit warm at night
  b.box(tx0 - 0.25, BODY, tz0 - 0.25, tx1 + 0.25, BODY + 0.2, tz1 + 0.25, CONCRETE, { faces: 'NESWB', top: FELT });
  b.box(tx0 + 0.25, BODY + 0.2, tz0 + 0.25, tx1 - 0.25, TOPF, tz1 - 0.25, BRONZE_GLASS, { faces: 'NESW', win: interior(1.3) });
  // the core of stairs and lifts, a blank shaft of concrete up the west face, rising to the roof
  const sz = (tz0 + tz1) / 2;
  b.box(tx0 - 0.9, POD + 0.45, sz - 1.3, tx0 - 0.2, ROOF + 0.15, sz + 1.3, CONCRETE, { faces: 'NESWT', top: FELT });
  b.box(tx0 - 0.96, POD + 1, sz - 0.25, tx0 - 0.9, BODY - 0.5, sz + 0.25, GLASS, { faces: 'W', win: interior(0.7) });
  for (let i = 1; i < FINS; i++) {
    const x = tx0 + 0.25 + ((tx1 - tx0 - 0.5) * i) / FINS;
    for (const [za, zb] of [[tz0 + 0.2, tz0 + 0.3], [tz1 - 0.3, tz1 - 0.2]]) b.box(x - 0.05, BODY + 0.2, za, x + 0.05, TOPF, zb, 0x4a4540, { faces: 'NESW' });
  }
  // the roof slab over it, overhanging, its fascia lit along the edge, and a parapet with the plant inside
  b.box(tx0 - 0.4, TOPF, tz0 - 0.4, tx1 + 0.4, ROOF, tz1 + 0.4, CONCRETE, { faces: 'NESWTB', top: FELT });
  k.glows.push({ x: cx, y: TOPF - 0.06, z: tz1 + 0.42, sx: tx1 - tx0 + 0.6, sy: 0.08, sz: 0.06, color: '#ffe9c4' });
  k.glows.push({ x: cx, y: TOPF - 0.06, z: tz0 - 0.42, sx: tx1 - tx0 + 0.6, sy: 0.08, sz: 0.06, color: '#ffe9c4' });
  k.glows.push({ x: tx1 + 0.42, y: TOPF - 0.06, z: (tz0 + tz1) / 2, sx: 0.06, sy: 0.08, sz: tz1 - tz0 + 0.6, color: '#ffe9c4' });
  k.glows.push({ x: tx0 - 0.42, y: TOPF - 0.06, z: (tz0 + tz1) / 2, sx: 0.06, sy: 0.08, sz: tz1 - tz0 + 0.6, color: '#ffe9c4' });
  b.box(tx0 + 1.0, ROOF, tz0 + 1.0, tx1 - 2.6, h - 0.05, tz0 + 3.0, PLANT, { top: 0x7d8288 });
  b.cyl(tx1 - 1.4, tz1 - 1.5, ROOF, h - 0.05, 0.8, 0.8, 8, 0x9ea3a8, { cap: 0x8a8f94 });
  // a red lamp on the highest corner, on a short mast
  b.box(tx1 + 0.15, ROOF, tz1 + 0.15, tx1 + 0.3, h + 0.6, tz1 + 0.3, PLANT, { faces: 'NESW' });
  beacon(k, tx1 + 0.22, h + 0.85, tz1 + 0.22, 0.45);
  // its name, high on the east face under the top floor, and on the canopy over its door on the south
  plate(k, 'campustown-tower-third', tx1 + 0.22, BODY - 1.2, (tz0 + tz1) / 2, 1, 0, 0.6, 5.2, CONCRETE);

  // the door on the south, under the canopy where the hotel's cars drew up
  const cw = 2.4, cz1 = z1 + 1.2;
  b.box(cx - cw, POD - 0.35, z1 - 0.3, cx + cw, POD - 0.12, cz1, CONCRETE, { faces: 'NESWTB' });
  for (const x of [cx - cw + 0.25, cx + cw - 0.25]) b.box(x - 0.1, 0, cz1 - 0.35, x + 0.1, POD - 0.35, cz1 - 0.15, CONCRETE, { faces: 'NESW' });
  b.box(cx - 1.0, 0.03, z1 - 0.3, cx + 1.0, 2.3, z1 - 0.25, DOOR, { faces: 'S', win: interior(1.6) });
  plate(k, 'campustown-tower-third', cx, POD - 0.66, cz1, 0, 1, 0.38, 2 * cw - 0.4, TRIM);
  k.glows.push({ x: cx, y: POD - 0.4, z: z1 + 0.45, sx: 2 * cw - 0.6, sy: 0.06, sz: 0.1, color: '#ffe2ae' });
  k.lights.push({ x: cx, z: z1 + 2.5, r: 10, color: '#ffe2ae', k: 0.55 });
  k.lights.push({ x: x1 + 1.5, z: (z0 + z1) / 2, r: 9, color: '#ffe2ae', k: 0.4 });
  k.person(cx - 1.5, z1 + 0.6);
  k.person(cx + 0.9, z1 + 0.9);
  k.person(cx + 1.6, z1 + 0.5);
}

// ---------------------------------------------------------------------------
// The bar and grill at Fourth Street, and Joe's Brewery
// ---------------------------------------------------------------------------

/** The bar and grill's brick, and the dark frame of its front. */
const BAR_BRICK = 0x7a3f33, BAR_FRAME = 0x23262c;

function barGrill(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, x1, z1, h } = l, f = l.z0 + SET, cx = (x0 + x1) / 2, cz = (f + z1) / 2, U = 2 * STOREY;

  // two storeys of brick, with windows on the floor over the bar and down the sides, a dark cornice, and a parapet that steps up over the front
  b.box(x0, 0, f, x1, U, z1, BAR_BRICK, { win: HALL, seed: 0.91, faces: 'NESW' });
  b.box(x0 - 0.06, 0, f + 0.1, x1 + 0.06, 0.45, z1 + 0.06, BASE, { faces: 'ESWT' });
  b.box(x0 - 0.12, U, f - 0.12, x1 + 0.12, U + 0.25, z1 + 0.12, BAR_FRAME, { faces: 'NESWTB', top: FELT });
  b.box(x0, U + 0.25, f - 0.12, x1, h, f + 0.15, BAR_BRICK, { faces: 'NESWT', top: LIMESTONE });
  b.box(x0, U + 0.25, z1 - 0.2, x1, U + 0.6, z1 + 0.05, BAR_BRICK, { faces: 'NESWT', top: LIMESTONE });

  // the front: a dark frame over the ground floor, three windows that fold open like garage doors, the door in the middle
  b.box(x0 + 0.2, 0, f - 0.14, x1 - 0.2, STOREY + 0.2, f, BAR_FRAME, { faces: 'NEWT' });
  const w = (x1 - x0 - 0.4) / 4;
  for (const i of [0, 1, 3]) {
    const xa = x0 + 0.2 + i * w + 0.18, xb = x0 + 0.2 + (i + 1) * w - 0.18;
    b.box(xa, 0.4, f - 0.19, xb, 2.5, f - 0.14, 0x7a5a3a, { faces: 'N', win: interior(1.45) });
    b.box(xa, 1.42, f - 0.23, xb, 1.5, f - 0.19, BAR_FRAME, { faces: 'NTB' });
  }
  const dx = x0 + 0.2 + 2.5 * w;
  b.box(dx - 0.6, 0.03, f - 0.19, dx + 0.6, 2.4, f - 0.14, DOOR, { faces: 'N', win: interior(1.6) });
  plate(k, 'campustown-bar-grill', cx, 3.55, f, 0, -1, 0.85, 5.6, 0x15151c);
  k.glows.push({ x: cx, y: 3.0, z: f - 0.35, sx: x1 - x0 - 1, sy: 0.08, sz: 0.1, color: '#ffe2ae' });
  k.lights.push({ x: cx, z: f - 2.2, r: 9, color: '#ffc48a', k: 0.6 });
  // brick piers up the floor above, on the front and on the east side, which the opening view sees
  for (let i = 0; i <= 4; i++) {
    const x = x0 + 0.15 + ((x1 - x0 - 0.3) * i) / 4, z = f + 0.15 + ((z1 - f - 0.3) * i) / 4;
    b.box(x - 0.15, STOREY + 0.2, f - 0.12, x + 0.15, U, f, 0x6a352b, { faces: 'NEW' });
    if (i > 0 && i < 4) b.box(x1, 0.45, z - 0.15, x1 + 0.12, U, z + 0.15, 0x6a352b, { faces: 'ENS' });
  }
  // and the band of dark stone where the floor above begins, round the three sides that have none
  b.box(x0 - 0.05, STOREY + 0.2, f, x1 + 0.05, STOREY + 0.38, z1 + 0.05, BAR_FRAME, { faces: 'ESWTB' });
  // two high tables on the paving in front, and people at them and on their way in
  for (const x of [x0 + 1.6, x1 - 1.6]) {
    b.cyl(x, l.z0 + 0.5, 0, 1.05, 0.06, 0.06, 4, FRAME, { cap: false });
    b.cyl(x, l.z0 + 0.5, 1.05, 1.12, 0.35, 0.35, 6, 0x2b2b2b);
    k.person(x - 0.55, l.z0 + 0.45);
    k.person(x + 0.55, l.z0 + 0.4);
  }
  k.person(dx + 0.3, l.z0 + 0.3);

  // the side on Fourth Street: a side door under a lamp
  b.box(x0 - 0.05, 0.03, cz - 0.5, x0, 2.2, cz + 0.5, DOOR, { faces: 'W', win: interior(1.2) });
  k.glows.push({ x: x0 - 0.15, y: 2.5, z: cz, sx: 0.12, sy: 0.14, sz: 0.3, color: '#ffe2ae' });
  // the back: the kitchen door, the grease bin, and the grill's flue up the wall to the roof
  b.box(x1 - 2.4, 0.03, z1, x1 - 1.5, 2.2, z1 + 0.05, 0x5a5f66, { faces: 'S' });
  k.glows.push({ x: x1 - 1.95, y: 2.5, z: z1 + 0.13, sx: 0.28, sy: 0.12, sz: 0.12, color: '#ffe2ae' });
  b.box(x0 + 0.6, 0, z1 + 0.15, x0 + 2.0, 1.0, z1 + 0.95, 0x3f5d4a, { top: 0x2f4a3a });
  b.box(x1 - 1.1, 2.4, z1, x1 - 0.5, U + 1.4, z1 + 0.5, PLANT, { faces: 'ESWT' });
  // on the roof: plant, and the name again on a board, and SPORTS, both facing the opening view
  unit(k, x0 + 1.6, z1 - 1.5, U + 0.25, 1.4, 1.0, 0.8);
  roofBoard(k, 'campustown-bar-grill', cx + 0.6, U + 0.25, cz + 0.4, 4.0, 0.7, 0x15151c);
  roofBoard(k, 'campustown-sports', x0 + 2.0, U + 0.25, f + 1.6, 2.2, 0.55, 0x15151c);
}

/** Joe's old brick, and the stone of its trim. */
const JOES_BRICK = 0x9a4a36, JOES_STONE = 0xe1d6bf;

function joes(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1, h } = l, U = 2 * STOREY, bx1 = x0 + 5.5, cz = (z0 + z1) / 2, bx = (x0 + bx1) / 2;

  // the old building: two storeys of brick with tall narrow windows, a stone base, a corbelled cornice, a stepped front to Fourth Street
  b.box(x0, 0, z0, bx1, U, z1, JOES_BRICK, { win: HALL_NARROW, seed: 0.37, faces: 'NESW' });
  b.box(x0 - 0.06, 0, z0 - 0.06, bx1 + 0.06, 0.55, z1 + 0.06, JOES_STONE, { faces: 'NESWT' });
  b.box(x0 - 0.06, STOREY - 0.08, z0 - 0.06, bx1 + 0.06, STOREY + 0.08, z1 + 0.06, JOES_STONE, { faces: 'NESWTB' });
  b.box(x0 - 0.18, U, z0 - 0.18, bx1 + 0.18, U + 0.35, z1 + 0.18, BRICK.deep, { faces: 'NESWTB', top: FELT });
  b.box(x0 - 0.05, U + 0.35, z0 + 0.4, x0 + 0.3, U + 0.75, z1 - 0.4, JOES_BRICK, { faces: 'NESWT', top: JOES_STONE });
  b.box(x0 - 0.05, U + 0.75, cz - 1.6, x0 + 0.3, h - 0.1, cz + 1.6, JOES_BRICK, { faces: 'NESWT', top: JOES_STONE });
  chimney(b, x0 + 1.2, z1 - 1.3, U + 0.35, U + 1.3, BRICK.deep, 0.35, 0.35);

  // the front on Fourth Street: the door under its neon, windows either side lit warm
  b.box(x0 - 0.05, 0.03, cz - 0.65, x0, 2.4, cz + 0.65, DOOR, { faces: 'W', win: interior(1.6) });
  b.box(x0 - 0.8, 2.5, cz - 0.95, x0, 2.65, cz + 0.95, BRICK.deep, { faces: 'NESWTB' });
  for (const z of [cz - 2.4, cz + 2.4]) b.box(x0 - 0.05, 0.8, z - 0.8, x0, 2.4, z + 0.8, 0x7a5a3a, { faces: 'W', win: interior(1.3) });
  plate(k, 'campustown-joes', x0, 4.0, cz, -1, 0, 0.75, 5.6, 0x15151c);
  k.lights.push({ x: x0 - 2.2, z: cz, r: 9, color: '#ffd59a', k: 0.55 });
  k.person(x0 - 0.35, cz + 1.2);

  // its name painted large on the east wall over the garden, where the opening view reads it, and on a board over its roof
  plate(k, 'campustown-joes-wall', bx1, 4.35, cz, 1, 0, 0.85, 5.2, 0x8a3e2e);
  roofBoard(k, 'campustown-joes', bx + 0.4, U + 0.35, z1 - 1.2, 3.6, 0.5, 0x15151c);
  // the doors out to the garden, and the kegs stacked by the back door
  for (const z of [z0 + 1.5, z1 - 1.8]) b.box(bx1, 0.03, z - 0.7, bx1 + 0.05, 2.3, z + 0.7, DOOR, { faces: 'E', win: interior(1.5) });
  for (const [x, y] of [[x0 + 0.9, 0], [x0 + 1.55, 0], [x0 + 1.22, 0.62]]) b.cyl(x, z1 + 0.45, y, y + 0.6, 0.3, 0.3, 6, 0xb9bcc0);
  b.box(x0 + 2.4, 0.03, z1, x0 + 3.3, 2.2, z1 + 0.05, 0x5a5f66, { faces: 'S' });

  // the beer garden east of it: paving, a fence, a pergola with lamps strung under it, tables and people
  const gx0 = bx1 + 0.05, gx1 = x1, gz0 = z0 + 0.2, gz1 = z1, y = 0.035;
  area(k, rect(gx0, gz0, gx1, gz1), PAVER, y);
  b.box(gx1 - 0.12, 0, gz0, gx1, 1.2, gz1, WOOD, { faces: 'EWT', top: 0xb08a5e });
  b.box(gx0, 0, gz1 - 0.12, gx1 - 0.12, 1.2, gz1, WOOD, { faces: 'NSWT', top: 0xb08a5e });
  b.box(gx0, 0, gz0, gx1 - 0.12, 1.2, gz0 + 0.12, WOOD, { faces: 'NSWT', top: 0xb08a5e });
  const px0 = gx0 + 0.35, px1 = gx1 - 0.45, pz0 = gz0 + 0.6, pz1 = gz1 - 0.6, PY = 2.7;
  for (const x of [px0, px1]) for (const z of [pz0, (pz0 + pz1) / 2, pz1]) b.box(x - 0.09, 0, z - 0.09, x + 0.09, PY, z + 0.09, WOOD_DARK, { faces: 'NESW' });
  for (const x of [px0, px1]) b.box(x - 0.11, PY, pz0 - 0.3, x + 0.11, PY + 0.22, pz1 + 0.3, WOOD_DARK, { faces: 'NESWTB' });
  for (let i = 0; i < 6; i++) {
    const z = pz0 + ((pz1 - pz0) * i) / 5;
    b.box(px0 - 0.3, PY + 0.22, z - 0.07, px1 + 0.3, PY + 0.32, z + 0.07, WOOD, { faces: 'NSTB' });
  }
  lampString(k, [px0 + 0.1, PY - 0.05, pz0], [px1 - 0.1, PY - 0.05, pz1], 8);
  lampString(k, [px1 - 0.1, PY - 0.05, pz0], [px0 + 0.1, PY - 0.05, pz1], 8);
  const tx = (gx0 + gx1) / 2 - 0.1;
  for (const z of [gz0 + 1.6, cz + 0.3, gz1 - 1.5]) {
    picnic(k, tx, z, y, 'z');
    k.person(tx - 0.9, z - 0.4, y);
    k.person(tx + 0.9, z + 0.3, y);
  }
  k.person(gx0 + 0.4, cz - 1.8, y);
  k.lights.push({ x: (gx0 + gx1) / 2, z: cz, r: 8, color: '#ffd9a0', k: 0.65 });
}

/**
 * A food truck, its kitchen along x with its cab at the east end, its hatch and
 * its board on the south side, where the opening view and the queue are.
 */
function truck(k: Build, cx: number, cz: number, body: number, trim: number, id: string): void {
  const b = k.b, L = 2.7, W = 1.15, H = 3.05, s = cz + W;
  b.box(cx - L, 0.32, cz - W + 0.1, cx + L, 0.5, cz + W - 0.1, DARK, { faces: 'NESW' });
  b.box(cx - L, 0.5, cz - W, cx + L - 1.5, H, cz + W, body, { top: 0xd8d4cc });
  b.box(cx + L - 1.6, 0.5, cz - W + 0.05, cx + L, 2.05, cz + W - 0.05, body, { top: 0xd8d4cc });
  b.box(cx + L, 1.2, cz - W + 0.25, cx + L + 0.04, 1.9, cz + W - 0.25, 0x2c3a46, { faces: 'E' });
  for (const x of [cx - L + 0.85, cx + L - 0.75]) for (const z of [cz - W + 0.02, cz + W - 0.3]) b.box(x - 0.36, 0, z, x + 0.36, 0.62, z + 0.28, DARK);
  // the hatch, lit from inside, with a counter under it and an awning over it
  b.box(cx - 2.2, 1.2, s, cx + 0.2, 2.1, s + 0.04, 0x3a2a20, { faces: 'S', win: interior(1.8) });
  b.box(cx - 2.25, 1.1, s, cx + 0.25, 1.17, s + 0.32, trim, { faces: 'NESWTB' });
  b.box(cx - 2.35, 2.22, s, cx + 0.35, 2.3, s + 0.8, trim, { faces: 'NESWTB' });
  plate(k, id, cx - 1.0, 2.7, s, 0, 1, 0.42, 1.9, trim);
  unit(k, cx - 1.6, cz, H, 0.9, 0.7, 0.5);
  k.lights.push({ x: cx - 1.0, z: s + 2.2, r: 6, color: '#ffd59a', k: 0.5 });
  // the queue at its hatch
  k.person(cx - 1.4, s + 1.15);
  k.person(cx - 0.6, s + 1.9);
  k.person(cx + 0.3, s + 2.6);
}

/**
 * The yard behind the Red Lion's garden, on open ground that the opening view
 * sees: three food trucks in a row, their hatches to the south, picnic tables
 * before them under strings of lamps, and the yard's name on a board. Nothing
 * in it stands higher than 3.4, so the garden and its sign stay in sight over it.
 */
function truckYard(k: Build): void {
  const b = k.b, x0 = -80, x1 = -56.5, z0 = -65.6, z1 = -55.6, y = 0.027;
  area(k, rect(x0, z0, x1, z1), 0x6a6c70, y);
  // a white line round it, and between the trucks' pitches
  for (const [a, c, d, e] of [[x0 + 0.3, z0 + 0.3, x1 - 0.3, z0 + 0.42], [x0 + 0.3, z1 - 0.42, x1 - 0.3, z1 - 0.3], [x0 + 0.3, z0 + 0.42, x0 + 0.42, z1 - 0.42], [x1 - 0.42, z0 + 0.42, x1 - 0.3, z1 - 0.42]]) {
    b.box(a, y, c, d, y + 0.012, e, 0xe9e6dd, { faces: 'T' });
  }
  const cz = -63.4;
  truck(k, -75.5, cz, 0xf2c14e, 0x7a4a1c, 'campustown-truck-waffles');
  truck(k, -68.8, cz, 0xb8432a, 0x2a2d33, 'campustown-truck-bbq');
  truck(k, -62.1, cz, 0x3f8fb0, 0xe9e6dd, 'campustown-truck-dumplings');
  // picnic tables in a row before them, with people at them
  for (const x of [-77, -71.5, -66, -60.5]) {
    picnic(k, x, -58.4, y);
    k.person(x - 0.5, -57.2, y);
    k.person(x + 0.6, -59.6, y);
  }
  // three poles along the south side, and lamps strung from each truck's roof to them
  const poles = [-78.6, -67.2, -57.6], PH = 3.35, pz = z1 - 0.7;
  for (const x of poles) b.box(x - 0.07, y, pz - 0.07, x + 0.07, PH, pz + 0.07, POLE, { faces: 'NESW' });
  for (const [tx, p] of [[-75.5, 0], [-75.5, 1], [-68.8, 0], [-68.8, 2], [-62.1, 1], [-62.1, 2]]) {
    lampString(k, [tx - 1.0, 3.0, cz + 1.2], [poles[p], PH - 0.05, pz], 8);
  }
  // the yard's name on a board on two posts at its south side, facing the opening view
  const sx = -74.0, sz = z1 - 0.25;
  for (const x of [sx - 1.9, sx + 1.9]) b.box(x - 0.08, y, sz - 0.18, x + 0.08, 2.75, sz - 0.02, FRAME, { faces: 'NESW' });
  plate(k, 'campustown-food-trucks', sx, 3.05, sz - 0.12, 0, 1, 0.62, 3.6, 0x15151c);
  k.lights.push({ x: -68, z: -58.5, r: 10, color: '#ffd9a0', k: 0.55 });
}

export const MODELS: Record<string, Model> = {
  'red-lion': redLion,
  'shops-s1': shopsS1,
  'shops-s2': shopsS2,
  'green-309': green309,
  'tower-at-third': towerAtThird,
  'bar-grill': barGrill,
  joes,
};

/** The Red Lion's beer garden, and the yard of food trucks behind it. */
export function extras(k: Build): void {
  beerGarden(k);
  truckYard(k);
}
