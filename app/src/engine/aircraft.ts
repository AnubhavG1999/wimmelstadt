// Things that fly over a tile and never land: Concorde, on a slow round high
// above it, and a Montgolfier balloon that drifts. They were made for Europe,
// where Britain and France built the one together and Paris sent up the first
// of the other.
//
// They are made the way the helicopter in air.ts is: a shape of their own,
// moved on every frame. Neither ever lands, so neither needs a place to stand.

import * as THREE from 'three';
import { GeoBuilder, interior, type V3 } from './geo';
import type { Build } from './tile';

type P2 = [number, number];

// ---------------------------------------------------------------------------
// Concorde
// ---------------------------------------------------------------------------

export interface ConcordeOpts {
  /** The middle of the round it flies, how far it reaches to east and west and to north and south, and how high. */
  x: number; z: number; rx: number; rz: number; y: number;
  /** Its speed, in units per second. */
  speed?: number;
  /** How long it is from nose to tail. A toy one is about as long as two and a half cars. */
  length?: number;
}

/** Concorde, with its nose along +x and its middle at the origin: a slender body, a drooped nose, one great curved wing and a fin. */
function concordeGeometry(length: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const k = length / 18;
  const WHITE = 0xf4f3ee, SHADE = 0xd9d8d2, DARK = 0x23262b, NOZZLE = 0x4a4d54;
  const lit = interior(0.5); // it is seen at night as if the city lit it from below
  const P = (x: number, y: number, z: number): V3 => [x * k, y * k, z * k];

  // the body: thin at the tail, and drooping to a point at the nose
  const spine: [number, number, number][] = [[-8.6, 0.3, 0.16], [-6.6, 0.16, 0.6], [-2, 0, 0.78], [4, 0, 0.74], [6.9, -0.08, 0.5], [8.5, -0.42, 0.22], [9.4, -0.74, 0.06]];
  b.sweep(spine.map(([x, y]) => P(x, y, 0)), spine.map(([, , r]) => r * k), WHITE, { win: lit });
  // the windows of the cabin, and the visor over the flight deck
  b.box(-4.6 * k, 0.1 * k, -0.8 * k, 5.4 * k, 0.26 * k, 0.8 * k, DARK, { faces: 'NS' });
  b.box(6.2 * k, 0.26 * k, -0.36 * k, 7.3 * k, 0.5 * k, 0.36 * k, DARK);

  // the wing: one curve from beside the flight deck out to the tip, and straight across the back
  const edge: P2[] = [[5.2, 0.5], [2.4, 1.05], [-1.6, 2.25], [-6.3, 4.6], [-7.4, 4.6], [-7.6, 0.5]];
  const top = -0.3, under = -0.44;
  for (const side of [-1, 1]) {
    const at = (i: number, y: number): V3 => P(edge[i][0], y, edge[i][1] * side);
    for (let i = 1; i + 1 < edge.length; i++) {
      // a fan of triangles from the wing's root at the back
      b.quad(at(5, top), at(i - 1, top), at(i, top), at(i, top), [0, 1, 0], WHITE, { win: lit });
      b.quad(at(5, under), at(i - 1, under), at(i, under), at(i, under), [0, -1, 0], SHADE, { win: lit });
    }
    for (let i = 0; i + 1 < edge.length; i++) {
      // the edge of the wing, all the way round
      const dx = edge[i + 1][0] - edge[i][0], dz = (edge[i + 1][1] - edge[i][1]) * side, l = Math.hypot(dx, dz) || 1;
      b.quad(at(i, under), at(i + 1, under), at(i + 1, top), at(i, top), [(dz / l) * side, 0, (-dx / l) * side], SHADE);
    }
    // two engines in one box under each wing
    b.box(-7.0 * k, -1.0 * k, Math.min(side * 1.0, side * 2.05) * k, -2.6 * k, -0.44 * k, Math.max(side * 1.0, side * 2.05) * k, SHADE, { faces: 'NESWB' });
    b.box(-7.2 * k, -0.94 * k, Math.min(side * 1.08, side * 1.97) * k, -7.0 * k, -0.5 * k, Math.max(side * 1.08, side * 1.97) * k, NOZZLE, { faces: 'NSWTB' });
  }

  // the fin
  const fin: P2[] = [[-4.0, 0.7], [-7.8, 3.5], [-8.6, 3.5], [-8.4, 0.7]];
  for (const side of [-1, 1]) {
    const at = (i: number): V3 => P(fin[i][0], fin[i][1], 0.07 * side);
    b.quad(at(0), at(1), at(2), at(3), [0, 0, side], WHITE, { win: lit });
  }
  b.quad(P(-4.0, 0.7, -0.07), P(-7.8, 3.5, -0.07), P(-7.8, 3.5, 0.07), P(-4.0, 0.7, 0.07), [0.6, 0.8, 0], WHITE);
  b.quad(P(-8.6, 3.5, -0.07), P(-8.4, 0.7, -0.07), P(-8.4, 0.7, 0.07), P(-8.6, 3.5, 0.07), [-1, 0, 0], WHITE);
  return b.build();
}

