// Who travels the roads of Westeros in place of cars: riders, carts and wains.
//
// Each kind is a toy figure of lead and wood, chunky and simple, posed as toy
// horses are posed: a rider's horse in the flying gallop, the draught horses
// and the oxen at a walk. They are made of a few shared parts (a horse, an ox,
// a person, a wooden wheel, a lantern) put together in place, and they follow
// the rules of `TrafficKind` in tile.ts: nose along +x, standing on y = 0, the
// middle over (0, 0), paint given in white.
//
// The paint of the riders is the colours of the great houses, as the books give
// them, because a rider shows whose man he is. Plain colours stand for the
// houses: there are no sigils.

import * as THREE from 'three';
import type { TrafficKind } from '../../engine/tile';
import { PART, boxAt, shapeFrom, shapePart, sideProfile } from '../../engine/vehicles';

type P2 = [number, number];
type V3 = [number, number, number];
type Piece = THREE.BufferGeometry;

/** The colours of the great houses, as the books give them. */
export const HOUSE = {
  starkGrey: 0x8a9099,
  starkWhite: 0xe8e6df,
  lannisterCrimson: 0x9b1b1f,
  lannisterGold: 0xd9b23c,
  baratheonGold: 0xe0b830,
  baratheonBlack: 0x1d1d20,
  tyrellGreen: 0x3f7a3a,
  martellOrange: 0xe07a22,
  tullyBlue: 0x2f5fa8,
  tullyRed: 0xb03028,
  arrynBlue: 0x6ea6d9,
  greyjoyBlack: 0x1d1d20,
  targaryenRed: 0xb3141c,
  nightsWatch: 0x1b1b1f,
} as const satisfies Record<string, number>;

const SKIN = 0xd9a77e, STEEL = 0x8d939a, IRON = 0x34353a, LEATHER = 0x5a3c26, STRAW = 0xcdb36e;
const SHAFT = 0x6e4e30, OAK = 0x4e3422, GILT = 0xc9a23a, GLASS = 0x2b3440;
const FLAME = 0xffa63a, HORN = 0xffd27a;

/** What a piece is dyed: the vehicle's paint, or a colour of its own. */
interface Dye { part: number; color: number }
const PAINTED: Dye = { part: PART.paint, color: 0xffffff };
const own = (color: number): Dye => ({ part: PART.trim, color });

const dyed = (g: Piece, d: Dye): Piece => shapePart(g, d.part, d.color);
const trim = (g: Piece, color: number): Piece => shapePart(g, PART.trim, color);
const paint = (g: Piece): Piece => shapePart(g, PART.paint, 0xffffff);

const UP = new THREE.Vector3(0, 1, 0);

/**
 * A tapered rod from one point to another, square in section unless it is
 * given more sides: a leg, an arm, a pole. It is `ra` thick at `a` and `rb` at
 * `b`. An open rod has no ends, for where its ends are hidden.
 */
function rod(a: V3, b: V3, ra: number, rb: number, sides = 4, open = false): Piece {
  const from = new THREE.Vector3(...a), dir = new THREE.Vector3(...b).sub(from);
  const len = dir.length();
  return new THREE.CylinderGeometry(rb, ra, len, sides, 1, open)
    .rotateY(Math.PI / sides)
    .translate(0, len / 2, 0)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()))
    .translate(from.x, from.y, from.z);
}

/** A side profile pushed out to a width, standing at a place across the vehicle. */
const slab = (pts: P2[], width: number, z = 0): Piece => sideProfile(pts, width).translate(0, 0, z);

/** A profile across the vehicle, as corners with z across and y up, pushed out along it from x0 to x1: a canvas tilt, a roof. */
const vault = (pts: P2[], x0: number, x1: number): Piece =>
  sideProfile(pts, x1 - x0).rotateY(Math.PI / 2).translate((x0 + x1) / 2, 0, 0);

/** Moves pieces made about the origin to a place, scaled. */
function place(pieces: Piece[], x: number, z = 0, s = 1): Piece[] {
  for (const g of pieces) g.scale(s, s, s).translate(x, 0, z);
  return pieces;
}

// ---------------------------------------------------------------------------
// Horses and oxen
// ---------------------------------------------------------------------------

