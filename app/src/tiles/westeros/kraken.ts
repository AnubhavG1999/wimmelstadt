// The kraken in the Sunset Sea.
//
// The channel between the Hightower and Lannisport is a long stretch of open
// water, and something lives in it. Most of the time it is a dark shape just
// under the surface that glides up and down the channel, its arms trailing
// behind it. Now and then it stops, the shape gathers, and it comes up: a
// head with one eye to each side, and ten arms that rise out of the sea one
// after another, curl and wave, and go down again. Then it sinks deep, where
// it is hardly seen at all, before it comes back.
//
// The books speak of krakens as the ironborn's arms and as sailors' tales.
// This one is the tile's own drawing.
//
// It is two meshes. The beast itself is one mesh whose parts are placed by
// hand on every frame while it is up, as the dragons' are. Its shape under
// the water is a flat one, drawn dark and thin a hair over the sea, because
// the engine's water is not seen through.

import * as THREE from 'three';
import { GeoBuilder, interior, rng } from '../../engine/geo';
import { lathe } from '../../engine/parts';
import type { Build } from '../../engine/tile';
import { WATER_LEVEL, type P2 } from './plan';

const HIDE = 0x7a2a38, HIDE_DARK = 0x54182a, PALE = 0xdcaa9c, EYE = 0xf2d870, PUPIL = 0x140d0c;

/**
 * Where it swims, as corners: from the Hightower north to Lannisport, in the middle of the channel, and to
 * the north-east of the strip of water that the Hightower itself hides from the view the tile opens with.
 */
const LANE: P2[] = [[-85.5, 71], [-88, 60], [-91, 50], [-94.5, 41]];
/** Where along that way it comes up, as shares of its length: it goes from one to the next, and back. */
const SPOTS = [0.1, 0.46, 0.84];
/** How fast it glides, in units a second. */
const PACE = 2.1;

/** How many arms, how many joints an arm has, and the two that are longer than the rest. */
const ARMS = 10, JOINTS = 6, LONG = 8;
/** How large it is: 1 is a beast whose arms stand four and a half out of the water. */
const SIZE = 1.3;
const isLong = (a: number): boolean => a === 2 || a === 7;

interface Part { start: number; count: number }

/** A place on the lane, by how far along it: where, and which way the lane runs there. */
function onLane(s: number, out: { x: number; z: number; dx: number; dz: number }): void {
  let left = s;
  for (let i = 0; i + 1 < LANE.length; i++) {
    const a = LANE[i], b = LANE[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= l || i + 2 === LANE.length) {
      const u = Math.min(1, Math.max(0, left / l));
      out.x = a[0] + (b[0] - a[0]) * u; out.z = a[1] + (b[1] - a[1]) * u;
      out.dx = (b[0] - a[0]) / l; out.dz = (b[1] - a[1]) / l;
      return;
    }
    left -= l;
  }
}
const LANE_LENGTH = LANE.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - LANE[i][0], p[1] - LANE[i][1]), 0);

const smooth = (t: number): number => {
  const v = Math.min(1, Math.max(0, t));
  return v * v * (3 - 2 * v);
};