/** Concorde, flying a wide round over the tile for ever, leaning into its turns. */
export function concorde(k: Build, o: ConcordeOpts): void {
  const length = o.length ?? 18, s = length / 18;
  const craft = new THREE.Group();
  craft.name = 'concorde';
  craft.matrixAutoUpdate = false;
  craft.add(new THREE.Mesh(concordeGeometry(length), k.mat.city()));

  // its lamps: red on the left wingtip and green on the right, a white one that flashes, and the glow of four engines
  const lampGeo = new THREE.BoxGeometry(0.24 * s, 0.24 * s, 0.24 * s);
  const lampOf = (color: number, x: number, y: number, z: number, geo: THREE.BufferGeometry = lampGeo): THREE.MeshBasicMaterial => {
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x * s, y * s, z * s);
    craft.add(m);
    return mat;
  };
  const red = lampOf(0xff2a2a, -6.9, -0.36, -4.66), green = lampOf(0x2aff5a, -6.9, -0.36, 4.66), flash = lampOf(0xffffff, -8.2, 3.62, 0);
  const burnerGeo = new THREE.BoxGeometry(0.1 * s, 0.34 * s, 0.34 * s);
  const burners = [-1.74, -1.3, 1.3, 1.74].map((z) => lampOf(0xff9a3a, -7.26, -0.72, z, burnerGeo));
  k.group.add(craft);

  // the round: an oval, a little higher at one end than the other
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pts.push(new THREE.Vector3(o.x + Math.cos(a) * o.rx, o.y + Math.sin(a * 2 + 0.6) * 3.5, o.z - Math.sin(a) * o.rz));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  curve.arcLengthDivisions = 600;
  const total = curve.getLength(), speed = o.speed ?? 22;

  let dist = Math.random() * total, yaw = 0, lean = 0, clock = Math.random() * 3, first = true;
  const pos = new THREE.Vector3(), dir = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), side = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  k.each((dt, _time, night) => {
    clock += dt;
    dist = (dist + speed * dt) % total;
    const u = dist / total;
    curve.getPointAt(u, pos);
    curve.getTangentAt(u, dir);
    const next = Math.atan2(dir.z, dir.x);
    let d = (next - yaw) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    // it leans into its turns: the faster it is turning, the more
    const want = first || dt <= 0 ? 0 : THREE.MathUtils.clamp((d / dt) * 1.9, -0.6, 0.6);
    lean += (want - lean) * (first ? 1 : 1 - Math.exp(-dt * 2));
    yaw = next;
    first = false;

    fwd.copy(dir).normalize();
    side.crossVectors(fwd, UP).normalize();
    up.crossVectors(side, fwd).normalize();
    right.copy(side).multiplyScalar(Math.cos(lean)).addScaledVector(up, -Math.sin(lean));
    up.multiplyScalar(Math.cos(lean)).addScaledVector(side, Math.sin(lean));
    craft.matrix.makeBasis(fwd, up, right).setPosition(pos);
    craft.matrixWorldNeedsUpdate = true;

    const shine = 0.9 + 3.4 * night;
    red.color.setRGB(1, 0.16, 0.16).multiplyScalar(shine);
    green.color.setRGB(0.16, 1, 0.35).multiplyScalar(shine);
    flash.color.setRGB(1, 1, 1).multiplyScalar((clock % 1.5 < 0.12 ? 1 : 0.05) * shine);
    for (const b of burners) b.color.setRGB(1, 0.6, 0.23).multiplyScalar(0.7 + 3.0 * night);
  });
}

