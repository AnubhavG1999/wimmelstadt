// The smaller things to find on the Japan tile: the scramble at Shibuya, the
// places where cars gather, the scenes on the mountain, what floats on the
// water, and the lanterns. Their places come from plan.ts.

import * as THREE from 'three';
import { placed } from '../../engine/build';
import { Smoke } from '../../engine/effects';
import { GeoBuilder, interior, type V3 } from '../../engine/geo';
import { PLAZA, area, oval, rect } from '../../engine/ground';
import { buildPath } from '../../engine/paths';
import { train } from '../../engine/rail';
import type { Build } from '../../engine/tile';
import { slopes, stoneLantern, tiledRoof } from './landmarks';
import {
  BOATS, CARRIER, FARMS, FERRIS, GARAGE, HACHIKO, KONBINI, LOOKOUT_YARD, MOAT, MONKEYS, PADDIES, PARTS, PARTS_PARK, PASS, PASS_LINE, PETROL, POND,
  RIVER_CHERRIES, ROCK_GARDEN, ROUND_TOWER, SCRAMBLE, SCREENS, SHELF, SHORE, TOFU, TOKYO, UENO_PARK, USED_CARS,
} from './plan';
import { lantern, mast, standingCar, vending } from '../../engine/props';

const S2 = Math.SQRT1_2;
const PAINT = 0xf2efe6, VERMILION = 0xd8432b, WOOD = 0x6b4a3a, PLASTER = 0xf1ede2, STONE = 0x9a968c, ASPHALT = 0x5d5f66, DRIVE = 0x4a4c52;

/** A tall narrow banner on a pole, as stands outside a shop in Japan. */
function banner(k: Build, x: number, z: number, color: number): void {
  const b = k.b;
  b.box(x - 0.07, 0, z - 0.07, x + 0.07, 4.6, z + 0.07, 0xd9dde4);
  b.box(x + 0.07, 1.5, z - 0.03, x + 1.0, 4.5, z + 0.03, color, { faces: 'NSTB' });
}

/** A footbridge in a low arch, east to west, with a rail on each side. */
function archBridge(k: Build, x0: number, x1: number, z: number, half: number, rise: number, base = 0.25): void {
  const b = k.b, n = 8, RED = 0xb5463a, DARK = 0x8a3a30;
  const at = (i: number): [number, number] => [x0 + ((x1 - x0) * i) / n, base + Math.sin((i / n) * Math.PI) * rise];
  for (let i = 0; i < n; i++) {
    const [ax, y0] = at(i), [bx, y1] = at(i + 1);
    b.quad([ax, y0, z - half], [bx, y1, z - half], [bx, y1, z + half], [ax, y0, z + half], [0, 1, 0], RED);
    b.quad([ax, y0 - 0.3, z - half], [bx, y1 - 0.3, z - half], [bx, y1 - 0.3, z + half], [ax, y0 - 0.3, z + half], [0, -1, 0], DARK);
    for (const s of [-1, 1]) {
      b.quad([ax, y0 - 0.3, z + s * half], [bx, y1 - 0.3, z + s * half], [bx, y1, z + s * half], [ax, y0, z + s * half], [0, 0, s], DARK);
      b.beam([ax, y0 + 0.95, z + s * half], [bx, y1 + 0.95, z + s * half], 0.12, 0.12, VERMILION, { win: interior(0.4) });
    }
  }
  for (let i = 0; i <= n; i++) {
    const [x, y] = at(i);
    for (const s of [-1, 1]) b.box(x - 0.12, y - 0.3, z + s * half - 0.12, x + 0.12, y + 0.95, z + s * half + 0.12, VERMILION);
  }
}

// ---------------------------------------------------------------------------
// Shibuya
// ---------------------------------------------------------------------------

/**
 * The scramble: stripes from corner to corner as well as across each street, a
 * crowd at every corner and a knot of people in the middle of it, a tower of
 * screens on one corner, a round-fronted tower on another, and Hachikō waiting
 * on a third.
 */
function shibuya(k: Build): void {
  const b = k.b, { x: cx, z: cz } = SCRAMBLE;
  // the stripes that run from corner to corner
  for (const way of [1, -1]) {
    for (let t = -4.3; t <= 4.31; t += 1.43) {
      const px = cx + t * S2, pz = cz + way * t * S2;
      const ax = S2 * 0.34, az = way * S2 * 0.34, bx = -way * S2 * 1.25, bz = S2 * 1.25;
      area(k, [[px - ax - bx, pz - az - bz], [px + ax - bx, pz + az - bz], [px + ax + bx, pz + az + bz], [px - ax + bx, pz - az + bz]], PAINT, 0.07);
    }
  }
  // The streets to the north and the west get their crossings from the engine.
  // The ring's street comes in from the east and leaves to the south round a
  // bend, which is no junction to the engine, so those two are painted here.
  for (let n = 0; n < 6; n++) {
    const l = (n - 2.5) * 1.5;
    area(k, rect(cx + 5.25, cz + l - 0.375, cx + 7.75, cz + l + 0.375), PAINT, 0.055);
    area(k, rect(cx + l - 0.375, cz + 5.25, cx + l + 0.375, cz + 7.75), PAINT, 0.055);
  }
  // a signal on a post at each corner
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = cx + sx * 5.5, z = cz + sz * 5.5;
      b.box(x - 0.1, 0, z - 0.1, x + 0.1, 4.6, z + 0.1, 0x5d6168);
      b.box(x - 0.22, 3.4, z - 0.22, x + 0.22, 4.6, z + 0.22, 0x23262b);
      k.glows.push({ x, y: 4.25, z, sx: 0.5, sy: 0.3, sz: 0.5, color: '#ff4a3a' }, { x, y: 3.75, z, sx: 0.5, sy: 0.3, sz: 0.5, color: '#4dffa0' });
      // and the crowd that waits there to cross
      for (let i = 0; i < 11; i++) k.person(cx + sx * 6.5 + (k.rand() - 0.5) * 2.4, cz + sz * 6.5 + (k.rand() - 0.5) * 2.4);
    }
  }
  // people in the middle of the crossing. No vehicle's way comes this near the middle.
  for (let i = 0; i < 12; i++) {
    const way = i % 2 ? 1 : -1, t = -1.4 + ((i * 0.83) % 2.8);
    k.person(cx + t * S2 + (((i * 0.37) % 0.4) - 0.2), cz + way * t * S2 + (((i * 0.53) % 0.4) - 0.2));
  }

  // the tower of screens: glass, with a screen several storeys tall on each face that looks at the crossing
  {
    const s = SCREENS, mx = (s.x0 + s.x1) / 2, mz = (s.z0 + s.z1) / 2;
    b.box(s.x0, 0, s.z0, s.x1, s.h, s.z1, 0x8fb4cf, { win: { cell: 2.1, storey: 5, lit: 0.5, kind: 1 }, seed: 0.3, top: 0x7b7a7e });
    b.box(s.x0 + 1.5, s.h, s.z0 + 1.2, s.x1 - 1.5, s.h + 2.2, s.z1 - 1.2, 0x6f7378);
    // each screen is a dark frame on the wall, with the picture a hair in front of it
    const screen = (id: string, face: 'S' | 'E', y: number, h: number, aspect: number): void => {
      const hw = (h * aspect) / 2 + 0.3, hh = h / 2 + 0.3;
      if (face === 'S') {
        b.box(mx - hw, y - hh, s.z1, mx + hw, y + hh, s.z1 + 0.1, 0x14141c, { faces: 'ESWTB' });
        k.sign(id, mx, y, s.z1 + 0.13, 0, 1, h);
      } else {
        b.box(s.x1, y - hh, mz - hw, s.x1 + 0.1, y + hh, mz + hw, 0x14141c, { faces: 'NESTB' });
        k.sign(id, s.x1 + 0.13, y, mz, 1, 0, h);
      }
    };
    // Cat Cola's screen sits at the top of the face, so that the big screen below it has room
    screen('ad-neko', 'S', 36.75, 9.4, 0.54);
    screen('ad-yume', 'S', 9.4, 5.7, 1.35);
    screen('ad-donut', 'E', 25, 11.7, 0.54);
    // a band of light between the screens, where the news runs
    b.box(s.x0 + 0.4, 14.6, s.z1, s.x1 - 0.4, 15.6, s.z1 + 0.08, 0xfff2c9, { win: interior(2.4), faces: 'S' });
    b.box(s.x1, 14.6, s.z0 + 0.4, s.x1 + 0.08, 15.6, s.z1 - 0.4, 0xfff2c9, { win: interior(2.4), faces: 'E' });
    k.lights.push({ x: mx, z: s.z1 + 6, r: 18, color: '#7fd8ff', k: 0.6 }, { x: s.x1 + 6, z: mz, r: 16, color: '#ff8ac8', k: 0.6 });

    // The big screen, which shows what is playing. No wall at the crossing is
    // wide enough for it alone, so it spans the south faces of this tower and of
    // the pencil building beside it, which stand flush, as one screen over the
    // crossing does in life. Its frame bridges the narrow gap between the two.
    // (the pencil building is 32 high and its west side is 10 west of this tower's, as ORDINARY in plan.ts has it)
    const BIG = 10.05, west = s.x0 - 10, bx = (west + s.x1) / 2, by = 25.8;
    const bw = (BIG * 16) / 9 / 2 + 0.3, bh = BIG / 2 + 0.3;
    b.box(bx - bw, by - bh, s.z1, bx + bw, by + bh, s.z1 + 0.1, 0x14141c, { faces: 'NESWTB' });
    k.sign('screen', bx, by, s.z1 + 0.13, 0, 1, BIG);
    k.lights.push({ x: bx - 3, z: s.z1 + 8, r: 20, color: '#ffb35c', k: 0.5 });
  }
  // the round-fronted tower: a drum of pale metal at the corner, with the shops behind it
  {
    const t = ROUND_TOWER, r = (t.x1 - t.x0) / 2, dx = t.x0 + r, dz = t.z1 - r, flat = r * Math.cos(Math.PI / 16);
    b.box(t.x0 + 2.6, 0, t.z0, t.x1, t.h - 8, t.z1 - 2.6, 0xdcd6c9, { win: { cell: 2.4, storey: 5, lit: 0.4, kind: 2 }, seed: 0.55, top: 0x8d8a83 });
    b.cyl(dx, dz, 0, t.h, r, r, 16, 0xd9dde4, { win: { cell: 1.1, storey: 9.5, lit: 0.5, kind: 6 }, seed: 0.2, cap: 0x9aa0a8 });
    b.cyl(dx, dz, t.h, t.h + 0.6, r + 0.3, r + 0.3, 16, 0xc8ccd2);
    k.glows.push({ x: dx, y: t.h + 0.9, z: dz, sx: 6.6, sy: 0.3, sz: 0.3, color: '#ff3d9a' }, { x: dx, y: t.h + 0.9, z: dz, sx: 0.3, sy: 0.3, sz: 6.6, color: '#ff3d9a' });
    // a sign down its front, on the two sides that look at the crossing
    k.sign('donut-v', dx, 21, dz + flat + 0.06, 0, 1, 7.8);
    k.sign('kaiju-v', dx - flat - 0.06, 21, dz, -1, 0, 7.8);
    k.lights.push({ x: dx - 3, z: dz + 5, r: 16, color: '#ffd23f', k: 0.55 });
  }
  // Hachikō: a dog of bronze, sitting on a block of stone, where people arrange to meet
  {
    const h = HACHIKO, BRONZE = 0x8a6a3a;
    area(k, rect(h.x0, h.z0, h.x1, h.z1), PLAZA);
    b.box(h.x - 0.9, 0, h.z - 0.9, h.x + 0.9, 1.5, h.z + 0.9, STONE);
    // haunches behind, chest and forelegs before them, the head up, ears pricked, and the tail curled over
    b.box(h.x - 0.36, 1.5, h.z - 0.5, h.x + 0.36, 2.0, h.z + 0.1, BRONZE);
    b.box(h.x - 0.3, 1.5, h.z - 0.05, h.x + 0.3, 2.65, h.z + 0.4, BRONZE);
    b.box(h.x - 0.27, 2.6, h.z + 0.05, h.x + 0.27, 3.12, h.z + 0.55, BRONZE);
    b.box(h.x - 0.14, 2.62, h.z + 0.55, h.x + 0.14, 2.9, h.z + 0.74, BRONZE);
    for (const s of [-1, 1]) b.box(h.x + s * 0.2 - 0.08, 3.12, h.z + 0.12, h.x + s * 0.2 + 0.08, 3.38, h.z + 0.28, BRONZE);
    b.box(h.x - 0.1, 1.9, h.z - 0.64, h.x + 0.1, 2.35, h.z - 0.48, BRONZE);
    k.sign('hachiko', h.x, 0.85, h.z + 0.93, 0, 1, 0.7);
    k.sign('hachiko', h.x + 0.93, 0.85, h.z, 1, 0, 0.7);
    for (let i = 0; i < 12; i++) k.person(h.x - 1.9 + ((i * 2.9) % 6.4), h.z + 1.7 + ((i * 1.7) % 4.4));
    for (const [x, z] of [[h.x1 - 2, h.z0 + 3], [h.x1 - 2, h.z0 + 11.5], [h.x0 + 2.5, h.z0 + 14.5]]) k.tree(x, z, 0.65);
    // a police box at the far end of the square, with its red lamp
    b.box(h.x0 + 2.4, 0, h.z1 - 6.4, h.x0 + 8.4, 3.6, h.z1 - 2.2, 0xe9e3d6, { win: { cell: 2, storey: 3.6, lit: 1, kind: 2 }, seed: 0.4, top: 0x6f7378 });
    k.glows.push({ x: h.x0 + 5.4, y: 4.0, z: h.z1 - 2.1, sx: 0.5, sy: 0.5, sz: 0.5, color: '#ff3b3b' });
    for (let i = 0; i < 5; i++) k.person(h.x0 + 1.4 + ((i * 3.1) % 7), h.z0 + 9 + i * 2.1);
    k.lights.push({ x: h.x, z: h.z + 3, r: 13, color: '#ffe2ae', k: 0.5 });
  }
}