export function buildKraken(k: Build): void {
  // --- the beast: its head, and every joint of every arm, each a part with a place of its own in one mesh ---
  const g = new GeoBuilder(), parts: Part[] = [];
  const part = (make: () => void): Part => {
    const start = g.triangles * 3;
    make();
    const p = { start, count: g.triangles * 3 - start };
    parts.push(p);
    return p;
  };
  const head = part(() => {
    const ring = (r: number, y: number): [number, number] => [r * SIZE, y * SIZE];
    lathe(g, 0, 0, [ring(1.4, -1.0), ring(1.62, 0), ring(1.42, 0.8)], 8, HIDE);
    lathe(g, 0, 0, [ring(1.42, 0.8), ring(0.98, 1.5), ring(0.4, 1.9), ring(0.02, 2.02)], 8, HIDE_DARK);
    // an eye to each side: a pale disc that glows a little at night, and a slit in it
    for (const s of [-1, 1]) {
      const a = (s * Math.PI) / 2, cx = Math.cos(a), cz = Math.sin(a);
      g.obox(cx * 1.52 * SIZE, 0.72 * SIZE, cz * 1.52 * SIZE, 0.07, 0.3 * SIZE, 0.34 * SIZE, a, EYE, { win: interior(1), faces: 'B' });
      g.obox(cx * 1.6 * SIZE, 0.72 * SIZE, cz * 1.6 * SIZE, 0.03, 0.25 * SIZE, 0.08 * SIZE, a, PUPIL);
    }
  });
  // one joint of an arm, along +x from its own beginning: the side with the suckers is +y
  const joint = (len: number, r0: number, r1: number, last: boolean): Part => part(() => {
    g.quad([0, r0, -r0], [len, r1, -r1], [len, r1, r1], [0, r0, r0], [0, 1, 0], PALE);
    g.quad([0, -r0, r0], [len, -r1, r1], [len, -r1, -r1], [0, -r0, -r0], [0, -1, 0], HIDE);
    g.quad([0, -r0, -r0], [len, -r1, -r1], [len, r1, -r1], [0, r0, -r0], [0, 0, -1], HIDE_DARK);
    g.quad([0, r0, r0], [len, r1, r1], [len, -r1, r1], [0, -r0, r0], [0, 0, 1], HIDE_DARK);
    if (last) g.quad([len, -r1, -r1], [len, -r1, r1], [len, r1, r1], [len, r1, -r1], [1, 0, 0], HIDE);
  });
  const arms: { joints: Part[]; lens: number[]; phase: number; delay: number }[] = [];
  const chance = rng(7241);
  for (let a = 0; a < ARMS; a++) {
    const n = isLong(a) ? LONG : JOINTS, l0 = (isLong(a) ? 1.2 : 1.02) * SIZE, r = (isLong(a) ? 0.22 : 0.3) * SIZE;
    const joints: Part[] = [], lens: number[] = [];
    for (let j = 0; j < n; j++) {
      const len = l0 * (1 - 0.07 * j), ra = r * (1 - j / n) ** 0.8 + 0.05, rb = r * (1 - (j + 1) / n) ** 0.8 + 0.05, wide = 0.3 * SIZE;
      // the two long arms end in a club: wider at the last joint but one
      const club = isLong(a) && j >= n - 2;
      joints.push(joint(len, club && j === n - 1 ? wide : ra, club ? (j === n - 1 ? 0.06 : wide) : rb, j === n - 1));
      lens.push(len);
    }
    arms.push({ joints, lens, phase: chance() * 6.28, delay: chance() });
  }
  const geo = g.build();
  const position = geo.getAttribute('position') as THREE.BufferAttribute, normal = geo.getAttribute('normal') as THREE.BufferAttribute;
  position.setUsage(THREE.DynamicDrawUsage);
  normal.setUsage(THREE.DynamicDrawUsage);
  const rest = Float32Array.from(position.array as Float32Array), restN = Float32Array.from(normal.array as Float32Array);
  const pos = position.array as Float32Array, nor = normal.array as Float32Array;
  const beast = new THREE.Mesh(geo, k.mat.city());
  beast.name = 'kraken';
  beast.castShadow = true;
  beast.frustumCulled = false;
  beast.visible = false;
  k.group.add(beast);

  /** Puts a part where it belongs: at `p`, with its own x, y and z along the three given ways. */
  const place = (pt: Part, px: number, py: number, pz: number, X: THREE.Vector3, Y: THREE.Vector3, Z: THREE.Vector3): void => {
    for (let i = pt.start * 3, e = (pt.start + pt.count) * 3; i < e; i += 3) {
      const x = rest[i], y = rest[i + 1], z = rest[i + 2];
      pos[i] = px + X.x * x + Y.x * y + Z.x * z;
      pos[i + 1] = py + X.y * x + Y.y * y + Z.y * z;
      pos[i + 2] = pz + X.z * x + Y.z * y + Z.z * z;
      const nx = restN[i], ny = restN[i + 1], nz = restN[i + 2];
      nor[i] = X.x * nx + Y.x * ny + Z.x * nz;
      nor[i + 1] = X.y * nx + Y.y * ny + Z.y * nz;
      nor[i + 2] = X.z * nx + Y.z * ny + Z.z * nz;
    }
  };

  // --- its shape under the water: a spearhead of a body, and the arms trailing in strips behind it ---
  const STRIP = 5, shapeTris = 4 + ARMS * STRIP * 2;
  const shapeGeo = new THREE.BufferGeometry();
  const shapePos = new THREE.BufferAttribute(new Float32Array(shapeTris * 9), 3);
  shapePos.setUsage(THREE.DynamicDrawUsage);
  shapeGeo.setAttribute('position', shapePos);
  const shapeMat = new THREE.MeshBasicMaterial({ color: 0x1c0a16, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const shape = new THREE.Mesh(shapeGeo, shapeMat);
  shape.name = 'kraken-under-water';
  shape.frustumCulled = false;
  shape.renderOrder = 2;
  shape.layers.set(1); // kept out of the mirror image, as shadows are
  k.group.add(shape);
  const sp = shapePos.array as Float32Array;

  // --- what it does ---
  type Mode = 'glide' | 'rise' | 'wave' | 'sink' | 'deep';
  let mode: Mode = 'deep', since = 0, lasts = 3, s = SPOTS[0] * LANE_LENGTH, spot = 0, step = 1, yaw = 0, turned = 0;
  const here = { x: 0, z: 0, dx: 0, dz: 1 };
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const go = (next: Mode, seconds: number): void => { mode = next; since = 0; lasts = seconds; };

  k.each((dt, time) => {
    since += dt;
    const target = SPOTS[spot] * LANE_LENGTH;
    if (mode === 'deep' && since >= lasts) go('glide', 0);
    if (mode === 'glide') {
      const d = target - s, move = Math.min(Math.abs(d), PACE * dt);
      s += Math.sign(d) * move;
      if (Math.abs(target - s) < 0.01) go('rise', 2.6);
    } else if (mode === 'rise' && since >= lasts) go('wave', 5.5 + chance() * 3);
    else if (mode === 'wave' && since >= lasts) go('sink', 2.6);
    else if (mode === 'sink' && since >= lasts) {
      // on to the next place, turning back at either end of its way; first it goes deep for a while
      if (spot + step < 0 || spot + step >= SPOTS.length) step = -step;
      spot += step;
      go('deep', 7 + chance() * 9);
    }

    onLane(s, here);
    // it swims the way it is going: its body first, its arms behind
    const heading = Math.atan2(here.dz * step, here.dx * step);
    yaw += Math.atan2(Math.sin(heading - yaw), Math.cos(heading - yaw)) * Math.min(1, dt * 1.5);
    // how far it is up, from 0 under the water to 1 with its head out
    const up = mode === 'rise' ? since / lasts : mode === 'wave' ? 1 : mode === 'sink' ? 1 - since / lasts : 0;
    // how deep it lies: 0 just under the surface, 1 far down
    const deep = mode === 'deep' ? Math.sin(Math.PI * Math.min(1, since / lasts)) : 0;
    if (mode === 'wave') turned += dt * 0.22;

    // --- the shape under the water ---
    const c = Math.cos(yaw), sn = Math.sin(yaw), y = WATER_LEVEL + 0.03, gather = smooth(up);
    let n = 0;
    const put = (lx: number, lz: number): void => { sp[n++] = here.x + lx * c - lz * sn; sp[n++] = y; sp[n++] = here.z + lx * sn + lz * c; };
    const tri = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number): void => { put(ax, az); put(bx, bz); put(cx, cz); };
    // the body: a point ahead, two fins, and its shoulders, breathing a little
    const w = (1.5 + 0.12 * Math.sin(time * 1.7)) * SIZE, B = SIZE;
    tri(6.2 * B, 0, 3.4 * B, w, 3.4 * B, -w);
    tri(3.4 * B, w, 0, w * 0.78, 0, -w * 0.78);
    tri(3.4 * B, w, 0, -w * 0.78, 3.4 * B, -w);
    tri(5.4 * B, 0, 4.2 * B, 2.1 * B, 4.2 * B, -2.1 * B);
    // the arms: drawn in as it comes up, because then they are out of the water
    const reach = 7.2 * SIZE * (1 - 0.8 * gather);
    for (let a = 0; a < ARMS; a++) {
      const base = (a - (ARMS - 1) / 2) * 0.24 * SIZE, long = isLong(a) ? 1.3 : 1;
      let px = 0, pz = base, pw = 0.2;
      for (let j = 1; j <= STRIP; j++) {
        const u = j / STRIP;
        const qx = -reach * long * u, qz = base * (1 + 2.1 * u) + 0.42 * u * Math.sin(time * 2.1 - 3.4 * u + a * 1.3), qw = 0.2 * (1 - u) + 0.03;
        tri(px, pz - pw, px, pz + pw, qx, qz + qw);
        tri(px, pz - pw, qx, qz + qw, qx, qz - qw);
        px = qx; pz = qz; pw = qw;
      }
    }
    shapePos.needsUpdate = true;
    shapeMat.opacity = 0.42 - 0.34 * deep;

    // --- the beast itself, while any of it is out of the water ---
    beast.visible = up > 0;
    if (!beast.visible) return;
    const bob = 0.12 * Math.sin(time * 1.3), hy = WATER_LEVEL + (-3.0 + 3.9 * smooth(up * 1.4)) * SIZE + bob, face = yaw + turned;
    X.set(Math.cos(face), 0, Math.sin(face));
    Z.set(-Math.sin(face), 0, Math.cos(face));
    place(head, here.x, hy, here.z, X, UP, Z);
    arms.forEach((arm, a) => {
      // each arm comes up in its own time, and goes down in it
      const mine = mode === 'wave' ? 1 : smooth((up * 1.9 - arm.delay * 0.9) / 1.0);
      const az = face + ((a + 0.5) / ARMS) * Math.PI * 2;
      let px = here.x + Math.cos(az) * 1.75 * SIZE, py = WATER_LEVEL - 0.55 - (1 - mine) * 8.5 * SIZE + bob * 0.5, pz = here.z + Math.sin(az) * 1.75 * SIZE;
      // it leaves the water leaning well out, climbs, and curls in at its tip: more tightly while it is down.
      // Every other arm leans farther out and stands lower, so that they are a crown and not a cage.
      let lean = (isLong(a) ? 1.05 : a % 2 ? 0.62 : 0.86) + 0.16 * Math.sin(time * 0.8 + arm.phase), sway = 0;
      const last = arm.joints.length - 1;
      arm.joints.forEach((pt, j) => {
        if (j > 0) lean += (isLong(a) ? 0.13 : 0.2) + (j >= last - 1 ? 0.5 : 0) + 0.2 * Math.sin(time * 1.35 - j * 0.9 + arm.phase) + (1 - mine) * 0.5;
        sway += 0.13 * Math.sin(time * 1.1 - j * 0.8 + arm.phase * 2);
        const ox = Math.cos(az + sway), oz = Math.sin(az + sway), cl = Math.cos(lean), sl = Math.sin(lean);
        X.set(ox * cl, sl, oz * cl);
        Z.set(-oz, 0, ox);
        Y.crossVectors(Z, X);
        place(pt, px, py, pz, X, Y, Z);
        px += X.x * arm.lens[j]; py += X.y * arm.lens[j]; pz += X.z * arm.lens[j];
      });
    });
    position.needsUpdate = true;
    normal.needsUpdate = true;
  });
}
