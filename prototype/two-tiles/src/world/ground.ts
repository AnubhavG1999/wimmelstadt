// A tile's ground: its relief, its water, and the paint on it. Built from the
// tile's plan, in the tile's own units; the caller stands it where the tile is.
//
// The ground is one surface. Water is where that surface dips below the water's
// level, with a steep bank that reads as a quay. Streets, lawns and kerbs are
// painted on it.

import * as THREE from 'three';
import { TILE, type Shape, type Street, type TilePlan } from '../city/plan.ts';
import { LOOK, gradientMap } from '../look/shared.ts';

/** Where the water's surface lies, and how deep its bed is. */
export const WATER_LEVEL = -0.9;
const BED = -2.8;

/** How finely the plan's shapes are measured, in dots to a unit, and how finely the ground is painted. */
const MEASURE = 2, PAINT = 4;
/** One corner of ground every STEP units. */
const STEP = TILE / 200;

const PAVING = '#c0b8a8', KERB = '#a39b8c', ASPHALT = '#4b4e55', GRASS = '#7fb866', QUAY = '#a8a294', LINE = '#e9e4d6';

export interface Ground {
  plan: TilePlan;
  /** The ground and the water, built round the tile's north-west corner. */
  group: THREE.Group;
  /** How high the ground is at a place on the tile. Below the water's level it is a bed. */
  heightAt(x: number, z: number): number;
  /** Whether a place on the tile is water. */
  wetAt(x: number, z: number): boolean;
}

/** Fills a shape, or draws it as a line, in the current colours. */
export function draw(g: CanvasRenderingContext2D, s: Shape, k: number): void {
  g.beginPath();
  if ('outline' in s) {
    s.outline.forEach(([x, z], i) => (i ? g.lineTo(x * k, z * k) : g.moveTo(x * k, z * k)));
    g.closePath();
    g.fill();
  } else if ('round' in s) {
    g.ellipse(s.round[0] * k, s.round[1] * k, s.rx * k, s.rz * k, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    s.line.forEach(([x, z], i) => (i ? g.lineTo(x * k, z * k) : g.moveTo(x * k, z * k)));
    g.lineWidth = s.width * k;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
  }
}

const sheet = (size: number): CanvasRenderingContext2D => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c.getContext('2d', { willReadFrequently: true })!;
};

function trace(g: CanvasRenderingContext2D, s: Street, k: number): void {
  g.beginPath();
  s.path.forEach(([x, z], i) => (i ? g.lineTo(x * k, z * k) : g.moveTo(x * k, z * k)));
  if (s.closed) g.closePath();
}

/** Paints the tile's ground: paving, lawns, quays and every street. */
function paint(plan: TilePlan): HTMLCanvasElement {
  const k = PAINT, g = sheet(TILE * k);
  g.fillStyle = PAVING;
  g.fillRect(0, 0, TILE * k, TILE * k);
  // the beds and banks of the water are stone; the water itself lies over them
  g.fillStyle = g.strokeStyle = QUAY;
  for (const s of plan.water) draw(g, 'line' in s ? { ...s, width: s.width + 2 } : s, k);
  g.fillStyle = g.strokeStyle = PAVING;
  for (const s of plan.land) draw(g, s, k);
  g.fillStyle = g.strokeStyle = GRASS;
  for (const s of plan.parks) draw(g, s, k);

  g.lineJoin = 'round';
  g.lineCap = 'butt';
  const order: Street['kind'][] = ['lane', 'street', 'route', 'boulevard'];
  for (const layer of ['kerb', 'road'] as const) {
    for (const kind of order) {
      for (const s of plan.streets) {
        if (s.kind !== kind) continue;
        trace(g, s, k);
        g.setLineDash([]);
        g.lineCap = s.closed ? 'butt' : 'square';
        if (layer === 'kerb') {
          g.strokeStyle = KERB;
          g.lineWidth = (s.width + 1.4) * k;
        } else {
          g.strokeStyle = kind === 'lane' ? (s.id === 'lombard-street' ? '#b5553c' : '#7f7b74') : kind === 'route' ? '#57514d' : ASPHALT;
          g.lineWidth = s.width * k;
        }
        g.stroke();
      }
    }
  }
  // what is painted on the roads
  g.lineCap = 'butt';
  for (const s of plan.streets) {
    trace(g, s, k);
    if (s.kind === 'boulevard') {
      g.setLineDash([]);
      g.strokeStyle = GRASS;
      g.lineWidth = 1.6 * k;
      g.stroke();
      g.strokeStyle = KERB;
      g.lineWidth = 0.3 * k;
      g.stroke();
    } else if (s.kind === 'route') {
      g.setLineDash([]);
      g.strokeStyle = '#e6b93a';
      g.lineWidth = 0.7 * k;
      g.stroke();
      g.strokeStyle = '#57514d';
      g.lineWidth = 0.25 * k;
      g.stroke();
    } else if (s.kind === 'street' && s.width >= 6) {
      g.setLineDash([2.2 * k, 2.2 * k]);
      g.strokeStyle = LINE;
      g.lineWidth = 0.28 * k;
      g.stroke();
    }
  }
  // tram rails, laid in the street
  g.setLineDash([]);
  for (const r of plan.rails) {
    if (r.kind !== 'tram') continue;
    for (const off of [-0.55, 0.55]) {
      g.beginPath();
      r.path.forEach(([x, z], i) => {
        // each rail lies to one side of the line, square to the way it runs
        const a = r.path[Math.max(0, i - 1)], b = r.path[Math.min(r.path.length - 1, i + 1)];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const px = (x - ((b[1] - a[1]) / l) * off) * k, pz = (z + ((b[0] - a[0]) / l) * off) * k;
        if (i) g.lineTo(px, pz);
        else g.moveTo(px, pz);
      });
      g.strokeStyle = '#2b2d32';
      g.lineWidth = 0.22 * k;
      g.stroke();
    }
  }
  return g.canvas;
}

