// The Others and their wights, waiting in the snow before the north mouth of
// the gate through the Wall: a small thing to find. The view the tile opens
// with never sees it, for the Wall stands between, and it is there for
// whoever turns the view round to the north.
//
// They are drawn from the prologue of A Game of Thrones and from nothing else.
// The Others are tall and gaunt, their flesh as pale as milk, in armour that
// seems to change its colour as they move: here each side of it is another
// pale grey, blue or white, so that it changes as the view goes round. Their
// swords are thin blades of crystal with a faint blue light in them, and their
// eyes burn blue. One stands a little taller than the rest and wears a crown
// of short spikes of ice, a nod to the series for the collector that takes
// nothing from its design: no horns and no ridges, only the books' look and a
// plain crown. The wights are dead men of the Night's Watch in their black and
// wildlings in their furs, with pale hands, standing slack. All their eyes
// glow blue in the dark: each eye is a glow, a box that is dim by day and
// bright by night, and costs no triangle that stands still.
//
// They stand to both sides of the kingsroad, at the foot of the ice, and face
// the mouth of the tunnel. None stands in a lane, nor within reach of what
// swings out on the ring beyond, nor under the haunted forest's trees.

import { interior, rng, type GeoBuilder, type V3 } from '../../engine/geo';
import { tri } from '../../engine/parts';
import type { Build } from '../../engine/tile';
import { WALL } from './plan';

/** Flesh as pale as milk. */
const MILK = 0xf1f3f4;
/** Armour that seems to change its colour as they move: another pale grey, blue or white on each side. */
const ARMOUR = [0xe6ecf1, 0xa9bfd2, 0x7d8e9f, 0x5a6b7d, 0x9db6cb, 0xcbd8e3];
const LEGS = 0x6f8093;
/** A thin blade of crystal, with a faint blue light in it by night. */
const CRYSTAL = 0xa6dbff, SHIMMER = interior(0.45);
/** The leader's crown: short spikes of ice, with a fainter light still, so that its eyes outshine it. */
const ICE = 0xd3eefc, ICE_LIGHT = interior(0.3);
/** Eyes of a burning blue. */
const EYE = '#5cd2ff';
/** The dead: their faces, and their pale hands. */
const DEAD = 0xc2cace, HANDS = 0xe2e7ea;
/** The black of the Night's Watch, hood and all, and the furs of wildlings with their hair or caps. */
const WATCH = { coat: 0x1f2025, top: 0x1a1b1f };
const FURS = [{ coat: 0x6e5a46, top: 0x4c3d30 }, { coat: 0x877c6e, top: 0x5b5044 }, { coat: 0x5a4a3b, top: 0x8a7b66 }];

type Who = 'leader' | 'other' | 'watch' | 'wildling';

/**
 * Where each stands: so far east of the middle of the gate, and so far north
 * of the Wall's north foot. The leader and the six Others stand in a row at
 * the foot of the ice, on both sides of the road; their wights stand behind
 * them. Each keeps 1.6 from the small weirwoods of the grove, and the haunted
 * forest plants no tree that would reach one of them (`standing`). They keep
 * to the ground that a view from the north sees between the trees.
 */
const BAND: [Who, number, number][] = [
  ['leader', -6.45, -1.05],
  ['other', -7.65, -1.15], ['other', -8.85, -1.3], ['other', -10.05, -1.4],
  ['other', 6.45, -1.05], ['other', 7.65, -1.15], ['other', 8.85, -1.3],
  ['watch', -9.65, -2.65], ['wildling', -10.2, -3.95], ['watch', -9.05, -5.0],
  ['wildling', 10.05, -1.2], ['watch', 9.6, -2.55], ['wildling', 9.9, -3.9], ['watch', 9.02, -4.95],
];

/** Where each of the band stands on the board, for the forest to keep off. */
export function standing(): [number, number][] {
  return BAND.map(([, dx, dz]) => [WALL.gateX + dx, WALL.north + dz]);
}