// ---------------------------------------------------------------------------
// Where cars gather
// ---------------------------------------------------------------------------

/**
 * The tuner's garage: a building with its street side left open. On the left a
 * showroom with a turntable, which waits for a hero. On the right a workshop,
 * with a car up on a lift.
 */
function garage(k: Build): void {
  const b = k.b, g = GARAGE, wall = 0xe9e3d6, inner = 0xf5f1e8, mid = g.wall;
  b.box(g.x0, 0, g.z0, g.x1, 0.06, g.z1, 0xe9e6df, { faces: 'T', win: interior(0.9) });
  // (the walls have no tops of their own: the roof lies on them)
  b.box(g.x0, 0, g.z0, g.x1, g.h, g.z0 + 0.6, wall, { faces: 'NEW' });
  b.box(g.x0 + 0.6, 0.06, g.z0 + 0.5, g.x1 - 0.6, g.h - 0.7, g.z0 + 0.6, inner, { faces: 'S', win: interior(0.75) });
  b.box(g.x0, 0, g.z0 + 0.6, g.x0 + 0.6, g.h, g.z1, wall, { faces: 'WS' });
  b.box(g.x0 + 0.5, 0.06, g.z0 + 0.6, g.x0 + 0.6, g.h - 0.7, g.z1, inner, { faces: 'E', win: interior(0.75) });
  b.box(g.x1 - 0.6, 0, g.z0 + 0.6, g.x1, g.h, g.z1, wall, { faces: 'ES' });
  b.box(g.x1 - 0.6, 0.06, g.z0 + 0.6, g.x1 - 0.5, g.h - 0.7, g.z1, inner, { faces: 'W', win: interior(0.75) });
  b.box(g.x0 - 0.4, g.h - 0.7, g.z0 - 0.2, g.x1 + 0.4, g.h, g.z1 + 0.9, 0x2a2c31, { top: 0x6f7378 });
  b.box(g.x0 + 0.6, g.h - 0.75, g.z0 + 0.6, g.x1 - 0.6, g.h - 0.7, g.z1, 0xffffff, { faces: 'B', win: interior(0.95) });
  // a wall between the showroom and the workshop, and a red stripe along the back of both
  b.box(mid - 0.2, 0.06, g.z0 + 0.6, mid + 0.2, g.h - 0.75, g.z1 - 2.5, inner, { faces: 'EWS', win: interior(0.7) });
  b.box(g.x0 + 0.6, 4.2, g.z0 + 0.6, g.x1 - 0.6, 5.1, g.z0 + 0.66, 0xc2183a, { faces: 'S', win: interior(0.9) });
  for (const fx of [0.14, 0.4, 0.62, 0.86]) {
    for (const fz of [0.3, 0.72]) k.glows.push({ x: g.x0 + (g.x1 - g.x0) * fx, y: g.h - 0.85, z: g.z0 + (g.z1 - g.z0) * fz, sx: 1.6, sy: 0.14, sz: 0.5, color: '#fff3dc' });
  }
  // the workshop: a lift with its two posts and the arms that reach in under the car, tool chests, and tyres by the wall
  {
    const lx = g.lift.x, lz = g.lift.z, LIFT = 0xe8a23d;
    for (const s of [-1, 1]) {
      const px = lx + s * 2.05, ix = lx + s * 0.45;
      b.box(px - 0.22, 0.06, lz - 0.3, px + 0.22, 4.6, lz + 0.3, LIFT);
      for (const dz of [-1.75, 1.75]) b.box(Math.min(px, ix), 1.36, lz + dz - 0.15, Math.max(px, ix), 1.6, lz + dz + 0.15, LIFT, { faces: 'NESWTB' });
    }
    b.box(mid + 0.6, 0.06, g.z0 + 0.8, mid + 2.8, 2, g.z0 + 2.0, 0xc2183a);
    b.box(mid + 3.1, 0.06, g.z0 + 0.8, mid + 4.2, 1.4, g.z0 + 2.0, 0x3f6fb5);
    for (let i = 0; i < 2; i++) for (let n = 0; n < 3; n++) b.cyl(g.x1 - 1.7, g.z0 + 1.9 + i * 2.1, 0.06 + n * 0.75, 0.74 + n * 0.75, 0.95, 0.95, 8, 0x1c1d22);
    k.person(lx - 3, lz + 0.8);
  }
  // its name, across the front of the roof, and what it does, over the workshop
  for (const [id, x, h] of [['habahiro', (g.x0 + mid) / 2, 3.2], ['tuning', (mid + g.x1) / 2, 2]] as const) {
    k.sign(id, x, g.h + 0.3 + h / 2, g.z1 + 0.95, 0, 1, h);
    k.sign(id, x, g.h + 0.3 + h / 2, g.z1 + 0.75, 0, -1, h);
  }
  k.lights.push({ x: (g.x0 + g.x1) / 2, z: g.z1 + 5, r: 22, color: '#fff0d6', k: 0.75 }, { x: g.table.x, z: g.table.z, r: 13, color: '#fff0d6', k: 0.6 });
  for (let i = 0; i < 6; i++) k.person(g.x0 + 3 + i * 3.1, g.z1 + 1.6 + (i % 2) * 1.1);

  // the turntable: a disc of its own, which turns
  const table = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(g.table.r, g.table.r, 0.4, 28), k.mat.prop({ vertexColors: false, color: 0xcfcbc2 }));
  disc.position.y = 0.2;
  disc.receiveShadow = true;
  table.add(disc);
  for (let i = 0; i < 8; i++) {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.3), k.mat.prop({ vertexColors: false, color: 0xc2183a }));
    const a = (i / 8) * Math.PI * 2;
    mark.position.set(Math.cos(a) * (g.table.r - 0.7), 0.42, Math.sin(a) * (g.table.r - 0.7));
    mark.rotation.y = -a;
    table.add(mark);
  }
  table.position.set(g.table.x, 0.05, g.table.z);
  k.group.add(table);
  k.each((dt) => {
    table.rotation.y -= g.turn * dt;
  });
}

