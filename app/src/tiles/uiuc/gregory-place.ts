// Gregory Place, with Basil Thai in it, and Manolo's behind.
//
// Gregory Place is a block of shops with flats over them on the west side of
// Gregory Street in Urbana, across from the Krannert Center. Basil Thai is the
// third of its four shops from the north, and the one the tile is here for:
// its awning is white and reads BASIL THAI, with "at Urbana" under it. Its
// neighbours' awnings say what is sold there. A hero stands at the kerb in
// front of it.
//
// Manolo's, which sold pizza and empanadas on Oregon Street until October
// 2026, stands behind the block, with its name on a board over its roof where
// the opening view can read it.

import { interior } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { twoWheeler } from '../../engine/parts';
import { EN, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { FELT, GLASS, HALL, STOREY, awning, chimney } from './look';
import { AREAS, CARR, GREGORY_ST, HERO_SPOTS, type LotDef, type Model } from './plan';

/** The block's brick, its cast stone, and the dark metal of its shopfronts. */
const BRICK = 0xb26550, STONE = 0xe3d9c3, FRAME = 0x3d424a;
/** Basil Thai's awning, and the lettering on it. */
const WHITE = 0xf6f4ee, INK = '#1d1f22';
const ASPHALT = 0x4f5158, LINE = 0xf0efe8;

/** Three storeys: the shops, and two floors of flats. */
const WALL = 3 * STOREY;

/**
 * The four shops, from north to south: where each front ends, as a share of
 * the block's length, the colour of its awning, and the sign on it.
 */
const SHOPS = [
  { to: 0.211, cloth: 0x2f5d46, sign: 'gregory-place-korean' },
  { to: 0.433, cloth: 0x7a2f2f, sign: 'gregory-place-grill' },
  { to: 0.767, cloth: WHITE, sign: 'gregory-place-basil' },
  { to: 1, cloth: 0x27405f, sign: 'gregory-place-subs' },
];
const BASIL = 2;

const cloth = (id: string, text: string, color: string): SignDef => ({ id, lines: [text], color, ink: '#f4efe0', aspect: 4.2, kind: 'board', size: [218, 52] });

export const SIGNS: SignDef[] = [
  {
    // white cloth, the name in capitals, and "at Urbana" under it
    id: 'gregory-place-basil', lines: ['BASIL THAI', 'at Urbana'], color: '#f6f4ee', aspect: 5.4, real: true, size: [486, 90],
    paint: (ctx, _s, w, h) => {
      ctx.fillStyle = '#f6f4ee';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(h * 0.52)}px ${EN}`;
      ctx.fillText('BASIL THAI', w / 2, h * 0.36);
      ctx.font = `700 ${Math.round(h * 0.27)}px Arial, "Helvetica Neue", sans-serif`;
      ctx.fillText('at Urbana', w / 2, h * 0.8);
    },
  },
  cloth('gregory-place-korean', 'KOREAN', '#2f5d46'),
  cloth('gregory-place-grill', 'GRILL', '#7a2f2f'),
  cloth('gregory-place-subs', 'SUBS', '#27405f'),
  { id: 'gregory-place-manolos', lines: ["MANOLO'S", 'PIZZA & EMPANADAS'], color: '#f6ecd2', ink: '#9c2b22', aspect: 2.7, kind: 'board', real: true, size: [300, 111] },
  { id: 'gregory-place-manolos-cloth', lines: ["MANOLO'S"], color: '#b8392e', ink: '#f6ecd2', aspect: 4.6, kind: 'board', real: true, size: [239, 52] },
];

function gregoryPlace(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, len = z1 - z0;

  // the block: brick, with a stone base and a stone band over the shops on the three sides that have none
  b.box(x0, 0, z0, x1, WALL, z1, BRICK, { win: HALL, seed: 0.47, faces: 'NESW' });
  b.box(x0 - 0.07, 0, z0 - 0.07, x1 + 0.07, 0.45, z1 + 0.07, STONE, { faces: 'NSWT' });
  b.box(x0 - 0.08, STOREY - 0.12, z0 - 0.08, x1 + 0.08, STOREY + 0.12, z1 + 0.08, STONE, { faces: 'NSWTB' });
  // a thinner band of stone at the foot of the top storey, on all four sides
  b.box(x0 - 0.06, 2 * STOREY - 0.07, z0 - 0.06, x1 + 0.06, 2 * STOREY + 0.07, z1 + 0.06, STONE, { faces: 'NESWTB' });
  // its cornice, a low wall round the roof, and the roof inside it
  b.box(x0 - 0.25, WALL, z0 - 0.25, x1 + 0.25, WALL + 0.3, z1 + 0.25, STONE, { faces: 'NESWTB' });
  const top = WALL + 0.3, wallTop = top + 0.55;
  b.box(x0, top, z0, x1, wallTop, z0 + 0.3, BRICK, { top: STONE });
  b.box(x0, top, z1 - 0.3, x1, wallTop, z1, BRICK, { top: STONE });
  b.box(x0, top, z0 + 0.3, x0 + 0.3, wallTop, z1 - 0.3, BRICK, { faces: 'EWT', top: STONE });
  b.box(x1 - 0.3, top, z0 + 0.3, x1, wallTop, z1 - 0.3, BRICK, { faces: 'EWT', top: STONE });
  b.box(x0 + 0.3, top, z0 + 0.3, x1 - 0.3, top + 0.12, z1 - 0.3, FELT, { faces: 'T' });
  // on the roof: the head of the stairs, at the south end where it hides nothing behind the block, and the flats' cooling units
  b.box(x0 + 0.9, top + 0.12, z1 - 3.6, x0 + 3.1, top + 2.2, z1 - 1.2, BRICK, { top: FELT });
  for (const f of [0.14, 0.32, 0.5, 0.68]) b.box(x0 + 1.4, top + 0.12, z0 + f * len - 0.5, x0 + 2.7, top + 0.85, z0 + f * len + 0.5, 0xb9bcc0);
  chimney(b, x1 - 2.2, z0 + 0.6 * len, top + 0.12, top + 1.5, BRICK, 0.4, 0.4);

  // -------------------------------------------------------------------------
  // The front on Gregory Street: four shops, each under its awning
  // -------------------------------------------------------------------------

  // a skin of stone over the ground floor, which the shopfronts are set in
  const front = x1 + 0.2, head = STOREY + 0.3;
  b.box(x1, 0, z0 - 0.07, front, head, z1 + 0.07, STONE, { faces: 'NEST' });
  /** A pane of the shop's window, lit from within, between a sill and a head of dark metal. */
  const pane = (za: number, zb: number): void => {
    b.box(front, 0.55, za, front + 0.05, 2.3, zb, GLASS, { faces: 'E', win: interior(1.2) });
    b.box(front, 0.4, za - 0.07, front + 0.1, 0.55, zb + 0.07, FRAME, { faces: 'NEST' });
    b.box(front, 2.3, za - 0.07, front + 0.1, 2.44, zb + 0.07, FRAME, { faces: 'NESB' });
  };
  const door = (zc: number): void => {
    b.box(front, 0.04, zc - 0.5, front + 0.05, 2.3, zc + 0.5, 0x2c3037, { faces: 'E', win: interior(1.6) });
    b.box(front, 2.3, zc - 0.57, front + 0.1, 2.44, zc + 0.57, FRAME, { faces: 'NESB' });
  };

  let za = z0;
  SHOPS.forEach((shop, i) => {
    const zb = z0 + shop.to * len, zc = (za + zb) / 2;
    const a = za + 0.5, c = zb - 0.5;
    if (i === BASIL) {
      // its door in the middle, and a window either side
      door(zc);
      pane(a, zc - 0.75);
      pane(zc + 0.75, c);
      const v = awning(b, 'E', za + 0.32, zb - 0.32, front, 3.75, 1.3, 0.45, 0.95, shop.cloth);
      k.sign(shop.sign, v.x, v.y, v.z, v.nx, v.nz, 0.86, zb - za - 0.9);
      k.glows.push({ x: front + 0.55, y: 3.2, z: zc, sx: 0.12, sy: 0.1, sz: zb - za - 1.4, color: '#fff1d6' });
      k.lights.push({ x: x1 + 3.2, z: zc, r: 10, color: '#ffe9c4', k: 0.65 });
      // someone on the way in, someone on the way out, and a board on the walk that says it is open
      k.person(front + 0.55, zc - 0.25);
      k.person(front + 0.9, zc + 1.5);
      b.box(front + 0.35, 0, zc - 2.3, front + 0.75, 1.0, zc - 2.2, 0x2c3037, { faces: 'NESWT' });
    } else {
      // its door at the south end of its front
      door(c - 0.5);
      pane(a, c - 1.25);
      const v = awning(b, 'E', za + 0.35, zb - 0.35, front, 3.35, 0.95, 0.35, 0.6, shop.cloth);
      k.sign(shop.sign, v.x, v.y, v.z, v.nx, v.nz, 0.46, zb - za - 1.2);
      k.glows.push({ x: front + 0.45, y: 2.9, z: zc, sx: 0.1, sy: 0.08, sz: zb - za - 1.4, color: '#ffe2ae' });
    }
    za = zb;
  });
  // a pier of brick between one shop and the next, which runs on up the wall to the cornice
  for (const f of [0, ...SHOPS.map((s) => s.to)]) {
    const z = Math.min(z1 - 0.24, Math.max(z0 + 0.24, z0 + f * len));
    b.box(x1, 0, z - 0.24, front + 0.12, WALL, z + 0.24, BRICK, { faces: 'NES' });
  }
  k.lights.push({ x: x1 + 3.2, z: z0 + 0.2 * len, r: 9, color: '#ffe2ae', k: 0.45 });
  k.lights.push({ x: x1 + 3.2, z: z0 + 0.9 * len, r: 9, color: '#ffe2ae', k: 0.45 });
  // a bench and two who have sat down on it, and someone walking past
  b.box(front + 0.25, 0.35, z0 + 0.32 * len - 0.9, front + 0.7, 0.5, z0 + 0.32 * len + 0.9, 0x8d6b4a, { faces: 'NESWTB' });
  for (const d of [-0.75, 0.75]) b.box(front + 0.3, 0, z0 + 0.32 * len + d - 0.06, front + 0.65, 0.35, z0 + 0.32 * len + d + 0.06, FRAME);
  k.person(front + 0.95, z0 + 0.3 * len);
  k.person(front + 0.6, z0 + 0.9 * len);
  k.person(front + 0.85, z0 + 0.07 * len);

  // -------------------------------------------------------------------------
  // The back: doors to the stairs and the shops' kitchens, and the bins
  // -------------------------------------------------------------------------
  for (const f of [0.12, 0.38, 0.62, 0.9]) {
    const z = z0 + f * len;
    b.box(x0 - 0.05, 0.05, z - 0.45, x0, 2.2, z + 0.45, 0x5a5f66, { faces: 'W' });
    k.glows.push({ x: x0 - 0.12, y: 2.5, z, sx: 0.12, sy: 0.14, sz: 0.3, color: '#ffe2ae' });
  }
  b.box(x0 - 1.0, 0, z0 + 0.5 * len - 0.7, x0 - 0.2, 1.0, z0 + 0.5 * len + 0.7, 0x3f5d4a, { top: 0x2f4a3a });
}

function manolos(k: Build, l: LotDef): void {
  const b = k.b;
  const { x0, z0, x1, z1 } = l, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const wall = 3.5, CREAM = 0xf1e3bf, RED = 0xb8392e;

  // one storey of painted brick with a red band at its foot, and a low wall round a flat roof
  b.box(x0, 0, z0, x1, wall, z1, CREAM, { faces: 'NESW' });
  b.box(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.7, z1 + 0.05, RED, { faces: 'NESWT' });
  b.box(x0 - 0.12, wall, z0 - 0.12, x1 + 0.12, wall + 0.4, z1 + 0.12, RED, { faces: 'NESWTB', top: FELT });
  // the kitchen's flue, and its hood
  b.cyl(x0 + 1.3, z1 - 1.2, wall + 0.4, wall + 1.6, 0.28, 0.28, 6, 0xb9bcc0);
  b.box(x0 + 2.2, wall + 0.4, z1 - 1.8, x0 + 3.4, wall + 0.95, z1 - 0.8, 0xb9bcc0);

  // the front, on the lane to the north: a wide window, the door, and an awning in red
  const n = z0 - 0.05;
  b.box(x0 + 0.6, 0.8, n - 0.05, cx + 0.4, 2.5, n, GLASS, { faces: 'N', win: interior(1.3) });
  b.box(x0 + 0.5, 0.68, n - 0.1, cx + 0.5, 0.8, n, FRAME, { faces: 'NEWT' });
  b.box(cx + 1.0, 0.04, n - 0.05, cx + 2.0, 2.4, n, 0x2c3037, { faces: 'N', win: interior(1.6) });
  const v = awning(b, 'N', x0 + 0.3, x1 - 0.3, n, 3.3, 1.0, 0.4, 0.5, RED);
  k.sign('gregory-place-manolos-cloth', v.x, v.y, v.z, v.nx, v.nz, 0.4, 3);
  k.glows.push({ x: cx, y: 2.75, z: n - 0.5, sx: x1 - x0 - 1.4, sy: 0.08, sz: 0.1, color: '#ffe2ae' });
  k.lights.push({ x: cx, z: z0 - 2.5, r: 8, color: '#ffe2ae', k: 0.5 });
  // a table on the walk, two who are eating at it, and the bike that takes the pizzas out
  b.cyl(x0 + 1.4, z0 - 1.6, 0, 0.9, 0.08, 0.08, 4, FRAME, { cap: false });
  b.cyl(x0 + 1.4, z0 - 1.6, 0.9, 1.0, 0.6, 0.6, 8, 0xf2efe6);
  k.person(x0 + 0.5, z0 - 1.5);
  k.person(x0 + 2.3, z0 - 1.9);
  twoWheeler(b, x1 + 0.55, z0 + 1.6, Math.PI / 2, RED, true);

  // on the two sides the opening view sees: a window in the east wall, and the back door in the south one
  b.box(x1, 1.1, cz - 1.1, x1 + 0.05, 2.5, cz + 1.1, GLASS, { faces: 'E', win: interior(1.1) });
  b.box(x1, 0.98, cz - 1.2, x1 + 0.1, 1.1, cz + 1.2, FRAME, { faces: 'NEST' });
  b.box(cx - 0.45, 0.04, z1, cx + 0.45, 2.2, z1 + 0.05, 0x6a4a3a, { faces: 'S' });
  k.glows.push({ x: cx, y: 2.55, z: z1 + 0.12, sx: 0.3, sy: 0.14, sz: 0.12, color: '#ffe2ae' });
  b.box(x1 - 1.9, 0, z1 + 0.15, x1 - 0.7, 0.95, z1 + 0.9, 0x3f5d4a, { top: 0x2f4a3a });

  // its name on a board over the roof, on two posts, turned to face the opening view. It stands over the west of
  // the roof and no wider than this, because the block of shops hides whatever is further east.
  const view = (42 * Math.PI) / 180, nx = Math.sin(view), nz = Math.cos(view);
  const bw = 4.4, bh = 1.65, by = wall + 1.6 + bh / 2, bx = x0 + 2.1, bz = cz + 0.55;
  b.obox(bx, by, bz, bw / 2 + 0.12, bh / 2 + 0.12, 0.07, -view, 0x5a2a22);
  k.sign('gregory-place-manolos', bx + nx * 0.1, by, bz + nz * 0.1, nx, nz, bh, bw);
  for (const s of [-1, 1]) {
    const px = bx + s * Math.cos(view) * (bw / 2 - 0.5) - nx * 0.15, pz = bz - s * Math.sin(view) * (bw / 2 - 0.5) - nz * 0.15;
    b.box(px - 0.08, wall + 0.4, pz - 0.08, px + 0.08, by - bh / 2, pz + 0.08, 0xb9bcc0, { faces: 'NESW' });
  }
}

export const MODELS: Record<string, Model> = { 'gregory-place': gregoryPlace, manolos };

export function extras(k: Build): void {
  // the bays at the kerb in front of the shops: one for a hero, in front of Basil Thai, and one south of it.
  // (They lie where they do because a street lamp stands at the kerb just north of them.)
  const hero = HERO_SPOTS.find((s) => s.id === 'basil-thai');
  if (hero) {
    const kerb = GREGORY_ST - CARR, xa = hero.x - 1.45;
    area(k, rect(xa, hero.z - 4.2, kerb + 0.03, hero.z + 12.2), ASPHALT, 0.035);
    for (const d of [-4, 4, 12]) area(k, rect(xa + 0.1, hero.z + d - 0.08, kerb - 0.15, hero.z + d + 0.08), LINE, 0.045);
  }
  // the car park behind the block: three lines for two cars side by side
  const park = AREAS.find((a) => a.id === 'gregory-place-parking');
  if (park) {
    const xm = (park.x0 + park.x1) / 2;
    for (const x of [xm - 2.95, xm, xm + 2.95]) area(k, rect(x - 0.07, park.z1 - 7.4, x + 0.07, park.z1 - 0.4), LINE, 0.035);
  }
}
