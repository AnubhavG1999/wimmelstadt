// Plain traffic, and the heroes that drive among it. The vehicles are the toy
// cars of the look prototype: plain, with lamps that come on at night.
//
// How they drive is a stand-in. Every route is driven as a ring: a closed road
// both ways round, any other out along one side and back along the other,
// turning round at each end. Vehicles keep their distance from the one in
// front, so a slow one gathers a queue behind it, but they do not turn from one
// road into another and they pass through crossing traffic at junctions. Real
// driving (lanes, signals, turning) comes with the road network.

import * as THREE from 'three';
import { makeVehicleMaterial } from '../look/materials.ts';
import { trafficTypes } from './vehicles.ts';

/** A road as traffic sees it: a line of points in the city, each with its height, and how it is driven. */
export interface Route {
  id: string;
  /** Where the road runs: east, up, south. */
  pts: [number, number, number][];
  closed: boolean;
  /** How fast it is driven, in units a second, and how far apart its vehicles are on average. */
  speed: number;
  gap: number;
  /** Traffic keeps to the left on it. */
  left?: boolean;
}

/** How often each kind of vehicle is seen, in the order vehicles.ts makes them: saloon, hatchback, van, pick-up, bus. */
const SHARE = [0.32, 0.3, 0.14, 0.14, 0.1];
/** How far from the middle of the road a vehicle drives. */
const KEEP = 1.9;
/** The least room between one vehicle's middle and the next: a car's length and a little air. */
const ROOM = 9.5;
/** With this much clear road beyond that, a vehicle drives at its own speed. */
const CLEAR = 22;

interface Ring {
  pts: [number, number, number][];
  at: number[];
  /** The road's own length, and how far once round is: twice that if vehicles turn round at its ends. */
  span: number;
  length: number;
  way: 'out-and-back' | 'round' | 'round-backwards';
  left: boolean;
  cars: Car[];
}

interface Car {
  ring: Ring;
  /** How far round its ring it is. */
  u: number;
  speed: number;
  /** Which kind of vehicle it is, and which of that kind. A hero has a model of its own instead. */
  kind: number;
  slot: number;
  body?: THREE.Object3D;
}

export class Traffic {
  /** One batch of vehicles for each kind. */
  readonly group = new THREE.Group();
  private meshes: THREE.InstancedMesh[];
  private rings: Ring[] = [];
  private byRoute = new Map<string, Ring>();
  private total = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler(0, 0, 0, 'YZX');
  private p = new THREE.Vector3();
  private one = new THREE.Vector3(1, 1, 1);