/** The parts shop and the used-car lot beside it, under the Wangan. */
function carLots(k: Build): void {
  const b = k.b, p = PARTS, u = USED_CARS, px = (p.x0 + p.x1) / 2;
  // the parts shop: yellow, with a black band, and tyres stacked outside
  b.box(p.x0, 0, p.z0, p.x1, 5.6, p.z1, 0xf2c14e, { win: { cell: 3, storey: 5.6, lit: 1, kind: 2 }, seed: 0.2, top: 0x8d8a83 });
  b.box(p.x0 - 0.06, 4.2, p.z0 - 0.06, p.x1 + 0.06, 5.0, p.z1 + 0.06, 0x1c1d22, { faces: 'NESW' });
  b.box(px - 4.1, 5.6, p.z1 - 0.2, px + 4.1, 8.1, p.z1 - 0.04, 0x14141c);
  k.sign('parts', px, 6.85, p.z1, 0, 1, 2.2);
  k.sign('parts', px, 6.85, p.z1 - 0.24, 0, -1, 2.2);
  for (let i = 0; i < 4; i++) for (let n = 0; n < 2 + (i % 2); n++) b.cyl(p.x0 + 1.4 + i * 2.2, p.z1 + 1.5, n * 0.75, n * 0.75 + 0.68, 0.95, 0.95, 8, 0x1c1d22);
  k.lights.push({ x: px, z: p.z1 + 3, r: 12, color: '#ffe28a', k: 0.55 });
  for (const [x, z] of [[p.x0 + 9.4, p.z1 + 1.2], [p.x0 + 10.3, p.z1 + 2]]) k.person(x, z);

  // the used-car lot: asphalt, a hut for the salesman, a board with what it sells, and banners along the water
  area(k, rect(u.x0, u.z0, u.x1, u.z1), ASPHALT);
  b.box(u.x0 + 0.9, 0, u.z0 + 0.5, u.x0 + 4.4, 3.2, u.z0 + 3.9, 0xe9e3d6, { win: { cell: 1.7, storey: 3.2, lit: 1, kind: 2 }, seed: 0.7, top: 0x6f7378 });
  // the board stands along the street side, on two posts, and reads from both sides
  const bz0 = u.z0 + 5.4, bz1 = u.z1 - 1.4, bm = (bz0 + bz1) / 2;
  for (const z of [bz0 + 0.4, bz1 - 0.4]) b.box(u.x0 + 0.3, 0, z - 0.16, u.x0 + 0.62, 4.3, z + 0.16, 0x6b7076);
  b.box(u.x0 + 0.36, 4.2, bz0, u.x0 + 0.56, 7.1, bz1, 0x14141c, { faces: 'NESWTB' });
  k.sign('used-cars', u.x0 + 0.33, 5.65, bm, -1, 0, 2.5, bz1 - bz0 - 0.5);
  k.sign('used-cars', u.x0 + 0.59, 5.65, bm, 1, 0, 2.5, bz1 - bz0 - 0.5);
  const HUES = [0xe8523f, 0xf2c14e, 0x4fa3d8, 0xff5aa8];
  for (let i = 0; i < 6; i++) banner(k, u.x0 + 4.5 + i * 3.6, u.z1 - 0.4, HUES[i % 4]);
  // a string of little flags over each row of cars
  for (const z of u.rows) {
    const fx0 = u.first - 2.4, fx1 = u.first + 5 * u.pitch + 2.4, fz = z + 3.9;
    b.beam([fx0, 5.4, fz], [fx1, 5.4, fz], 0.04, 0.04, 0x2a2c31);
    for (const x of [fx0, fx1]) b.box(x - 0.1, 0, fz - 0.1, x + 0.1, 5.5, fz + 0.1, 0x6b7076);
    for (let x = fx0 + 0.9; x < fx1 - 0.5; x += 1.3) b.box(x - 0.2, 4.85, fz - 0.02, x + 0.2, 5.38, fz + 0.02, HUES[Math.round(x * 3) % 4], { faces: 'NS' });
  }
  // the parts shop's own car park, beside it: three bays, and a P on a pole
  {
    const c = PARTS_PARK;
    area(k, rect(c.x0, c.z0, c.x1, c.z1), ASPHALT);
    for (let i = 0; i <= c.bays; i++) area(k, rect(c.first + (i - 0.5) * c.pitch - 0.09, c.z0 + 0.5, c.first + (i - 0.5) * c.pitch + 0.09, c.z1 - 0.6), PAINT, 0.045);
    b.box(c.x1 - 0.5, 0, c.z1 - 0.5, c.x1 - 0.24, 4.4, c.z1 - 0.24, 0x6b7076);
    b.box(c.x1 - 1.25, 4.4, c.z1 - 0.45, c.x1 + 0.51, 6.16, c.z1 - 0.29, 0x1c4fa8, { faces: 'NESWTB' });
    k.sign('p', c.x1 - 0.37, 5.28, c.z1 - 0.27, 0, 1, 1.6);
    k.sign('p', c.x1 - 0.37, 5.28, c.z1 - 0.47, 0, -1, 1.6);
    for (const [x, z] of [[c.first + 1.8, c.z1 - 1.4], [c.first + c.pitch + 1.7, c.z0 + 2.2], [c.first + c.pitch + 2.3, c.z0 + 3]]) k.person(x, z);
    k.lights.push({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, r: 12, color: '#fff0d6', k: 0.5 });
  }
  k.person(u.x0 + 5.6, u.z0 + 2.4);
  k.person(u.first + 2 * u.pitch + 1.8, u.rows[1] - 4.4);
  k.person(u.first + 2 * u.pitch + 2.7, u.rows[1] - 4.6);
  k.lights.push({ x: (u.x0 + u.x1) / 2, z: (u.z0 + u.z1) / 2, r: 20, color: '#fff0d6', k: 0.55 });
}

/** The konbini: bright as day all night, with a car park in front where a hero may stand. */
function konbini(k: Build): void {
  const b = k.b, c = KONBINI, mx = (c.x0 + c.x1) / 2;
  b.box(c.x0, 0, c.z0, c.x1, 4.4, c.z1, 0xf2f0ea, { top: 0x8d8a83 });
  // the front is all glass, with the shop lit behind it
  b.box(c.x0 + 0.5, 0.3, c.z1, c.x1 - 0.5, 3.1, c.z1 + 0.06, 0xf8fcff, { win: interior(2), faces: 'S' });
  for (let i = 0; i <= 5; i++) {
    const x = c.x0 + 0.5 + (i * (c.x1 - c.x0 - 1)) / 5;
    b.box(x - 0.08, 0.3, c.z1 + 0.04, x + 0.08, 3.1, c.z1 + 0.12, 0x9aa0a8, { faces: 'ESW' });
  }
  // two stripes along its fascia, in colours of its own
  b.box(c.x0 - 0.05, 3.3, c.z0 - 0.05, c.x1 + 0.05, 3.75, c.z1 + 0.1, 0x22b8c8, { faces: 'NESW', win: interior(0.9) });
  b.box(c.x0 - 0.05, 3.75, c.z0 - 0.05, c.x1 + 0.05, 4.1, c.z1 + 0.1, 0xff5aa8, { faces: 'NESW', win: interior(0.9) });
  b.box(mx - 3.9, 4.4, c.z1 - 0.14, mx + 3.9, 6.2, c.z1 + 0.02, 0x14141c);
  k.sign('konbini-box', mx, 5.3, c.z1 + 0.06, 0, 1, 1.7);
  b.box(c.x0 + 2, 4.4, c.z0 + 1.5, c.x0 + 4.4, 5.6, c.z0 + 3.2, 0xb9bcc0);
  // the car park: three bays, a kerb stone at the head of each, and a sign on a pole by the way in
  area(k, rect(c.x0 - 0.4, c.z1 + 0.5, c.x1 + 3, c.park), ASPHALT);
  for (let i = 0; i <= 3; i++) area(k, rect(c.x0 + 0.26 + i * 4.1, c.z1 + 2, c.x0 + 0.44 + i * 4.1, c.z1 + 9.2), PAINT, 0.045);
  for (let i = 0; i < 3; i++) b.box(c.x0 + 1.3 + i * 4.1, 0, c.z1 + 1.5, c.x0 + 3.5 + i * 4.1, 0.3, c.z1 + 1.85, 0xd9d5cb);
  vending(k, c.x1 + 0.5, c.z1 - 2.6, 0, 2);
  {
    const px = c.x1 + 2.2, pz = c.park - 1;
    b.box(px - 0.14, 0, pz - 0.14, px + 0.14, 5.2, pz + 0.14, 0x6b7076);
    b.box(px - 1.15, 5.2, pz - 0.16, px + 1.15, 7.5, pz + 0.16, 0xf2f0ea, { faces: 'NESWTB' });
    k.sign('konbini-pole', px, 6.35, pz + 0.19, 0, 1, 2.2);
    k.sign('konbini-pole', px, 6.35, pz - 0.19, 0, -1, 2.2);
  }
  // the way in from the street, across the sidewalk, and on to the petrol station
  area(k, rect(c.x1 + 3, c.z1 + 3, TOKYO.west - 4.8, c.z1 + 8), DRIVE, 0.025);
  area(k, rect(c.x1 - 5, c.park, c.x1 + 2, PETROL.z0 - 0.5), ASPHALT, 0.021);
  k.lights.push({ x: mx, z: c.z1 + 4, r: 17, color: '#f4fbff', k: 0.95 }, { x: mx, z: c.z1 + 8, r: 12, color: '#f4fbff', k: 0.5 });
  for (const [x, z] of [[c.x0 + 5.6, c.z1 + 0.9], [c.x0 + 6.6, c.z1 + 0.8], [c.x1 - 1.6, c.z1 + 0.9], [c.x1 + 1.5, c.z1 - 2.2]]) k.person(x, z);
}

