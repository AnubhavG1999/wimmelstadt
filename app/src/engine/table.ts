// The table the tiles stand on: a bed of felt in a wooden tray, like the table
// a board game is played on. And the brass plate on a tile's base that says
// which place it is.

import * as THREE from 'three';
import { GeoBuilder } from './geo';
import { toon } from './look/materials';
import { roomToon } from './room/look';
import type { Rect } from './tile';

/** How far the felt reaches beyond the outermost bases, and how wide the wooden edge round it is. */
const FELT = 24, EDGE = 11;
/** How far the wooden edge stands above the height the bases rest at, and how far the table reaches below it. Its underside is what it stands on: the desk. */
export const TABLE = { lip: 3.2, under: 7 };
// quiet colours: the table is there to set the tiles off, not to be looked at
const BAIZE = 0x234539, WOOD = 0x6a4830, WOOD_TOP = 0x7d563a, WOOD_DARK = 0x513622;

/**
 * The table. `bases` is the ground the tiles' bases cover between them, and
 * `y` is the height their undersides rest at. Returns the table and the
 * ground it covers.
 */
export function buildTable(bases: Rect, y: number): { mesh: THREE.Mesh; rect: Rect } {
  const b = new GeoBuilder();
  const f: Rect = { x0: bases.x0 - FELT, z0: bases.z0 - FELT, x1: bases.x1 + FELT, z1: bases.z1 + FELT };
  const t: Rect = { x0: f.x0 - EDGE, z0: f.z0 - EDGE, x1: f.x1 + EDGE, z1: f.z1 + EDGE };
  // the felt, a hair below the bases so that the two never share a surface
  b.box(f.x0, y - 6, f.z0, f.x1, y - 0.02, f.z1, BAIZE, { faces: 'T' });
  // the wooden edge round it: a lighter top, and darker inner faces where the felt meets it
  const top = y + TABLE.lip, bottom = y - TABLE.under;
  b.box(t.x0, bottom, t.z0, t.x1, top, f.z0, WOOD, { top: WOOD_TOP, faces: 'NEWT' });
  b.box(t.x0, bottom, f.z1, t.x1, top, t.z1, WOOD, { top: WOOD_TOP, faces: 'SEWT' });
  b.box(t.x0, bottom, f.z0, f.x0, top, f.z1, WOOD, { top: WOOD_TOP, faces: 'WT' });
  b.box(f.x1, bottom, f.z0, t.x1, top, f.z1, WOOD, { top: WOOD_TOP, faces: 'ET' });
  b.box(f.x0, y - 0.02, f.z0 - 0.01, f.x1, top, f.z0, WOOD_DARK, { faces: 'S' });
  b.box(f.x0, y - 0.02, f.z1, f.x1, top, f.z1 + 0.01, WOOD_DARK, { faces: 'N' });
  b.box(f.x0 - 0.01, y - 0.02, f.z0, f.x0, top, f.z1, WOOD_DARK, { faces: 'E' });
  b.box(f.x1, y - 0.02, f.z0, f.x1 + 0.01, top, f.z1, WOOD_DARK, { faces: 'W' });
  // and its underside, for when the view looks along the table's edge
  b.box(t.x0, bottom, t.z0, t.x1, bottom + 0.01, t.z1, WOOD_DARK, { faces: 'B' });
  // (the room's own material, so that the lamps on the desk light the felt as they light the map)
  const mesh = new THREE.Mesh(b.build(), roomToon());
  mesh.receiveShadow = true;
  mesh.layers.set(1); // layer 1 is left out of the mirror image used for wet streets
  return { mesh, rect: t };
}

/** The lettering of a nameplate, drawn once for each tile. */
function plateTexture(name: string): THREE.CanvasTexture {
  const W = 1024, H = 112;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  // brushed brass: lighter along the top, darker along the bottom
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#e2c476');
  g.addColorStop(0.5, '#c9a352');
  g.addColorStop(1, '#a8833c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(60, 42, 14, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(9, 9, W - 18, H - 18);
  // a screw at each end
  for (const x of [34, W - 34]) {
    ctx.fillStyle = '#8a6a2e';
    ctx.beginPath();
    ctx.arc(x, H / 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c4418';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 6, H / 2 - 4);
    ctx.lineTo(x + 6, H / 2 + 4);
    ctx.stroke();
  }
  // the name, engraved: dark letters with a thin light edge below them
  const text = name.toUpperCase().split('').join(' ');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 62;
  do {
    ctx.font = `700 ${size}px Georgia, "Times New Roman", serif`;
    size -= 2;
  } while (ctx.measureText(text).width > W - 150 && size > 20);
  ctx.fillStyle = 'rgba(255, 236, 176, 0.55)';
  ctx.fillText(text, W / 2, H / 2 + 5);
  ctx.fillStyle = '#3a2a10';
  ctx.fillText(text, W / 2, H / 2 + 3);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * A tile's name on a brass plate, on each side of its base. `base` is the
 * ground the base covers, and the plate sits half way between `top` and
 * `bottom`.
 */
export function nameplates(name: string, base: Rect, top: number, bottom: number): THREE.Mesh {
  const w = 50, h = (w * 112) / 1024, out = 0.14;
  const cx = (base.x0 + base.x1) / 2, cz = (base.z0 + base.z1) / 2, y0 = (top + bottom) / 2 - h / 2, y1 = y0 + h;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  // each side: where its middle is, which way it faces, and which way its lettering runs
  const sides: [number, number, number, number, number, number][] = [
    [cx, base.z1 + out, 0, 1, 1, 0], // south
    [cx, base.z0 - out, 0, -1, -1, 0], // north
    [base.x1 + out, cz, 1, 0, 0, -1], // east
    [base.x0 - out, cz, -1, 0, 0, 1], // west
  ];
  for (const [px, pz, nx, nz, rx, rz] of sides) {
    const ax = px - (rx * w) / 2, az = pz - (rz * w) / 2, bx = px + (rx * w) / 2, bz = pz + (rz * w) / 2;
    // two triangles, wound so that the plate faces outwards
    const corners: [number, number, number, number, number][] = [
      [ax, y0, az, 0, 0], [bx, y0, bz, 1, 0], [bx, y1, bz, 1, 1],
      [ax, y0, az, 0, 0], [bx, y1, bz, 1, 1], [ax, y1, az, 0, 1],
    ];
    for (const [x, y, z, u, v] of corners) {
      pos.push(x, y, z);
      nor.push(nx, 0, nz);
      uv.push(u, v);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geo, toon({ vertexColors: false, map: plateTexture(name), side: THREE.DoubleSide }));
  mesh.layers.set(1);
  return mesh;
}