  constructor(routes: Route[]) {
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const types = trafficTypes();
    const counts = types.map(() => 0);
    const pick = (): number => {
      let r = rnd();
      for (let k = 0; k < SHARE.length; k++) {
        if ((r -= SHARE[k]) < 0) return k;
      }
      return 0;
    };
    for (const route of routes) {
      const pts = route.closed ? [...route.pts, route.pts[0]] : route.pts;
      const at = [0];
      for (let i = 1; i < pts.length; i++) at.push(at[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
      const span = at[at.length - 1];
      if (span < ROOM * 2) continue;
      const ways: Ring['way'][] = route.closed ? ['round', 'round-backwards'] : ['out-and-back'];
      for (const way of ways) {
        const ring: Ring = { pts, at, span, length: way === 'out-and-back' ? span * 2 : span, way, left: route.left === true, cars: [] };
        const n = Math.max(1, Math.min(Math.floor(ring.length / (ROOM * 1.6)), Math.round(ring.length / route.gap)));
        for (let i = 0; i < n; i++) {
          const kind = pick();
          ring.cars.push({ ring, u: ((i + rnd() * 0.5) * ring.length) / n, speed: route.speed * (0.9 + rnd() * 0.2), kind, slot: counts[kind]++ });
          this.total++;
        }
        this.rings.push(ring);
        if (!this.byRoute.has(route.id)) this.byRoute.set(route.id, ring);
      }
    }
    this.group.name = 'traffic';
    const material = makeVehicleMaterial();
    const c = new THREE.Color();
    this.meshes = types.map((type, k) => {
      const mesh = new THREE.InstancedMesh(type.geo, material, Math.max(1, counts[k]));
      mesh.count = counts[k];
      mesh.name = type.name;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      for (let i = 0; i < counts[k]; i++) mesh.setColorAt(i, c.set(type.colors[Math.floor(rnd() * type.colors.length)]));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      return mesh;
    });
    this.update(0);
  }

  get count(): number {
    return this.total;
  }

  /** Puts a hero on a route, in the widest gap in its traffic, to drive among it. */
  adopt(body: THREE.Object3D, route: string): boolean {
    const ring = this.byRoute.get(route);
    if (!ring) return false;
    let u = 0, widest = -1, after = 0;
    ring.cars.forEach((car, i) => {
      const next = ring.cars[(i + 1) % ring.cars.length];
      const gap = ring.cars.length === 1 ? ring.length : (next.u - car.u + ring.length) % ring.length;
      if (gap > widest) {
        widest = gap;
        u = (car.u + gap / 2) % ring.length;
        after = i + 1;
      }
    });
    const hero: Car = { ring, u, speed: 17, kind: -1, slot: 0, body };
    ring.cars.splice(after, 0, hero);
    this.place(hero);
    body.position.copy(this.p);
    body.rotation.copy(this.e);
    return true;
  }

  /** Works out where a vehicle is and which way it faces, and leaves that in `this.p` and `this.e`. */
  private place(car: Car): void {
    const ring = car.ring;
    let s = car.u, dir = 1;
    if (ring.way === 'out-and-back' && car.u > ring.span) {
      s = ring.length - car.u;
      dir = -1;
    } else if (ring.way === 'round-backwards') {
      s = ring.span - car.u;
      dir = -1;
    }
    let lo = 0, hi = ring.at.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ring.at[mid] <= s) lo = mid;
      else hi = mid;
    }
    const a = ring.pts[lo], b = ring.pts[hi], run = Math.max(1e-6, ring.at[hi] - ring.at[lo]), t = (s - ring.at[lo]) / run;
    const tx = ((b[0] - a[0]) / run) * dir, tz = ((b[2] - a[2]) / run) * dir, climb = ((b[1] - a[1]) / run) * dir;
    // to the right of the way it is going, or to the left where the place drives on the left
    const side = ring.left ? -KEEP : KEEP;
    this.p.set(a[0] + (b[0] - a[0]) * t - tz * side, a[1] + (b[1] - a[1]) * t + 0.04, a[2] + (b[2] - a[2]) * t + tx * side);
    // it faces the way it is going, and tips up or down with the road
    this.e.set(0, -Math.atan2(tz, tx), Math.atan(climb));
  }

  /** Moves every vehicle on. */
  update(dt: number): void {
    for (const ring of this.rings) {
      const cars = ring.cars, n = cars.length;
      for (let i = 0; i < n; i++) {
        const car = cars[i];
        // Drive on, by how much road is clear ahead: closing up slowly, at its own
        // speed with a fair gap, and a little faster to catch up across an empty
        // stretch. This is what makes a queue dissolve by itself.
        let go = car.speed * dt;
        if (n > 1) {
          const room = ((cars[(i + 1) % n].u - car.u + ring.length) % ring.length) - ROOM;
          go = Math.max(0, Math.min(go * Math.min(1.25, room / CLEAR), room));
        }
        car.u = (car.u + go) % ring.length;
        this.place(car);
        if (car.body) {
          car.body.position.copy(this.p);
          car.body.position.y += 0.08;
          car.body.rotation.copy(this.e);
        } else {
          this.q.setFromEuler(this.e);
          this.m.compose(this.p, this.q, this.one);
          this.meshes[car.kind].setMatrixAt(car.slot, this.m);
        }
      }
    }
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
  }
}