/** The petrol station: a roof on four posts, with the hoses hanging down from it, as they do in Japan. */
function petrol(k: Build): void {
  const b = k.b, p = PETROL, mx = (p.x0 + p.x1) / 2, mz = (p.z0 + p.z1) / 2, ORANGE = 0xe8662f;
  area(k, rect(p.x0 - 1, p.z0 - 0.5, p.x1 + 3, p.z1 + 1), 0x8f8c86);
  b.box(p.x0, 5.2, p.z0, p.x1, 5.95, p.z1, 0xf2f0ea, { top: 0xd9dde4, faces: 'NESWTB' });
  b.box(p.x0 - 0.06, 5.25, p.z0 - 0.06, p.x1 + 0.06, 5.62, p.z1 + 0.06, ORANGE, { faces: 'NESW', win: interior(0.8) });
  for (const [x, z] of [[p.x0 + 0.8, p.z0 + 0.8], [p.x1 - 0.8, p.z0 + 0.8], [p.x0 + 0.8, p.z1 - 0.8], [p.x1 - 0.8, p.z1 - 0.8]]) b.box(x - 0.25, 0, z - 0.25, x + 0.25, 5.2, z + 0.25, 0xd9dde4);
  // the island the cars stop beside, and over it the hoses: a reel under the roof, a hose down from it, a nozzle at its end
  const iz = mz + 1.6;
  b.box(p.x0 + 2.4, 0, iz - 0.25, p.x1 - 2.4, 0.25, iz + 0.25, 0xd9d5cb);
  for (const x of [p.x0 + 4, mx, p.x1 - 4]) {
    b.box(x - 0.35, 4.7, iz - 0.5, x + 0.35, 5.2, iz + 0.5, ORANGE, { faces: 'NESWB' });
    for (const s of [-1, 1]) {
      b.beam([x, 4.7, iz + s * 0.35], [x + 0.2, 2.45, iz + s * 0.35], 0.06, 0.06, 0x1c1d22);
      b.box(x + 0.06, 2.1, iz + s * 0.35 - 0.1, x + 0.36, 2.45, iz + s * 0.35 + 0.1, 0xd8432b, { faces: 'NESWTB' });
    }
    k.glows.push({ x, y: 5.08, z: mz - 1.4, sx: 1.6, sy: 0.14, sz: 0.5, color: '#fff7e6' });
  }
  // the office at the back, and what is sold, on the roof's edge
  b.box(mx - 3.5, 0, p.z0 + 0.3, mx + 3.5, 3.3, p.z0 + 2.7, 0xe9e3d6, { win: { cell: 2.3, storey: 3.3, lit: 1, kind: 2 }, seed: 0.2, top: 0x6f7378 });
  b.box(mx - 3.4, 5.95, p.z1 - 0.2, mx + 3.4, 7.85, p.z1 - 0.04, 0x14141c);
  k.sign('gasoline', mx, 6.9, p.z1, 0, 1, 1.7);
  b.box(p.x1 - 0.2, 5.95, mz - 3.4, p.x1 - 0.04, 7.85, mz + 3.4, 0x14141c);
  k.sign('gasoline', p.x1, 6.9, mz, 1, 0, 1.7);
  for (const [x, z] of [[mx + 4.6, mz + 0.5], [mx - 1.2, p.z0 + 3.3]]) k.person(x, z);
  k.lights.push({ x: mx, z: mz, r: 16, color: '#fff7e6', k: 0.9 });
}

/** The tofu shop at the foot of the pass: a small wooden shop that is open before dawn. */
function tofuShop(k: Build): void {
  const b = k.b, t = TOFU, mx = (t.x0 + t.x1) / 2, DARK = 0x3a2a24;
  b.box(t.x0, 0, t.z0, t.x1, 3.3, t.z1, 0x7a5644, { win: { cell: 3, storey: 3.3, lit: 1, kind: 2 }, seed: 0.5 });
  b.box(t.x0 + 0.2, 3.3, t.z0 + 0.2, t.x1 - 0.2, 5.8, t.z1 - 0.2, PLASTER, { win: { cell: 2, storey: 2.5, lit: 0.5, kind: 0 }, seed: 0.3 });
  slopes(b, [t.x0 - 0.5, t.z0 - 0.5, t.x1 + 0.5, t.z1 + 0.5], 3.3, [t.x0 + 0.2, t.z0 + 0.2, t.x1 - 0.2, t.z1 - 0.2], 3.9, 0x4a4f55);
  tiledRoof(b, t.x0 + 0.2, t.z0 + 0.2, t.x1 - 0.2, t.z1 - 0.2, 5.8, 1.9, 0.8);
  // its name on a board over the door, and on a sign that hangs at the corner
  b.box(mx - 2.8, 2.1, t.z1, mx + 2.8, 3.3, t.z1 + 0.1, DARK, { faces: 'ESWB' });
  k.sign('tofu', mx, 2.7, t.z1 + 0.13, 0, 1, 1.05);
  b.box(t.x0 - 1.25, 0.55, t.z1 - 0.35, t.x0 - 0.1, 3.15, t.z1 - 0.29, 0x1a1a1a, { faces: 'NESWTB' });
  k.sign('tofu-v', t.x0 - 0.67, 1.85, t.z1 - 0.26, 0, 1, 2.5);
  k.sign('tofu-v', t.x0 - 0.67, 1.85, t.z1 - 0.38, 0, -1, 2.5);
  lantern(k, t.x1 + 0.35, 2.6, t.z1 + 0.35, 0.7);
  k.person(mx + 1.4, t.z1 + 0.8);
  k.lights.push({ x: mx, z: t.z1 + 3, r: 10, color: '#ffe2ae', k: 0.6 });
}

// ---------------------------------------------------------------------------
// On the mountain
// ---------------------------------------------------------------------------

/**
 * A thatched farmhouse: a roof so steep and so deep that it is most of the
 * house, with rows of paper windows in each end. It is built round (0, 0), with
 * its ridge running north and south.
 */
function farmhouse(k: Build, w: number, d: number, h: number): void {
  const b = k.b, THATCH = 0xa08a5c, EDGE = 0x7d6a45;
  const hw = w / 2, hd = d / 2, over = 0.6, eave = 1.0, out = hw + 0.5;
  /** Half the roof's width at a height. */
  const at = (y: number): number => out * (1 - (y - eave) / (h - eave));
  b.box(-hw + 0.5, 0, -hd, hw - 0.5, 2.2, hd, WOOD, { win: { cell: 1.6, storey: 2.2, lit: 0.7, kind: 4 }, seed: 0.3 });
  for (const s of [-1, 1]) {
    // a slope of thatch, from near the ground to the ridge, and the thick edge it ends in at the eaves
    b.quad([s * out, eave, -hd - over], [s * out, eave, hd + over], [0, h, hd + over], [0, h, -hd - over], [s * (h - eave), out, 0], THATCH);
    b.quad([s * out, eave - 0.4, -hd - over], [s * out, eave - 0.4, hd + over], [s * out, eave, hd + over], [s * out, eave, -hd - over], [s, 0, 0], EDGE);
    // an end: plaster above the timber, under the thatch
    const z = s * hd, wide = at(2.2) - 0.1;
    // (a triangle shows from one side only: its corners go the other way round on the north end)
    b.tri([-s * wide, 2.2, z], [s * wide, 2.2, z], [0, h - 0.5, z], [0, 0, s], PLASTER, { win: interior(0.4) });
    for (const y of [3.0, 4.5]) {
      const half = at(y + 0.55) - 0.75;
      if (half > 0.5) b.box(-half, y, Math.min(z, z + s * 0.05), half, y + 0.55, Math.max(z, z + s * 0.05), 0xfff1c9, { win: interior(1.6), faces: s > 0 ? 'S' : 'N' });
    }
    // the thick edge of the thatch, up each side of the end
    for (const sx of [-1, 1]) b.beam([sx * out, eave - 0.2, s * (hd + over)], [0, h - 0.1, s * (hd + over)], 0.3, 0.3, EDGE);
  }
  b.box(-0.4, h - 0.15, -hd - over - 0.1, 0.4, h + 0.3, hd + over + 0.1, EDGE, { faces: 'NESWT' });
}

