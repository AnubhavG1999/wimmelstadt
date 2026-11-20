// Ships under sail on the narrow sea.
//
// Three of them go round one long way through open water, a third of it
// apart: down the mouth of Blackwater Bay past Dragonstone, round the corner
// of the stormlands, about in the sea off Dorne, and back up the east side.
// They are the only things on the water that move. The ships at the quays
// are their builders' and lie still.
//
// A ship is a mesh of its own, as the engine's tiles make a river boat: one
// shape each, because each has its own colours. Its sails are this tile's
// drawing, from what the books say of them: a merchant cog of the crownlands,
// a trader out of Braavos with a purple hull and purple sails, and a galley
// of Lys with a striped hull.

import * as THREE from 'three';
import { flat, pathOf, rounded } from '../../engine/corners';
import { GeoBuilder, interior, type V3 } from '../../engine/geo';
import type { Build } from '../../engine/tile';
import { WATER_LEVEL, type P2 } from './plan';

/** A ship's colours: its hull, the wale along its side, and the strips of its sail from the yard down. */
interface Colours { hull: number; wale: number; sail: number[]; pennon: number }

const OAK = 0x5a4636, DECK = 0xb39a6b, SPAR = 0x6b5539, SKIN = 0xe8c4a0;

const SHIPS: Colours[] = [
  { hull: OAK, wale: 0xb53a2e, sail: [0xe9dfc6, 0xb53a2e, 0xe9dfc6, 0xe9dfc6], pennon: 0xb53a2e },
  { hull: 0x4a2f5c, wale: 0x8d62ab, sail: [0x6b3f8a, 0x6b3f8a, 0x8d62ab, 0x6b3f8a], pennon: 0xd9c98f },
  { hull: 0x2e6b6b, wale: 0xe2c14e, sail: [0xe9dfc6, 0x2e6b6b, 0xe9dfc6, 0x2e6b6b], pennon: 0xe2c14e },
];

/**
 * The way they sail, as corners of one closed line: south down the bay's
 * mouth, round Storm's End's headland well off its rocks, west along the
 * shore of Dorne, about, and back north up the east side. It keeps clear of
 * the quays, of Dragonstone and of every shore by 4 or more.
 */
const WAY: P2[] = [
  [84.5, 46.5], [82.5, 60], [81, 78], [81, 93], [78, 103.5], [69, 107.8], [62, 107.2], [59.8, 109.2], [62.5, 111.2], [72, 111.3],
  [82, 109.5], [89, 104], [91.5, 93], [91.5, 72], [90.5, 56], [88.5, 48], [86.5, 45.5],
];

/** How fast they sail, in units a second, and how far below a ship's waterline its keel is drawn. */
const PACE = 2.3, KEEL = 0.45;

/** A face that is seen from both its sides: a sail, a pennon. */
function both(g: GeoBuilder, a: V3, b: V3, c: V3, d: V3, n: V3, color: number): void {
  g.quad(a, b, c, d, n, color);
  g.quad(d, c, b, a, [-n[0], -n[1], -n[2]], color);
}