/** Where one stands and the way it faces. It is drawn in a frame of its own: forward is +x, and its left is -z. */
interface Stance { x: number; z: number; yaw: number }

/** Where a place in a figure's own frame is on the board. */
function boardAt(s: Stance, lx: number, ly: number, lz: number): V3 {
  const c = Math.cos(s.yaw), n = Math.sin(s.yaw);
  return [s.x + lx * c - lz * n, ly, s.z + lx * n + lz * c];
}

/** Two eyes that glow: on the front of a head whose face is `front` ahead of the middle, at height `y`. */
function eyes(k: Build, s: Stance, front: number, y: number, apart: number, size: number): void {
  for (const side of [-1, 1]) {
    const [x, , z] = boardAt(s, front, y, side * apart);
    k.glows.push({ x, y, z, sx: size, sy: size * 0.7, sz: size, color: EYE });
  }
}

/** A short spike of ice: three faces that rise to a point from (x, y, z), in the figure's own frame. */
function spike(b: GeoBuilder, x: number, y: number, z: number, r: number, h: number): void {
  const top: V3 = [x, y + h, z];
  const foot = [0, 1, 2].map((i): V3 => [x + Math.cos(0.5 + (i * 2 * Math.PI) / 3) * r, y, z + Math.sin(0.5 + (i * 2 * Math.PI) / 3) * r]);
  for (let i = 0; i < 3; i++) {
    const a = foot[i], c = foot[(i + 1) % 3];
    // outwards: away from the spike's own middle
    const mx = (a[0] + c[0]) / 2 - x, mz = (a[2] + c[2]) / 2 - z, l = Math.hypot(mx, r * 0.5, mz);
    tri(b, a, c, top, [mx / l, (r * 0.5) / l, mz / l], ICE, { win: ICE_LIGHT });
  }
}

/**
 * An Other: long thin legs, a body in armour of a different colour on every
 * side, a head as pale as milk, and one arm with its sword, on the side that
 * is away from the Wall. The leader is a little taller, rests both hands on a
 * sword stood point down before it, and wears a crown of ice.
 */
function other(k: Build, s: Stance, i: number, leader: boolean): void {
  const b = k.b, h = leader ? 1.2 : 1.06;
  const tone = (j: number): number => ARMOUR[(i + j) % ARMOUR.length];
  // the side of it that looks away from the Wall, to the north: its left when it faces east
  const out = Math.cos(s.yaw) > 0 ? -1 : 1;
  const hip = 1.32 * h, neck = 2.44 * h, crown = 2.86 * h, face = 0.19 * h;
  b.moved(s.x, 0, s.z, s.yaw, () => {
    b.box(-0.12 * h, 0, -0.17 * h, 0.12 * h, hip, 0.17 * h, LEGS, { faces: 'NESW' });
    const [x0, x1, z0, z1] = [-0.16 * h, 0.16 * h, -0.29 * h, 0.29 * h];
    for (const [f, j] of [['E', 0], ['N', 2], ['S', 4], ['W', 3], ['T', 1]] as const) b.box(x0, hip, z0, x1, neck, z1, tone(j), { faces: f });
    b.box(-face, neck, -face, face, crown, face, MILK);
    if (leader) {
      // both hands on the pommel of a sword whose point rests in the snow
      for (const side of [-1, 1]) b.beam([0, 2.3 * h, side * 0.33 * h], [0.36 * h, 1.58 * h, side * 0.06 * h], 0.06 * h, 0.055 * h, tone(2));
      b.beam([0.4 * h, 1.62 * h, 0], [0.42 * h, 0.04, 0], 0.035 * h, 0.014, CRYSTAL, { win: SHIMMER });
      // the crown: a band of ice round the top of the head, so that it is worn and not grown, with a spike at
      // each of its corners and in the middle of its front and its back
      const rim = face + 0.025 * h, band = crown + 0.02 * h;
      b.box(-rim, crown - 0.07 * h, -rim, rim, band, rim, ICE, { win: ICE_LIGHT });
      for (const [x, z, tall] of [[0.15, 0.15, 0.2], [0.15, -0.15, 0.2], [-0.15, 0.15, 0.17], [-0.15, -0.15, 0.17], [0.14, 0, 0.27], [-0.14, 0, 0.22]]) {
        spike(b, x * h, band, z * h, 0.055 * h, tall * h);
      }
      return;
    }
    // the sword arm hangs, and the blade points down and ahead into the snow
    b.beam([0, 2.34 * h, out * 0.33 * h], [0.06 * h, 1.36 * h, out * 0.37 * h], 0.06 * h, 0.05 * h, tone(2));
    b.beam([0.07 * h, 1.4 * h, out * 0.37 * h], [0.62 * h, 0.08, out * 0.43 * h], 0.035 * h, 0.012, CRYSTAL, { win: SHIMMER });
  });
  eyes(k, s, face, 2.68 * h, 0.095 * h, 0.085 * h);
}