/** The thatched farmhouses and their paddies, and the monkeys in their hot pool, on the shelf below Fuji. */
function shelf(k: Build): void {
  const b = k.b, y = SHELF.y - 0.2;
  for (const [x, z, turn] of FARMS) {
    placed(k, x, z, turn, (q) => farmhouse(q, 6.6, 8.4, 7.6), y);
    k.lights.push({ x, z, r: 9, color: '#ffd9a0', k: 0.45 });
  }
  // rice paddies: water in squares, with the rice in rows
  for (const p of PADDIES) {
    area(k, rect(p.x0, p.z0, p.x1, p.z1), 0x7fae8f, y + 0.04);
    for (let x = p.x0 + 0.5; x < p.x1 - 0.2; x += 0.9) b.box(x - 0.07, y, p.z0 + 0.3, x + 0.07, y + 0.3, p.z1 - 0.3, 0x5f9a52, { faces: 'NESWT' });
  }
  // the pool: hot water among rocks, some of them capped with snow
  const m = MONKEYS, r = m.r;
  b.cyl(m.x, m.z, y, y + 0.35, r, r, 10, 0x8a8277);
  b.cyl(m.x, m.z, y + 0.35, y + 0.4, r - 0.5, r - 0.5, 10, 0x9fd8e0, { win: interior(0.35) });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4, d = r - 0.1 + (i % 2) * 0.5;
    b.cyl(m.x + Math.cos(a) * d, m.z + Math.sin(a) * d, y, y + 0.9 + (i % 3) * 0.4, 0.9, 0.45, 5, 0x8a8277, { cap: 0xf3f5fa });
  }
  // the monkeys: some up to their necks in it, two on the rocks. Grey-brown, with red faces.
  const FUR = 0x8f8074, FACE = 0xd9705f;
  const monkey = (x: number, z: number, base: number, yaw: number): void => {
    b.obox(x, base + 0.3, z, 0.26, 0.3, 0.24, yaw, FUR);
    b.obox(x + Math.cos(yaw) * 0.08, base + 0.78, z + Math.sin(yaw) * 0.08, 0.21, 0.2, 0.2, yaw, FUR);
    b.obox(x + Math.cos(yaw) * 0.27, base + 0.76, z + Math.sin(yaw) * 0.27, 0.04, 0.12, 0.13, yaw, FACE);
  };
  for (const [dx, dz, yaw] of [[-0.9, 0.4, 0.4], [0.5, -0.8, 2.2], [1.0, 0.8, 3.6], [-0.2, 1.3, -1.2], [0.1, -0.1, 1.2]]) monkey(m.x + dx, m.z + dz, y - 0.1, yaw);
  monkey(m.x - r + 0.1, m.z - 0.6, y + 0.9, 0.2);
  monkey(m.x + r - 0.2, m.z + 1.4, y + 0.9, 3.3);
  // steam rises from the water
  const steam = new Smoke(k.mat.prop({ vertexColors: false, color: 0xffffff }), 48);
  k.group.add(steam.mesh);
  const from = new THREE.Vector3(), drift = new THREE.Vector3(0.2, 0.5, 0.1);
  let due = 0;
  k.each((dt) => {
    due -= dt;
    if (due <= 0) {
      due = 0.16 + Math.random() * 0.2;
      steam.puff(from.set(m.x + (Math.random() - 0.5) * (r + 1), y + 0.6, m.z + (Math.random() - 0.5) * (r + 1)), drift, 0.6, 1);
    }
    steam.update(dt);
  });
  // people who have walked up to look
  for (const [dx, dz] of [[-r - 1.6, 1.2], [-r - 1.9, 2.1], [0.6, r + 1.5]]) k.person(m.x + dx, m.z + dz, y);
  k.lights.push({ x: m.x, z: m.z, r: 8, color: '#cfe8ff', k: 0.4 });
}