/** A horse's coat, and the darker colour of its mane and tail. */
interface Coat { hair: number; mane: number }
const BAY: Coat = { hair: 0x7a4526, mane: 0x1d1611 };
const BLACK: Coat = { hair: 0x2b2623, mane: 0x141210 };
const DARK_BAY: Coat = { hair: 0x4a2e1e, mane: 0x17120e };
const GREY: Coat = { hair: 0x96948f, mane: 0x55534f };
const WHITE: Coat = { hair: 0xd6d2c8, mane: 0xa8a49b };
const CHESTNUT: Coat = { hair: 0xa05a2c, mane: 0x6a3519 };
const DUN: Coat = { hair: 0xb8975c, mane: 0x3e3022 };

/** A horse's pose: its neck, its head, where its tail ends and the top and hoof of each leg. */
interface Gait {
  /** The neck as a side profile: the base of its crest, the chest, the throat and the crest behind the ears. */
  neck: [P2, P2, P2, P2];
  poll: P2;
  muzzle: P2;
  tail: P2;
  /** Near fore, off fore, near hind and off hind. The near side is the left, towards -z. */
  legs: [P2, P2][];
}

/** The flying gallop of a toy horse: forelegs stretched forward, hind legs back, neck out and tail streaming. */
const GALLOP: Gait = {
  neck: [[0.75, 2.15], [1.2, 1.6], [1.95, 2.5], [1.7, 2.88]],
  poll: [1.8, 2.82], muzzle: [2.3, 2.42],
  tail: [-1.9, 1.85],
  legs: [[[0.8, 1.5], [1.95, 0.25]], [[0.8, 1.5], [1.75, 0.03]], [[-0.8, 1.55], [-1.9, 0.22]], [[-0.8, 1.55], [-1.7, 0.03]]],
};

/** A walk in mid stride, the near fore and the off hind forward. */
const WALK: Gait = {
  neck: [[0.75, 2.2], [1.2, 1.65], [1.75, 2.75], [1.45, 3.05]],
  poll: [1.58, 2.98], muzzle: [2.0, 2.32],
  tail: [-1.45, 0.95],
  legs: [[[0.8, 1.45], [1.2, 0]], [[0.8, 1.45], [0.55, 0]], [[-0.8, 1.5], [-0.55, 0]], [[-0.8, 1.5], [-1.1, 0]]],
};

/** A horse's barrel, from the rump round under the belly, up the chest and back along the withers and the back. */
const HORSE_BODY: P2[] = [[-1.25, 2.0], [-1.15, 1.5], [-0.85, 1.25], [0.7, 1.22], [1.15, 1.45], [1.25, 1.95], [1.0, 2.3], [-1.0, 2.32]];

/** The top of a horse's back, where a saddle or a cloth sits. */
const BACK = 2.32;

/**
 * A horse about the origin: its barrel's middle over (0, 0), 3.6 to 4.3 long
 * with its head and tail, its back 2.3 high. `girth` is how wide its barrel
 * is, and a draught horse wears a collar.
 */
function horse(coat: Coat, gait: Gait, girth = 0.9, collar = false): Piece[] {
  // It has no ears: at the size it is seen they would not show, and it is drawn many times over.
  const [n0, , , n3] = gait.neck, [px, py] = gait.poll, [mx, my] = gait.muzzle, [tx, ty] = gait.tail;
  const out = [
    trim(slab(HORSE_BODY, girth), coat.hair),
    trim(slab(gait.neck, girth * 0.6), coat.hair),
    // the mane along the crest of the neck
    trim(slab([[n0[0] - 0.05, n0[1] + 0.1], [n0[0] + 0.12, n0[1] - 0.02], [n3[0] + 0.05, n3[1] - 0.08], [n3[0] - 0.06, n3[1] + 0.08]], girth * 0.3), coat.mane),
    trim(rod([px, py, 0], [mx, my, 0], 0.3, 0.2), coat.hair),
    trim(rod([-1.15, 2.2, 0], [tx, ty, 0], 0.1, 0.18, 3), coat.mane),
  ];
  gait.legs.forEach(([[tx, ty], [hx, hy]], i) => {
    const z = (i % 2 ? 1 : -1) * (girth / 2 - 0.2);
    out.push(trim(rod([tx, ty, z], [hx, hy, z], 0.17, 0.1, 4, true), coat.hair));
  });
  if (collar) out.push(trim(new THREE.BoxGeometry(0.26, 0.8, girth * 0.82).rotateZ(0.85).translate(1.12, 2.2, 0), LEATHER));
  return out;
}

