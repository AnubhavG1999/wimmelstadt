// Things that fly. For now there is one: a helicopter that lives on a pad on a
// roof, and every so often takes off, flies a round and comes back.

import * as THREE from 'three';
import { GeoBuilder, interior, type V3 } from './geo';
import type { Build } from './tile';

export interface HelicopterOpts {
  /** The middle of its pad, at the height of the pad's surface. */
  pad: V3;
  /** Which way its nose points while it stands, in degrees: 0 is east and 90 is south. */
  facing?: number;
  /**
   * The round it flies: points in the air that it passes in turn after it has
   * risen from the pad, before it comes back to the same place above it. Keep
   * them clear of anything tall.
   */
  round: V3[];
  /** How long it stands between flights, in seconds: the least and the most. */
  rest?: [number, number];
  /** Its speed in the air, in units per second. */
  speed?: number;
  /** The colour of its body, and of the stripe along it and its tail. */
  body?: number;
  trim?: number;
}

/** How far above the pad it hovers before it sets off, and when it comes back. */
const HOVER = 9;

function bodyGeometry(body: number, trim: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const DARK = 0x2a2c31, GLASS = 0xa9c7d8;
  // skids, and the struts that carry the cabin on them
  for (const z of [-1, 1]) {
    b.box(-1.7, 0, z - 0.09, 1.8, 0.14, z + 0.09, DARK);
    for (const x of [-1.0, 1.1]) b.box(x - 0.08, 0.14, z - 0.08, x + 0.08, 0.62, z + 0.08, DARK);
  }
  // the cabin: a belly, a back with a stripe along it, and a nose of glass that is lit at night
  b.box(-1.6, 0.6, -0.95, 2.2, 1.35, 0.95, body, { faces: 'NESWTB' });
  b.box(-1.6, 1.35, -0.95, 0.45, 2.3, 0.95, body);
  b.box(-1.62, 1.1, -0.97, 0.47, 1.36, 0.97, trim, { faces: 'NSW' });
  b.box(0.45, 1.35, -0.9, 2.1, 2.2, 0.9, GLASS, { win: interior(0.9) });
  b.box(2.2, 0.7, -0.7, 2.6, 1.3, 0.7, body);
  b.box(-1.4, 2.3, -0.62, 0.5, 2.72, 0.62, trim);
  // the tail: a boom, a fin and a small wing across it
  b.beam([-1.5, 1.75, 0], [-5.3, 2.0, 0], 0.3, 0.15, body);
  b.box(-5.65, 1.55, -0.07, -4.95, 3.05, 0.07, trim);
  b.box(-5.0, 1.95, -0.85, -4.45, 2.05, 0.85, trim, { faces: 'NESWTB' });
  // the mast the rotor turns on
  b.box(-0.6, 2.72, -0.13, -0.34, 3.06, 0.13, DARK);
  return b.build();
}

function rotorGeometry(span: number, chord: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const BLADE = 0x3a3d44;
  b.box(-span, 0, -chord, span, 0.07, chord, BLADE, { faces: 'NESWTB' });
  b.box(-chord, 0.001, -span, chord, 0.071, span, BLADE, { faces: 'NESWTB' });
  b.cyl(0, 0, -0.06, 0.16, chord * 1.4, chord * 1.4, 8, BLADE);
  return b.build();
}

/**
 * Stands a helicopter on a pad. It rests there with its rotor still, and now
 * and then starts up, climbs, flies its round and lands again.
 */
