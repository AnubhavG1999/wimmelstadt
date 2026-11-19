// Starts a tile's build and finishes it: hands the tile what it builds with,
// then turns what it collected into a handful of meshes.

import * as THREE from 'three';
import { GeoBuilder, rng } from './geo';
import { finishStreets } from './roads';
import { FACE_NORMAL, SignBuilder, buildSignAtlas } from './signs';
import { makeTileLook, tileMaterials, type TileLook } from './look/materials';
import { TILE, type Build, type Light, type Rect, type TileDef } from './tile';

interface Spot { x: number; y: number; z: number }
interface TreeSpot extends Spot { s: number; tall: boolean }
interface LampSpot extends Spot { yaw: number }

/** A tile that has been built: everything on it that stands still. */
export interface Standing {
  /** In the tile's own coordinates, and placed where the tile stands. */
  group: THREE.Group;
  look: TileLook;
  /** Whether it has water, or anything else that mirrors the city whatever the weather. */
  mirrors: boolean;
  /** Brightens signs and lamps as night falls, and runs whatever the tile asked to have run. */
  frame(dt: number, time: number, night: number): void;
  stats: { triangles: number; signs: number; glows: number; trees: number; people: number };
}

function rgba(hex: string, a: number): string {
  const c = new THREE.Color(hex);
  const h = c.getHex(THREE.SRGBColorSpace);
  return `rgba(${(h >> 16) & 255},${(h >> 8) & 255},${h & 255},${a})`;
}

