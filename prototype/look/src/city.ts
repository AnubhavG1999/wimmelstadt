// Builds everything that stands still: the ground, the buildings, the landmark,
// the two cutaways, the expressway, and the small things on the street.
// The shapes come from scene-data.ts; this file only turns them into meshes.

import * as THREE from 'three';
import { GeoBuilder, NO_WIN, interior, rng, type V3, type WinSpec } from './geo';
import {
  ARCH, BLOCK_THEME, BOARD, BUILDINGS, CARPARK, CUTS, EXPRESS_HALF, EXPRESS_RING, EXPRESS_Y, FLYOVER, FOUNTAIN, GOLDEN_GATE,
  H_STREETS, LANDMARK, LOOPS, MEDIAN_X, NEON, PARK, POND, SHOWROOM, SIGN_POOLS, STOREY, STREET_CARR, TAJ, TORII, V_STREETS,
  blockRect, humpHeight, onCut,
  type Building, type Seg, type Style, type Theme,
} from './scene-data';
import { buildPath, type Path } from './paths';
import { U, makeCityMaterial, makeDeckMaterial, makeGroundMaterial, makePropMaterial, makeVehicleMaterial } from './materials';
import { buildSignAtlas, type SignAtlas } from './signs';
import { buildLandmarkLot, buildMonuments, type Glow, type Light } from './landmarks';

const CONCRETE = 0xbdb8ad;
const ASPHALT = 0x4f5157;
const ROOFS = [0x8d8a83, 0x7b7a7e, 0x9d988f, 0x6f7378];

const PALETTE: Record<Style, number[]> = {
  glass: [0x8fb4cf, 0x7aa3c2, 0x9cc3d3, 0x6f95b5, 0xa9c9dc],
  office: [0xe9dcc3, 0xf0cfa8, 0xdfe6d4, 0xf2e3b3, 0xe6c7b8, 0xcfe0e8],
  resi: [0xc98f6b, 0xb9785a, 0xd9a583, 0xa86b52, 0xd6b08c, 0xbf8a7a],
  shop: [0xe8dcc6, 0xe6c9a4, 0xd8e0d6, 0xf0e2c0, 0xdcc8c0, 0xc9d7e0, 0xe9b9a0],
  neon: [0x3d3856, 0x2f3b55, 0x4a3b58, 0x38324e],
  concrete: [0xa9a8a2, 0x9aa0a6, 0xb5b0a6],
  euro: [0xf0e3c4, 0xe9cfa6, 0xe6d3c8, 0xd9dcc8, 0xf2d9a8, 0xd8c4b0],
};

/** What pitched roofs are covered with: slate and clay in Europe, dark tile in Asia. */
const HIP_ROOFS: Record<Theme, number[]> = {
  europe: [0x5f6b7a, 0xb5654a, 0x6b7785],
  asia: [0x3d4a4f, 0x35484a],
  america: [0x7a5a4a, 0x6b6f76],
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
  euro: { cell: 2.8, storey: STOREY, lit: 0.34, kind: 2 },
};

const FACE_RIGHT: Record<string, V3> = { S: [1, 0, 0], N: [-1, 0, 0], E: [0, 0, -1], W: [0, 0, 1] };
const FACE_NORMAL: Record<string, V3> = { S: [0, 0, 1], N: [0, 0, -1], E: [1, 0, 0], W: [-1, 0, 0] };

class SignBuilder {
  private pos: number[] = [];
  private uv: number[] = [];
  constructor(readonly atlas: SignAtlas) {}

