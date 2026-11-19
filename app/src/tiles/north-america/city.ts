// Builds everything that stands still on North America: the buildings, Halo
// Tower, the two cutaways, the expressway, the ground, and the small things on
// the street. The shapes come from plan.ts; this file turns them into meshes
// with what the engine provides.

import * as THREE from 'three';
import { helicopter } from '../../engine/air';
import { ordinaryBuildings, type BuildingRules } from '../../engine/buildings';
import { interior, type V3, type WinSpec } from '../../engine/geo';
import { buildPath, type Path } from '../../engine/paths';
import { ASPHALT, CONCRETE, roadDeck, type DeckOpts } from '../../engine/roads';
import type { Build, TileParts } from '../../engine/tile';
import { makeGroundMaterial } from './ground';
import { buildL } from './l';
import { buildLandmarkLot, buildMonuments } from './landmarks';
import {
  ARCH, BLOCK_QUARTER, BOARD, BUILDINGS, CARPARK, CARPARK_ROADS, CUTS, EXPRESS_HALF, EXPRESS_RING, EXPRESS_Y, FLYOVER, FOUNTAIN, GOLDEN_GATE,
  H_STREETS, HERO_SPOTS, L_LINE, LANDMARK, LOOPS, MEDIAN_X, NEON, PARK, PARKED, POND, SHOWROOM, SIGN_POOLS, STOREY, STREET_CARR, TURNTABLE_RATE, UNDER_L, V_STREETS,
  blockRect, humpHeight, onCut,
  type Building, type Quarter, type Seg, type Style,
} from './plan';

const ROOFS = [0x8d8a83, 0x7b7a7e, 0x9d988f, 0x6f7378];

const PALETTE: Record<Style, number[]> = {
  glass: [0x8fb4cf, 0x7aa3c2, 0x9cc3d3, 0x6f95b5, 0xa9c9dc],
  office: [0xe9dcc3, 0xf0cfa8, 0xdfe6d4, 0xf2e3b3, 0xe6c7b8, 0xcfe0e8],
  resi: [0xc98f6b, 0xb9785a, 0xd9a583, 0xa86b52, 0xd6b08c, 0xbf8a7a],
  shop: [0xe8dcc6, 0xe6c9a4, 0xd8e0d6, 0xf0e2c0, 0xdcc8c0, 0xc9d7e0, 0xe9b9a0],
  neon: [0x3d3856, 0x2f3b55, 0x4a3b58, 0x38324e],
  concrete: [0xa9a8a2, 0x9aa0a6, 0xb5b0a6],
  stucco: [0xf0e3c4, 0xe9cfa6, 0xe6d3c8, 0xd9dcc8, 0xf2d9a8, 0xd8c4b0],
};

/** What pitched roofs are covered with: clay tile on the coast, shingle elsewhere. */
const HIP_ROOFS: Record<Quarter, number[]> = {
  coast: [0xb5654a, 0xa85a44, 0xc0704f],
  loop: [0x6b6f76, 0x5f6b7a],
  roadside: [0x7a5a4a, 0x6b6f76],
  downtown: [0x6b6f76],
};

const WIN: Record<Style, WinSpec> = {
  glass: { cell: 2.4, storey: STOREY, lit: 0.44, kind: 1 },
  office: { cell: 2.8, storey: STOREY, lit: 0.36, kind: 0 },
  resi: { cell: 3.2, storey: STOREY, lit: 0.3, kind: 0 },
  shop: { cell: 4.6, storey: STOREY, lit: 0.4, kind: 2 },
  neon: { cell: 4.6, storey: STOREY, lit: 0.22, kind: 3 },
  concrete: { cell: 3.4, storey: STOREY, lit: 0.16, kind: 4 },
  // narrow bays: an arcade of small shopfronts below, tall windows above
  stucco: { cell: 2.8, storey: STOREY, lit: 0.34, kind: 2 },
};

function edgeFaces(b: Building): string {
  const r = blockRect(b.block);
  let f = '';
  if (b.z - r.z0 < 1.6) f += 'N';
  if (r.z1 - (b.z + b.d) < 1.6) f += 'S';
  if (b.x - r.x0 < 1.6) f += 'W';
  if (r.x1 - (b.x + b.w) < 1.6) f += 'E';
  return f;
}