/** The lookout's rail, its vending machines and the people at it, and the boards and mirrors at each hairpin of the pass. */
function passDetails(k: Build): void {
  const b = k.b, y = PASS.y1, yard = LOOKOUT_YARD, RAIL_WHITE = 0xe9e3d6;
  // along the yard runs north-east, and out from it, towards the view, is south-east
  const spot = (along: number, out: number): [number, number] => [yard.x + S2 * along + S2 * out, yard.z - S2 * along + S2 * out];
  // a rail along the far edge of the yard, where the ground falls away
  for (let t = -yard.half; t <= yard.half + 0.01; t += 2.5) {
    const [x, z] = spot(t, yard.deep + 0.2);
    b.obox(x, y + 0.5, z, 0.1, 0.5, 0.1, Math.PI / 4, RAIL_WHITE);
    if (t + 2.5 <= yard.half + 0.01) {
      const [x1, z1] = spot(t + 2.5, yard.deep + 0.2);
      b.beam([x, y + 0.95, z], [x1, y + 0.95, z1], 0.09, 0.09, RAIL_WHITE);
      b.beam([x, y + 0.5, z], [x1, y + 0.5, z1], 0.07, 0.07, RAIL_WHITE);
    }
  }
  {
    const [x, z] = spot(yard.half - 1.1, -yard.deep + 0.5);
    vending(k, x, z, Math.PI / 4, 2, y);
  }
  // people between the cars, at the rail, and by the machines
  for (const [along, out] of [[-1.95, 2.9], [1.95, 3.0], [2.0, 1.9], [-6.2, 2.8], [-6.6, 1.2], [-6.1, -0.6], [6.2, 2.9], [6.6, 0.4], [5.9, -1.4]]) {
    const [x, z] = spot(along, out);
    k.person(x, z, y);
  }
  // at each hairpin: a row of boards with arrows round the outside of the bend, and a mirror on a post
  const hairpins = PASS_LINE.filter((p) => p.t === 'arc' && Math.abs(p.a1 - p.a0) > 3);
  hairpins.forEach((p, n) => {
    if (p.t !== 'arc') return;
    const mid = (p.a0 + p.a1) / 2, r = p.r + PASS.width + 0.75, py = (p.y0 + p.y1) / 2;
    for (const off of [-0.55, 0, 0.55]) {
      const a = mid + off, x = p.c[0] + Math.cos(a) * r, z = p.c[1] + Math.sin(a) * r;
      b.box(x - 0.08, py - 1.2, z - 0.08, x + 0.08, py + 1.2, z + 0.08, 0x6b7076);
      b.obox(x, py + 1.75, z, 0.05, 0.62, 0.62, a, 0x2a2c31, { faces: 'B' });
      k.sign('chevron', x - Math.cos(a) * 0.08, py + 1.75, z - Math.sin(a) * 0.08, -Math.cos(a), -Math.sin(a), 1.15);
    }
    const a = mid + 1.05, x = p.c[0] + Math.cos(a) * r, z = p.c[1] + Math.sin(a) * r;
    b.box(x - 0.07, py - 1.2, z - 0.07, x + 0.07, py + 2.7, z + 0.07, 0xe8662f);
    b.obox(x, py + 3.2, z, 0.08, 0.5, 0.5, a, 0xe8662f, { faces: 'B' });
    b.obox(x - Math.cos(a) * 0.1, py + 3.2, z - Math.sin(a) * 0.1, 0.02, 0.4, 0.4, a, 0xcfe0ea, { win: interior(0.6), faces: 'B' });
    // what a car leaves behind when it goes round sideways: two dark lines that swing wide through the bend
    {
      const steps = 14, from = mid - 1.15 * Math.sign(p.a1 - p.a0), sweep = 2.1 * Math.sign(p.a1 - p.a0);
      for (const track of [0, 1.7]) {
        for (let i = 0; i < steps; i++) {
          const corners: V3[] = [];
          for (const [u, side] of [[i / steps, -1], [(i + 1) / steps, -1], [(i + 1) / steps, 1], [i / steps, 1]]) {
            const a = from + sweep * u, rr = p.r - 2.6 + track + 2.5 * u * u + side * 0.16;
            // (a hair above the road, which is laid in flat pieces and so is not quite where the bend's own height says)
            const y = p.y0 + ((p.y1 - p.y0) * (a - p.a0)) / (p.a1 - p.a0) + 0.15;
            corners.push([p.c[0] + Math.cos(a) * rr, y, p.c[1] + Math.sin(a) * rr]);
          }
          b.quad(corners[0], corners[1], corners[2], corners[3], [0, 1, 0], 0x2b2c31);
        }
      }
    }
    // People who have come up to watch stand on a ledge of concrete outside the
    // wall, beyond the boards: the bank itself is too steep to stand them on.
    if (n < 4) {
      const pa = mid - 1.0, pr = p.r + PASS.width + 1.0;
      const top = p.y0 + ((p.y1 - p.y0) * (pa - p.a0)) / (p.a1 - p.a0) - 0.1;
      const lx = p.c[0] + Math.cos(pa) * pr, lz = p.c[1] + Math.sin(pa) * pr;
      b.obox(lx, top - 2.5, lz, 1.0, 2.5, 2.4, pa, 0xbdb8ad);
      b.obox(lx + Math.cos(pa) * 0.92, top + 0.45, lz + Math.sin(pa) * 0.92, 0.08, 0.45, 2.4, pa, 0xe9e3d6);
      for (let i = 0; i < 5; i++) {
        const along = -1.9 + i * 0.95, out = i % 2 ? 0.25 : -0.35;
        k.person(lx + Math.cos(pa) * out - Math.sin(pa) * along, lz + Math.sin(pa) * out + Math.cos(pa) * along, top);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Kyoto's smaller things
// ---------------------------------------------------------------------------

/** The rock garden: raked gravel, fifteen stones in five groups, each on its moss, behind a clay wall. */
function rockGarden(k: Build): void {
  const b = k.b, g = ROCK_GARDEN, CLAY = 0xc9b48a;
  area(k, rect(g.x0, g.z0, g.x1, g.z1), 0xf0ede4);
  // the lines the rake leaves
  for (let z = g.z0 + 0.7; z < g.z1 - 0.3; z += 0.7) area(k, rect(g.x0 + 0.4, z, g.x1 - 0.4, z + 0.1), 0xdcd8cc, 0.035);
  for (const [dx, dz, n] of [[1.5, 1.8, 5], [5.2, 4.0, 2], [2.2, 6.6, 3], [5.6, 8.6, 2], [2.8, 10.6, 3]]) {
    const x = g.x0 + dx, z = g.z0 + dz;
    area(k, oval(x, z, 1.25, 0.95, 10), 0x6fa85a, 0.05);
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = i === 0 ? 0 : 0.62;
      b.cyl(x + Math.cos(a) * r, z + Math.sin(a) * r * 0.7, 0, 0.5 + (i === 0 ? 0.6 : 0.15 * (i % 2)), 0.42 - i * 0.04, 0.22, 5, 0x77736b);
    }
  }
  // the wall, with tiles along its top, on the three sides away from the veranda
  const wall = (x0: number, z0: number, x1: number, z1: number): void => {
    b.box(x0, 0, z0, x1, 1.7, z1, CLAY);
    b.box(x0 - 0.15, 1.7, z0 - 0.15, x1 + 0.15, 2.0, z1 + 0.15, 0x4a4f55);
  };
  wall(g.x0 - 0.5, g.z0 - 0.5, g.x1, g.z0);
  wall(g.x0 - 0.5, g.z1, g.x1, g.z1 + 0.5);
  wall(g.x0 - 0.5, g.z0, g.x0, g.z1);
  // the veranda it is looked at from, with people sitting along its edge
  b.box(g.x1, 0, g.z0, g.x1 + 1.9, 0.6, g.z1, WOOD);
  for (let i = 0; i < 4; i++) k.person(g.x1 + 0.8, g.z0 + 2 + i * 2.6, 0.6);
}

/** Lanterns along Gion's lane and over the yokocho, and the red bridge over the river. */
function lanterns(k: Build): void {
  const b = k.b;
  // Gion: a lantern at the door of each townhouse, on the lane between the two rows
  for (let z = 21.8; z < 40; z += 3.4) {
    lantern(k, -50.6, 2.5, z, 0.62);
    lantern(k, -49.4, 2.5, z + 1.7, 0.62);
  }
  for (const z of [24, 30.8, 37]) k.person(-50, z);
  k.lights.push({ x: -50, z: 26, r: 9, color: '#ffb48a', k: 0.5 }, { x: -50, z: 36, r: 9, color: '#ffb48a', k: 0.5 });
  // the yokocho: a string of them over the lane between its two rows of bars
  b.beam([-19, 4.4, -14.25], [3, 4.4, -14.25], 0.04, 0.04, 0x2a2c31);
  for (const x of [-19, 3]) b.box(x - 0.09, 0, -14.34, x + 0.09, 4.5, -14.16, 0x3a2a24);
  for (let x = -18; x <= 2.3; x += 1.75) lantern(k, x, 3.85, -14.25, 0.55, Math.round(x) % 2 ? 0xd8432b : 0xf2e6c8);
  for (const [x, z] of [[-16.2, -14.6], [-12, -13.9], [-9.5, -14.7], [-5.4, -14], [-1.6, -14.5], [1.2, -13.8]]) k.person(x, z);
  k.lights.push({ x: -13, z: -14.25, r: 9, color: '#ffb48a', k: 0.55 }, { x: -3, z: -14.25, r: 9, color: '#ffb48a', k: 0.55 });
  // under the arches: lanterns along the front of the bar
  for (let x = -6.4; x <= 0.7; x += 1.7) lantern(k, x, 3.2, -25.4, 0.6);
  for (const x of [-5.2, -2.9, -0.4]) k.person(x, -24.6);
  k.lights.push({ x: -3, z: -23.5, r: 9, color: '#ffb48a', k: 0.55 });
  // the red bridge, from Gion over the river to Tokyo's bank
  archBridge(k, SHORE.river.west - 1.6, SHORE.river.east + 1.6, 30, 1.7, 1.5);
  k.lights.push({ x: (SHORE.river.west + SHORE.river.east) / 2, z: 30, r: 9, color: '#ffd9a0', k: 0.45 });
}

// ---------------------------------------------------------------------------
// Cherry trees
// ---------------------------------------------------------------------------

/** A pile of rounded lumps as one shape: each is [x, y, z, radius, how far it is squashed]. */
function lumps(parts: [number, number, number, number, number][]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  for (const [x, y, z, r, squash] of parts) {
    const g = new THREE.IcosahedronGeometry(r, 0).scale(1, squash, 1).translate(x, y, z);
    pos.push(...g.getAttribute('position').array);
    nor.push(...g.getAttribute('normal').array);
    uv.push(...g.getAttribute('uv').array);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

/** A number between 0 and 1 that is always the same for the same number given: for scattering things without the tile's own dice. */
const scatter = (n: number): number => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Cherry trees in blossom: a dark trunk under a low, wide cloud of pink. The
 * engine's own trees come out green nine times in ten, so these are the
 * tile's. Each spot is [x, z, size].
 */
function cherryTrees(k: Build, spots: [number, number, number][]): void {
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.46, 2.7, 6).translate(0, 1.35, 0);
  const crownGeo = lumps([[0, 4.2, 0, 2.6, 0.72], [1.5, 4.9, 0.5, 1.6, 0.8], [-1.3, 4.7, -0.9, 1.5, 0.8], [0.2, 4.6, 1.5, 1.3, 0.8]]);
  const trunks = new THREE.InstancedMesh(trunkGeo, k.mat.prop({ vertexColors: false, color: 0x5a4034 }), spots.length);
  const crowns = new THREE.InstancedMesh(crownGeo, k.mat.prop({ vertexColors: false, color: 0xffffff }), spots.length);
  const PINKS = [0xf7b6cd, 0xf2a7c3, 0xf9c6d8, 0xf4b0c8];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  spots.forEach(([x, z, s], i) => {
    q.setFromAxisAngle(up, scatter(i * 3 + 1) * Math.PI * 2);
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.92 + scatter(i * 3 + 2) * 0.2), s));
    trunks.setMatrixAt(i, m4);
    crowns.setMatrixAt(i, m4);
    crowns.setColorAt(i, col.set(PINKS[i % PINKS.length]));
  });
  crowns.castShadow = true;
  crowns.receiveShadow = true;
  trunks.frustumCulled = crowns.frustumCulled = false;
  k.group.add(trunks, crowns);
}

/**
 * The cherry trees: a line along the river, with paper lanterns between them,
 * petals fallen on the sidewalk and adrift on the water, and people on the red
 * bridge to look at it all. And the trees of Ueno Park, which people sit under.
 */
function cherries(k: Build): void {
  const b = k.b, PETALS = [0xf9d3e0, 0xf4bcd0, 0xfbe3ea];
  const west = SHORE.river.west, east = SHORE.river.east;
  // (on Kyoto's bank they are large enough for their crowns to meet; on Tokyo's there is less room)
  const river = RIVER_CHERRIES.map(([x, z], i): [number, number, number] => [x, z, x < west ? 0.8 + scatter(i + 40) * 0.08 : 0.62]);
  // Ueno Park: along its far sides, so that they do not stand between the scramble and the view
  const ueno: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    if (i < 8) ueno.push([UENO_PARK.x1 - 2.5, UENO_PARK.z0 + 2.5 + i * 2.9, 0.66 + scatter(i + 70) * 0.2]);
    if (i > 0) ueno.push([UENO_PARK.x0 + 0.6 + i * 2.6, UENO_PARK.z0 + 2.2, 0.66 + scatter(i + 90) * 0.2]);
  }
  cherryTrees(k, [...river, ...ueno]);

  // petals: a few on the ground under each tree by the river, and many more on the water beside it
  const fleck = (x: number, y: number, z: number, w: number, d: number, n: number): void =>
    b.quad([x - w, y, z - d], [x + w, y, z - d], [x + w, y, z + d], [x - w, y, z + d], [0, 1, 0], PETALS[n % PETALS.length]);
  const water = -0.86;
  RIVER_CHERRIES.forEach(([x, z], i) => {
    const kyoto = x < west;
    for (let n = 0; n < 5; n++) fleck(x - 0.75 + scatter(i * 31 + n) * 1.5, 0.04, z - 2 + scatter(i * 37 + n) * 4, 0.13, 0.09, n + i);
    for (let n = 0; n < 7; n++) {
      const out = 0.25 + scatter(i * 41 + n) ** 2 * 2.6;
      fleck(kyoto ? west + out : east - out, water, z - 2.6 + scatter(i * 43 + n) * 5.2, n % 2 ? 0.2 : 0.11, n % 2 ? 0.11 : 0.2, n + i);
    }
  });
  // and rafts of them, drifting down the middle
  for (let n = 0; n < 9; n++) {
    const z = 2 + n * 6.6 + scatter(n + 5) * 3, x = (west + east) / 2 - 1.2 + scatter(n + 11) * 2.4;
    for (let m = 0; m < 6; m++) fleck(x + (scatter(n * 13 + m) - 0.5) * 1.1, water, z + (scatter(n * 17 + m) - 0.5) * 2.6, 0.12, 0.2, n + m);
  }
  // paper lanterns on posts along Kyoto's bank, between the trees, and a soft pink light under the blossom
  for (const z of [1, 6.5, 12, 23, 34, 45, 50.5, 56]) {
    b.box(west - 0.36, 0, z - 0.06, west - 0.24, 1.75, z + 0.06, 0x3a2a24);
    lantern(k, west - 0.3, 2.1, z, 0.55, 0xf9c9d9);
  }
  for (const z of [3.75, 14.75, 25.75, 36.75, 47.75, 58.75]) k.lights.push({ x: west - 0.6, z, r: 9, color: '#ffc4dd', k: 0.75 });
  for (const z of [10.5, 21.5]) k.lights.push({ x: east + 1, z, r: 8, color: '#ffc4dd', k: 0.6 });
  // people on the red bridge, where the view along the river is best
  for (const [x, y, z] of [[-26.4, 1.64, 29.5], [-25, 1.75, 30.5], [-23.6, 1.64, 29.7]]) k.person(x, z, y);
}

/** People in the castle's and the pavilion's grounds, looking over the water, and a stone lantern or two beside them. */
function gardens(k: Build): void {
  const bank = MOAT.x1 + 0.6;
  // on the bank by the street, by the castle's bridge and across the pond from the pavilion: where the view is
  for (const z of [3.4, 8.6, 10.3, 14.8]) k.person(bank, z);
  for (const z of [36.5, 39.2, 42.4, 55, 58.4, 61]) k.person(POND.x1 + 1.3, z);
  for (const [x, z] of [[-84, 28.4], [-88, 29], [-91.6, 28.3], [-84, 68.2], [-86.6, 68.8], [-90, 68.3], [-93.2, 68.9]]) k.person(x, z);
  stoneLantern(k, POND.x1 + 1.3, 34);
  stoneLantern(k, -80.5, 68.6);
  stoneLantern(k, -95.5, 28.8);
}

/** A festival stall: a counter under a striped awning, with lanterns along its front. It looks south. */
function stall(k: Build, x: number, z: number, color: number): void {
  const b = k.b, w = 1.25, d = 0.8, RED = 0xd8432b, WHITE = 0xf2f0ea;
  b.box(x - w, 0, z - d, x + w, 1.1, z + d, color, { win: interior(0.5) });
  b.box(x - w - 0.08, 1.1, z - d - 0.08, x + w + 0.08, 1.2, z + d + 0.08, 0xf2e6c8, { faces: 'NESWTB' });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(x + sx * w - 0.06, 1.2, z + sz * d - 0.06, x + sx * w + 0.06, 2.3, z + sz * d + 0.06, 0x3a2a24);
  // the awning, in stripes
  const slat = (2 * w + 0.5) / 6;
  for (let i = 0; i < 6; i++) b.box(x - w - 0.25 + i * slat, 2.3, z - d - 0.3, x - w - 0.25 + (i + 1) * slat, 2.42, z + d + 0.5, i % 2 ? WHITE : RED, { faces: 'NESWTB' });
  for (const dx of [-0.8, 0, 0.8]) lantern(k, x + dx, 1.92, z + d + 0.42, 0.42);
  k.lights.push({ x, z: z + 1.6, r: 6, color: '#ffd9a0', k: 0.5 });
}

/** Stalls along the waterfront, to either side of the Ferris wheel, and the people who have stopped at them. */
function stalls(k: Build): void {
  const z = TOKYO.south + 9.3, HUES = [0x3f6fb5, 0xf2c14e, 0x4fa36b, 0xff8ac8, 0xe8662f];
  [21.5, 25, 51.5, 55, 58.5].forEach((x, i) => {
    stall(k, x, z, HUES[i]);
    for (let n = 0; n < 3; n++) k.person(x - 0.9 + n * 0.9 + (i % 2) * 0.2, z + 1.9 + ((n + i) % 2) * 0.7);
  });
}

// ---------------------------------------------------------------------------
// On the waterfront and the water
// ---------------------------------------------------------------------------

/** Ueno Park: a pond with a small red hall on an island, a path, and people sitting on blue sheets under the cherry trees. */
function uenoPark(k: Build): void {
  const b = k.b, p = UENO_PARK, mx = (p.x0 + p.x1) / 2, mz = (p.z0 + p.z1) / 2;
  area(k, rect(p.x0, mz - 1.2, p.x1, mz + 1.2), PLAZA, 0.04);
  // the pond, and the island in it, with a bridge of planks out to it
  const px = mx + 3, pz = mz + 6.6;
  b.cyl(px, pz, 0, 0.1, 5.2, 5.2, 14, 0xcfc8b8);
  b.cyl(px, pz, 0.1, 0.16, 4.7, 4.7, 14, 0x6fb7d9);
  b.cyl(px, pz, 0.16, 0.5, 2.0, 2.0, 8, 0xb9b2a2);
  b.cyl(px, pz, 0.5, 2.6, 1.3, 1.3, 6, PLASTER, { win: interior(0.6), cap: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    b.box(px + Math.cos(a) * 1.3 - 0.12, 0.5, pz + Math.sin(a) * 1.3 - 0.12, px + Math.cos(a) * 1.3 + 0.12, 2.6, pz + Math.sin(a) * 1.3 + 0.12, VERMILION);
  }
  b.cyl(px, pz, 2.6, 3.9, 2.3, 0.15, 6, 0x4f8f7a, { cap: false });
  b.box(px - 0.5, 0.18, mz + 1.3, px + 0.5, 0.42, pz - 1.8, 0xb5463a, { faces: 'NESWT' });
  // blue sheets under the trees, and people on them
  for (const [x, z] of [[p.x0 + 6.5, p.z0 + 6], [p.x0 + 13.5, p.z0 + 6.6], [p.x0 + 19.3, p.z0 + 5.6], [p.x1 - 6, p.z0 + 10.2], [p.x0 + 5, mz + 5.5], [p.x0 + 4.2, mz + 9.6]]) {
    area(k, rect(x - 1.5, z - 1.1, x + 1.5, z + 1.1), 0x3f7fd8, 0.05);
    for (let i = 0; i < 4; i++) k.person(x - 0.9 + (i % 2) * 1.8, z - 0.55 + Math.floor(i / 2) * 1.1);
  }
  // paper lanterns on posts along the path
  for (let x = p.x0 + 2.5; x < p.x1 - 1; x += 4.4) {
    b.box(x - 0.07, 0, mz - 1.75, x + 0.07, 2.6, mz - 1.61, 0x3a2a24);
    lantern(k, x, 2.9, mz - 1.68, 0.6, 0xf2c8d4);
  }
  for (let i = 0; i < 7; i++) k.person(p.x0 + 2 + i * 3.3, mz - 0.5 + (i % 3) * 0.5);
  stoneLantern(k, mx - 3.4, mz + 3.2);
  k.lights.push({ x: mx, z: mz, r: 16, color: '#ffd9e6', k: 0.5 });
}

/**
 * The Ferris wheel: a rim and spokes that turn slowly, cars that hang level
 * from it in five colours, and a clock face that glows at its hub.
 */
function ferrisWheel(k: Build): void {
  const f = FERRIS, cars = 20, STEEL = 0xf2f0ea, b = k.b;
  // what stands still: two pairs of legs and the axle
  for (const s of [-1, 1]) for (const dz of [-1.7, 1.7]) b.beam([f.x + s * 7.2, 0, f.z + dz], [f.x, f.y, f.z + dz * 0.75], 0.5, 0.36, STEEL);
  b.box(f.x - 0.4, f.y - 0.4, f.z - 1.4, f.x + 0.4, f.y + 0.4, f.z + 1.4, 0xd9dde4, { faces: 'NESWTB' });
  // what turns: the rim and the spokes, built round the wheel's own middle
  const w = new GeoBuilder(), lit = interior(0.7);
  const on = (i: number, r: number, z: number): V3 => [Math.cos((i / cars) * Math.PI * 2) * r, Math.sin((i / cars) * Math.PI * 2) * r, z];
  for (let i = 0; i < cars; i++) {
    for (const z of [-0.55, 0.55]) {
      w.beam(on(i, f.r, z), on(i + 1, f.r, z), 0.2, 0.2, STEEL, { win: lit });
      if (i % 2 === 0) w.beam([0, 0, z], on(i, f.r, z), 0.1, 0.1, STEEL, { win: lit });
    }
    w.beam(on(i, f.r, -0.55), on(i, f.r, 0.55), 0.12, 0.12, STEEL, { win: lit });
  }
  for (let i = 0; i < 10; i++) w.beam(on(i * 2, f.r * 0.56, 0), on(i * 2 + 2, f.r * 0.56, 0), 0.1, 0.1, STEEL, { win: lit });
  const wheel = new THREE.Mesh(w.build(), k.mat.city());
  wheel.position.set(f.x, f.y, f.z);
  // the cars: one shape, drawn once for each, kept level as the wheel turns
  const c = new GeoBuilder();
  c.box(-0.8, -1.75, -0.7, 0.8, -0.55, 0.7, 0xffffff, { faces: 'NESWTB' });
  c.box(-0.82, -1.25, -0.72, 0.82, -0.85, 0.72, 0xcfe0ea, { win: interior(1.6), faces: 'NESW' });
  c.box(-0.05, -0.55, -0.05, 0.05, 0, 0.05, 0x6b7076, { faces: 'NESW' });
  const hung = new THREE.InstancedMesh(c.build(), k.mat.city(), cars);
  hung.frustumCulled = false;
  const HUES = [0xe8523f, 0xf2c14e, 0x4fa3d8, 0x6fbf73, 0xff8ac8];
  const col = new THREE.Color();
  for (let i = 0; i < cars; i++) hung.setColorAt(i, col.set(HUES[i % HUES.length]));
  // the clock at the hub: a face that glows
  const face = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.5, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff1c9, toneMapped: false }));
  face.position.set(f.x, f.y, f.z + 1.2);
  k.group.add(wheel, hung, face);
  const m4 = new THREE.Matrix4();
  let turn = 0;
  const place = (): void => {
    wheel.rotation.z = turn;
    for (let i = 0; i < cars; i++) {
      const a = turn + (i / cars) * Math.PI * 2;
      hung.setMatrixAt(i, m4.makeTranslation(f.x + Math.cos(a) * f.r, f.y + Math.sin(a) * f.r, f.z));
    }
    hung.instanceMatrix.needsUpdate = true;
  };
  place();
  k.each((dt, _time, night) => {
    turn += dt * 0.11;
    place();
    (face.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.93, 0.76).multiplyScalar(0.78 + 0.5 * night);
  });
  k.lights.push({ x: f.x, z: f.z + 4, r: 20, color: '#ffd9f0', k: 0.55 });
  // a ticket hut and a queue
  b.box(f.x + 9.5, 0, f.z - 1.4, f.x + 13, 2.8, f.z + 1.4, 0xff8ac8, { win: { cell: 1.7, storey: 2.8, lit: 1, kind: 2 }, seed: 0.1, top: 0xf2f0ea });
  for (let i = 0; i < 7; i++) k.person(f.x + 3.4 + i * 0.85, f.z + 1.9 + (i % 2) * 0.5);
}