  /** Adds a sign centred at the given point, facing `face` and `h` tall. Returns its width. */
  add(id: string, cx: number, cy: number, cz: number, face: string, h: number, maxW = Infinity): number {
    const r = this.atlas.rects.get(id);
    if (!r) return 0;
    let w = h * r.aspect;
    if (w > maxW) {
      w = maxW;
      h = w / r.aspect;
    }
    const R = FACE_RIGHT[face];
    const hw = w / 2, hh = h / 2;
    const p = (sx: number, sy: number): V3 => [cx + R[0] * hw * sx, cy + hh * sy, cz + R[2] * hw * sx];
    const corners = [p(-1, -1), p(1, -1), p(1, 1), p(-1, 1)];
    const uvs = [[r.u0, r.vBottom], [r.u1, r.vBottom], [r.u1, r.vTop], [r.u0, r.vTop]];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.pos.push(...corners[i]);
      this.uv.push(uvs[i][0], uvs[i][1]);
    }
    return w;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

function edgeFaces(b: Building): string {
  const r = blockRect(b.block);
  let f = '';
  if (b.z - r.z0 < 1.6) f += 'N';
  if (r.z1 - (b.z + b.d) < 1.6) f += 'S';
  if (b.x - r.x0 < 1.6) f += 'W';
  if (r.x1 - (b.x + b.w) < 1.6) f += 'E';
  return f;
}

function rgba(hex: string, a: number): string {
  const c = new THREE.Color(hex);
  const h = c.getHex(THREE.SRGBColorSpace);
  return `rgba(${(h >> 16) & 255},${(h >> 8) & 255},${h & 255},${a})`;
}

/** Paints every light source onto a small map of the board. Shaders read it at night. */
function buildLightMap(lights: Light[]): THREE.CanvasTexture {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  const sx = S / (BOARD.x1 - BOARD.x0), sz = S / (BOARD.z1 - BOARD.z0);
  ctx.setTransform(sx, 0, 0, sz, -BOARD.x0 * sx, -BOARD.z0 * sz);
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const g = ctx.createRadialGradient(l.x, l.z, 0, l.x, l.z, l.r);
    g.addColorStop(0, rgba(l.color, l.k * 0.62));
    g.addColorStop(0.45, rgba(l.color, l.k * 0.25));
    g.addColorStop(1, rgba(l.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(l.x - l.r, l.z - l.r, l.r * 2, l.r * 2);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  t.generateMipmaps = false;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export interface City {
  group: THREE.Group;
  /** The disc in the showroom; the caller turns it. */
  turntable: THREE.Object3D;
  /** Brightens signs, lamps and the landmark's ring as night falls. */
  setNight(night: number, time: number): void;
  stats: { triangles: number; signs: number; glows: number; trees: number; people: number };
}

export function buildCity(): City {
  const group = new THREE.Group();
  const cityB = new GeoBuilder();
  const deckB = new GeoBuilder();
  const lights: Light[] = [];
  const glows: Glow[] = [];
  const atlas = buildSignAtlas();
  const signs = new SignBuilder(atlas);
  const rand = rng(20261118);

  // -------------------------------------------------------------------------
  // Road decks: a strip of road along a path, with its sides and low walls
  // -------------------------------------------------------------------------

  interface RibbonOpts {
    thick: number; wall: number; lanes: number; lift?: number; structure?: boolean; step?: number;
    /** Where the road is lower than this, its sides run down to the ground, as on a ramp of earth. */
    skirt?: number;
  }

  function ribbon(path: Path, hw: number, o: RibbonOpts): void {
    const n = Math.max(1, Math.ceil(path.length / (o.step ?? 2)));
    const lift = o.lift ?? 0;
    // how deep the structure is and how tall its low walls are, at one place along the road
    const dims = (f: { y: number }): { t: number; w: number } => {
      if (o.skirt === undefined) return { t: o.thick, w: o.wall };
      const h = f.y - lift;
      return { t: h < o.skirt ? f.y : o.thick, w: o.wall * Math.min(1, h / 1.2) };
    };
    const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
    const frame = (s: number) => {
      path.at(s, p);
      path.at(s + 0.6, a);
      path.at(s - 0.6, b);
      const tx = a.x - b.x, tz = a.z - b.z;
      const l = Math.hypot(tx, tz) || 1;
      return { x: p.x, y: p.y + lift, z: p.z, rx: -tz / l, rz: tx / l };
    };
    const win: WinSpec = { cell: o.lanes, storey: hw * 2, lit: 0, kind: 0 };
    const up = (q: V3, dy: number): V3 => [q[0], q[1] + dy, q[2]];
    let f0 = frame(0), s0 = 0;
    for (let i = 1; i <= n; i++) {
      const s1 = (i / n) * path.length;
      const f1 = frame(s1);
      const L0: V3 = [f0.x - f0.rx * hw, f0.y, f0.z - f0.rz * hw], R0: V3 = [f0.x + f0.rx * hw, f0.y, f0.z + f0.rz * hw];
      const L1: V3 = [f1.x - f1.rx * hw, f1.y, f1.z - f1.rz * hw], R1: V3 = [f1.x + f1.rx * hw, f1.y, f1.z + f1.rz * hw];
      deckB.quad(L0, R0, R1, L1, [0, 1, 0], ASPHALT, { uvs: [[0, s0], [1, s0], [1, s1], [0, s1]], win });
      if (o.structure !== false) {
        const { t: t0, w: w0 } = dims(f0), { t: t1, w: w1 } = dims(f1), inset = 0.45;
        const nx = (f0.rx + f1.rx) / 2, nz = (f0.rz + f1.rz) / 2;
        const Ri0: V3 = [R0[0] - f0.rx * inset, R0[1], R0[2] - f0.rz * inset], Ri1: V3 = [R1[0] - f1.rx * inset, R1[1], R1[2] - f1.rz * inset];
        const Li0: V3 = [L0[0] + f0.rx * inset, L0[1], L0[2] + f0.rz * inset], Li1: V3 = [L1[0] + f1.rx * inset, L1[1], L1[2] + f1.rz * inset];
        cityB.quad(up(L0, -t0), up(R0, -t0), up(R1, -t1), up(L1, -t1), [0, -1, 0], CONCRETE);
        cityB.quad(up(R0, -t0), up(R1, -t1), up(R1, w1), up(R0, w0), [nx, 0, nz], CONCRETE);
        cityB.quad(up(L0, -t0), up(L1, -t1), up(L1, w1), up(L0, w0), [-nx, 0, -nz], CONCRETE);
        cityB.quad(Ri0, Ri1, up(Ri1, w1), up(Ri0, w0), [-nx, 0, -nz], CONCRETE);
        cityB.quad(Li0, Li1, up(Li1, w1), up(Li0, w0), [nx, 0, nz], CONCRETE);
        cityB.quad(up(Ri0, w0), up(R0, w0), up(R1, w1), up(Ri1, w1), [0, 1, 0], CONCRETE);
        cityB.quad(up(Li0, w0), up(L0, w0), up(L1, w1), up(Li1, w1), [0, 1, 0], CONCRETE);
      }
      f0 = f1;
      s0 = s1;
    }
  }

  function pierBlocked(x: number, z: number): boolean {
    // the Golden Gate's span hangs from its cables
    if (Math.abs(x - GOLDEN_GATE.x) < 8 && z > GOLDEN_GATE.z0 - 1 && z < GOLDEN_GATE.z1 + 1) return true;
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

  // -------------------------------------------------------------------------
  // Buildings
  // -------------------------------------------------------------------------

  function parapet(x0: number, z0: number, x1: number, z1: number, y: number, color: number): void {
    if (x1 - x0 < 4 || z1 - z0 < 4) return;
    const t = 0.4, h = 0.7;
    cityB.box(x0, y, z0, x1, y + h, z0 + t, color);
    cityB.box(x0, y, z1 - t, x1, y + h, z1, color);
    cityB.box(x0, y, z0 + t, x0 + t, y + h, z1 - t, color, { faces: 'EWT' });
    cityB.box(x1 - t, y, z0 + t, x1, y + h, z1 - t, color, { faces: 'EWT' });
  }

  /** A pitched roof with four slopes, standing a little proud of the walls. */
  function hipRoof(x0: number, z0: number, x1: number, z1: number, y: number, color: number, chimneys: boolean): void {
    const o = 0.45;
    const ax0 = x0 - o, az0 = z0 - o, ax1 = x1 + o, az1 = z1 + o;
    const w = ax1 - ax0, d = az1 - az0;
    const run = Math.min(w, d) / 2;
    const rise = Math.min(5.2, run * 0.62);
    const cx = (ax0 + ax1) / 2, cz = (az0 + az1) / 2;
    const A: V3 = [ax0, y, az0], B: V3 = [ax1, y, az0], C: V3 = [ax1, y, az1], D: V3 = [ax0, y, az1];
    const len = Math.hypot(run, rise);
    const n = (nx: number, nz: number): V3 => [(nx * rise) / len, run / len, (nz * rise) / len];
    if (w >= d) {
      const R0: V3 = [ax0 + run, y + rise, cz], R1: V3 = [ax1 - run, y + rise, cz];
      cityB.quad(D, C, R1, R0, n(0, 1), color);
      cityB.quad(B, A, R0, R1, n(0, -1), color);
      cityB.tri(A, D, R0, n(-1, 0), color);
      cityB.tri(C, B, R1, n(1, 0), color);
    } else {
      const R0: V3 = [cx, y + rise, az0 + run], R1: V3 = [cx, y + rise, az1 - run];
      cityB.quad(A, D, R1, R0, n(-1, 0), color);
      cityB.quad(C, B, R0, R1, n(1, 0), color);
      cityB.tri(B, A, R0, n(0, -1), color);
      cityB.tri(D, C, R1, n(0, 1), color);
    }
    cityB.box(ax0, y - 0.3, az0, ax1, y, az1, 0xe9e3d6, { faces: 'NESW' });
    if (chimneys) {
      for (const [fx, fz] of [[0.3, 0.34], [0.72, 0.62]]) {
        const px = x0 + (x1 - x0) * fx, pz = z0 + (z1 - z0) * fz;
        cityB.box(px - 0.5, y, pz - 0.5, px + 0.5, y + rise + 0.9, pz + 0.5, 0xa5674f, { top: 0x4a4f55 });
      }
    }
  }

  function roofDetails(b: Building, x0: number, z0: number, x1: number, z1: number, y: number): void {
    const w = x1 - x0, d = z1 - z0;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (b.roof === 'none') return;
    if (b.roof === 'hip') {
      const theme = BLOCK_THEME[b.block];
      const pal = HIP_ROOFS[theme];
      hipRoof(x0, z0, x1, z1, y, pal[b.tint % pal.length], theme === 'europe');
      return;
    }
    parapet(x0, z0, x1, z1, y, 0xb0aca4);
    const unit = () => {
      const ux = x0 + 1.2 + rand() * Math.max(0.1, w - 4.6), uz = z0 + 1.2 + rand() * Math.max(0.1, d - 3.8);
      cityB.box(ux, y, uz, ux + 2.2, y + 1.6, uz + 1.4, 0xb9bcc0);
    };
    if (b.roof === 'units') {
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) unit();
      cityB.box(x0 + 1.5, y, z0 + 1.5, x0 + 5, y + 3, z0 + 4.5, 0xa39f97);
    } else if (b.roof === 'tank') {
      const tx = x1 - 3.4, tz = z1 - 3.4;
      for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cityB.box(tx + ox - 0.15, y, tz + oz - 0.15, tx + ox + 0.15, y + 1.3, tz + oz + 0.15, 0x5d5a55);
      cityB.cyl(tx, tz, y + 1.2, y + 4, 1.5, 1.5, 8, 0x9b7653);
      cityB.cyl(tx, tz, y + 4, y + 5, 1.65, 0.15, 8, 0x6b6f76, { cap: false });
      unit();
    } else if (b.roof === 'helipad') {
      const R = Math.min(w, d) / 2 - 1.6;
      cityB.cyl(cx, cz, y, y + 0.25, R, R, 18, 0x4b5560);
      cityB.cyl(cx, cz, y + 0.25, y + 0.3, R - 0.6, R - 0.6, 18, 0xe9c94a);
      cityB.cyl(cx, cz, y + 0.3, y + 0.34, R - 1.3, R - 1.3, 18, 0x4b5560);
    } else if (b.roof === 'garden') {
      cityB.box(x0 + 1, y, z0 + 1, x1 - 1, y + 0.5, z1 - 1, 0x6aa457);
      cityB.box(x0 + 2, y + 0.5, z0 + 2, x0 + 3.6, y + 1.9, z0 + 3.6, 0x4f8f4a);
      cityB.box(x1 - 4, y + 0.5, z1 - 3.8, x1 - 2.2, y + 2.1, z1 - 2, 0x5f9f4e);
    } else if (w > 10) {
      cityB.box(x0 + 1.5, y, z0 + 1.5, x0 + 4.5, y + 2.6, z0 + 4, 0xa39f97);
    }
  }

  function signage(b: Building, idx: number): void {
    if (b.part || b.y0 > 0) return;
    const faces = b.signs ?? edgeFaces(b);
    const isNeon = b.style === 'neon';
    if (b.style !== 'shop' && b.style !== 'euro' && !isNeon) return;
    // the block's theme decides what the signs say, and in which language
    const pool = SIGN_POOLS[BLOCK_THEME[b.block]];
    let k = idx;
    for (const face of faces) {
      const n = FACE_NORMAL[face], R = FACE_RIGHT[face];
      const ns = face === 'N' || face === 'S';
      const faceLen = ns ? b.w : b.d;
      const fx = face === 'E' ? b.x + b.w : face === 'W' ? b.x : b.x + b.w / 2;
      const fz = face === 'S' ? b.z + b.d : face === 'N' ? b.z : b.z + b.d / 2;
      const id = pool.fascia[k++ % pool.fascia.length];
      const h = isNeon ? 3.0 : 2.1;
      const cy = b.y1 < 7.6 ? b.y1 + h / 2 + 0.25 : isNeon ? 6.3 : 5.7;
      signs.add(id, fx + n[0] * 0.12, cy, fz + n[2] * 0.12, face, h, faceLen - 1.5);
      const col = atlas.rects.get(id)!.color;
      lights.push({ x: fx + n[0] * 4, z: fz + n[2] * 4, r: isNeon ? 15 : 10, color: col, k: isNeon ? 0.6 : 0.4 });
      lights.push({ x: fx + n[0] * 2.5, z: fz + n[2] * 2.5, r: 8, color: '#ffd9a8', k: 0.35 });

      if (isNeon && b.y1 >= 14) {
        // a blade sign that stands out from the wall, readable from both sides
        const bid = pool.blade[(idx + k) % pool.blade.length];
        const rect = atlas.rects.get(bid)!;
        const bh = Math.min(b.y1 - 8, 15), bw = bh * rect.aspect;
        const along = faceLen / 2 - 0.9;
        const bx = fx + R[0] * along + n[0] * (0.35 + bw / 2), bz = fz + R[2] * along + n[2] * (0.35 + bw / 2);
        const by = 7.5 + bh / 2;
        for (const f2 of ns ? ['E', 'W'] : ['S', 'N']) {
          const n2 = FACE_NORMAL[f2];
          signs.add(bid, bx + n2[0] * 0.1, by, bz + n2[2] * 0.1, f2, bh);
        }
        if (ns) cityB.box(bx - 0.08, by - bh / 2, bz - bw / 2, bx + 0.08, by + bh / 2, bz + bw / 2, 0x14141c);
        else cityB.box(bx - bw / 2, by - bh / 2, bz - 0.08, bx + bw / 2, by + bh / 2, bz + 0.08, 0x14141c);
        lights.push({ x: bx + n[0] * 3, z: bz + n[2] * 3, r: 12, color: rect.color, k: 0.5 });
      }
    }
    if (isNeon) {
      const col = NEON[idx % NEON.length];
      const y = b.y1 + 0.85;
      glows.push({ x: b.x + b.w / 2, y, z: b.z + 0.2, sx: b.w, sy: 0.3, sz: 0.3, color: col });
      glows.push({ x: b.x + b.w / 2, y, z: b.z + b.d - 0.2, sx: b.w, sy: 0.3, sz: 0.3, color: col });
      glows.push({ x: b.x + 0.2, y, z: b.z + b.d / 2, sx: 0.3, sy: 0.3, sz: b.d, color: col });
      glows.push({ x: b.x + b.w - 0.2, y, z: b.z + b.d / 2, sx: 0.3, sy: 0.3, sz: b.d, color: col });
      if (b.y1 <= 50) {
        // a billboard on the roof, readable from the south and from the north
        const board = pool.billboard[idx % pool.billboard.length];
        const cx = b.x + b.w / 2, cz = b.z + b.d / 2;
        const bh = Math.min(5, (b.w - 1) / atlas.rects.get(board)!.aspect);
        const cy = b.y1 + 1.8 + bh / 2;
        const bw = signs.add(board, cx, cy, cz + 0.12, 'S', bh, b.w - 1);
        signs.add(board, cx, cy, cz - 0.12, 'N', bh, b.w - 1);
        cityB.box(cx - bw / 2, cy - bh / 2, cz - 0.1, cx + bw / 2, cy + bh / 2, cz + 0.1, 0x14141c);
        cityB.box(cx - bw / 2 + 0.6, b.y1, cz - 0.15, cx - bw / 2 + 0.9, cy - bh / 2, cz + 0.15, 0x5d5a55);
        cityB.box(cx + bw / 2 - 0.9, b.y1, cz - 0.15, cx + bw / 2 - 0.6, cy - bh / 2, cz + 0.15, 0x5d5a55);
      }
    }
  }

  BUILDINGS.forEach((b, i) => {
    if (b.landmark) {
      buildLandmarkLot(b, { b: cityB, glows, lights });
      return;
    }
    const pal = PALETTE[b.style];
    const color = pal[b.tint % pal.length];
    const seed = (i * 0.618034) % 1;
    const win = WIN[b.style];
    const roofCol = ROOFS[i % ROOFS.length];
    let x0 = b.x, z0 = b.z, x1 = b.x + b.w, z1 = b.z + b.d, top = b.y1;
    cityB.box(x0, b.y0, z0, x1, b.y1, z1, color, { win, seed, top: roofCol });
    if (b.crown) {
      parapet(x0, z0, x1, z1, b.y1, 0xb0aca4);
      x0 += b.crown.inset; z0 += b.crown.inset; x1 -= b.crown.inset; z1 -= b.crown.inset;
      top = b.y1 + b.crown.h;
      cityB.box(x0, b.y1, z0, x1, top, z1, color, { win, seed: seed + 0.31, top: roofCol });
      parapet(x0, z0, x1, z1, top, 0xb0aca4);
    }
    roofDetails(b, x0, z0, x1, z1, top);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (b.spire) {
      cityB.cyl(cx, cz, top, top + b.spire, 0.55, 0.12, 6, 0x9aa0a8, { cap: false });
      glows.push({ x: cx, y: top + b.spire + 0.3, z: cz, sx: 0.8, sy: 0.8, sz: 0.8, color: '#ff3b3b' });
    } else if (top > 85) {
      glows.push({ x: x0 + 0.5, y: top + 1.1, z: z0 + 0.5, sx: 0.6, sy: 0.6, sz: 0.6, color: '#ff3b3b' });
      glows.push({ x: x1 - 0.5, y: top + 1.1, z: z1 - 0.5, sx: 0.6, sy: 0.6, sz: 0.6, color: '#ff3b3b' });
    }
    signage(b, i);
    const crown = b.sign;
    if (crown) {
      signs.add(crown, b.x + b.w / 2, b.y1 - 4.5, b.z + b.d + 0.12, 'S', 4.4, b.w - 2);
      signs.add(crown, b.x + b.w + 0.12, b.y1 - 4.5, b.z + b.d / 2, 'E', 4.4, b.d - 2);
      signs.add(crown, b.x + b.w / 2, b.y1 - 4.5, b.z - 0.12, 'N', 4.4, b.w - 2);
      signs.add(crown, b.x - 0.12, b.y1 - 4.5, b.z + b.d / 2, 'W', 4.4, b.d - 2);
    }
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

  // Toy versions of famous monuments: the arch, the bridge, the torii and the Taj Mahal.
  buildMonuments({ b: cityB, glows, lights });

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
    signs.add('mochi', (s.x0 + s.x1) / 2, s.h + 1.7, s.z1 + 0.95, 'S', 3.0);
    signs.add('mochi', (s.x0 + s.x1) / 2, s.h + 1.7, s.z1 + 0.75, 'N', 3.0);
    lights.push({ x: (s.x0 + s.x1) / 2, z: s.z1 + 5, r: 20, color: '#fff0d6', k: 0.75 });
    lights.push({ x: s.turntable.x, z: s.turntable.z, r: 13, color: '#fff0d6', k: 0.6 });

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(s.turntable.r, s.turntable.r, 0.4, 28),
      makePropMaterial({ vertexColors: false, color: 0xcfcbc2 }),
    );
    disc.position.y = 0.2;
    disc.receiveShadow = true;
    turntable.add(disc);
    for (let i = 0; i < 8; i++) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.3), makePropMaterial({ vertexColors: false, color: 0x2f2f38 }));
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
    cityB.box(c.x1 - 0.6, 0, c.z0 + 0.6, c.x1, c.roofY + 1, c.z1, wall, { faces: 'EST' });
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

    const loop = LOOPS.find((l) => l.id === 'carpark')!;
    const [ground, helixA, roof, helixB] = loop.segs;
    for (const h of [helixA, helixB]) {
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
    // the ground-level link and the two short bridges from the spirals to the roof
    if (ground.t === 'poly') ribbon(buildPath([ground], false), 2.6, { thick: 0, wall: 0, lanes: 1, lift: 0.04, structure: false });
    if (roof.t === 'poly') {
      const first = roof.pts[0], last = roof.pts[roof.pts.length - 1];
      for (const p of [first, last]) {
        const seg: Seg = { t: 'poly', pts: [[p[0], p[1]], [p[0], c.z1 - 0.2]], y: c.roofY, r: 0 };
        ribbon(buildPath([seg], false), 2.6, { thick: 0.6, wall: 0.9, lanes: 1 });
      }
    }
    signs.add('ponpoko', (c.x0 + c.x1) / 2, c.roofY + 2.6, c.z0 - 0.12, 'N', 2.6);
    signs.add('ponpoko', (c.x0 + c.x1) / 2, c.roofY + 2.6, c.z0 + 0.72, 'S', 2.6);
    signs.add('ponpoko', c.x0 - 0.12, c.roofY - 3, (c.z0 + c.z1) / 2, 'W', 2.4, c.z1 - c.z0 - 2);
    signs.add('p', c.x1 + 0.12, 12, c.z1 - 4, 'E', 5);
    signs.add('p', c.x0 - 0.12, 12, c.z1 - 4, 'W', 5);
  }

  // -------------------------------------------------------------------------
  // The expressway
  // -------------------------------------------------------------------------

  {
    const path = buildPath([EXPRESS_RING], true);
    const thick = 2.2;
    ribbon(path, EXPRESS_HALF, { thick, wall: 1.1, lanes: 2 });
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
    const spots = lampSpots.filter((s) => s.x > BOARD.x0 + 1 && s.x < BOARD.x1 - 1 && s.z > BOARD.z0 + 1 && s.z < BOARD.z1 - 1 && !onCut(s.x, s.z, 2));
    const pb = new GeoBuilder();
    pb.box(-0.18, 0, -0.18, 0.18, 8, 0.18, 0x4b4f57);
    pb.box(0, 7.75, -0.14, 2.3, 8.0, 0.14, 0x4b4f57, { faces: 'NESWTB' });
    const posts = new THREE.InstancedMesh(pb.build(), makePropMaterial(), spots.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    spots.forEach((s, i) => {
      // turning by -yaw around the vertical axis points the arm along (cos yaw, sin yaw)
      q.setFromAxisAngle(up, -s.yaw);
      m4.compose(new THREE.Vector3(s.x, 0, s.z), q, one);
      posts.setMatrixAt(i, m4);
      const bx = s.x + Math.cos(s.yaw) * 2.0, bz = s.z + Math.sin(s.yaw) * 2.0;
      glows.push({ x: bx, y: 7.62, z: bz, sx: 0.7, sy: 0.22, sz: 0.7, color: '#ffd9a0' });
      lights.push({ x: bx, z: bz, r: 13, color: '#ffc98a', k: 0.5 });
    });
    posts.frustumCulled = false;
    group.add(posts);
  }

  // -------------------------------------------------------------------------
  // Trees
  // -------------------------------------------------------------------------

  let treeCount = 0;
  {
    const spots: { x: number; z: number; s: number; tall?: boolean }[] = [];
    const m = LANDMARK;
    for (let i = 0; i < 400 && spots.length < 44; i++) {
      const x = PARK.x0 + 3 + rand() * (PARK.x1 - PARK.x0 - 6), z = PARK.z0 + 3 + rand() * (PARK.z1 - PARK.z0 - 6);
      if (Math.hypot(x - m.x, z - m.z) < 15.2) continue;
      if (Math.abs(x - m.x) < 3 || Math.abs(z - m.z) < 3) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 2.8) continue;
      if (x < PARK.x0 + 15 && z > PARK.z1 - 13) continue; // the pavilion
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
    // the garden of the Taj Mahal: slender trees along the pool, rounder ones at its edges
    {
      const cx = (TAJ.x0 + TAJ.x1) / 2;
      for (let z = TAJ.z0 + 33; z < TAJ.z1 - 7; z += 3.1) {
        spots.push({ x: cx - 4.3, z, s: 0.9, tall: true });
        spots.push({ x: cx + 4.3, z, s: 0.9, tall: true });
      }
      for (const [dx, dz] of [[4, 33], [9, 41], [4, 44], [44, 33], [39, 41], [44, 44], [14, 41], [34, 41]]) {
        spots.push({ x: TAJ.x0 + dx, z: TAJ.z0 + dz, s: 0.8 });
      }
    }
    treeCount = spots.length;
    const trunkGeo = new THREE.CylinderGeometry(0.38, 0.5, 2.8, 6).translate(0, 1.4, 0);
    const crownGeo = new THREE.IcosahedronGeometry(2.7, 0).scale(1, 0.9, 1).translate(0, 4.5, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, makePropMaterial({ vertexColors: false, color: 0x7a5a3c }), spots.length);
    const crowns = new THREE.InstancedMesh(crownGeo, makePropMaterial({ vertexColors: false, color: 0xffffff }), spots.length);
    const greens = [0x5f9f4e, 0x6fae58, 0x4f8f4a, 0x7fb85f, 0x5a9a5a];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    spots.forEach((t, i) => {
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      const tall = t.tall === true;
      m4.compose(new THREE.Vector3(t.x, 0, t.z), q, tall ? new THREE.Vector3(t.s * 0.42, t.s * 1.3, t.s * 0.42) : new THREE.Vector3(t.s, t.s * (0.9 + rand() * 0.3), t.s));
      trunks.setMatrixAt(i, m4);
      crowns.setMatrixAt(i, m4);
      const pick = rand();
      col.set(tall ? 0x3f7a4a : pick < 0.12 ? 0xf2a7c3 : pick < 0.18 ? 0xe8a23d : greens[Math.floor(rand() * greens.length)]);
      crowns.setColorAt(i, col);
    });
    crowns.castShadow = true;
    crowns.receiveShadow = true;
    trunks.frustumCulled = crowns.frustumCulled = false;
    group.add(trunks, crowns);
  }

  // -------------------------------------------------------------------------
  // People: still figures, as on a model railway
  // -------------------------------------------------------------------------

  let peopleCount = 0;
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
    // visitors at the Taj Mahal's pool and at the feet of the arch
    for (let i = 0; i < 14; i++) {
      spots.push({ x: (TAJ.x0 + TAJ.x1) / 2 + (rand() < 0.5 ? -1 : 1) * (1.8 + rand() * 0.7), z: TAJ.z0 + 31.5 + rand() * 10 });
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        spots.push({ x: ARCH.x + (rand() < 0.5 ? -1 : 1) * (2.8 + rand() * 1.1), z: ARCH.z + (side * ARCH.span) / 2 + rand() * 6 - 3 });
      }
      // and under the torii
      for (let i = 0; i < 4; i++) {
        spots.push({ x: TORII.x + (rand() < 0.5 ? -1 : 1) * (1.4 + rand() * 2.4), z: TORII.z + side * (TORII.half + rand() * 1.0 - 0.1) });
      }
    }
    // around the fountain
    for (let i = 0; i < 11; i++) {
      const a = rand() * Math.PI * 2, r = FOUNTAIN.r + 0.9 + rand() * 2.0;
      spots.push({ x: FOUNTAIN.x + Math.cos(a) * r, z: FOUNTAIN.z + Math.sin(a) * r });
    }
    const inBoard = spots.filter((s) => s.x > BOARD.x0 + 0.6 && s.x < BOARD.x1 - 0.6 && s.z > BOARD.z0 + 0.6 && s.z < BOARD.z1 - 0.6 && !onCut(s.x, s.z, 0.8));
    peopleCount = inBoard.length;

    const body = new THREE.BoxGeometry(0.8, 1.9, 0.5).translate(0, 0.95, 0).toNonIndexed();
    const head = new THREE.BoxGeometry(0.56, 0.56, 0.56).translate(0, 2.2, 0).toNonIndexed();
    const tagPart = (g: THREE.BufferGeometry, part: number, color: number) => {
      const n = g.getAttribute('position').count;
      const c = new THREE.Color(color);
      const cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
      return g;
    };
    tagPart(body, 0, 0xffffff);
    tagPart(head, 5, 0xe8c4a0);
    const geo = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'color', 'aPart'] as const) {
      const a = body.getAttribute(name), b = head.getAttribute(name);
      const merged = new Float32Array(a.array.length + b.array.length);
      merged.set(a.array as Float32Array, 0);
      merged.set(b.array as Float32Array, a.array.length);
      geo.setAttribute(name, new THREE.BufferAttribute(merged, a.itemSize));
    }
    const people = new THREE.InstancedMesh(geo, makeVehicleMaterial(), inBoard.length);
    const clothes = [0xd94f4f, 0x3f6fb5, 0xf2c14e, 0x4fa36b, 0xeeeeee, 0x2f2f38, 0xc77dba, 0xf08a4b, 0x7fd0c8];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    inBoard.forEach((s, i) => {
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      const k = 0.9 + rand() * 0.25;
      m4.compose(new THREE.Vector3(s.x, 0.02, s.z), q, new THREE.Vector3(k, k, k));
      people.setMatrixAt(i, m4);
      people.setColorAt(i, col.set(clothes[Math.floor(rand() * clothes.length)]));
    });
    people.frustumCulled = false;
    people.receiveShadow = true;
    group.add(people);
  }