export function buildGround(plan: TilePlan, anisotropy: number): Ground {
  // --- where the water is: measured from the plan's shapes, with soft edges ---
  const size = TILE * MEASURE;
  const sharp = sheet(size);
  sharp.fillStyle = '#000';
  sharp.fillRect(0, 0, size, size);
  sharp.fillStyle = sharp.strokeStyle = '#fff';
  for (const s of plan.water) draw(sharp, s, MEASURE);
  sharp.fillStyle = sharp.strokeStyle = '#000';
  for (const s of plan.land) draw(sharp, s, MEASURE);
  const soft = sheet(size);
  soft.filter = 'blur(1.6px)';
  soft.drawImage(sharp.canvas, 0, 0);
  const wet = soft.getImageData(0, 0, size, size).data;
  const wetness = (x: number, z: number): number => {
    const i = Math.min(size - 1, Math.max(0, Math.round(x * MEASURE))), j = Math.min(size - 1, Math.max(0, Math.round(z * MEASURE)));
    return wet[(j * size + i) * 4] / 255;
  };
  const heightAt = (x: number, z: number): number => {
    let h = 0;
    for (const hill of plan.hills) {
      const t = Math.hypot(x - hill.at[0], z - hill.at[1]) / hill.r;
      if (t < 1) h += hill.h * (1 - t * t) ** 2;
    }
    const w = Math.min(1, Math.max(0, (wetness(x, z) - 0.3) / 0.4)), bank = w * w * (3 - 2 * w);
    return h * (1 - bank) + BED * bank;
  };

  // --- the ground itself ---
  const n = Math.round(TILE / STEP) + 1;
  const pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i, x = Math.min(TILE, i * STEP), z = Math.min(TILE, j * STEP);
      pos[k * 3] = x;
      pos[k * 3 + 1] = heightAt(x, z);
      pos[k * 3 + 2] = z;
      uv[k * 2] = x / TILE;
      uv[k * 2 + 1] = 1 - z / TILE;
    }
  }
  const index = new Uint32Array((n - 1) * (n - 1) * 6);
  let q = 0;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + n, c = a + 1, d = b + 1;
      index[q++] = a; index[q++] = b; index[q++] = c;
      index[q++] = c; index[q++] = b; index[q++] = d;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeVertexNormals();

  const map = new THREE.CanvasTexture(paint(plan));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  const material = new THREE.MeshToonMaterial({ map, gradientMap });
  // snow lies on the ground when the weather has brought it
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = LOOK.uSnow;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uSnow;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), uSnow * 0.86);`);
  };
  const land = new THREE.Mesh(geo, material);
  land.name = `${plan.id}: ground`;
  land.receiveShadow = true;

  const group = new THREE.Group();
  group.add(land);
  if (plan.water.length) {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(TILE, TILE), new THREE.MeshToonMaterial({ color: '#2f78ad', gradientMap }));
    water.name = `${plan.id}: water`;
    water.rotation.x = -Math.PI / 2;
    water.position.set(TILE / 2, WATER_LEVEL, TILE / 2);
    water.receiveShadow = true;
    group.add(water);
  }
  return { plan, group, heightAt, wetAt: (x, z) => heightAt(x, z) < WATER_LEVEL };
}
