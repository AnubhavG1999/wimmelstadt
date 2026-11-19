// A dragon in the air: a Japanese one, long and without wings, with antlers,
// whiskers, a mane and three claws to a foot. It flies a round of its own,
// rising and falling along its length as it goes, after a pearl that keeps
// just ahead of it. By night it glows from within, like a lantern.
//
// It is the engine's helicopter in kind: meshes of its own, moved on every
// frame. Its body is one shape drawn many times, a piece for each joint.

import * as THREE from 'three';
import { GeoBuilder, interior, type V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';

export interface DragonOpts {
  /** The round it flies: points in the air, passed in turn and joined into a closed curve. Keep them clear of anything tall. */
  round: V3[];
  /** Its speed, in units per second. */
  speed?: number;
  /** How many joints its body has, and how long each is. */
  joints?: number;
  joint?: number;
  /** How large it is: 1 is a body two units across. */
  size?: number;
  /** The colour of its back, of its belly, and of its mane and the fins along its spine. */
  back?: number;
  belly?: number;
  mane?: number;
}

const GOLD = 0xe2b64c, IVORY = 0xf3ecd8;

/** One joint of the body, along x, about 1 across: a back, two flanks, a belly, and a fin on top. */
function jointGeometry(len: number, back: number, belly: number, mane: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const h = len / 2 + 0.06, glow = interior(0.42);
  // its outline, looking along it: [height, half the width]
  const ring: [number, number][] = [[1.0, 0.34], [0.52, 0.96], [-0.42, 0.9], [-0.92, 0.36]];
  const colors = [back, back, belly];
  for (const s of [-1, 1]) {
    for (let i = 0; i + 1 < ring.length; i++) {
      const [y0, w0] = ring[i], [y1, w1] = ring[i + 1];
      // (a flank faces away from the middle of the body)
      const n: V3 = [0, (y0 + y1) / 2, (s * (w0 + w1)) / 2];
      b.quad([-h, y0, s * w0], [h, y0, s * w0], [h, y1, s * w1], [-h, y1, s * w1], n, colors[i], { win: glow });
    }
  }
  b.quad([-h, 1.0, -0.34], [h, 1.0, -0.34], [h, 1.0, 0.34], [-h, 1.0, 0.34], [0, 1, 0], back, { win: glow });
  b.quad([-h, -0.92, -0.36], [h, -0.92, -0.36], [h, -0.92, 0.36], [-h, -0.92, 0.36], [0, -1, 0], belly, { win: glow });
  // the fin: a blade that leans back
  const f0: V3 = [-h * 0.7, 1.0, 0], f1: V3 = [h * 0.75, 1.0, 0], f2: V3 = [-h * 0.95, 1.95, 0];
  b.tri(f0, f1, f2, [0, 0.2, 1], mane, { win: interior(0.7) });
  b.tri(f0, f2, f1, [0, 0.2, -1], mane, { win: interior(0.7) });
  return b.build();
}

/** The head, with its nose along +x and the back of its skull at the origin. */
function headGeometry(back: number, belly: number, mane: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const glow = interior(0.42), bright = interior(0.8);
  // skull, brow, snout and nose
  b.box(-0.4, -0.75, -1.15, 2.2, 1.0, 1.15, back, { win: glow, faces: 'NESWTB' });
  b.box(2.2, -0.5, -0.86, 4.4, 0.55, 0.86, back, { win: glow, faces: 'NESWTB' });
  b.box(4.1, 0.2, -0.7, 4.8, 0.85, 0.7, back, { win: glow, faces: 'NESWTB' });
  for (const s of [-1, 1]) {
    b.box(1.1, 1.0, s * 0.95 - 0.3, 2.3, 1.3, s * 0.95 + 0.3, mane, { win: bright, faces: 'NESWT' });
    // eyes that burn at night
    b.box(1.5, 0.45, s * 1.16 - 0.02, 2.05, 0.92, s * 1.16 + 0.02, 0xfff1a8, { win: interior(4), faces: s > 0 ? 'S' : 'N' });
    // nostrils
    b.box(4.8, 0.45, s * 0.38 - 0.13, 4.86, 0.7, s * 0.38 + 0.13, 0x2a1a14, { faces: 'E' });
    // antlers: a beam swept back, with a tine
    b.beam([0.2, 0.95, s * 0.7], [-2.6, 2.7, s * 1.25], 0.2, 0.1, GOLD, { win: bright });
    b.beam([-1.3, 1.85, s * 0.98], [-1.7, 2.9, s * 1.6], 0.13, 0.06, GOLD, { win: bright });
    // whiskers: long, and trailing back
    b.sweep([[4.5, 0.25, s * 0.72], [5.6, 0.75, s * 1.9], [4.3, 1.45, s * 3.1], [2.2, 1.55, s * 3.7]], [0.11, 0.09, 0.07, 0.04], GOLD, { win: bright });
    // the mane: tufts that stream back from the cheeks and the crown
    b.beam([0.3, 0.2, s * 1.1], [-2.4, 0.5, s * 2.0], 0.36, 0.05, mane, { win: bright });
    b.beam([0.1, -0.4, s * 1.0], [-2.0, -0.9, s * 1.6], 0.3, 0.05, mane, { win: bright });
    // fangs
    b.box(3.5, -0.95, s * 0.62 - 0.1, 3.72, -0.5, s * 0.62 + 0.1, IVORY, { faces: 'NESWB' });
  }
  b.beam([-0.2, 0.9, 0], [-2.7, 1.7, 0], 0.4, 0.05, mane, { win: bright });
  // the lower jaw, a little open, and the beard under it
  b.box(0.3, -1.3, -0.74, 3.9, -0.86, 0.74, belly, { win: glow, faces: 'NESWTB' });
  b.box(0.3, -0.86, -0.6, 3.2, -0.76, 0.6, 0xa8322a, { faces: 'NESW' });
  b.beam([1.5, -1.3, 0], [0.5, -2.5, 0], 0.26, 0.04, mane, { win: bright });
  return b.build();
}

/** A leg, hanging from the origin and reaching forward: a thigh, a shin, and three claws. */
function legGeometry(back: number, side: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const glow = interior(0.42);
  b.beam([0, -0.2, side * 0.7], [-0.7, -1.7, side * 1.5], 0.36, 0.26, back, { win: glow });
  b.beam([-0.7, -1.7, side * 1.5], [0.9, -2.6, side * 1.7], 0.26, 0.2, back, { win: glow });
  for (const [dx, dz] of [[0.9, 0], [0.75, 0.42], [0.75, -0.42]]) b.beam([0.9, -2.6, side * 1.7], [0.9 + dx, -3.0, side * 1.7 + dz], 0.13, 0.03, IVORY);
  return b.build();
}

/** Sets a dragon flying its round for ever. */
export function dragon(k: Build, o: DragonOpts): void {
  const joints = o.joints ?? 26, size = o.size ?? 1, len = (o.joint ?? 1.9) * size, speed = o.speed ?? 15;
  const back = o.back ?? 0x2f8f78, belly = o.belly ?? 0xf0dfae, mane = o.mane ?? 0xe8612d;
  const mat = k.mat.city();

  const all = new THREE.Group();
  all.name = 'dragon';
  const body = new THREE.InstancedMesh(jointGeometry(len / size, back, belly, mane), mat, joints);
  body.frustumCulled = false;
  const head = new THREE.Mesh(headGeometry(back, belly, mane), mat);
  head.matrixAutoUpdate = false;
  head.frustumCulled = false;
  // two pairs of legs: where along the body each hangs, as a joint
  const legs = [0.2, 0.2, 0.58, 0.58].map((at, i) => {
    const m = new THREE.Mesh(legGeometry(back, i % 2 ? 1 : -1), mat);
    m.matrixAutoUpdate = false;
    m.frustumCulled = false;
    return { m, joint: Math.round(at * joints) };
  });
  // the pearl it follows: it shines by day and blazes at night
  const pearlMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, toneMapped: false });
  const pearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 1), pearlMat);
  all.add(body, head, ...legs.map((l) => l.m), pearl);
  k.group.add(all);

  const curve = new THREE.CatmullRomCurve3(o.round.map((p) => new THREE.Vector3(p[0], p[1], p[2])), true, 'centripetal');
  curve.arcLengthDivisions = 800;
  const length = curve.getLength();
  const UP = new THREE.Vector3(0, 1, 0);
  // where each joint is, and the head, and a point behind the tail: worked out first, then turned to face each other
  const pts = Array.from({ length: joints + 2 }, () => new THREE.Vector3());
  const tan = new THREE.Vector3(), side = new THREE.Vector3(), lift = new THREE.Vector3();
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(), m4 = new THREE.Matrix4(), scale = new THREE.Vector3();
  let dist = Math.random() * length;

  /** A place on its round, `behind` this far back from the head, with the wave that runs down its body. */
  const at = (behind: number, time: number, out: THREE.Vector3): THREE.Vector3 => {
    const u = (((dist - behind) / length) % 1 + 1) % 1;
    curve.getPointAt(u, out);
    curve.getTangentAt(u, tan);
    side.crossVectors(tan, UP).normalize();
    lift.crossVectors(side, tan).normalize();
    // the wave is small at the head and grows towards the tail
    const grow = Math.min(1, Math.max(0.2, 0.25 + behind / (14 * size))) * size;
    const phase = (behind * 0.36) / size - time * 2.6;
    return out.addScaledVector(lift, Math.sin(phase) * 1.5 * grow).addScaledVector(side, Math.cos(phase * 0.5) * 1.1 * grow);
  };
  /** Faces something along the way from one point to another. */
  const face = (from: THREE.Vector3, to: THREE.Vector3): void => {
    fwd.subVectors(to, from).normalize();
    right.crossVectors(fwd, UP).normalize();
    up.crossVectors(right, fwd).normalize();
  };

  k.each((dt, time, night) => {
    dist = (dist + speed * dt) % length;
    // the head is pts[0], the joints follow, and the last point is past the end of the tail
    for (let i = 0; i < pts.length; i++) at(i === 0 ? 0 : 1.4 * size + (i - 1) * len * 0.93, time, pts[i]);
    face(pts[1], pts[0]);
    head.matrix.makeBasis(fwd, up, right).scale(scale.setScalar(size)).setPosition(pts[0]);
    head.matrixWorldNeedsUpdate = true;
    for (let i = 0; i < joints; i++) {
      face(pts[i + 2], pts[i]);
      // thickest behind the head, and thinning to nothing at the tail
      const f = i / (joints - 1);
      const thick = (0.72 + 0.5 * Math.sin(Math.min(1, f * 3.2) * Math.PI * 0.5)) * (1 - 0.86 * Math.max(0, (f - 0.45) / 0.55) ** 1.3);
      scale.set(size, thick * size, thick * size);
      m4.makeBasis(fwd, up, right).scale(scale).setPosition(pts[i + 1]);
      body.setMatrixAt(i, m4);
      for (const leg of legs) {
        if (leg.joint !== i) continue;
        leg.m.matrix.makeBasis(fwd, up, right).scale(scale.setScalar(size * thick)).setPosition(pts[i + 1]);
        leg.m.matrixWorldNeedsUpdate = true;
      }
    }
    body.instanceMatrix.needsUpdate = true;
    // the pearl keeps ahead of its nose, and bobs
    at(-8.5 * size, time, pearl.position);
    pearl.position.y += Math.sin(time * 1.7) * 0.5;
    pearl.scale.setScalar(size);
    pearl.rotation.y += dt * 1.4;
    pearlMat.color.setRGB(1, 0.9, 0.62).multiplyScalar(0.95 + 2.6 * night);
  });
}
