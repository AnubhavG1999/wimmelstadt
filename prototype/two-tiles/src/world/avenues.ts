// The avenues, and the board the whole city stands on. An avenue runs between
// every two tiles and round the outside, and belongs to the city, not to a tile.
//
// For now all the avenues share one painting. That will not do for a city of
// twenty-three: each avenue then wants a painting of its own.

import * as THREE from 'three';
import { AVENUES, BOUNDS, CITY, COLS, PITCH, ROWS, origin } from '../city/city.ts';
import { AVENUE, TILE } from '../city/plan.ts';
import { LOOK, gradientMap } from '../look/shared.ts';

const PAINT = 4;

export function buildAvenues(anisotropy: number): THREE.Group {
  const wide = BOUNDS.x1 - BOUNDS.x0, deep = BOUNDS.z1 - BOUNDS.z0;
  const c = document.createElement('canvas');
  c.width = wide * PAINT;
  c.height = deep * PAINT;
  const g = c.getContext('2d')!;
  const X = (x: number): number => (x - BOUNDS.x0) * PAINT, Z = (z: number): number => (z - BOUNDS.z0) * PAINT;
  g.fillStyle = '#4b4e55';
  g.fillRect(0, 0, c.width, c.height);
  // a kerb round every tile, where its pavement meets the avenue
  g.strokeStyle = '#a39b8c';
  g.lineWidth = 1.4 * PAINT;
  for (const t of CITY) {
    const [x, z] = origin(t);
    g.strokeRect(X(x) - 0.7 * PAINT, Z(z) - 0.7 * PAINT, (TILE + 1.4) * PAINT, (TILE + 1.4) * PAINT);
  }
  // a broken line down the middle of each avenue
  g.strokeStyle = '#e9e4d6';
  g.lineWidth = 0.3 * PAINT;
  g.setLineDash([2.4 * PAINT, 2.4 * PAINT]);
  for (const a of AVENUES) {
    g.beginPath();
    g.moveTo(X(a.from[0]), Z(a.from[1]));
    g.lineTo(X(a.to[0]), Z(a.to[1]));
    g.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  const material = new THREE.MeshToonMaterial({ map, gradientMap });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnow = LOOK.uSnow;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uSnow;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.98), uSnow * 0.7);`);
  };
  // The road is laid only where the avenues are. Under a tile there is nothing, because a
  // tile's own ground dips below the road's level wherever it has water.
  const pos: number[] = [], uv: number[] = [], index: number[] = [];
  const strip = (x0: number, z0: number, x1: number, z1: number): void => {
    const k = pos.length / 3;
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) {
      pos.push(x, -0.02, z);
      uv.push((x - BOUNDS.x0) / wide, 1 - (z - BOUNDS.z0) / deep);
    }
    index.push(k, k + 3, k + 1, k + 1, k + 3, k + 2);
  };
  for (let i = 0; i <= COLS; i++) strip(i * PITCH - AVENUE, BOUNDS.z0, i * PITCH, BOUNDS.z1);
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i < COLS; i++) strip(i * PITCH, j * PITCH - AVENUE, i * PITCH + TILE, j * PITCH);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const road = new THREE.Mesh(geo, material);
  road.name = 'avenues';
  road.receiveShadow = true;

  // the board under it all: its top lies below every tile's water, and its edge shows all round
  const stone = new THREE.MeshToonMaterial({ color: '#b9b2a2', gradientMap });
  const cx = (BOUNDS.x0 + BOUNDS.x1) / 2, cz = (BOUNDS.z0 + BOUNDS.z1) / 2;
  const board = new THREE.Mesh(new THREE.BoxGeometry(wide + 6, 3, deep + 6), stone);
  board.name = 'board';
  board.position.set(cx, -4.6, cz);
  board.receiveShadow = true;
  const group = new THREE.Group();
  group.add(board, road);
  // and a wall from the road down to it, all the way round
  for (const [w, d, x, z] of [[wide + 1.2, 0.6, cx, BOUNDS.z0 - 0.3], [wide + 1.2, 0.6, cx, BOUNDS.z1 + 0.3], [0.6, deep, BOUNDS.x0 - 0.3, cz], [0.6, deep, BOUNDS.x1 + 0.3, cz]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3.1, d), stone);
    wall.position.set(x, -1.57, z);
    group.add(wall);
  }
  return group;
}