  // -------------------------------------------------------------------------
  // Meshes
  // -------------------------------------------------------------------------

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD.x1 - BOARD.x0, BOARD.z1 - BOARD.z0).rotateX(-Math.PI / 2),
    makeGroundMaterial(),
  );
  ground.receiveShadow = true;
  ground.layers.set(1); // layer 1 is left out of the mirror image used for wet streets
  group.add(ground);

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD.x1 - BOARD.x0 + 7, 9, BOARD.z1 - BOARD.z0 + 7),
    makePropMaterial({ vertexColors: false, color: 0x3a2f2a }),
  );
  slab.position.y = -4.56;
  slab.receiveShadow = true;
  slab.layers.set(1);
  group.add(slab);

  const cityMesh = new THREE.Mesh(cityB.build(), makeCityMaterial());
  cityMesh.castShadow = true;
  cityMesh.receiveShadow = true;
  group.add(cityMesh);

  const deckMesh = new THREE.Mesh(deckB.build(), makeDeckMaterial());
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  group.add(deckMesh);

  const signMat = new THREE.MeshBasicMaterial({ map: atlas.texture, toneMapped: false });
  group.add(new THREE.Mesh(signs.build(), signMat));

  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const glowMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glowMat, glows.length);
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    glows.forEach((g, i) => {
      m4.compose(new THREE.Vector3(g.x, g.y, g.z), q, new THREE.Vector3(g.sx, g.sy, g.sz));
      glowMesh.setMatrixAt(i, m4);
      glowMesh.setColorAt(i, col.set(g.color));
    });
  }
  glowMesh.frustumCulled = false;
  group.add(glowMesh);

  U.uLightMap.value = buildLightMap(lights);

  const haloA = new THREE.Color('#ff3d9a'), haloB = new THREE.Color('#35e0ff');
  return {
    group,
    turntable,
    setNight(night: number, time: number) {
      signMat.color.setScalar(0.8 + 1.8 * night);
      glowMat.color.setScalar(0.45 + 3.0 * night);
      const mix = 0.5 + 0.5 * Math.sin(time * 0.25);
      haloMat.color.copy(haloA).lerp(haloB, mix).multiplyScalar(0.55 + 3.2 * night);
    },
    stats: { triangles: cityB.triangles + deckB.triangles, signs: SIGN_COUNT(signs), glows: glows.length, trees: treeCount, people: peopleCount },
  };
}

function SIGN_COUNT(s: SignBuilder): number {
  return s.build().getAttribute('position').count / 6;
}