/** The car carrier at Tatsumi's pier: a ship that is all sides, with a ramp down to the quay and cars waiting to go aboard. */
function carCarrier(k: Build): void {
  const b = k.b, c = CARRIER, HULL = 0x2f5fa8, WHITE = 0xf2f0ea;
  const bow = c.x1 + 5.5, mz = (c.z0 + c.z1) / 2, quay = SHORE.pier.z1, [rx0, rx1] = c.ramp;
  // the hull: a box, with a bow that comes to a point, red below the water line
  b.box(c.x0, -1.2, c.z0, c.x1, 4.6, c.z1, HULL, { faces: 'NSWT' });
  b.quad([c.x1, -1.2, c.z0], [bow, -1.2, mz], [bow, 4.6, mz], [c.x1, 4.6, c.z0], [0.6, 0, -1], HULL);
  b.quad([bow, -1.2, mz], [c.x1, -1.2, c.z1], [c.x1, 4.6, c.z1], [bow, 4.6, mz], [0.6, 0, 1], HULL);
  b.up([c.x1, 4.6, c.z0], [bow, 4.6, mz], [c.x1, 4.6, c.z1], 0x4a4f55);
  b.box(c.x0 - 0.04, -1.2, c.z0 - 0.04, c.x1 + 0.04, -0.3, c.z1 + 0.04, 0xa53a30, { faces: 'NSW' });
  // the high sides that the cars are stowed behind, with a stripe and a row of small lit ports
  b.box(c.x0 + 0.4, 4.6, c.z0 + 0.3, c.x1 - 1.5, 10.4, c.z1 - 0.3, WHITE, { win: { cell: 2.2, storey: 2.9, lit: 0.3, kind: 4 }, seed: 0.4, top: 0xd9dde4 });
  b.box(c.x0 + 0.36, 8.9, c.z0 + 0.26, c.x1 - 1.46, 9.5, c.z1 - 0.26, HULL, { faces: 'NESW' });
  // the bridge, forward, and the funnel, aft
  b.box(c.x1 - 6.5, 10.4, c.z0 - 0.3, c.x1 - 2.5, 12.6, c.z1 + 0.3, WHITE, { win: { cell: 1.3, storey: 2.2, lit: 1, kind: 1 }, seed: 0.2, top: 0xd9dde4 });
  b.cyl(c.x0 + 4, mz, 10.4, 13.2, 1.3, 1.1, 8, 0xe8662f, { cap: 0x2a2c31 });
  k.glows.push({ x: c.x1 - 4.5, y: 13.4, z: mz, sx: 0.4, sy: 0.4, sz: 0.4, color: '#7dff9b' }, { x: c.x0 + 4, y: 13.6, z: mz, sx: 0.4, sy: 0.4, sz: 0.4, color: '#ff3b3b' });
  // the ramp: a door in her side, let down onto the quay, with a car on its way up
  b.quad([rx0, 0.04, quay - 2.4], [rx1, 0.04, quay - 2.4], [rx1, 1.6, c.z0], [rx0, 1.6, c.z0], [0, 1, -0.3], 0x8f8c86);
  b.quad([rx0, -0.26, quay - 2.4], [rx1, -0.26, quay - 2.4], [rx1, 1.3, c.z0], [rx0, 1.3, c.z0], [0, -1, 0.3], 0x77736b);
  for (const x of [rx0, rx1]) b.beam([x, 0.5, quay - 2.4], [x, 2.1, c.z0], 0.1, 0.1, 0xe8a23d);
  b.box(rx0, 1.6, c.z0 - 0.04, rx1, 4.4, c.z0 + 0.02, 0x1c1d22, { faces: 'N' });
  standingCar(k, (rx0 + rx1) / 2, quay - 0.4, Math.PI / 2, { body: 0xd9d4cc, y: 0.72 });
  // lamps on masts over the cars that wait on the quay
  mast(k, SHORE.pier.x0 + 0.5, quay - 0.6, 9, '#fff0d6', 16);
  mast(k, SHORE.pier.x1 - 1.4, quay - 1.4, 9, '#fff0d6', 14);
  for (const [x, z] of [[rx1 + 1.2, quay - 1.6], [rx0 - 1.3, quay - 3.4]]) k.person(x, z);
  k.lights.push({ x: (c.x0 + c.x1) / 2, z: c.z0 - 2, r: 16, color: '#dfeaff', k: 0.5 });
}

