// Who travels the roads of Blackwater Bay in place of cars: a drover with his
// flock and his dog, a drover with three head of cattle, a lord's curtained
// litter on the shoulders of four bearers with a gold cloak of the City Watch
// walking ahead, a string of pack mules under bales from the east with their
// muleteer, and a fishwife pushing her barrow of fish with a gull riding on it.
//
// Each is a toy figure, chunky and simple, posed at a walk as toy animals are
// posed. They follow the rules of `TrafficKind` in tile.ts: nose along +x,
// standing on y = 0, the middle over (0, 0), paint given in white. None throws
// a beam; a lantern glows at night. Each is no longer than 7.5, the length the
// lanes were checked with.

import * as THREE from 'three';
import type { TrafficKind } from '../../engine/tile';
import { PART, boxAt, shapeFrom, shapePart, sideProfile } from '../../engine/vehicles';

type P2 = [number, number];
type V3 = [number, number, number];
type Piece = THREE.BufferGeometry;

const SKIN = 0xd9a77e, DARK = 0x2b2622, OAK = 0x5a3e28, SHAFT = 0x6e4e30, IRON = 0x34353a, HORN = 0xffd27a, GILT = 0xc9a23a;
const LINEN = 0xe2d8c4, ROPE = 0xb59a6a, SACKING = 0xc9b28a;

const trim = (g: Piece, color: number): Piece => shapePart(g, PART.trim, color);
const paint = (g: Piece): Piece => shapePart(g, PART.paint, 0xffffff);
/** A piece in a colour of its own, or in the paint. */
type Dye = number | 'paint';
const dyed = (g: Piece, d: Dye): Piece => (d === 'paint' ? paint(g) : trim(g, d));

const UP = new THREE.Vector3(0, 1, 0);

/** A tapered rod from one point to another, square in section unless given more sides: a leg, an arm, a pole. An open rod has no ends. */
function rod(a: V3, b: V3, ra: number, rb: number, sides = 4, open = false): Piece {
  const from = new THREE.Vector3(...a), dir = new THREE.Vector3(...b).sub(from);
  const len = dir.length();
  return new THREE.CylinderGeometry(rb, ra, len, sides, 1, open)
    .rotateY(Math.PI / sides)
    .translate(0, len / 2, 0)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()))
    .translate(from.x, from.y, from.z);
}

/** A side profile, as corners with x along and y up, pushed out to a width and standing at a place across. */
const slab = (pts: P2[], width: number, z = 0): Piece => sideProfile(pts, width).translate(0, 0, z);

/** Moves pieces made about the origin to a place, turned about the upright (radians, towards -z) and scaled. */
function place(pieces: Piece[], x: number, z = 0, turn = 0, s = 1): Piece[] {
  for (const g of pieces) g.scale(s, s, s).rotateY(turn).translate(x, 0, z);
  return pieces;
}

/** Moves a whole kind along itself, so that its middle is over the origin. */
function centred(pieces: Piece[]): Piece[] {
  const box = new THREE.Box3();
  for (const g of pieces) {
    g.computeBoundingBox();
    box.union(g.boundingBox!);
  }
  const dx = -(box.min.x + box.max.x) / 2, dz = -(box.min.z + box.max.z) / 2;
  for (const g of pieces) g.translate(dx, 0, dz);
  return pieces;
}

/** A horn lantern under an iron cap: the horn lights up at night. */
const lantern = (x: number, y: number, z: number): Piece[] => [
  shapePart(boxAt(0.26, 0.32, 0.26, x, y, z), PART.head, HORN),
  trim(boxAt(0.32, 0.07, 0.32, x, y + 0.2, z), IRON),
];

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** One who walks, as tall as the tile's own people: about 2.4 to the top of the head. */
interface Walker {
  x: number; z: number;
  coat: Dye;
  legs: number;
  /** Where the hands are, from the hip: they hang at the sides unless this says otherwise. */
  hands?: [V3, V3];
  /** How far the shoulders are ahead of the hips: a drover leans into his walk, a bearer stands straight. */
  lean?: number;
  /** A straw hat, a hood or a cloth wound round the head, in a colour. */
  hat?: number;
  hood?: number;
  wrap?: number;
  /** A long skirt to the ground in place of legs, and an apron over it. */
  skirt?: boolean;
  apron?: number;
  /** A cloak from the shoulders to the knees, in a colour. */
  cloak?: number;
}