/** A saddle on a horse's back. */
const saddle = (girth: number): Piece => trim(boxAt(0.8, 0.14, girth + 0.08, -0.02, BACK + 0.07, 0), LEATHER);

/** Where a rider sits on a horse of ordinary size. */
const SEAT = BACK + 0.12;

/** An ox, broad and low with its head carried forward, at a walk. Its middle is over (0, 0) and it is 3.4 long. */
function ox(hair: number): Piece[] {
  const out = [
    trim(slab([[-1.25, 1.95], [-1.2, 1.15], [-0.9, 0.95], [0.9, 0.95], [1.25, 1.2], [1.35, 1.75], [1.1, 2.12], [-0.6, 2.0]], 1.1), hair),
    trim(rod([1.25, 1.8, 0], [1.85, 1.2, 0], 0.34, 0.22), hair),
    trim(rod([-1.22, 1.85, 0], [-1.38, 0.8, 0], 0.06, 0.1, 3), hair),
  ];
  // horns curving out and up from the top of the head
  for (const s of [-1, 1]) out.push(trim(rod([1.42, 1.9, s * 0.12], [1.32, 2.28, s * 0.56], 0.07, 0.02, 3, true), 0xe2d7bd));
  const legs: [P2, P2][] = [[[0.8, 1.1], [1.1, 0]], [[0.8, 1.1], [0.5, 0]], [[-0.85, 1.15], [-0.6, 0]], [[-0.85, 1.15], [-1.15, 0]]];
  legs.forEach(([[tx, ty], [hx, hy]], i) => {
    const z = (i % 2 ? 1 : -1) * 0.33;
    out.push(trim(rod([tx, ty, z], [hx, hy, z], 0.2, 0.13, 4, true), hair));
  });
  return out;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

/** A person: one who rides astride, one who sits on a bench with their feet forward, or one who walks. */
interface Person {
  /** Where the seat is, or the feet for one who walks. */
  at: V3;
  pose: 'astride' | 'bench' | 'walk';
  coat: Dye;
  /** The arms are the coat's colour unless they are given another. */
  arms?: Dye;
  legs: number;
  /** One of these on the head: a hood, which is the cloak's dye or else the coat's, a helm, or a hat of a colour. */
  hood?: boolean;
  helm?: boolean;
  hat?: number;
  cloak?: Dye;
  /** How far the cloak streams back, from 0 hanging to 1 flying out behind. */
  stream?: number;
  /** How far the shoulders are forward of the hips. */
  lean?: number;
  /** How far out the knees are of one who rides astride: wider on a broader horse. */
  spread?: number;
  /** Where the left and the right hand are, from the seat. They hold the reins unless this says otherwise. */
  hands?: [V3, V3];
}

function person(p: Person): Piece[] {
  const [x, y, z] = p.at, lean = p.lean ?? 0.05;
  const hip = p.pose === 'walk' ? y + 1.25 : y;
  const arms = p.arms ?? p.coat, out: Piece[] = [];

  // the legs are open at both ends: their tops are hidden in the body, and their feet could be seen only from below
  for (const s of [-1, 1]) {
    const knee = p.spread ?? 0.55;
    const [a, b]: [V3, V3] = p.pose === 'astride'
      ? [[x - 0.05, hip + 0.1, z + s * (knee - 0.14)], [x + 0.3, hip - 0.8, z + s * knee]]
      : p.pose === 'bench'
        ? [[x, hip + 0.06, z + s * 0.17], [x + 0.6, hip - 0.55, z + s * 0.2]]
        : [[x, hip, z + s * 0.16], [x + s * 0.3, y, z + s * 0.18]];
    out.push(trim(rod(a, b, 0.16, 0.13, 4, true), p.legs));
  }
  out.push(dyed(slab([[x - 0.22, hip], [x + 0.22, hip], [x + 0.22 + lean, hip + 1.0], [x - 0.2 + lean, hip + 1.0]], 0.62, z), p.coat));

  const reins: [V3, V3] = p.pose === 'walk' ? [[0.08, -0.05, -0.36], [0.08, -0.05, 0.36]] : [[0.55, 0.32, -0.18], [0.55, 0.32, 0.18]];
  (p.hands ?? reins).forEach(([ax, ay, az], i) => {
    const s = i ? 1 : -1;
    out.push(dyed(rod([x + lean * 0.85, hip + 0.88, z + s * 0.3], [x + ax, hip + ay, z + az], 0.12, 0.09), arms));
  });

  const hx = x + lean * 1.05, hy = hip + 1.24;
  if (p.helm) {
    // a great helm with a dark slit to see through
    out.push(trim(boxAt(0.46, 0.5, 0.46, hx, hy, z), STEEL), trim(boxAt(0.05, 0.07, 0.34, hx + 0.23, hy + 0.04, z), IRON));
  } else {
    out.push(trim(boxAt(0.38, 0.42, 0.38, hx, hy, z), SKIN));
    if (p.hood) out.push(dyed(boxAt(0.48, 0.5, 0.48, hx - 0.07, hy + 0.03, z), p.cloak ?? p.coat));
    if (p.hat !== undefined) out.push(trim(new THREE.CylinderGeometry(0.16, 0.44, 0.22, 6).translate(hx, hy + 0.3, z), p.hat));
  }

  if (p.cloak) {
    // from the shoulders back and down, streaming out behind as far as the pace blows it
    const s = p.stream ?? 0;
    out.push(dyed(slab([
      [x + lean - 0.02, hip + 1.0], [x + lean - 0.3, hip + 1.04],
      [x - 0.42 - 0.85 * s, hip + 0.05 + 0.3 * s], [x - 0.18 - 0.5 * s, hip - 0.1 + 0.15 * s],
    ], 0.8, z), p.cloak));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Wheels and lanterns
// ---------------------------------------------------------------------------

/** Turns a flat piece that faces +z to face out on its side of the vehicle. */
const outward = (g: Piece, side: number): Piece => (side < 0 ? g.rotateY(Math.PI) : g);

/**
 * A wooden wheel standing on the road at x, with its axis across the
 * vehicle: a rim, the dark between its spokes, four spokes and a hub. The dark
 * and the spokes are flat, on the side that faces out, since nothing sees the
 * other. `z` says which side of the vehicle it is on.
 */
function wheel(x: number, r: number, z: number, sides = 10): Piece[] {
  const side = Math.sign(z), t = 0.2, face = z + side * (t / 2 + 0.015);
  return [
    trim(new THREE.CylinderGeometry(r, r, t, sides).rotateX(Math.PI / 2).translate(x, r, z), 0x6b4a2e),
    trim(outward(new THREE.CircleGeometry(r * 0.78, sides), side).translate(x, r, face), 0x2e2218),
    ...[0, Math.PI / 2].map((a) => trim(outward(new THREE.PlaneGeometry(r * 1.6, 0.14).rotateZ(a), side).translate(x, r, face + side * 0.012), 0x9a744a)),
    trim(boxAt(0.32, 0.32, t + 0.22, x, r, z), 0x4a3423),
  ];
}

/** A wheel on each side of the vehicle. */
const pair = (x: number, r: number, z: number, sides?: number): Piece[] => [...wheel(x, r, -z, sides), ...wheel(x, r, z, sides)];

/** A horn lantern under an iron cap. The horn is the part that lights up at night. */
const lantern = (x: number, y: number, z: number): Piece[] => [
  shapePart(boxAt(0.24, 0.3, 0.24, x, y, z), PART.head, HORN),
  trim(boxAt(0.3, 0.07, 0.3, x, y + 0.18, z), IRON),
];

// ---------------------------------------------------------------------------
// The kinds
// ---------------------------------------------------------------------------

/** A rider at the gallop, in a hooded cloak that streams out behind him. His cloak and his horse's cloth are the paint. */
function rider(): Piece[] {
  return place([
    ...horse(BAY, GALLOP),
    paint(slab([[-0.72, BACK + 0.04], [-0.78, 1.55], [0.58, 1.55], [0.64, BACK + 0.04]], 0.96)), // the trapper over its back
    saddle(0.9),
    ...person({ at: [-0.02, SEAT, 0], pose: 'astride', coat: own(0x6b4f35), legs: 0x3e3128, hood: true, cloak: PAINTED, stream: 1, lean: 0.25 }),
  ], -0.22);
}

/**
 * A knight in plate at a walk, on a heavier horse in a cloth that falls to its
 * knees, with a shield on his left arm and a banner on a lance in his right
 * hand. The banner, the shield, his surcoat and the horse's cloth are the paint.
 */
function knight(): Piece[] {
  const S = 1.06, W = 1.05, seat = (BACK + 0.06) * S, lance = 0.5;
  const steed = place([
    ...horse(GREY, WALK, W),
    paint(slab([[-1.22, BACK + 0.04], [-1.32, 1.42], [1.22, 1.42], [1.32, 1.95], [1.08, 2.38], [-0.3, BACK + 0.02]], W + 0.08)),
  ], 0, 0, S);
  return place([
    ...steed,
    ...person({
      at: [0, seat, 0], pose: 'astride', coat: PAINTED, arms: own(STEEL), legs: STEEL, helm: true, spread: 0.68,
      hands: [[0.5, 0.3, -0.2], [0.38, 0.62, lance - 0.08]],
    }),
    // a heater shield on the left arm
    paint(slab([[0.47, seat + 1.0], [-0.17, seat + 1.0], [-0.17, seat + 0.5], [0.15, seat + 0.07], [0.47, seat + 0.5]], 0.1, -0.8)),
    // the lance with its steel point, and a swallow tailed banner below the point
    trim(rod([0.33, 1.75, lance], [0.48, 5.2, lance], 0.07, 0.06), SHAFT),
    trim(rod([0.48, 5.2, lance], [0.49, 5.5, lance], 0.09, 0.015), STEEL),
    paint(slab([[0.46, 5.15], [-0.99, 5.1], [-0.66, 4.65], [-0.99, 4.2], [0.46, 4.15]], 0.06, lance)),
  ], -0.28);
}

/** Two brothers of the Night's Watch riding side by side, all in black on dark horses. The one on the right carries a torch. */
function watch(): Piece[] {
  const brothers: [number, Coat][] = [[-0.8, BLACK], [0.8, DARK_BAY]], out: Piece[] = [];
  brothers.forEach(([z, coat], i) => {
    const torch = i === 1;
    out.push(
      ...place(horse(coat, WALK), 0, z),
      saddle(0.9).translate(0, 0, z),
      ...person({
        at: [0, SEAT, z], pose: 'astride', coat: PAINTED, legs: 0x2a2622, hood: true, cloak: PAINTED, stream: 0.3,
        ...(torch ? { hands: [[0.55, 0.32, -0.18], [0.3, 0.8, 0.38]] } : {}),
      }),
    );
    if (torch) {
      const tz = z + 0.4, top: V3 = [0.42, SEAT + 1.4, tz];
      out.push(
        trim(rod([0.26, SEAT + 0.45, tz], top, 0.06, 0.05), OAK),
        shapePart(rod(top, [0.46, SEAT + 1.85, tz], 0.16, 0.02), PART.head, FLAME),
      );
    }
  });
  return place(out, -0.25);
}

/** A two wheeled cart behind one horse, with a driver on the front board and sacks and barrels in the back. Its boards are the paint. */
function cart(): Piece[] {
  const sack = (x: number, y: number, z: number, turn: number, color: number): Piece =>
    trim(new THREE.BoxGeometry(0.95, 0.5, 0.75).rotateY(turn).translate(x, y, z), color);
  const barrel = (x: number, z: number): Piece => trim(new THREE.CylinderGeometry(0.36, 0.36, 0.85, 8).translate(x, 1.675, z), 0x7d5630);
  return [
    ...place(horse(CHESTNUT, WALK, 0.9, true), 1.6),
    ...[-1, 1].map((s) => trim(rod([-0.75, 1.3, s * 0.62], [2.7, 1.95, s * 0.52], 0.06, 0.05), SHAFT)),
    // the bed: its floor, its sides, the tailboard and the front board
    paint(boxAt(3.0, 0.25, 2.1, -2.25, 1.125, 0)),
    paint(boxAt(3.0, 0.6, 0.1, -2.25, 1.55, -1.0)),
    paint(boxAt(3.0, 0.6, 0.1, -2.25, 1.55, 1.0)),
    paint(boxAt(0.1, 0.6, 2.1, -3.7, 1.55, 0)),
    paint(boxAt(0.1, 0.6, 2.1, -0.8, 1.55, 0)),
    sack(-3.05, 1.5, -0.45, 0.25, 0xc7b287),
    sack(-2.15, 1.5, 0.45, -0.2, 0xb09a6e),
    sack(-2.6, 1.95, -0.1, 0.6, 0xc7b287),
    barrel(-1.4, -0.45),
    barrel(-3.1, 0.5),
    ...pair(-2.2, 0.95, 1.2),
    ...person({ at: [-0.85, 1.9, 0], pose: 'bench', coat: own(0x7a6248), legs: 0x4a3c2c, hat: STRAW }),
  ];
}

/** A four wheeled wain heaped high with hay behind two oxen under a yoke, its driver sitting on the front of the bed. The hay is the paint. */
function haywain(): Piece[] {
  return [
    ...place(ox(0x8a6446), 2.75, -0.68),
    ...place(ox(0xd6ccb6), 2.75, 0.68),
    trim(boxAt(0.26, 0.22, 2.5, 3.8, 2.2, 0), SHAFT), // the yoke across both necks
    trim(rod([0.5, 1.15, 0], [3.8, 2.05, 0], 0.08, 0.07), SHAFT),
    trim(boxAt(5.0, 0.3, 2.3, -2.0, 1.2, 0), 0x7a5a3a),
    // the hay, a faceted heap that overhangs the bed
    paint(new THREE.SphereGeometry(1, 8, 4).scale(2.55, 1.25, 1.55).translate(-2.3, 2.3, 0)),
    ...pair(-3.55, 0.95, 1.3),
    ...pair(-0.45, 0.75, 1.3, 8),
    ...person({ at: [0.45, 1.4, 0], pose: 'bench', coat: own(0x8a7a58), legs: 0x5a4a36, hat: 0xd2b86c }),
  ];
}

/** The tilt of a covered wagon across the wagon, from the top of its bed up over its hoops. */
const TILT: P2[] = [[-1.25, 1.45], [1.25, 1.45], [1.32, 2.55], [0.98, 3.3], [0, 3.6], [-0.98, 3.3], [-1.32, 2.55]];
/** The tilt's profile grown or shrunk about the middle of the bed's top. */
const tilt = (s: number): P2[] => TILT.map(([z, y]) => [z * s, 1.45 + (y - 1.45) * s]);

/** A covered wagon with a canvas tilt on hoops behind a pair of horses, a lantern hung at the front. The canvas is the paint. */
function wain(): Piece[] {
  return [
    ...place(horse(DUN, WALK, 0.9, true), 2.55, -0.58),
    ...place(horse(DUN, WALK, 0.9, true), 2.55, 0.58),
    trim(rod([-0.25, 1.2, 0], [3.6, 1.95, 0], 0.07, 0.06), SHAFT),
    trim(boxAt(4.5, 0.3, 2.3, -2.45, 1.3, 0), 0x6b4c32),
    paint(vault(TILT, -4.6, -0.55)),
    // the front hoop, and the dark of the inside seen through the opening of the tilt
    trim(vault(tilt(1.04), -0.6, -0.48), SHAFT),
    trim(vault(tilt(0.78), -0.48, -0.44), 0x2a2119),
    trim(boxAt(0.5, 0.35, 1.6, -0.15, 1.62, 0), SHAFT), // the driver's bench
    ...lantern(-0.33, 2.55, -1.0),
    ...pair(-3.65, 0.95, 1.25),
    ...pair(-1.05, 0.78, 1.25, 8),
    ...person({ at: [-0.15, 1.8, 0], pose: 'bench', coat: own(0x5d6b4c), legs: 0x4a3c2c, hood: true }),
  ];
}

/**
 * A wheelhouse, the great travelling carriage of a lord: two storeys of carved
 * oak banded in gilt on big wheels, small windows, a little roof, a coachman in
 * livery on the box and a lantern at the front, drawn by four white horses in
 * two pairs. It is of toy size, so the team is smaller than a rider's horse
 * and the whole is ten long. Its body and the coachman's coat are the paint.
 */
function wheelhouse(): Piece[] {
  const S = 0.85, Z = 0.5;
  const team = [0.3, 3.15].flatMap((x) => [-Z, Z].flatMap((z) => place(horse(WHITE, WALK), x, z, S)));
  // two small windows in each storey on each side, flat on the face of the body: in the lower storey they clear the big wheels
  const windows = [-1, 1].flatMap((side) => [[-4.25, 2.2, 1.25], [-2.55, 2.2, 1.25], [-4.0, 3.3, 1.15], [-2.9, 3.3, 1.15]].map(([x, y, half]) =>
    shapePart(outward(new THREE.PlaneGeometry(0.5, 0.48), side).translate(x, y, side * (half + 0.015)), PART.glass, GLASS)));
  return [
    ...team,
    trim(rod([-1.3, 1.15, 0], [3.9, 1.75, 0], 0.07, 0.06), OAK),
    paint(boxAt(3.0, 1.25, 2.5, -3.4, 2.025, 0)),
    trim(boxAt(3.12, 0.12, 2.62, -3.4, 2.71, 0), GILT),
    paint(boxAt(2.7, 1.0, 2.3, -3.45, 3.27, 0)),
    trim(vault([[-1.38, 3.77], [1.38, 3.77], [1.38, 3.9], [0, 4.25], [-1.38, 3.9]], -4.95, -1.85), OAK),
    ...windows,
    // the coachman's box and his footboard
    trim(boxAt(0.7, 1.0, 1.4, -1.6, 1.85, 0), OAK),
    trim(boxAt(0.45, 0.08, 1.4, -1.0, 1.72, 0), OAK),
    ...person({ at: [-1.6, 2.35, 0], pose: 'bench', coat: PAINTED, legs: 0x2a2622, hat: 0x2c2622 }),
    ...lantern(-1.95, 3.2, 1.0),
    ...pair(-3.95, 1.0, 1.33, 8),
    ...pair(-2.05, 0.8, 1.33, 8),
  ];
}

const kind = (name: string, len: number, wid: number, wb: number, colors: number[], pieces: Piece[]): TrafficKind =>
  ({ name, len, wid, wb, colors, lamps: false, geo: shapeFrom(pieces) });

const H = HOUSE;

export const WAYFARERS: TrafficKind[] = [
  kind('rider', 4.4, 1.4, 2.2, [H.starkGrey, H.starkWhite, H.lannisterCrimson, H.baratheonGold, H.tyrellGreen, H.martellOrange, H.tullyBlue, H.arrynBlue, H.greyjoyBlack], rider()),
  kind('banner', 4.0, 1.7, 2.2, [H.lannisterCrimson, H.lannisterGold, H.baratheonGold, H.starkGrey, H.tyrellGreen, H.martellOrange, H.tullyRed, H.arrynBlue, H.targaryenRed], knight()),
  kind('watch', 3.8, 3.0, 2.2, [H.nightsWatch], watch()),
  kind('cart', 7.5, 2.8, 3.6, [0x8a6a44, 0x6b5136, 0x9a7b55, 0x8e4a3c, 0x5a6e80, 0x667a58], cart()),
  kind('haywain', 9.7, 3.1, 4.8, [0xd9c36a, 0xe3cf7a, 0xc9b25a, 0xd6bd62, 0xe8d690], haywain()),
  kind('wain', 9.4, 2.9, 4.7, [0xe6dcc0, 0xd9cba8, 0xc9b99a, 0xefe6cf, 0xbfae8c], wain()),
  kind('wheelhouse', 10.0, 3.1, 5.0, [H.lannisterCrimson, H.tyrellGreen, H.arrynBlue, H.tullyBlue, H.baratheonBlack, H.martellOrange], wheelhouse()),
];