/** One ship, in its own frame: its bow to +x, its waterline at 0, about 10 long and 9 high to its masthead. */
function ship(g: GeoBuilder, c: Colours): void {
  const W = 1.45, GUN = 1.05, X0 = -3.3, X1 = 2.4;
  // the hull amidships: two sides and the deck
  g.box(X0, -KEEL, -W, X1, GUN, W, c.hull, { faces: 'NST', top: DECK });
  g.box(X0, 0.5, -W - 0.03, X1, 0.72, W + 0.03, c.wale, { faces: 'NS' });
  for (const s of [-1, 1]) {
    // the bow: the two sides come to the stem, which rises
    g.quad([X1, -KEEL, s * W], [5.0, -KEEL, 0], [5.0, 1.65, 0], [X1, GUN, s * W], [0.5, 0, s * 0.87], c.hull);
    // the stern: drawn in a little, and rising to the castle
    g.quad([X0, -KEEL, s * W], [-4.4, -KEEL, s * 0.85], [-4.4, GUN, s * 0.85], [X0, GUN, s * W], [-0.4, 0, s * 0.92], c.hull);
  }
  g.tri([X1, GUN, -W], [X1, GUN, W], [5.0, 1.65, 0], [0, 1, 0], DECK);
  g.quad([-4.4, -KEEL, 0.85], [-4.4, -KEEL, -0.85], [-4.4, GUN, -0.85], [-4.4, GUN, 0.85], [-1, 0, 0], c.hull);
  // the sterncastle: a cabin with a lit light in its stern, a deck on it, and a rail
  g.box(-4.4, GUN, -1.15, -2.2, 1.95, 1.15, c.hull, { faces: 'NESW', top: DECK });
  g.box(-4.4, 1.95, -1.15, -2.2, 2.0, 1.15, DECK, { faces: 'T' });
  g.box(-4.43, 1.25, -0.5, -4.4, 1.7, 0.5, 0xe8b860, { faces: 'W', win: interior(0.9) });
  for (const s of [-1, 1]) g.box(-4.4, 2.0, s > 0 ? 1.05 : -1.15, -2.2, 2.35, s > 0 ? 1.15 : -1.05, c.wale, { faces: 'NST' });
  g.box(-4.4, 2.0, -1.15, -4.3, 2.35, 1.15, c.wale, { faces: 'EWT' });
  // a lantern on the stern, which burns at night
  g.box(-4.36, 2.35, -0.05, -4.28, 2.9, 0.05, SPAR, { faces: 'NESW' });
  g.box(-4.48, 2.9, -0.16, -4.16, 3.25, 0.16, 0xf2c060, { faces: 'NESWT', win: interior(1) });
  // the mast, the yard and the bowsprit
  g.box(0.14, GUN, -0.11, 0.36, 8.4, 0.11, SPAR, { faces: 'NESWT' });
  g.box(0.36, 6.95, -2.75, 0.5, 7.1, 2.75, SPAR, { faces: 'NESWTB' });
  g.beam([4.6, 1.5, 0], [6.3, 2.3, 0], 0.08, 0.05, SPAR);
  // the sail: four strips from the yard to its foot, bellied forward by the wind
  const rows: [number, number, number][] = [[7.0, 0.5, 2.7], [5.85, 1.05, 2.72], [4.7, 1.3, 2.7], [3.55, 1.15, 2.62], [2.5, 0.7, 2.5]];
  for (let i = 0; i < 4; i++) {
    const [y0, x0, w0] = rows[i], [y1, x1, w1] = rows[i + 1];
    both(g, [x1, y1, -w1], [x1, y1, w1], [x0, y0, w0], [x0, y0, -w0], [1, 0.2 * (i < 2 ? 1 : -1), 0], c.sail[i]);
  }
  // a pennon at the masthead, streaming aft
  both(g, [0.25, 8.0, 0], [-1.7, 8.15, 0], [-1.7, 8.25, 0], [0.25, 8.4, 0], [0, 0, 1], c.pennon);
  // her people: one at the helm and two on deck
  const coats = [0x4f6f8f, 0x8a5a3a, 0x6f7f4f];
  ([[-3.2, 2.0, 0.2], [-0.9, GUN, -0.7], [1.6, GUN, 0.6]] as V3[]).forEach(([x, y, z], i) => {
    g.box(x - 0.19, y, z - 0.19, x + 0.19, y + 0.95, z + 0.19, coats[i], { faces: 'NESW' });
    g.box(x - 0.15, y + 0.95, z - 0.15, x + 0.15, y + 1.28, z + 0.15, SKIN);
  });
}

/** Builds the ships and sets them sailing. */
export function buildShips(k: Build): void {
  const path = pathOf(flat(rounded(WAY, 7, true)), true), L = path.length;
  const material = k.mat.city();
  const meshes = SHIPS.map((c, i) => {
    const g = new GeoBuilder();
    ship(g, c);
    const mesh = new THREE.Mesh(g.build(), material);
    mesh.name = `ship-${i}`;
    mesh.castShadow = true;
    k.group.add(mesh);
    return mesh;
  });
  const here = new THREE.Vector3(), ahead = new THREE.Vector3();
  let t = 0;
  k.each((dt) => {
    t += dt;
    meshes.forEach((mesh, i) => {
      const s = (t * PACE + (i * L) / meshes.length) % L;
      path.at(s, here);
      path.at((s + 1.5) % L, ahead);
      // she rides the swell: up and down a little, her bow rising and falling, heeled a little to the wind and rolling about that
      mesh.position.set(here.x, WATER_LEVEL + 0.06 * Math.sin(t * 1.1 + i * 2.1), here.z);
      mesh.rotation.set(0.05 + 0.04 * Math.sin(t * 0.7 + i * 1.7), -Math.atan2(ahead.z - here.z, ahead.x - here.x), 0.022 * Math.sin(t * 0.9 + i), 'YZX');
    });
  });
}