/** Paints every light source onto a small map of the tile. Shaders read it at night. */
function buildLightMap(lights: Light[], board: Rect): THREE.CanvasTexture {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  const sx = S / (board.x1 - board.x0), sz = S / (board.z1 - board.z0);
  ctx.setTransform(sx, 0, 0, sz, -board.x0 * sx, -board.z0 * sz);
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

/**
 * The base a tile stands on, like a model on a table: how far it reaches
 * beyond the tile's ground on every side, where its top and its underside
 * are, how deep the hollow under the ground is (for water), and its colour.
 */
export const BASE = { rim: 3.5, top: -0.06, bottom: -9.06, floor: -2.4, color: 0x3a2f2a };

/**
 * Builds something somewhere else. Whatever `fn` adds, as if around (0, 0), is
 * turned by `turn` degrees and moved to (x, y, z): its shapes, its signs, its
 * lights, its trees and its people. For a model that was written to stand at
 * the origin, and for anything that should not be square to the tile.
 */
export function placed(k: Build, x: number, z: number, turn: number, fn: (k: Build) => void, y = 0): void {
  const yaw = THREE.MathUtils.degToRad(turn), c = Math.cos(yaw), s = Math.sin(yaw);
  const at = (px: number, pz: number): [number, number] => [x + px * c - pz * s, z + px * s + pz * c];
  const inner: Build = {
    ...k,
    glows: [],
    lights: [],
    sign: (id, sx, sy, sz, nx, nz, h, maxW) => {
      const [ax, az] = at(sx, sz);
      return k.sign(id, ax, sy + y, az, nx * c - nz * s, nx * s + nz * c, h, maxW);
    },
    tree: (tx, tz, size, tall, ty = 0) => k.tree(...at(tx, tz), size, tall, ty + y),
    person: (px, pz, py = 0) => k.person(...at(px, pz), py + y),
    lamp: (lx, lz, lyaw, ly = 0) => k.lamp(...at(lx, lz), lyaw + yaw, ly + y),
    signs: {
      atlas: k.signs.atlas,
      add: (id, cx, cy, cz, face, h, maxW) => inner.sign(id, cx, cy, cz, FACE_NORMAL[face][0], FACE_NORMAL[face][2], h, maxW),
      addFacing: (id, cx, cy, cz, nx, nz, h, maxW) => inner.sign(id, cx, cy, cz, nx, nz, h, maxW),
    },
  };
  k.b.moved(x, y, z, yaw, () => k.deck.moved(x, y, z, yaw, () => k.street.moved(x, y, z, yaw, () => fn(inner))));
  // a quarter turn swaps which way a strip of light runs
  const swapped = Math.abs(s) > Math.SQRT1_2;
  for (const g of inner.glows) {
    const [ax, az] = at(g.x, g.z);
    k.glows.push({ ...g, x: ax, y: g.y + y, z: az, sx: swapped ? g.sz : g.sx, sz: swapped ? g.sx : g.sz });
  }
  for (const l of inner.lights) {
    const [ax, az] = at(l.x, l.z);
    k.lights.push({ ...l, x: ax, z: az });
  }
  if (inner.mirrors) k.mirrors = true;
}

/**
 * Starts the build of a tile that stands with the middle of its board at
 * (ox, oz) in the city. Returns what the tile builds with, and the step that
 * finishes the build once the tile has added everything.
 */
export function startBuild(def: TileDef, ox: number, oz: number): { k: Build; finish(): Standing } {
  const board = TILE;
  const group = new THREE.Group();
  group.position.set(ox, 0, oz);
  const look = makeTileLook(board, ox, oz);
  const mat = tileMaterials(look);
  const signs = new SignBuilder(buildSignAtlas(def.signs));
  const trees: TreeSpot[] = [], people: Spot[] = [], lamps: LampSpot[] = [];
  const frames: ((dt: number, time: number, night: number) => void)[] = [];

  const k: Build = {
    board,
    b: new GeoBuilder(),
    deck: new GeoBuilder(),
    street: new GeoBuilder(),
    glows: [],
    lights: [],
    signs,
    sign: (id, x, y, z, nx, nz, h, maxW) => signs.addFacing(id, x, y, z, nx, nz, h, maxW),
    tree: (x, z, s, tall = false, y = 0) => void trees.push({ x, y, z, s, tall }),
    person: (x, z, y = 0) => void people.push({ x, y, z }),
    lamp: (x, z, yaw, y = 0) => {
      lamps.push({ x, y, z, yaw });
      // the lamp hangs at the end of the arm, and throws a pool of light below it
      const bx = x + Math.cos(yaw) * 2.0, bz = z + Math.sin(yaw) * 2.0;
      k.glows.push({ x: bx, y: y + 7.62, z: bz, sx: 0.7, sy: 0.22, sz: 0.7, color: '#ffd9a0' });
      k.lights.push({ x: bx, z: bz, r: 13, color: '#ffc98a', k: 0.5 });
    },
    rand: rng(def.seed),
    group,
    mat,
    look,
    each: (fn) => void frames.push(fn),
    mirrors: false,
  };

  const finish = (): Standing => {
    // Props are placed with random numbers of their own, so that how many of
    // one kind a tile has does not change where the others stand.
    const rand = rng(def.seed ^ 0x51ed270b);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);

    // The base the tile stands on, like a model on a table: a frame round the
    // ground, and a floor well below it, so that water can lie in a hollow.
    const base = new GeoBuilder();
    const { rim, top, bottom, floor, color } = BASE;
    base.box(board.x0 - rim, bottom, board.z0 - rim, board.x1 + rim, top, board.z0, color);
    base.box(board.x0 - rim, bottom, board.z1, board.x1 + rim, top, board.z1 + rim, color);
    base.box(board.x0 - rim, bottom, board.z0, board.x0, top, board.z1, color);
    base.box(board.x1, bottom, board.z0, board.x1 + rim, top, board.z1, color);
    base.box(board.x0, bottom, board.z0, board.x1, floor, board.z1, color, { faces: 'T' });
    const slab = new THREE.Mesh(base.build(), mat.prop());
    slab.receiveShadow = true;
    slab.layers.set(1); // layer 1 is left out of the mirror image used for wet streets
    group.add(slab);

    const cityMesh = new THREE.Mesh(k.b.build(), mat.city());
    cityMesh.castShadow = true;
    cityMesh.receiveShadow = true;
    group.add(cityMesh);

    if (k.deck.triangles > 0) {
      const deckMesh = new THREE.Mesh(k.deck.build(), mat.deck());
      deckMesh.castShadow = true;
      deckMesh.receiveShadow = true;
      group.add(deckMesh);
    }
    // where streets cross, their junctions are cleared and given zebra crossings
    finishStreets(k);
    if (k.street.triangles > 0) {
      const streetMesh = new THREE.Mesh(k.street.build(), mat.street());
      streetMesh.receiveShadow = true;
      streetMesh.layers.set(1);
      group.add(streetMesh);
    }

    const signMat = new THREE.MeshBasicMaterial({ map: signs.atlas.texture, toneMapped: false });
    group.add(new THREE.Mesh(signs.build(), signMat));

    // street lamps
    if (lamps.length > 0) {
      const pb = new GeoBuilder();
      pb.box(-0.18, 0, -0.18, 0.18, 8, 0.18, 0x4b4f57);
      pb.box(0, 7.75, -0.14, 2.3, 8.0, 0.14, 0x4b4f57, { faces: 'NESWTB' });
      const posts = new THREE.InstancedMesh(pb.build(), mat.prop(), lamps.length);
      lamps.forEach((s, i) => {
        // turning by -yaw around the vertical axis points the arm along (cos yaw, sin yaw)
        q.setFromAxisAngle(up, -s.yaw);
        m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, one);
        posts.setMatrixAt(i, m4);
      });
      posts.frustumCulled = false;
      group.add(posts);
    }

    // trees
    if (trees.length > 0) {
      const trunkGeo = new THREE.CylinderGeometry(0.38, 0.5, 2.8, 6).translate(0, 1.4, 0);
      const crownGeo = new THREE.IcosahedronGeometry(2.7, 0).scale(1, 0.9, 1).translate(0, 4.5, 0);
      const trunks = new THREE.InstancedMesh(trunkGeo, mat.prop({ vertexColors: false, color: 0x7a5a3c }), trees.length);
      const crowns = new THREE.InstancedMesh(crownGeo, mat.prop({ vertexColors: false, color: 0xffffff }), trees.length);
      const greens = [0x5f9f4e, 0x6fae58, 0x4f8f4a, 0x7fb85f, 0x5a9a5a];
      trees.forEach((t, i) => {
        q.setFromAxisAngle(up, rand() * Math.PI * 2);
        const size = t.tall ? new THREE.Vector3(t.s * 0.42, t.s * 1.3, t.s * 0.42) : new THREE.Vector3(t.s, t.s * (0.9 + rand() * 0.3), t.s);
        m4.compose(new THREE.Vector3(t.x, t.y, t.z), q, size);
        trunks.setMatrixAt(i, m4);
        crowns.setMatrixAt(i, m4);
        // most are green, a few are in blossom and a few have turned
        const pick = rand();
        col.set(t.tall ? 0x3f7a4a : pick < 0.12 ? 0xf2a7c3 : pick < 0.18 ? 0xe8a23d : greens[Math.floor(rand() * greens.length)]);
        crowns.setColorAt(i, col);
      });
      crowns.castShadow = true;
      crowns.receiveShadow = true;
      trunks.frustumCulled = crowns.frustumCulled = false;
      group.add(trunks, crowns);
    }

    // people: still figures, as on a model railway
    if (people.length > 0) {
      const body = new THREE.BoxGeometry(0.8, 1.9, 0.5).translate(0, 0.95, 0).toNonIndexed();
      const head = new THREE.BoxGeometry(0.56, 0.56, 0.56).translate(0, 2.2, 0).toNonIndexed();
      const tagPart = (g: THREE.BufferGeometry, part: number, color: number): void => {
        const n = g.getAttribute('position').count;
        const c = new THREE.Color(color);
        const cols = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
        g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
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
      const figures = new THREE.InstancedMesh(geo, mat.vehicle(), people.length);
      const clothes = [0xd94f4f, 0x3f6fb5, 0xf2c14e, 0x4fa36b, 0xeeeeee, 0x2f2f38, 0xc77dba, 0xf08a4b, 0x7fd0c8];
      people.forEach((s, i) => {
        q.setFromAxisAngle(up, rand() * Math.PI * 2);
        const size = 0.9 + rand() * 0.25;
        m4.compose(new THREE.Vector3(s.x, s.y + 0.02, s.z), q, new THREE.Vector3(size, size, size));
        figures.setMatrixAt(i, m4);
        figures.setColorAt(i, col.set(clothes[Math.floor(rand() * clothes.length)]));
      });
      figures.frustumCulled = false;
      figures.receiveShadow = true;
      group.add(figures);
    }

    // everything that glows, last, because lamps add to it
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const glowMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glowMat, Math.max(1, k.glows.length));
    glowMesh.count = k.glows.length;
    q.identity();
    k.glows.forEach((g, i) => {
      m4.compose(new THREE.Vector3(g.x, g.y, g.z), q, new THREE.Vector3(g.sx, g.sy, g.sz));
      glowMesh.setMatrixAt(i, m4);
      glowMesh.setColorAt(i, col.set(g.color));
    });
    glowMesh.frustumCulled = false;
    group.add(glowMesh);

    look.uLightMap.value = buildLightMap(k.lights, board);

    return {
      group,
      look,
      mirrors: k.mirrors,
      frame(dt, time, night) {
        signMat.color.setScalar(0.8 + 1.8 * night);
        glowMat.color.setScalar(0.45 + 3.0 * night);
        for (const fn of frames) fn(dt, time, night);
      },
      stats: { triangles: k.b.triangles + k.deck.triangles + k.street.triangles, signs: signs.count, glows: k.glows.length, trees: trees.length, people: people.length },
    };
  };

  return { k, finish };
}