// ---------------------------------------------------------------------------
// The Montgolfier balloon
// ---------------------------------------------------------------------------

export interface BalloonOpts {
  /** The middle of the small round it drifts, how wide that is, and how high its basket hangs. */
  x: number; z: number; r: number; y: number;
  /** How many seconds one round takes. */
  round?: number;
}

/** A hot-air balloon in the brothers' colours: blue, with bands of gold, and a gallery to stand in below it. */
function balloonGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const BLUE = 0x2f5fb8, GOLD = 0xe2b94a, WOOD = 0x9b7653, ROPE = 0x6b5a45;
  const glow = interior(1.0); // lit from inside by its fire, like a lantern
  // its skin, from the mouth up to the crown: [height, radius, colour]
  const skin: [number, number, number][] = [
    [2.2, 1.5, BLUE], [3.4, 2.5, GOLD], [3.9, 2.9, BLUE], [7.2, 5.3, GOLD], [7.9, 5.6, BLUE], [11.4, 6.1, GOLD],
    [12.1, 6.1, BLUE], [15.2, 4.9, BLUE], [16.9, 3.0, GOLD], [17.5, 2.1, BLUE], [18.2, 0.15, BLUE],
  ];
  for (let i = 0; i + 1 < skin.length; i++) {
    const [y0, r0, color] = skin[i], [y1, r1] = skin[i + 1];
    b.cyl(0, 0, y0, y1, r0, r1, 14, color, { win: glow, cap: false });
  }
  // the gallery: a ring of wicker round the fire, hung from the skin
  b.cyl(0, 0, 0, 1.3, 1.9, 2.1, 12, WOOD, { cap: false });
  b.cyl(0, 0, 0, 0.12, 2.1, 2.1, 12, WOOD);
  b.cyl(0, 0, 1.3, 1.5, 2.25, 2.25, 12, GOLD, { cap: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    b.beam([Math.cos(a) * 2.05, 1.4, Math.sin(a) * 2.05], [Math.cos(a) * 1.5, 2.3, Math.sin(a) * 1.5], 0.06, 0.06, ROPE);
  }
  return b.build();
}

/** A Montgolfier balloon that drifts slowly round in the air, rising and sinking a little as it goes. */
export function balloon(k: Build, o: BalloonOpts): void {
  const craft = new THREE.Group();
  craft.name = 'balloon';
  craft.add(new THREE.Mesh(balloonGeometry(), k.mat.city()));
  // the fire in its mouth
  const fire = new THREE.MeshBasicMaterial({ color: 0xffb04a, toneMapped: false });
  const flame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), fire);
  flame.position.y = 1.8;
  craft.add(flame);
  // two travellers in the gallery
  for (const [x, z, color] of [[1.2, 0.3, 0xb5483a], [-1.0, -0.8, 0x2f4f8f]] as const) {
    const who = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.45), k.mat.prop({ vertexColors: false, color }));
    who.position.set(x, 0.9, z);
    craft.add(who);
  }
  k.group.add(craft);

  const round = o.round ?? 150, start = Math.random() * Math.PI * 2;
  k.each((_dt, time, night) => {
    const a = start + (time / round) * Math.PI * 2;
    craft.position.set(o.x + Math.cos(a) * o.r, o.y + Math.sin(time * 0.37) * 1.6 + Math.sin(time * 0.13) * 0.9, o.z + Math.sin(a) * o.r);
    craft.rotation.y = time * 0.06;
    // the fire flickers, and shows most at night
    fire.color.setRGB(1, 0.69, 0.29).multiplyScalar((0.75 + 0.25 * Math.sin(time * 9.1) * Math.sin(time * 5.3)) * (0.9 + 3.0 * night));
  });
}