/** A pleasure boat with a roof and lanterns along its eaves. It floats on y = 0, along x. */
function boatGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const HULL = 0x5a4636, ROOF = 0x3d4a4f, PAPER = 0xfff1c9;
  b.box(-3.6, 0, -1.25, 3.2, 0.95, 1.25, HULL, { faces: 'NSWT' });
  // the bow comes to a point and lifts
  b.quad([3.2, 0, -1.25], [4.7, 0.5, 0], [4.7, 1.2, 0], [3.2, 0.95, -1.25], [0.6, 0, -1], HULL);
  b.quad([4.7, 0.5, 0], [3.2, 0, 1.25], [3.2, 0.95, 1.25], [4.7, 1.2, 0], [0.6, 0, 1], HULL);
  b.up([3.2, 0.95, -1.25], [4.7, 1.2, 0], [3.2, 0.95, 1.25], 0x7a5a48);
  // the cabin: paper screens, lit from inside, under a low roof that reaches out past them
  b.box(-2.7, 0.95, -1.05, 2.1, 2.2, 1.05, PAPER, { win: interior(1.5), faces: 'NESW' });
  for (let x = -2.7; x <= 2.11; x += 1.2) b.box(x - 0.07, 0.95, -1.08, x + 0.07, 2.2, 1.08, HULL, { faces: 'NS' });
  b.box(-3.2, 2.2, -1.45, 2.6, 2.45, 1.45, ROOF, { faces: 'NESWTB' });
  b.box(-2.6, 2.45, -0.8, 2.0, 2.65, 0.8, ROOF);
  // red lanterns along both eaves
  for (let x = -2.8; x <= 2.3; x += 1.02) {
    for (const z of [-1.5, 1.5]) b.box(x - 0.17, 1.75, z - 0.17, x + 0.17, 2.18, z + 0.17, 0xe8523f, { win: interior(2.2), faces: 'NESWTB' });
  }
  return b.build();
}

/**
 * Lantern boats: two that go round the cove, between the shrine's stage and
 * the great torii and then out through it, and two that go round the bay.
 */
function boats(k: Build): void {
  const car = { geometry: boatGeometry(), length: 8.6 };
  for (const round of [BOATS.cove, BOATS.bay]) {
    // the water is 0.9 below the ground, and a boat sits a little way down in it
    const way = buildPath([{ t: 'ring', pts: round.pts, y: -1.32, r: round.r }], true);
    for (let i = 0; i < 2; i++) train(k, way, { cars: 1, car, speed: 3.8, from: (way.length * i) / 2 + 9 });
  }
}

// ---------------------------------------------------------------------------
// Everything, in turn
// ---------------------------------------------------------------------------

export function buildScenes(k: Build): void {
  shibuya(k);
  garage(k);
  carLots(k);
  konbini(k);
  petrol(k);
  tofuShop(k);
  shelf(k);
  passDetails(k);
  rockGarden(k);
  gardens(k);
  cherries(k);
  lanterns(k);
  stalls(k);
  uenoPark(k);
  ferrisWheel(k);
  carCarrier(k);
  boats(k);
}
