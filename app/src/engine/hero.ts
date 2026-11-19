// Heroes: the vehicles that stand for the collector's own diecasts.
//
// A generated model arrives looking like a photograph: glossy, with the studio's
// reflections and shadows printed into its texture. Dropped into the city like
// that it would read as a sticker driving around. So a hero is drawn in the
// city's own hand: the same flat bands of light, the texture's brightness ironed
// into a few steps (which removes photographed shine but keeps the edges of
// decals), and a dark outline. This follows the "city look" of the generator
// trial in prototype/hero.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { looseLook, makeModelMaterial, type TileLook } from './look/materials';

export interface HeroInfo {
  capture: string;
  name: string;
  model: string;
  triangles: number;
  /** The toy's length in centimetres, which is its length in the city. */
  length: number;
  /** Quarter turns that bring the model's nose to the front. */
  turn: number;
}

export interface LoadedHero {
  info: HeroInfo;
  /** The hero, standing on y = 0 with its nose along +x. */
  body: THREE.Group;
  /** How long and how wide it is. */
  length: number;
  width: number;
  /** Which tile's lamps and signs light it. Set when it is put on a tile. */
  look: TileLook;
}

/** The outline: the model's back faces, pushed outwards by about a pixel and a half and drawn dark. */
const outlineSize = { value: new THREE.Vector2(0.002, 0.002) };
const outline = new THREE.MeshBasicMaterial({ color: '#14161b', side: THREE.BackSide });
outline.onBeforeCompile = (shader) => {
  shader.uniforms.uOutline = outlineSize;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform vec2 uOutline;')
    .replace('#include <project_vertex>', `#include <project_vertex>
      vec4 outwards = projectionMatrix * vec4(normalize(normalMatrix * normal), 0.0);
      if (dot(outwards.xy, outwards.xy) > 1e-10) gl_Position.xy += normalize(outwards.xy) * uOutline * gl_Position.w;`);
};

/** Keeps the outline the same width on screen, whatever the size of the picture. */
export function sizeOutline(widthPx: number, heightPx: number): void {
  outlineSize.value.set(3 / Math.max(1, widthPx), 3 / Math.max(1, heightPx));
}

function cityLook(look: TileLook, source: THREE.Material): THREE.Material {
  const s = source as THREE.MeshStandardMaterial;
  return makeModelMaterial(look, s.map ?? null, s.color ? s.color.clone() : new THREE.Color('#ffffff'), s.side);
}

/** Stands a model on the ground, nose along +x, at its toy's length, and dresses it in the city's look. */
function settle(root: THREE.Object3D, info: HeroInfo): LoadedHero {
  const look = looseLook();
  const hulls: [THREE.Mesh, THREE.Mesh][] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => cityLook(look, m)) : cityLook(look, mesh.material);
    mesh.receiveShadow = true;
    if (mesh.geometry.getAttribute('normal')) hulls.push([mesh, new THREE.Mesh(mesh.geometry, outline)]);
  });
  // attached only now: adding them during the walk above would have the walk visit them too
  for (const [mesh, hull] of hulls) mesh.add(hull);

  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  // a car is lower than it is wide: whichever side is shortest should point up
  if (size.x < size.y && size.x <= size.z) root.rotation.z = Math.PI / 2;
  else if (size.z < size.y && size.z < size.x) root.rotation.x = Math.PI / 2;
  root.updateMatrixWorld(true);
  const turned = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  if (turned.z > turned.x) root.rotation.y += Math.PI / 2;
  root.rotation.y += (info.turn * Math.PI) / 2;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const k = info.length / Math.max(s.x, s.z, 1e-6);
  root.scale.multiplyScalar(k);
  root.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  const body = new THREE.Group();
  body.name = info.name;
  body.add(root);
  return { info, body, length: Math.max(s.x, s.z) * k, width: Math.min(s.x, s.z) * k, look };
}

/**
 * Loads every hero the development server has. A built copy of the app has
 * none yet, and that is not an error: the city simply has traffic and no heroes.
 */
export async function loadHeroes(): Promise<LoadedHero[]> {
  // a built copy does not go looking for them: there is nowhere for it to find any
  if (!import.meta.env.DEV) return [];
  let list: HeroInfo[];
  try {
    const res = await fetch('captures/heroes.json');
    if (!res.ok || !(res.headers.get('Content-Type') ?? '').includes('json')) return [];
    list = (await res.json()) as HeroInfo[];
  } catch {
    return [];
  }
  const loader = new GLTFLoader();
  const heroes: LoadedHero[] = [];
  for (const info of list) {
    try {
      const gltf = await loader.loadAsync(`captures/${info.capture}/hero/${info.model}`);
      heroes.push(settle(gltf.scene, info));
    } catch (e) {
      console.warn(`Could not load the hero of ${info.capture}`, e);
    }
  }
  return heroes;
}