export function buildCity(k: Build): TileParts {
  const group = k.group, cityB = k.b, glows = k.glows, lights = k.lights, signs = k.signs, rand = k.rand;
  const ribbon = (path: Path, hw: number, o: DeckOpts): void => roadDeck(k, path, hw, o);

  function pierBlocked(x: number, z: number): boolean {
    // the Golden Gate's span hangs from its cables
    if (Math.abs(x - GOLDEN_GATE.x) < 8 && z > GOLDEN_GATE.z0 - 1 && z < GOLDEN_GATE.z1 + 1) return true;
    // the L's branches pass under the deck where they leave the loop
    if (Math.abs(x - 32) < 3.2 && (Math.abs(z - L_LINE.north) < 4.6 || Math.abs(z - L_LINE.south) < 3)) return true;
    for (const h of H_STREETS) {
      const d = Math.abs(z - h.z);
      if (d < h.carr + 0.8 && !(h.median > 0 && d < h.median - 0.9 && Math.abs(x) < MEDIAN_X)) return true;
    }
    for (const v of V_STREETS) {
      const d = Math.abs(x - v.x);
      if (d < v.carr + 0.8 && d > 0.7) return true;
    }
    // on a street that cuts through a block, only the line between its two lanes is free
    for (const c of CUTS) {
      const d = Math.abs(z - c.z);
      if (x > c.x0 - 1 && x < c.x1 + 1 && d < STREET_CARR + 0.8 && d > 0.7) return true;
    }
    // anything built below the deck is in the way, the gate tower's tunnel included
    for (const b of BUILDINGS) {
      if (b.y0 < 10 && x > b.x - 1 && x < b.x + b.w + 1 && z > b.z - 1 && z < b.z + b.d + 1) return true;
    }
    return false;
  }

  /** Whether a place on the sidewalk is in one of the car park's driveways. */
  const inDriveway = (x: number, z: number): boolean => z > 91 && z < 101 && (Math.abs(x - CARPARK.driveOut) < 3.6 || Math.abs(x - CARPARK.driveIn) < 3.6);

  /** Whether the L's track or one of its platforms is right overhead. */
  const underL = (x: number, z: number): boolean => UNDER_L.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);

  // -------------------------------------------------------------------------
  // Buildings
  // -------------------------------------------------------------------------

  // every lot says which of its faces carry signs: the ones on the edge of its block, unless the plan says otherwise
  type Sited = Building & { signs: string };
  const rules: BuildingRules<Sited> = {
    styles: Object.fromEntries((Object.keys(PALETTE) as Style[]).map((s) => [s, { palette: PALETTE[s], win: WIN[s], shops: s === 'shop' || s === 'stucco', neon: s === 'neon' }])),
    roofs: ROOFS,
    // the block's quarter decides what covers a pitched roof and what the signs say
    hip: (b) => ({ colors: HIP_ROOFS[BLOCK_QUARTER[b.block]] }),
    pool: (b) => SIGN_POOLS[BLOCK_QUARTER[b.block]],
    neon: NEON,
  };
  // a lot that holds something famous is built by its own model; the rest are ordinary
  ordinaryBuildings(k, BUILDINGS.map((b): Sited => ({ ...b, signs: b.signs ?? edgeFaces(b) })), rules, (b) => {
    if (!b.landmark) return false;
    buildLandmarkLot(b, k);
    return true;
  });

  // The big screen on the gate tower, facing the boulevard, and its twin on the far side.
  {
    const t = BUILDINGS.find((b) => b.name === 'gate-upper')!;
    const cx = t.x + t.w / 2;
    signs.add('screen', cx, 53, t.z + t.d + 0.15, 'S', 13.5);
    signs.add('screen', cx, 53, t.z - 0.15, 'N', 13.5);
    lights.push({ x: cx, z: t.z + t.d + 10, r: 22, color: '#ff3d9a', k: 0.35 });
  }

  // The street through the gate tower's base: a tunnel with lit walls.
  {
    const t = BUILDINGS.find((b) => b.name === 'gate-lintel')!;
    const x0 = t.x, x1 = t.x + t.w, z0 = t.z, z1 = t.z + t.d, h = t.y0;
    cityB.box(x0, 0, z0, x1, h, z0 + 0.1, 0xd9d5cb, { faces: 'S', win: interior(0.55) });
    cityB.box(x0, 0, z1 - 0.1, x1, h, z1, 0xd9d5cb, { faces: 'N', win: interior(0.55) });
    // a dark band over each mouth, so the opening reads from a distance
    cityB.box(x1, h - 0.9, z0 - 0.4, x1 + 0.16, h + 0.5, z1 + 0.4, 0x3d4650, { faces: 'ENSTB' });
    cityB.box(x0 - 0.16, h - 0.9, z0 - 0.4, x0, h + 0.5, z1 + 0.4, 0x3d4650, { faces: 'WNSTB' });
    const zc = (z0 + z1) / 2;
    for (const x of [x0 + 4, (x0 + x1) / 2, x1 - 4]) lights.push({ x, z: zc, r: 11, color: '#ffe2ae', k: 0.6 });
    for (const x of [x0 - 0.3, x1 + 0.3]) {
      glows.push({ x, y: h - 0.2, z: zc, sx: 0.3, sy: 0.3, sz: z1 - z0 - 1.5, color: '#ffe2ae' });
    }
  }

  // -------------------------------------------------------------------------
  // The landmark in the park
  // -------------------------------------------------------------------------

  const haloMat = new THREE.MeshBasicMaterial({ color: 0xff3d9a, toneMapped: false });
  {
    const m = LANDMARK;
    cityB.cyl(m.x, m.z, 0, 0.12, 13.4, 13.4, 28, 0xd8d2c4);
    cityB.cyl(m.x, m.z, 0.12, m.podiumH, m.podiumR, m.podiumR, 8, 0xe4ded0, { win: { cell: 4.3, storey: 4.6, lit: 0.9, kind: 2 }, seed: 0.42, cap: 0x9d988f });
    cityB.cyl(m.x, m.z, m.podiumH, m.shaftTop, m.shaftR0, m.shaftR1, 8, 0x9cc3d3, { win: { cell: 2.0, storey: STOREY, lit: 0.6, kind: 1 }, seed: 0.77, cap: false });
    cityB.cyl(m.x, m.z, m.shaftTop - 5, m.shaftTop, m.shaftR1 + 0.2, m.podR, 12, 0xd9d4ca, { cap: false });
    cityB.cyl(m.x, m.z, m.shaftTop, m.podTop, m.podR, m.podR, 12, 0xa9c9dc, { win: { cell: 1.7, storey: 5.5, lit: 1, kind: 1 }, seed: 0.13, cap: 0x8d8a83 });
    cityB.cyl(m.x, m.z, m.podTop, m.podTop + 3, m.podR - 2, 2.2, 12, 0x8d8a83, { cap: false });
    cityB.cyl(m.x, m.z, m.podTop + 3, m.spireTop, 0.9, 0.15, 6, 0x9aa0a8, { cap: false });
    glows.push({ x: m.x, y: m.spireTop + 0.4, z: m.z, sx: 0.9, sy: 0.9, sz: 0.9, color: '#ff3b3b' });

    const halo = new THREE.Mesh(new THREE.TorusGeometry(m.haloR, 0.85, 6, 44), haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(m.x, m.haloY, m.z);
    group.add(halo);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const r = (m.haloR + 5.2) / 2;
      cityB.obox(m.x + Math.cos(a) * r, m.haloY, m.z + Math.sin(a) * r, (m.haloR - 5.2) / 2, 0.22, 0.22, a, 0x9aa0a8, { faces: 'B' });
    }
    lights.push({ x: m.x, z: m.z, r: 26, color: '#c77dff', k: 0.5 });

    // paths across the park and a pond with a rowing boat on it
    cityB.box(m.x - 1.6, 0, PARK.z0 + 0.5, m.x + 1.6, 0.08, PARK.z1 - 0.5, 0xd8d2c4, { faces: 'T' });
    cityB.box(PARK.x0 + 0.5, 0, m.z - 1.6, PARK.x1 - 0.5, 0.08, m.z + 1.6, 0xd8d2c4, { faces: 'T' });
    cityB.cyl(POND.x, POND.z, 0, 0.1, POND.r + 0.6, POND.r + 0.6, 20, 0xcfc8b8);
    cityB.cyl(POND.x, POND.z, 0.1, 0.16, POND.r, POND.r, 20, 0x6fb7d9);
    cityB.obox(POND.x + 1.6, 0.36, POND.z - 1.1, 1.3, 0.2, 0.55, 0.6, 0xc8523f, { top: 0xe9dcc3 });
  }

  // The square in block B3, with its fountain.
  {
    const f = FOUNTAIN;
    cityB.cyl(f.x, f.z, 0, 0.09, f.r + 3.4, f.r + 3.4, 22, 0xd8d2c4);
    cityB.cyl(f.x, f.z, 0.09, 0.7, f.r, f.r, 14, 0xcfc8b8);
    cityB.cyl(f.x, f.z, 0.7, 0.75, f.r - 0.45, f.r - 0.45, 14, 0x6fb7d9);
    cityB.cyl(f.x, f.z, 0.75, 2.1, 0.55, 0.35, 8, 0xcfc8b8);
    cityB.cyl(f.x, f.z, 2.1, 2.3, 1.3, 1.3, 10, 0xcfc8b8);
    cityB.cyl(f.x, f.z, 2.3, 2.36, 1.0, 1.0, 10, 0x8fd3e8, { win: interior(0.8) });
    lights.push({ x: f.x, z: f.z, r: 12, color: '#cfe8ff', k: 0.5 });
  }

  // Toy versions of famous monuments: the two arches, the bridge and the ballpark.
  buildMonuments(k);

  // -------------------------------------------------------------------------
  // The showroom: a cutaway that opens onto the boulevard
  // -------------------------------------------------------------------------

  const turntable = new THREE.Group();
  {
    const s = SHOWROOM;
    const wall = 0xe9e3d6, inner = 0xf5f1e8;
    cityB.box(s.x0, 0, s.z0, s.x1, 0.06, s.z1, 0xe9e6df, { faces: 'T', win: interior(0.9) });
    // (the walls have no tops of their own: the roof lies on them, and two tops at one height flicker)
    cityB.box(s.x0, 0, s.z0, s.x1, s.h, s.z0 + 0.6, wall, { faces: 'NEW' });
    cityB.box(s.x0 + 0.6, 0.06, s.z0 + 0.5, s.x1 - 0.6, s.h - 0.7, s.z0 + 0.6, inner, { faces: 'S', win: interior(0.75) });
    cityB.box(s.x0, 0, s.z0 + 0.6, s.x0 + 0.6, s.h, s.z1, wall, { faces: 'WS' });
    cityB.box(s.x0 + 0.5, 0.06, s.z0 + 0.6, s.x0 + 0.6, s.h - 0.7, s.z1, inner, { faces: 'E', win: interior(0.75) });
    cityB.box(s.x1 - 0.6, 0, s.z0 + 0.6, s.x1, s.h, s.z1, wall, { faces: 'ES' });
    cityB.box(s.x1 - 0.6, 0.06, s.z0 + 0.6, s.x1 - 0.5, s.h - 0.7, s.z1, inner, { faces: 'W', win: interior(0.75) });
    cityB.box(s.x0 - 0.4, s.h - 0.7, s.z0 - 0.2, s.x1 + 0.4, s.h, s.z1 + 0.9, 0xd9d4ca, { top: 0x8d8a83 });
    cityB.box(s.x0 + 0.6, s.h - 0.75, s.z0 + 0.6, s.x1 - 0.6, s.h - 0.7, s.z1, 0xffffff, { faces: 'B', win: interior(0.95) });
    for (const fx of [0.2, 0.5, 0.8]) {
      for (const fz of [0.3, 0.72]) {
        glows.push({ x: s.x0 + (s.x1 - s.x0) * fx, y: s.h - 0.85, z: s.z0 + (s.z1 - s.z0) * fz, sx: 1.6, sy: 0.14, sz: 0.5, color: '#fff3dc' });
      }
    }
    signs.add('showroom', (s.x0 + s.x1) / 2, s.h + 1.7, s.z1 + 0.95, 'S', 3.0);
    signs.add('showroom', (s.x0 + s.x1) / 2, s.h + 1.7, s.z1 + 0.75, 'N', 3.0);
    lights.push({ x: (s.x0 + s.x1) / 2, z: s.z1 + 5, r: 20, color: '#fff0d6', k: 0.75 });
    lights.push({ x: s.turntable.x, z: s.turntable.z, r: 13, color: '#fff0d6', k: 0.6 });

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(s.turntable.r, s.turntable.r, 0.4, 28),
      k.mat.prop({ vertexColors: false, color: 0xcfcbc2 }),
    );
    disc.position.y = 0.2;
    disc.receiveShadow = true;
    turntable.add(disc);
    for (let i = 0; i < 8; i++) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.3), k.mat.prop({ vertexColors: false, color: 0x2f2f38 }));
      const a = (i / 8) * Math.PI * 2;
      mark.position.set(Math.cos(a) * (s.turntable.r - 0.7), 0.42, Math.sin(a) * (s.turntable.r - 0.7));
      mark.rotation.y = -a;
      turntable.add(mark);
    }
    turntable.position.set(s.turntable.x, 0.05, s.turntable.z);
    group.add(turntable);
  }

  // -------------------------------------------------------------------------
  // The car park: open floors, a roof deck and two spiral ramps
  // -------------------------------------------------------------------------

  {
    const c = CARPARK;
    const slab = 0xc4c0b6, wall = 0xb3aea3;
    cityB.box(c.x0, 0, c.z0, c.x1, 0.05, c.z1, slab, { faces: 'T', win: interior(0.5) });
    // The floors and the roof stop inside the walls, and a hair short of the open
    // side. If their edges reached the outside they would lie in the same plane as
    // the walls' faces and the columns' fronts, and the two would flicker through
    // each other: at night, when the floors glow, that showed as ragged bright bands.
    const fx0 = c.x0 + 0.6, fx1 = c.x1 - 0.6, fz0 = c.z0 + 0.6, fz1 = c.z1 - 0.04;
    for (let f = 1; f < c.floors; f++) {
      cityB.box(fx0, f * STOREY - 0.5, fz0, fx1, f * STOREY, fz1, slab, { faces: 'STB', win: interior(0.5) });
    }
    cityB.box(fx0, c.roofY - 0.7, fz0, fx1, c.roofY, fz1, slab, { faces: 'ST', top: ASPHALT });
    cityB.box(c.x0 + 0.6, c.roofY - 0.75, c.z0 + 0.6, c.x1 - 0.6, c.roofY - 0.7, c.z1, 0xffffff, { faces: 'B', win: interior(0.6) });
    // the back and side walls: plain outside, lit inside
    cityB.box(c.x0, 0, c.z0, c.x1, c.roofY + 1, c.z0 + 0.6, wall, { faces: 'NEWT' });
    cityB.box(c.x0 + 0.6, 0, c.z0 + 0.5, c.x1 - 0.6, c.roofY - 0.7, c.z0 + 0.6, 0xd9d5cb, { faces: 'S', win: interior(0.45) });
    cityB.box(c.x0, 0, c.z0 + 0.6, c.x0 + 0.6, c.roofY + 1, c.z1, wall, { faces: 'WST' });
    cityB.box(c.x0 + 0.5, 0, c.z0 + 0.6, c.x0 + 0.6, c.roofY - 0.7, c.z1, 0xd9d5cb, { faces: 'E', win: interior(0.45) });
    // The east wall stops at the roof: that side is open to the apron that joins the
    // roof to the expressway, which is built with the expressway below.
    cityB.box(c.x1 - 0.6, 0, c.z0 + 0.6, c.x1, c.roofY, c.z1, wall, { faces: 'EST' });
    cityB.box(c.x1 - 0.6, 0, c.z0 + 0.6, c.x1 - 0.5, c.roofY - 0.7, c.z1, 0xd9d5cb, { faces: 'W', win: interior(0.45) });
    // columns along the open side, and the low wall around the roof
    for (let k = 1; k < 5; k++) {
      const x = c.x0 + ((c.x1 - c.x0) * k) / 5;
      cityB.box(x - 0.5, 0, c.z1 - 1, x + 0.5, c.roofY - 0.7, c.z1, wall);
    }
    const gaps: [number, number][] = [[c.ox + 14.4, c.ox + 20.6], [c.ox + 27.4, c.ox + 33.6]];
    let sx = c.x0 + 0.6;
    for (const [g0, g1] of [...gaps, [c.x1 - 0.6, c.x1 - 0.6] as [number, number]]) {
      if (g0 > sx) cityB.box(sx, c.roofY, c.z1 - 0.5, g0, c.roofY + 1, c.z1, wall);
      sx = g1;
    }
    for (let f = 0; f < c.floors; f++) {
      glows.push({ x: (c.x0 + c.x1) / 2, y: f * STOREY + 4.25, z: c.z1 - 2.4, sx: c.x1 - c.x0 - 3, sy: 0.14, sz: 0.3, color: '#d8f0ff' });
    }
    lights.push({ x: (c.x0 + c.x1) / 2 - 10, z: c.z1 + 5, r: 20, color: '#cfe8ff', k: 0.55 });
    lights.push({ x: (c.x0 + c.x1) / 2 + 10, z: c.z1 + 5, r: 20, color: '#cfe8ff', k: 0.55 });

    const { up, down, ground } = CARPARK_ROADS;
    for (const h of [up, down]) {
      if (h.t !== 'helix') continue;
      ribbon(buildPath([h], false), 2.6, { thick: 0.6, wall: 0.9, lanes: 1, lift: 0.05, step: 1.5 });
      cityB.cyl(h.cx, h.cz, 0, c.roofY + 1.5, 3.3, 3.3, 10, wall, { cap: 0x8d8a83 });
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const px = h.cx + Math.cos(a) * 9.5, pz = h.cz + Math.sin(a) * 9.5;
        cityB.box(px - 0.3, 0, pz - 0.3, px + 0.3, c.roofY + 0.9, pz + 0.3, wall);
      }
      lights.push({ x: h.cx, z: h.cz, r: 15, color: '#cfe8ff', k: 0.5 });
    }
    // the link between the spirals on the ground, a driveway from each out to the street, and a short bridge from each to the roof
    ribbon(buildPath([ground], false), 2.6, { thick: 0, wall: 0, lanes: 1, lift: 0.04, structure: false });
    for (const x of [c.driveOut, c.driveIn]) {
      const drive: Seg = { t: 'poly', pts: [[x, c.helixA.cz + 9], [x, blockRect('A3').z1 + 3]], y: 0, r: 0 };
      ribbon(buildPath([drive], false), 2.6, { thick: 0, wall: 0, lanes: 1, lift: 0.045, structure: false });
      const seg: Seg = { t: 'poly', pts: [[x, c.helixA.cz], [x, c.z1 - 0.2]], y: c.roofY, r: 0 };
      ribbon(buildPath([seg], false), 2.6, { thick: 0.6, wall: 0.9, lanes: 1 });
    }
    lights.push({ x: c.x1 + 3, z: (c.rowN + c.rowS) / 2, r: 12, color: '#cfe8ff', k: 0.4 });
    signs.add('carpark', (c.x0 + c.x1) / 2, c.roofY + 2.6, c.z0 - 0.12, 'N', 2.6);
    signs.add('carpark', (c.x0 + c.x1) / 2, c.roofY + 2.6, c.z0 + 0.72, 'S', 2.6);
    signs.add('carpark', c.x0 - 0.12, c.roofY - 3, (c.z0 + c.z1) / 2, 'W', 2.4, c.z1 - c.z0 - 2);
    signs.add('p', c.x1 + 0.12, 12, c.z1 - 4, 'E', 5);
    signs.add('p', c.x0 - 0.12, 12, c.z1 - 4, 'W', 5);
  }

  // -------------------------------------------------------------------------
  // The expressway
  // -------------------------------------------------------------------------

  const piers: { x: number; z: number }[] = [];

  {
    const path = buildPath([EXPRESS_RING], true);
    const thick = 2.2;
    // The car park's roof stands a storey above the deck and a few units from it, at
    // the deck's south-west corner. An apron joins the two, and the deck's outer wall
    // is left out along it: from `dockA`, a third of the way round the corner, which
    // turns round (-18, 59), to `dockB`, on the straight north of it. Both are places
    // where the deck is built in pieces, so that its wall ends exactly there.
    const piece = path.length / Math.ceil(path.length / 2);
    const snap = (s: number): number => Math.round(s / piece) * piece;
    const dockA = snap(path.closest(-18 - 14 * Math.cos(0.61), 59 + 14 * Math.sin(0.61)));
    const dockB = snap(path.closest(-32, CARPARK.z0 + 1.8));
    const open = (s: number, side: number): boolean => side < 0 && s > dockA && s < dockB;
    ribbon(path, EXPRESS_HALF, { thick, wall: 1.1, lanes: 2, open });

    // The apron: one slab between the edge of the deck and the edge of the roof. Its
    // top slopes from one to the other, its underside carries on the deck's, and it
    // has a low wall across each end, from the roof's wall to the deck's.
    {
      const c = CARPARK, wallX = c.x1, wallTop = EXPRESS_Y + 1.1, under = EXPRESS_Y - thick;
      const q = new THREE.Vector3(), q1 = new THREE.Vector3(), q0 = new THREE.Vector3();
      // the deck's outer edge along the apron, from the south end to the north end
      const edge: V3[] = [];
      const cuts = Math.round((dockB - dockA) / piece);
      for (let i = 0; i <= cuts; i++) {
        const s = dockA + i * piece;
        path.at(s, q);
        path.at(s + 0.6, q1);
        path.at(s - 0.6, q0);
        const tx = q1.x - q0.x, tz = q1.z - q0.z, tl = Math.hypot(tx, tz) || 1;
        // the outer edge is to the left of the way the ring runs
        edge.push([q.x + (tz / tl) * EXPRESS_HALF, EXPRESS_Y, q.z - (tx / tl) * EXPRESS_HALF]);
      }
      // and the edge of the roof beside it
      const zS = c.z1 - 0.6, zN = edge[cuts][2];
      const roof: V3[] = edge.map((_, i) => [wallX, c.roofY, zS + ((zN - zS) * i) / cuts]);
      const at = (p: V3, y: number): V3 => [p[0], y, p[2]];
      // plain asphalt: nothing in the deck's material paints a line on it
      const plain = { uvs: [[0.5, 0], [0.5, 0], [0.5, 1], [0.5, 1]] as [number, number][], win: { cell: 0, storey: 20, lit: 0, kind: 0 } };
      for (let i = 0; i < cuts; i++) {
        k.deck.quad(roof[i], edge[i], edge[i + 1], roof[i + 1], [0, 1, 0], ASPHALT, plain);
        cityB.quad(at(roof[i], under), at(edge[i], under), at(edge[i + 1], under), at(roof[i + 1], under), [0, -1, 0], CONCRETE);
      }
      // the two ends: the face of the slab, and a low wall on top of it
      for (const [i, out] of [[0, 1], [cuts, -1]] as [number, number][]) {
        const G = roof[i], E = edge[i];
        const dx = E[0] - G[0], dz = E[2] - G[2], dl = Math.hypot(dx, dz) || 1;
        // which way is out of the apron at this end: south at the south end, north at the north end
        let nx = -dz / dl, nz = dx / dl;
        if (nz * out < 0) { nx = -nx; nz = -nz; }
        const inner = (p: V3, y: number): V3 => [p[0] - nx * 0.45, y, p[2] - nz * 0.45];
        cityB.quad(at(G, under), at(E, under), at(E, wallTop), at(G, c.roofY + 1), [nx, 0, nz], CONCRETE);
        cityB.quad(inner(G, c.roofY), inner(E, EXPRESS_Y), inner(E, wallTop), inner(G, c.roofY + 1), [-nx, 0, -nz], CONCRETE);
        cityB.quad(at(G, c.roofY + 1), at(E, wallTop), inner(E, wallTop), inner(G, c.roofY + 1), [0, 1, 0], CONCRETE);
        // and the stub of the roof's own wall that the low wall starts from
        const z0 = out > 0 ? zS : c.z0 + 0.6, z1 = out > 0 ? c.z1 : zN;
        cityB.box(wallX - 0.6, c.roofY, Math.min(z0, z1), wallX, c.roofY + 1, Math.max(z0, z1), 0xb3aea3, { faces: 'NESWT' });
      }
      // a kerb between the lane that comes off the expressway and the lane that goes on, with a lamp on it
      const kerbZ = (c.rowN + c.rowS) / 2;
      cityB.box(wallX + 1.3, EXPRESS_Y + 0.2, kerbZ - 1.3, wallX + 3.1, EXPRESS_Y + 1.0, kerbZ + 1.3, CONCRETE);
      k.lamp(wallX + 2.2, kerbZ, 0, EXPRESS_Y + 1.0);
    }
    const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let s = 6; s < path.length; s += 18) {
      for (const ds of [0, 4, -4, 8, -8]) {
        path.at(s + ds, p);
        if (pierBlocked(p.x, p.z)) continue;
        path.at(s + ds + 0.6, a);
        path.at(s + ds - 0.6, b);
        const yaw = Math.atan2(a.x - b.x, -(a.z - b.z)); // points across the deck
        const hy = (EXPRESS_Y - thick) / 2;
        cityB.obox(p.x, hy, p.z, 0.65, hy, 0.65, yaw, CONCRETE);
        piers.push({ x: p.x, z: p.z });
        cityB.obox(p.x, EXPRESS_Y - thick - 0.7, p.z, EXPRESS_HALF - 1.4, 0.7, 0.95, yaw, CONCRETE, { faces: 'B' });
        break;
      }
    }
    // a string of lamps along both edges
    for (let s = 0; s < path.length; s += 9) {
      path.at(s, p);
      path.at(s + 0.6, a);
      path.at(s - 0.6, b);
      const tx = a.x - b.x, tz = a.z - b.z, l = Math.hypot(tx, tz) || 1;
      const rx = -tz / l, rz = tx / l;
      for (const side of [-1, 1]) {
        if (open(s, side)) continue;
        glows.push({ x: p.x + rx * (EXPRESS_HALF - 0.22) * side, y: EXPRESS_Y + 1.3, z: p.z + rz * (EXPRESS_HALF - 0.22) * side, sx: 0.4, sy: 0.4, sz: 0.4, color: '#ffc27a' });
      }
    }
  }

  // -------------------------------------------------------------------------
  // The flyover: a slim viaduct for each of the boulevard's two inner lanes
  // -------------------------------------------------------------------------

  {
    const f = FLYOVER;
    const thick = 0.8;
    for (const side of [-1, 1]) {
      const z = f.z + side * f.offset;
      const seg: Seg = { t: 'poly', pts: [[f.x0 - 1, z], [f.x3 + 1, z]], y: 0, r: 0 };
      ribbon(buildPath([seg], false, f), f.half, { thick, wall: 0.8, lanes: 1, lift: 0.05, skirt: 3.3, step: 1.5 });
      // piers where the deck is open underneath, clear of the cross streets
      for (const x of [-54, -43, -21.5, 0, 21.5, 43, 54]) {
        const top = humpHeight(f, x) - thick;
        cityB.box(x - 0.5, 0, z - 1.2, x + 0.5, top, z + 1.2, CONCRETE);
        cityB.box(x - 0.8, top - 0.6, z - f.half + 0.3, x + 0.8, top, z + f.half - 0.3, CONCRETE, { faces: 'NESWB' });
      }
      // a string of lamps along the outer edge
      for (let x = f.x1 + 4; x <= f.x2 - 4; x += 10) {
        glows.push({ x, y: f.y + 1.05, z: z + side * (f.half - 0.22), sx: 0.4, sy: 0.4, sz: 0.4, color: '#ffc27a' });
      }
    }
  }

  // -------------------------------------------------------------------------
  // The L
  // -------------------------------------------------------------------------

  buildL(k, piers);

  // -------------------------------------------------------------------------
  // The helicopter, on the one roof that has a pad for it
  // -------------------------------------------------------------------------

  {
    const roof = BUILDINGS.find((b) => b.roof === 'helipad')!;
    helicopter(k, {
      pad: [roof.x + roof.w / 2, roof.y1 + 0.34, roof.z + roof.d / 2],
      facing: 35,
      // a round of the park: below the ring on Halo Tower, and wide of everything tall
      round: [[40, 78, 14], [56, 92, 44], [86, 96, 66], [70, 96, 100], [20, 94, 92], [-22, 92, 60], [-30, 96, 20], [-18, 100, -22], [14, 92, -30], [38, 76, -20]],
    });
  }

  // -------------------------------------------------------------------------
  // Street lamps
  // -------------------------------------------------------------------------

  const lampSpots: { x: number; z: number; yaw: number }[] = [];
  {
    const crossesH = (z: number) => H_STREETS.some((h) => Math.abs(z - h.z) < h.corr + 2);
    const crossesV = (x: number) => V_STREETS.some((v) => Math.abs(x - v.x) < v.corr + 2);
    for (const v of V_STREETS) {
      for (let z = BOARD.z0 + 9; z < BOARD.z1 - 4; z += 22) {
        if (crossesH(z)) continue;
        lampSpots.push({ x: v.x - v.carr - 1.3, z, yaw: 0 });
        lampSpots.push({ x: v.x + v.carr + 1.3, z: z + 11, yaw: Math.PI });
      }
    }
    for (const h of H_STREETS) {
      for (let x = BOARD.x0 + 9; x < BOARD.x1 - 4; x += 22) {
        if (crossesV(x)) continue;
        lampSpots.push({ x, z: h.z - h.carr - 1.3, yaw: Math.PI / 2 });
        if (!crossesV(x + 11)) lampSpots.push({ x: x + 11, z: h.z + h.carr + 1.3, yaw: -Math.PI / 2 });
      }
    }
    // no lamp stands where the L runs above the sidewalk, or under one of its platforms
    for (const s of lampSpots) {
      if (underL(s.x, s.z) || inDriveway(s.x, s.z)) continue;
      if (s.x > BOARD.x0 + 1 && s.x < BOARD.x1 - 1 && s.z > BOARD.z0 + 1 && s.z < BOARD.z1 - 1 && !onCut(s.x, s.z, 2)) k.lamp(s.x, s.z, s.yaw);
    }
  }

  // -------------------------------------------------------------------------
  // Trees
  // -------------------------------------------------------------------------

  {
    const spots: { x: number; z: number; s: number; tall?: boolean }[] = [];
    const m = LANDMARK;
    for (let i = 0; i < 400 && spots.length < 44; i++) {
      const x = PARK.x0 + 3 + rand() * (PARK.x1 - PARK.x0 - 6), z = PARK.z0 + 3 + rand() * (PARK.z1 - PARK.z0 - 6);
      if (Math.hypot(x - m.x, z - m.z) < 15.2) continue;
      if (Math.abs(x - m.x) < 3 || Math.abs(z - m.z) < 3) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 2.8) continue;
      if (x < PARK.x0 + 15 && z > PARK.z1 - 13) continue; // the pavilion
      if (underL(x, z)) continue;
      if (spots.some((t) => Math.hypot(t.x - x, t.z - z) < 4.2)) continue;
      spots.push({ x, z, s: 0.85 + rand() * 0.7 });
    }
    const blvd = H_STREETS[1];
    for (let x = -72; x <= 72; x += 12) {
      if (V_STREETS.some((v) => Math.abs(x - v.x) < v.carr + 3)) continue;
      spots.push({ x, z: blvd.z, s: 0.7 });
    }
    // small squares under the expressway's curves, clear of the streets that cut through
    for (const id of ['B1', 'B3'] as const) {
      const r = blockRect(id);
      const zs = id === 'B1' ? [31.8, 36] : [6, 12];
      for (const lz of zs) {
        spots.push({ x: r.x0 + 3.5, z: r.z0 + lz, s: 0.75 });
        spots.push({ x: r.x1 - 3.5, z: r.z0 + lz, s: 0.75 });
      }
    }
    // the square around the fountain
    for (const [dx, dz] of [[-5.2, -4.6], [5.2, -4.6], [-5.2, 4.6], [5.2, 4.6]]) {
      spots.push({ x: FOUNTAIN.x + dx, z: FOUNTAIN.z + dz, s: 0.7 });
    }
    for (const t of spots) k.tree(t.x, t.z, t.s, t.tall === true);
  }

  // -------------------------------------------------------------------------
  // People: still figures, as on a model railway
  // -------------------------------------------------------------------------

  {
    const spots: { x: number; z: number }[] = [];
    const nearH = (z: number) => H_STREETS.some((h) => Math.abs(z - h.z) < h.corr + 0.5);
    const nearV = (x: number) => V_STREETS.some((v) => Math.abs(x - v.x) < v.corr + 0.5);
    for (const v of V_STREETS) {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 15; i++) {
          const z = BOARD.z0 + 3 + rand() * (BOARD.z1 - BOARD.z0 - 6);
          if (nearH(z)) continue;
          spots.push({ x: v.x + side * (v.carr + 0.9 + rand() * 1.6), z });
        }
      }
    }
    for (const h of H_STREETS) {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 15; i++) {
          const x = BOARD.x0 + 3 + rand() * (BOARD.x1 - BOARD.x0 - 6);
          if (nearV(x)) continue;
          spots.push({ x, z: h.z + side * (h.carr + 0.9 + rand() * (h.corr - h.carr - 1.4)) });
        }
      }
    }
    const m = LANDMARK;
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2, r = 11.6 + rand() * 1.6;
      spots.push({ x: m.x + Math.cos(a) * r, z: m.z + Math.sin(a) * r });
    }
    for (let i = 0; i < 7; i++) spots.push({ x: SHOWROOM.x0 + 4 + rand() * (SHOWROOM.x1 - SHOWROOM.x0 - 8), z: SHOWROOM.z1 + 0.6 + rand() * 1.6 });
    // visitors at the feet of the arch
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        spots.push({ x: ARCH.x + (rand() < 0.5 ? -1 : 1) * (2.8 + rand() * 1.1), z: ARCH.z + (side * ARCH.span) / 2 + rand() * 6 - 3 });
      }
    }
    // around the fountain
    for (let i = 0; i < 11; i++) {
      const a = rand() * Math.PI * 2, r = FOUNTAIN.r + 0.9 + rand() * 2.0;
      spots.push({ x: FOUNTAIN.x + Math.cos(a) * r, z: FOUNTAIN.z + Math.sin(a) * r });
    }
    for (const s of spots) {
      if (s.x > BOARD.x0 + 0.6 && s.x < BOARD.x1 - 0.6 && s.z > BOARD.z0 + 0.6 && s.z < BOARD.z1 - 0.6 && !onCut(s.x, s.z, 0.8) && !inDriveway(s.x, s.z)) k.person(s.x, s.z);
    }
  }

  // -------------------------------------------------------------------------
  // The ground, and what changes with the hour
  // -------------------------------------------------------------------------

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD.x1 - BOARD.x0, BOARD.z1 - BOARD.z0).rotateX(-Math.PI / 2),
    makeGroundMaterial(k.look),
  );
  ground.receiveShadow = true;
  ground.layers.set(1); // layer 1 is left out of the mirror image used for wet streets
  group.add(ground);

  const haloA = new THREE.Color('#ff3d9a'), haloB = new THREE.Color('#35e0ff');
  k.each((dt, time, night) => {
    // the ring round Halo Tower drifts between two colours, and the showroom's turntable turns
    haloMat.color.copy(haloA).lerp(haloB, 0.5 + 0.5 * Math.sin(time * 0.25)).multiplyScalar(0.55 + 3.2 * night);
    turntable.rotation.y -= TURNTABLE_RATE * dt;
  });

  return { routes: LOOPS, parked: PARKED, heroSpots: HERO_SPOTS };
}