const HIP = 0.95;

function walker(p: Walker): Piece[] {
  const { x, z } = p, lean = p.lean ?? 0.06, out: Piece[] = [];
  if (p.skirt) {
    out.push(trim(slab([[x - 0.36, 0.02], [x + 0.36, 0.02], [x + 0.25, HIP + 0.12], [x - 0.25, HIP + 0.12]], 0.7, z), p.legs));
    if (p.apron !== undefined) out.push(trim(slab([[x + 0.3, 0.25], [x + 0.37, 0.25], [x + 0.3, HIP + 0.3], [x + 0.24, HIP + 0.3]], 0.5, z), p.apron));
  } else {
    // the legs in mid stride, open at both ends: their tops are in the body and their feet on the road
    for (const s of [-1, 1]) out.push(trim(rod([x, HIP, z + s * 0.16], [x + s * 0.28, 0, z + s * 0.18], 0.15, 0.12, 4, true), p.legs));
  }
  out.push(dyed(slab([[x - 0.24, HIP], [x + 0.24, HIP], [x + 0.24 + lean, HIP + 1.05], [x - 0.22 + lean, HIP + 1.05]], 0.64, z), p.coat));
  const hands = p.hands ?? [[0.06, 0.02, -0.38], [0.06, 0.02, 0.38]];
  hands.forEach(([ax, ay, az], i) => {
    const s = i ? 1 : -1;
    out.push(dyed(rod([x + lean * 0.85, HIP + 0.92, z + s * 0.32], [x + ax, HIP + ay, z + az], 0.12, 0.09), p.coat));
  });
  const hx = x + lean * 1.05, hy = HIP + 1.28;
  out.push(trim(boxAt(0.38, 0.42, 0.38, hx, hy, z), SKIN));
  if (p.hood !== undefined) out.push(trim(boxAt(0.48, 0.5, 0.48, hx - 0.07, hy + 0.03, z), p.hood));
  if (p.wrap !== undefined) out.push(trim(boxAt(0.44, 0.2, 0.44, hx - 0.02, hy + 0.2, z), p.wrap));
  if (p.hat !== undefined) out.push(trim(new THREE.CylinderGeometry(0.17, 0.46, 0.22, 6).translate(hx, hy + 0.3, z), p.hat));
  if (p.cloak !== undefined) {
    out.push(trim(slab([[x + lean - 0.05, HIP + 1.04], [x + lean - 0.32, HIP + 1.06], [x - 0.5, 0.55], [x - 0.26, 0.5]], 0.8, z), p.cloak));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Beasts
// ---------------------------------------------------------------------------

/** A sheep about the origin, facing +x, 1.6 long with its head: a faceted fleece, a black face and four thin legs. */
function sheep(fleece: Dye): Piece[] {
  const out = [
    dyed(new THREE.SphereGeometry(1, 6, 4).scale(0.66, 0.44, 0.42).translate(0, 0.82, 0), fleece),
    trim(rod([0.5, 0.95, 0], [0.88, 0.8, 0], 0.16, 0.11), DARK),
  ];
  for (const [lx, lz, fx] of [[0.32, -0.17, 0.42], [0.32, 0.17, 0.24], [-0.34, -0.17, -0.44], [-0.34, 0.17, -0.26]]) {
    out.push(trim(rod([lx, 0.6, lz], [fx, 0, lz], 0.07, 0.05, 3, true), DARK));
  }
  return out;
}

/** A sheepdog at a run, low and long, black with a white chest. 1.3 long. */
function dog(): Piece[] {
  return [
    trim(slab([[-0.5, 0.75], [-0.45, 0.5], [0.4, 0.48], [0.5, 0.72], [0.35, 0.82], [-0.4, 0.82]], 0.32), 0x1f1c1a),
    trim(slab([[0.4, 0.5], [0.55, 0.48], [0.62, 0.78], [0.5, 0.8]], 0.3), 0xe8e2d4),
    trim(rod([0.5, 0.8, 0], [0.82, 0.86, 0], 0.15, 0.09), 0x1f1c1a),
    trim(rod([-0.48, 0.74, 0], [-0.85, 0.9, 0], 0.05, 0.03, 3), 0x1f1c1a),
    ...[[0.32, 0.62], [0.32, 0.12], [-0.34, -0.12], [-0.34, -0.6]].map(([tx, fx]) => trim(rod([tx, 0.52, 0], [fx, 0.02, 0], 0.06, 0.05, 3, true), 0x1f1c1a)),
  ];
}

/** One of the cattle about the origin, facing +x, 3.4 long at full size: broad and low, its head carried forward, with horns. */
function beast(hide: Dye): Piece[] {
  const out = [
    dyed(slab([[-1.25, 1.95], [-1.2, 1.15], [-0.9, 0.95], [0.9, 0.95], [1.25, 1.2], [1.35, 1.75], [1.1, 2.12], [-0.6, 2.0]], 1.1), hide),
    dyed(rod([1.25, 1.8, 0], [1.85, 1.2, 0], 0.34, 0.22), hide),
    trim(rod([-1.22, 1.85, 0], [-1.38, 0.8, 0], 0.06, 0.1, 3), DARK),
  ];
  for (const s of [-1, 1]) out.push(trim(rod([1.42, 1.9, s * 0.12], [1.32, 2.28, s * 0.56], 0.07, 0.02, 3, true), 0xe2d7bd));
  const legs: [P2, P2][] = [[[0.8, 1.1], [1.1, 0]], [[0.8, 1.1], [0.5, 0]], [[-0.85, 1.15], [-0.6, 0]], [[-0.85, 1.15], [-1.15, 0]]];
  legs.forEach(([[tx, ty], [hx, hy]], i) => {
    const z = (i % 2 ? 1 : -1) * 0.33;
    out.push(dyed(rod([tx, ty, z], [hx, hy, z], 0.2, 0.13, 4, true), hide));
  });
  return out;
}

/** A pack mule about the origin, facing +x, 2.4 long: a small horse with long ears, under a pack saddle with a bale on each side and one on top. */
function mule(hair: number, top: number): Piece[] {
  const out = [
    trim(slab([[-0.85, 1.35], [-0.8, 0.95], [-0.55, 0.78], [0.5, 0.78], [0.8, 0.95], [0.85, 1.3], [0.65, 1.5], [-0.65, 1.5]], 0.62), hair),
    trim(slab([[0.5, 1.4], [0.8, 1.02], [1.22, 1.62], [1.02, 1.86]], 0.36), hair),
    trim(rod([1.12, 1.8, 0], [1.5, 1.42, 0], 0.17, 0.12), hair),
    trim(rod([-0.8, 1.38, 0], [-0.98, 0.72, 0], 0.05, 0.08, 3), DARK),
  ];
  // the long ears, the mark of a mule
  for (const s of [-1, 1]) out.push(trim(rod([1.06, 1.9, s * 0.08], [0.94, 2.38, s * 0.17], 0.06, 0.025, 3, true), hair));
  for (const [tx, tz, fx] of [[0.52, -0.2, 0.75], [0.52, 0.2, 0.3], [-0.55, -0.2, -0.3], [-0.55, 0.2, -0.78]]) {
    out.push(trim(rod([tx, 0.95, tz], [fx, 0, tz], 0.1, 0.07, 4, true), hair));
  }
  out.push(
    trim(boxAt(1.0, 0.16, 0.7, -0.05, 1.56, 0), OAK),
    paint(boxAt(0.95, 0.6, 0.34, -0.05, 1.3, -0.5)),
    paint(boxAt(0.95, 0.6, 0.34, -0.05, 1.3, 0.5)),
    trim(new THREE.CylinderGeometry(0.22, 0.22, 0.9, 6).rotateZ(Math.PI / 2).translate(-0.05, 1.86, 0), top),
  );
  return out;
}

// ---------------------------------------------------------------------------
// The kinds
// ---------------------------------------------------------------------------

/** A drover in a hood with his crook, walking behind his flock, and his dog running at their side. The fleece is the paint; one black sheep. */
function flock(): Piece[] {
  const sheepAt: [number, number, number][] = [
    [3.0, 0.2, 0.1], [2.6, -0.9, -0.15], [2.25, 0.95, 0.2], [1.75, -0.1, 0], [1.35, -1.12, 0.1], [1.05, 1.05, -0.2],
    [0.6, 0.0, 0.15], [0.12, -0.95, -0.1], [-0.28, 0.9, 0.1], [-0.62, -0.1, -0.2], [-1.2, -0.92, 0.25],
  ];
  const out = sheepAt.flatMap(([x, z, turn], i) => place(sheep(i === 5 ? 0x3a3430 : 'paint'), x, z, turn));
  out.push(...place(dog(), -1.55, 1.3, 0.2));
  const dx = -2.85, dz = 0.15;
  out.push(
    ...walker({ x: dx, z: dz, coat: 0x6b5a3e, legs: 0x4a3c2c, hood: 0x6b5a3e, lean: 0.14, hands: [[0.1, 0.02, -0.38], [0.42, 0.55, 0.42]] }),
    // the crook, held out in his right hand, its hook at the top
    trim(rod([dx + 0.32, 0, dz + 0.45], [dx + 0.5, 2.75, dz + 0.45], 0.05, 0.04), SHAFT),
    trim(rod([dx + 0.5, 2.75, dz + 0.45], [dx + 0.78, 2.92, dz + 0.45], 0.04, 0.035, 3), SHAFT),
    trim(rod([dx + 0.78, 2.92, dz + 0.45], [dx + 0.82, 2.66, dz + 0.45], 0.035, 0.03, 3), SHAFT),
  );
  return centred(out);
}

/** Three head of cattle, two abreast and one behind, and their drover with his switch. The front pair's hides are the paint. */
function cattle(): Piece[] {
  const out = [
    ...place(beast('paint'), 1.6, -0.6, 0.04, 0.8),
    ...place(beast('paint'), 1.4, 0.62, -0.05, 0.8),
    ...place(beast(0xd6ccb6), -1.25, 0.05, 0.08, 0.8),
  ];
  const dx = -3.3;
  out.push(
    ...walker({ x: dx, z: -0.1, coat: 0x5c4a35, legs: 0x3e3128, hat: 0xc8ae6a, lean: 0.12, hands: [[0.1, 0.02, -0.38], [0.55, 0.45, 0.4]] }),
    trim(rod([dx + 0.55, HIP + 0.45, 0.3], [dx + 1.6, HIP + 0.9, 0.5], 0.035, 0.02, 3), SHAFT),
  );
  return centred(out);
}

/**
 * A lord's litter: a curtained box with a roof of dark wood and gilt on two
 * long poles, carried at the shoulder by four bearers in linen, with lanterns
 * hung at the front of the roof, and a gold cloak of the City Watch walking
 * ahead with his staff. The curtains are the paint.
 */
function litter(): Piece[] {
  // the poles at the height of the bearers' shoulders, each bearer walking just outside his pole with it on his inner shoulder
  const Y = 2.0, Z = 0.6, out: Piece[] = [];
  for (const s of [-1, 1]) out.push(trim(rod([-2.75, Y, s * Z], [2.75, Y, s * Z], 0.07, 0.07, 6), OAK));
  out.push(
    trim(boxAt(2.2, 0.16, 1.5, 0, Y + 0.12, 0), OAK),
    // the curtained body, with its curtains drawn back a little at each side to show the dark inside
    paint(boxAt(2.0, 1.2, 1.36, 0, Y + 0.8, 0)),
    trim(boxAt(0.7, 0.62, 1.4, 0.35, Y + 0.86, 0), 0x2a2119),
    trim(boxAt(2.4, 0.14, 1.7, 0, Y + 1.47, 0), OAK),
    trim(boxAt(1.8, 0.3, 1.2, 0, Y + 1.68, 0), OAK),
    trim(boxAt(2.44, 0.06, 1.74, 0, Y + 1.41, 0), GILT),
  );
  for (const [cx, cz] of [[1.15, 0.8], [1.15, -0.8], [-1.15, 0.8], [-1.15, -0.8]]) out.push(trim(boxAt(0.14, 0.18, 0.14, cx, Y + 1.63, cz), GILT));
  out.push(...lantern(1.3, Y + 1.12, 0.88), ...lantern(1.3, Y + 1.12, -0.88));
  // the bearers, each with his inner hand up on the pole and the other at his side
  for (const bx of [2.05, -2.05]) {
    for (const s of [-1, 1]) {
      const up: V3 = [0.12, 1.02, -s * 0.28], down: V3 = [0.06, 0.02, s * 0.38];
      out.push(...walker({ x: bx, z: s * (Z + 0.3), coat: LINEN, legs: 0x5a4a38, lean: 0.02, hands: s > 0 ? [up, down] : [down, up] }));
    }
  }
  // the gold cloak ahead, his staff upright in his right hand
  const gx = 3.55;
  out.push(
    ...walker({ x: gx, z: 0, coat: 0x5a4632, legs: 0x3a2e24, cloak: 0xd6a92e, hood: 0xd6a92e, lean: 0.06, hands: [[0.1, 0.02, -0.38], [0.3, 0.55, 0.4]] }),
    trim(rod([gx + 0.3, 0, 0.42], [gx + 0.34, 2.85, 0.42], 0.05, 0.045), SHAFT),
  );
  return centred(out);
}

/** Three pack mules in a string under bales from the east, tied head to tail, and their muleteer ahead in a head cloth with the lead rope and a lantern. The side bales are the paint. */
function mules(): Piece[] {
  const at = [1.25, -0.8, -2.85];
  const out = at.flatMap((x, i) => place(mule([0x6e5a48, 0x4f4136, 0x7d6a55][i], [SACKING, 0x8a3a2a, 0xd8b45a][i]), x, 0, [0.03, -0.04, 0.02][i]));
  // the rope from each mule's head to the tail of the one ahead, and from the first to the muleteer's hand
  for (let i = 1; i < at.length; i++) out.push(trim(rod([at[i] + 1.45, 1.45, 0], [at[i - 1] - 0.85, 1.25, 0], 0.03, 0.03, 3), ROPE));
  const mx = 3.15;
  out.push(
    trim(rod([at[0] + 1.48, 1.45, 0], [mx + 0.05, HIP + 0.35, -0.38], 0.03, 0.03, 3), ROPE),
    ...walker({ x: mx, z: 0, coat: 0x7a3e2a, legs: 0x4a3a2c, wrap: 0xe6d6b0, lean: 0.08, hands: [[0.05, 0.35, -0.4], [0.2, 0.5, 0.44]] }),
    trim(rod([mx + 0.2, HIP + 0.5, 0.46], [mx + 0.3, HIP + 1.05, 0.5], 0.035, 0.03, 3), SHAFT),
    ...lantern(mx + 0.32, HIP + 0.82, 0.5),
  );
  return centred(out);
}

/** A fishwife in a long skirt, an apron and a head cloth pushing a one wheeled barrow of fish, with a gull riding on its front. The barrow's boards are the paint. */
function barrow(): Piece[] {
  const out: Piece[] = [
    // the box, its floor and four sides
    paint(boxAt(1.5, 0.12, 1.1, 0.55, 0.62, 0)),
    paint(boxAt(1.5, 0.42, 0.08, 0.55, 0.85, -0.51)),
    paint(boxAt(1.5, 0.42, 0.08, 0.55, 0.85, 0.51)),
    paint(boxAt(0.08, 0.42, 1.1, 1.26, 0.85, 0)),
    paint(boxAt(0.08, 0.42, 1.1, -0.16, 0.85, 0)),
    // the fish, a silver heap, and the wheel at the front
    trim(new THREE.SphereGeometry(1, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.66, 0.26, 0.44).translate(0.55, 0.98, 0), 0xb9c4ca),
    trim(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 8).rotateX(Math.PI / 2).translate(1.48, 0.34, 0), 0x6b4a2e),
    trim(boxAt(0.5, 0.08, 0.1, 1.3, 0.48, -0.12), OAK),
    trim(boxAt(0.5, 0.08, 0.1, 1.3, 0.48, 0.12), OAK),
    // the legs it rests on, and the handles back to her hands
    trim(boxAt(0.08, 0.56, 0.08, -0.05, 0.28, -0.45), OAK),
    trim(boxAt(0.08, 0.56, 0.08, -0.05, 0.28, 0.45), OAK),
    trim(rod([-0.15, 0.72, -0.45], [-0.95, 1.05, -0.42], 0.05, 0.045, 4), OAK),
    trim(rod([-0.15, 0.72, 0.45], [-0.95, 1.05, 0.42], 0.05, 0.045, 4), OAK),
    // a gull riding on the front board
    trim(slab([[1.05, 1.1], [1.45, 1.12], [1.5, 1.3], [1.15, 1.32]], 0.2), 0xf2f0ea),
    trim(slab([[1.0, 1.28], [1.35, 1.3], [1.3, 1.36], [1.0, 1.34]], 0.34), 0x9aa3ad),
    trim(rod([1.45, 1.3, 0], [1.62, 1.28, 0], 0.07, 0.04, 3), 0xf2f0ea),
    trim(rod([1.62, 1.28, 0], [1.72, 1.25, 0], 0.03, 0.01, 3), 0xe0a83a),
  ];
  out.push(...walker({ x: -1.2, z: 0, coat: 0x9a4a3a, legs: 0x56707a, skirt: true, apron: 0xe8e2d4, wrap: 0xd8c8a0, lean: 0.16, hands: [[0.22, 0.12, -0.42], [0.22, 0.12, 0.42]] }));
  return centred(out);
}

const kind = (name: string, len: number, wid: number, colors: number[], pieces: Piece[], wb?: number): TrafficKind =>
  ({ name, len, wid, ...(wb ? { wb } : {}), colors, lamps: false, geo: shapeFrom(pieces) });

export const TRAFFIC: TrafficKind[] = [
  kind('flock', 7.4, 3.2, [0xece6d6, 0xe2dccb, 0xd9d1bd, 0xf1ece0], flock()),
  kind('cattle', 7.0, 2.6, [0x7a5034, 0x3d332c, 0xb98d5c, 0x8a6446, 0x5e3a26], cattle()),
  kind('litter', 6.6, 2.6, [0x8a1d22, 0x2f6f6a, 0x3f7a3a, 0x2f4f7a, 0x5b3f6e, 0x1d1d20], litter()),
  kind('mules', 7.4, 1.8, [0xd8a43a, 0xa0522d, 0xa8402e, 0x3b4a7a, 0x5f7a3a], mules()),
  kind('barrow', 3.6, 1.6, [0x6b7f8c, 0x8a6f4c, 0x56707a, 0x7a5a3a], barrow()),
];