export function helicopter(k: Build, o: HelicopterOpts): void {
  const mat = k.mat.city();
  const craft = new THREE.Group();
  craft.name = 'helicopter';
  craft.matrixAutoUpdate = false;
  const hull = new THREE.Mesh(bodyGeometry(o.body ?? 0xf1eee6, o.trim ?? 0xc8323a), mat);
  const rotor = new THREE.Mesh(rotorGeometry(4.3, 0.2), mat);
  rotor.position.set(-0.47, 3.08, 0);
  // the small rotor at the tail turns on its side
  const tail = new THREE.Mesh(rotorGeometry(0.85, 0.09), mat);
  tail.position.set(-5.3, 2.35, 0.24);
  tail.rotation.x = Math.PI / 2;
  // a red lamp that blinks, on top of the fin, and a white one under the nose
  const red = new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false });
  const white = new THREE.MeshBasicMaterial({ color: 0xfff2d0, toneMapped: false });
  const lamp = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  const beacon = new THREE.Mesh(lamp, red);
  beacon.position.set(-5.3, 3.16, 0);
  const nose = new THREE.Mesh(lamp, white);
  nose.position.set(2.3, 0.58, 0);
  craft.add(hull, rotor, tail, beacon, nose);
  k.group.add(craft);

  const pad = new THREE.Vector3(o.pad[0], o.pad[1], o.pad[2]);
  const hover = pad.clone().setY(pad.y + HOVER);
  const curve = new THREE.CatmullRomCurve3([hover, ...o.round.map((p) => new THREE.Vector3(p[0], p[1], p[2]))], true, 'centripetal');
  curve.arcLengthDivisions = 600;
  const length = curve.getLength();
  const speed = o.speed ?? 15;
  const home = THREE.MathUtils.degToRad(o.facing ?? 0);
  const [restMin, restMax] = o.rest ?? [35, 70];

  // what it is doing, and how far through it
  let doing: 'rest' | 'start' | 'rise' | 'fly' | 'sink' | 'stop' = 'rest';
  let t = 8 + Math.random() * 14; // the first flight comes soon, so that it is seen
  let spin = 0, turn = 0, dist = 0, yaw = home, lean = 0, dip = 0, clock = Math.random() * 3;
  const pos = pad.clone(), at = new THREE.Vector3(), dir = new THREE.Vector3();
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), flat = new THREE.Vector3(), side = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const ease = (x: number): number => x * x * (3 - 2 * x);
  /** The shortest way round from one heading to another. */
  const swing = (from: number, to: number, f: number): number => {
    let d = (to - from) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return from + d * f;
  };
  const headingAt = (u: number): number => {
    curve.getTangentAt(u, dir);
    return Math.atan2(dir.z, dir.x);
  };
  const away = headingAt(0);

  const place = (): void => {
    flat.set(Math.cos(yaw), 0, Math.sin(yaw));
    side.set(-Math.sin(yaw), 0, Math.cos(yaw));
    // its nose dips as it flies forward, and it leans into its turns
    fwd.copy(flat).multiplyScalar(Math.cos(dip)).addScaledVector(UP, -Math.sin(dip));
    up.copy(UP).multiplyScalar(Math.cos(dip)).addScaledVector(flat, Math.sin(dip));
    right.copy(side).multiplyScalar(Math.cos(lean)).addScaledVector(up, -Math.sin(lean));
    up.multiplyScalar(Math.cos(lean)).addScaledVector(side, Math.sin(lean));
    craft.matrix.makeBasis(fwd, up, right).setPosition(pos);
    craft.matrixWorldNeedsUpdate = true;
  };
  place();

  k.each((dt, _time, night) => {
    clock += dt;
    // the lamps show by day and shine at night; the red one blinks
    red.color.setRGB(1, 0.16, 0.16).multiplyScalar((clock % 1.2 < 0.16 ? 1 : 0.12) * (0.9 + 3.4 * night));
    white.color.setRGB(1, 0.95, 0.82).multiplyScalar(0.5 + 2.6 * night);

    let wantLean = 0, wantDip = 0;
    if (doing === 'rest') {
      t -= dt;
      if (t <= 0) { doing = 'start'; t = 0; }
    } else if (doing === 'start') {
      t += dt;
      spin = Math.min(1, t / 2.6);
      if (t >= 3.2) { doing = 'rise'; t = 0; }
    } else if (doing === 'rise') {
      t += dt;
      const f = ease(Math.min(1, t / 3.4));
      pos.lerpVectors(pad, hover, f);
      yaw = swing(home, away, f);
      if (t >= 3.4) { doing = 'fly'; dist = 0; }
    } else if (doing === 'fly') {
      // it gathers speed as it leaves, and loses it as it comes back
      const v = speed * Math.min(1, 0.12 + dist / 34, 0.12 + (length - dist) / 34);
      dist = Math.min(length, dist + v * dt);
      const u = dist / length;
      curve.getPointAt(u, at);
      pos.copy(at);
      const next = headingAt(u);
      let d = (next - yaw) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      turn = dt > 0 ? d / dt : 0;
      yaw = next;
      wantLean = THREE.MathUtils.clamp(turn * 0.7, -0.42, 0.42);
      wantDip = 0.16 * (v / speed);
      if (dist >= length) { doing = 'sink'; t = 0; }
    } else if (doing === 'sink') {
      t += dt;
      const f = ease(Math.min(1, t / 3.8));
      pos.lerpVectors(hover, pad, f);
      yaw = swing(away, home, f);
      if (t >= 3.8) { doing = 'stop'; t = 0; }
    } else {
      t += dt;
      spin = Math.max(0, 1 - t / 4.5);
      if (t >= 4.5) { doing = 'rest'; t = restMin + Math.random() * (restMax - restMin); yaw = home; }
    }
    const kk = 1 - Math.exp(-dt * 3);
    lean += (wantLean - lean) * kk;
    dip += (wantDip - dip) * kk;
    rotor.rotation.y += 31 * spin * dt;
    tail.rotation.y += 47 * spin * dt;
    if (doing !== 'rest') place();
  });
}