/** A body that leans forward, `ax` for every unit up: four sides and a top, in the figure's own frame. */
function slumped(b: GeoBuilder, x0: number, z0: number, x1: number, z1: number, y1: number, ax: number, color: number): void {
  const P = (x: number, y: number, z: number): V3 => [x + ax * y, y, z];
  const l = Math.hypot(1, ax);
  b.quad(P(x1, 0, z1), P(x1, 0, z0), P(x1, y1, z0), P(x1, y1, z1), [1 / l, -ax / l, 0], color);
  b.quad(P(x0, 0, z0), P(x0, 0, z1), P(x0, y1, z1), P(x0, y1, z0), [-1 / l, ax / l, 0], color);
  b.quad(P(x0, 0, z1), P(x1, 0, z1), P(x1, y1, z1), P(x0, y1, z1), [0, 0, 1], color);
  b.quad(P(x1, 0, z0), P(x0, 0, z0), P(x0, y1, z0), P(x1, y1, z0), [0, 0, -1], color);
  b.quad(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), [0, 1, 0], color);
}

/** A wight: a dead man in a long coat or cloak, leaning a little, its head hung forward and its pale hands at its sides. */
function wight(k: Build, s: Stance, dress: { coat: number; top: number }, h: number): void {
  const b = k.b, ax = 0.07, tall = 1.74 * h;
  const hx = ax * tall + 0.07 * h, hy = tall - 0.04 * h, half = 0.22 * h;
  b.moved(s.x, 0, s.z, s.yaw, () => {
    slumped(b, -0.21 * h, -0.36 * h, 0.21 * h, 0.36 * h, tall, ax, dress.coat);
    b.box(hx - half, hy, -half, hx + half, hy + 2 * half, half, DEAD, { top: dress.top });
    const hand = ax * 0.95 * h;
    b.box(hand - 0.07 * h, 0.84 * h, -0.43 * h, hand + 0.07 * h, 1.04 * h, 0.43 * h, HANDS, { faces: 'NESW' });
  });
  eyes(k, s, hx + half, hy + 0.25 * h, 0.105 * h, 0.085 * h);
}

/** The whole band, facing the tunnel's north mouth. */
export function buildOthers(k: Build): void {
  const gx = WALL.gateX, gz = WALL.north, mouth: [number, number] = [gx, gz - 1];
  // numbers of its own, so that nothing else on the tile moves
  const r = rng(7701);
  let n = 0, f = 0;
  for (const [who, dx, dz] of BAND) {
    const x = gx + dx, z = gz + dz, toward = Math.atan2(mouth[1] - z, mouth[0] - x);
    const slack = r() - 0.5, size = 0.96 + r() * 0.08;
    if (who === 'leader' || who === 'other') {
      other(k, { x, z, yaw: toward }, n++, who === 'leader');
      continue;
    }
    // the dead stand slack, each turned a little its own way
    wight(k, { x, z, yaw: toward + slack * 1.2 }, who === 'watch' ? WATCH : FURS[f++ % FURS.length], size);
  }
}
