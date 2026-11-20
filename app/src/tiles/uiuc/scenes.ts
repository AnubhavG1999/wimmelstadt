// What stands on the tile that is not a building: the screen on the stadium's
// board, and the small scenes on the ground between the lots.

import { interior, rng } from '../../engine/geo';
import { area, rect } from '../../engine/ground';
import { EN, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { GLASS, IRON, ORANGE } from './look';
import { AREAS, CARR, LOT, PLAZA_STOP, WRIGHT, lot, type AreaDef, type Model } from './plan';

const LINE = 0xf0efe8;
const areaOf = (id: string): AreaDef | undefined => AREAS.find((a) => a.id === id);

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

/**
 * What the stadium's board shows when nothing is playing: a scoreboard between
 * games. GAME DAY in orange across the top, HOME and GUESTS with nothing on the
 * board yet, a clock that stands at nought, and a row of corn cobs and
 * footballs along the bottom, inside a border of lamps. It is laid out at 640
 * by 360 and scaled to whatever size the screen is given, it draws the whole
 * of its rectangle every time, and it keeps nothing between one call and the
 * next. It carries no name, no letter and no mark of anyone's.
 */
export function paintScoreboard(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  const k = h / 360;
  const NAVY = '#0f1e3d', PANEL = '#172b54', ORANGE = '#ff7a26', CREAM = '#fff3dc', AMBER = '#ffc44d', DARK = '#070d1c';
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PANEL;
  ctx.beginPath();
  ctx.roundRect(22 * k, 22 * k, w - 44 * k, h - 44 * k, 14 * k);
  ctx.fill();

  // the lamps round the edge, orange and cream by turns
  const lamp = (x: number, y: number, i: number): void => {
    ctx.fillStyle = i % 2 ? CREAM : ORANGE;
    ctx.beginPath();
    ctx.arc(x, y, 4.6 * k, 0, Math.PI * 2);
    ctx.fill();
  };
  const across = 24, down = 13;
  for (let i = 0; i <= across; i++) {
    const x = 11 * k + (i / across) * (w - 22 * k);
    lamp(x, 11 * k, i);
    lamp(x, h - 11 * k, i + 1);
  }
  for (let i = 1; i < down; i++) {
    const y = 11 * k + (i / down) * (h - 22 * k);
    lamp(11 * k, y, i);
    lamp(w - 11 * k, y, i + across);
  }

  // GAME DAY, in block letters with a hard shadow under them
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.font = `900 ${Math.round(92 * k)}px ${EN}`;
  ctx.fillStyle = DARK;
  ctx.fillText('GAME DAY', w / 2 + 5 * k, 121 * k);
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 7 * k;
  ctx.strokeText('GAME DAY', w / 2, 116 * k);
  ctx.fillStyle = ORANGE;
  ctx.fillText('GAME DAY', w / 2, 116 * k);

  // a dark window with amber figures in it, as a scoreboard's lamps show them
  const figures = (x: number, y: number, bw: number, bh: number, text: string, size: number): void => {
    ctx.fillStyle = DARK;
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y, bw, bh, 8 * k);
    ctx.fill();
    ctx.fillStyle = AMBER;
    ctx.font = `900 ${Math.round(size)}px "Courier New", "Consolas", monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + bh / 2 + size * 0.04);
    ctx.textBaseline = 'alphabetic';
  };
  const label = (x: number, y: number, text: string, size: number): void => {
    ctx.fillStyle = CREAM;
    ctx.font = `900 ${Math.round(size)}px ${EN}`;
    ctx.fillText(text, x, y);
  };
  // HOME and GUESTS, each with nothing on the board yet
  label(118 * k, 168 * k, 'HOME', 30 * k);
  figures(118 * k, 180 * k, 112 * k, 104 * k, '0', 104 * k);
  label(w - 118 * k, 168 * k, 'GUESTS', 30 * k);
  figures(w - 118 * k, 180 * k, 112 * k, 104 * k, '0', 104 * k);
  // between them the clock, which stands at nought, and the quarter
  figures(w / 2, 152 * k, 196 * k, 82 * k, '0:00', 76 * k);
  label(w / 2, 268 * k, '1ST', 26 * k);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i === 0 ? AMBER : DARK;
    ctx.beginPath();
    ctx.arc(w / 2 + (i - 1.5) * 22 * k, 284 * k, 6 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  // along the bottom: corn cobs and footballs by turns
  const cob = (x: number, y: number): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#5fa046';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 15 * k);
      ctx.quadraticCurveTo(s * 17 * k, 6 * k, s * 9 * k, -12 * k);
      ctx.quadraticCurveTo(s * 5 * k, 4 * k, 0, 15 * k);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.ellipse(0, -3 * k, 6.5 * k, 15 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const ball = (x: number, y: number): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.3);
    ctx.fillStyle = '#9a5a34';
    ctx.beginPath();
    ctx.ellipse(0, 0, 17 * k, 9.5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.moveTo(-8 * k, 0);
    ctx.lineTo(8 * k, 0);
    for (const d of [-5, 0, 5]) {
      ctx.moveTo(d * k, -3.5 * k);
      ctx.lineTo(d * k, 3.5 * k);
    }
    ctx.stroke();
    ctx.restore();
  };
  const n = 11;
  for (let i = 0; i < n; i++) {
    const x = 62 * k + (i / (n - 1)) * (w - 124 * k), y = 322 * k;
    if (i % 2) ball(x, y);
    else cob(x, y);
  }
}

export const SIGNS: SignDef[] = [
  // The engine fills it with what is playing. When nothing is, it shows its own picture.
  { id: 'scenes-screen', lines: ['GAME DAY', 'HOME', 'GUESTS'], color: '#ff7a26', aspect: 16 / 9, kind: 'screen', paint: paintScoreboard },
  // at each of the two bus stops on Wright Street
  { id: 'scenes-bus', lines: ['BUS'], color: '#27405f', ink: '#f4efe0', aspect: 2.4, kind: 'board', size: [125, 52] },
];

// ---------------------------------------------------------------------------
// The corn south of Florida Avenue, half of it cut
// ---------------------------------------------------------------------------

/** How far in from the field's edge the corn begins: inside the track the tractor drives round it (see moving.ts). */
const CORN_INSET = 2.7;

function corn(k: Build): void {
  const b = k.b, f = areaOf('corn');
  if (!f) return;
  const x0 = f.x0 + CORN_INSET, z0 = f.z0 + CORN_INSET, x1 = f.x1 - CORN_INSET, z1 = f.z1 - CORN_INSET;
  // the west two thirds still stand: rows that run north and south, green with gold on top
  const cut = x0 + (x1 - x0) * 0.66, rand = rng(1876);
  for (let x = x0 + 0.4; x < cut - 0.3; x += 1.05) {
    const h = 2.1 + rand() * 0.4;
    b.box(x - 0.3, 0, z0, x + 0.3, h, z1, rand() < 0.5 ? 0x6f9a3c : 0x7ba844, { top: 0xd9b84a });
  }
  // the east third is stubble, in rows
  area(k, rect(cut, z0, x1, z1), 0xd8c178, 0.035);
  for (let x = cut + 0.6; x < x1; x += 1.05) area(k, rect(x - 0.08, z0 + 0.2, x + 0.08, z1 - 0.2), 0xb99f58, 0.045);
  // the combine, working north along the edge of what stands: a red body on big wheels, a cab of glass,
  // the cutting head across its front, and the pipe it empties through
  const cx = cut + 2.3, cz = (z0 + z1) / 2 + 0.6, RED = 0xc8322b, GREY = 0x4a4d54;
  b.box(cx - 1.25, 0.9, cz - 1.4, cx + 1.25, 3.0, cz + 2.4, RED, { faces: 'NESWTB' });
  b.box(cx - 1.0, 3.0, cz - 0.2, cx + 1.0, 3.5, cz + 2.0, 0xa5271f, { faces: 'NESWT' });
  b.box(cx - 0.85, 2.0, cz - 2.5, cx + 0.85, 3.6, cz - 1.4, GLASS, { win: interior(0.7), faces: 'NESWT' });
  b.box(cx - 0.95, 3.6, cz - 2.6, cx + 0.95, 3.72, cz - 1.3, RED, { faces: 'NESWTB' });
  b.box(cx - 0.55, 0.5, cz - 3.4, cx + 0.55, 1.9, cz - 1.4, RED, { faces: 'NEWTB' });
  b.box(cx - 3.1, 0.15, cz - 4.5, cx + 3.1, 1.0, cz - 3.4, GREY, { faces: 'NESWTB', top: 0xd9b84a });
  b.box(cx - 3.1, 0.6, cz - 4.75, cx + 3.1, 0.85, cz - 4.5, 0xe9c94a, { faces: 'NEWTB' });
  for (const sx of [-1, 1]) {
    b.box(cx + sx * 1.3 - 0.3, 0, cz - 1.5, cx + sx * 1.3 + 0.3, 1.9, cz + 0.4, 0x1e1f23, { faces: 'NESWTB' });
    b.box(cx + sx * 1.05 - 0.2, 0, cz + 1.5, cx + sx * 1.05 + 0.2, 1.0, cz + 2.5, 0x1e1f23, { faces: 'NESWTB' });
  }
  b.box(cx + 1.25, 2.9, cz + 0.2, cx + 4.0, 3.2, cz + 0.55, RED, { faces: 'NESWTB' });
  k.person(cx + 3.2, cz + 2.6);
}

// ---------------------------------------------------------------------------
// Lot E-14 on game day: the tailgate
// ---------------------------------------------------------------------------

/**
 * A row of five bays inside the aisle. The first and the last hold parked
 * vehicles, the second and the fourth are kept for heroes, and in the middle
 * one stands a tent: a table, a grill, coolers, and a game of bags thrown at
 * two boards. Everything stands inside the middle bay, so that it hides
 * neither hero.
 */
function tailgate(k: Build): void {
  const b = k.b, { bays, row } = LOT;
  const z0 = row - 3.7, z1 = row + 3.7;
  for (let i = 0; i <= bays.length; i++) {
    const x = i < bays.length ? bays[i] - 2 : bays[i - 1] + 2;
    area(k, rect(x - 0.07, z0, x + 0.07, z1), LINE, 0.035);
  }
  const cx = bays[2], NAVY = 0x27405f;
  // the tent: four posts, and a canopy with a low peak and its underside
  const tz = z0 + 1.9, half = 1.55;
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(cx + dx * half - 0.06, 0, tz + dz * half - 0.06, cx + dx * half + 0.06, 2.5, tz + dz * half + 0.06, 0xd9dde2, { faces: 'NESW' });
  b.box(cx - half - 0.15, 2.5, tz - half - 0.15, cx + half + 0.15, 2.72, tz + half + 0.15, ORANGE, { faces: 'NESWB' });
  b.cyl(cx, tz, 2.72, 3.4, (half + 0.15) * Math.SQRT2, 0.06, 4, ORANGE, { phase: Math.PI / 4, cap: false });
  // under it: a table with what there is to eat, a grill, two coolers and four chairs
  b.box(cx - 1.1, 0.75, tz - 0.9, cx + 0.3, 0.85, tz - 0.3, 0xf2efe6, { faces: 'NESWTB' });
  for (const dx of [-1.0, 0.2]) b.box(cx + dx - 0.05, 0, tz - 0.65, cx + dx + 0.05, 0.75, tz - 0.55, 0x8d9198);
  for (const [dx, c] of [[-0.8, 0xc8322b], [-0.4, 0xf2c14e], [0.0, 0x8a4b2a]] as const) b.box(cx + dx - 0.14, 0.85, tz - 0.75, cx + dx + 0.14, 1.0, tz - 0.47, c, { faces: 'NESWT' });
  b.box(cx + 0.75, 0.6, tz - 1.0, cx + 1.35, 0.95, tz - 0.4, 0x23262c, { faces: 'NESWTB' });
  for (const dx of [0.8, 1.3]) b.box(cx + dx - 0.04, 0, tz - 0.74, cx + dx + 0.04, 0.6, tz - 0.66, 0x8d9198);
  for (const [dx, dz, c] of [[-1.2, 0.5, 0x2f66b3], [-0.5, 0.75, 0xc8322b]] as const) b.box(cx + dx - 0.3, 0, tz + dz - 0.2, cx + dx + 0.3, 0.42, tz + dz + 0.2, c, { top: 0xf2efe6 });
  for (const [dx, dz, c] of [[0.4, 0.6, NAVY], [1.1, 0.4, ORANGE], [0.9, 1.2, NAVY], [-0.1, 1.25, ORANGE]] as const) {
    b.box(cx + dx - 0.22, 0.3, tz + dz - 0.22, cx + dx + 0.22, 0.38, tz + dz + 0.22, c, { faces: 'NESWTB' });
    b.box(cx + dx - 0.22, 0.38, tz + dz + 0.16, cx + dx + 0.22, 0.85, tz + dz + 0.22, c, { faces: 'NESWT' });
  }
  for (const [dx, dz] of [[-1.2, -0.1], [0.55, -0.1], [1.5, 0.2], [-0.6, 0.0], [0.0, 1.9]]) k.person(cx + dx, tz + dz);
  // a string of lamps round the canopy's edge, and a pool of light under it
  for (const [dx, dz, sx, sz] of [[0, -half - 0.15, 2 * half, 0.08], [0, half + 0.15, 2 * half, 0.08]]) k.glows.push({ x: cx + dx, y: 2.44, z: tz + dz, sx, sy: 0.08, sz, color: '#ffd9a0' });
  k.lights.push({ x: cx, z: tz + 1, r: 8, color: '#ffd9a0', k: 0.55 });
  // the game: two low boards with a hole in each, a few steps apart, and bags that have landed
  for (const [bz, way] of [[z1 - 2.9, 1], [z1 - 0.5, -1]]) {
    const near = bz, far = bz + way * 1.1;
    b.quad([cx + 0.5, 0.08, near], [cx + 1.1, 0.08, near], [cx + 1.1, 0.36, far], [cx + 0.5, 0.36, far], [0, 1, 0], 0xf2efe6);
    b.box(cx + 0.5, 0, Math.min(far, far - way * 0.05), cx + 1.1, 0.36, Math.max(far, far - way * 0.05), 0xd9dde2);
    b.quad([cx + 0.72, 0.3, near + way * 0.72], [cx + 0.88, 0.3, near + way * 0.72], [cx + 0.88, 0.34, near + way * 0.88], [cx + 0.72, 0.34, near + way * 0.88], [0, 1, 0], 0x23262c);
  }
  for (const [dx, dz, c] of [[0.62, -2.6, ORANGE], [0.95, -2.3, NAVY], [1.3, -1.2, ORANGE], [0.3, -0.9, NAVY]] as const) b.box(cx + dx - 0.09, 0.02, z1 + dz - 0.09, cx + dx + 0.09, 0.12, z1 + dz + 0.09, c, { faces: 'NESWT' });
  k.person(cx + 1.55, z1 - 3.2);
  k.person(cx + 0.15, z1 - 0.35);
  k.person(cx - 0.9, z1 - 2.0);

  // the saucer's east car park: lines for the two rows of cars that stand there
  const east = areaOf('saucer-east-lot');
  if (east) {
    for (const z of [east.z0 + 1, east.z0 + 5, east.z0 + 9, east.z0 + 13]) area(k, rect(east.x0 + 0.2, z - 0.07, east.x0 + 7, z + 0.07), LINE, 0.035);
    for (const z of [east.z0 + 2, east.z0 + 6, east.z0 + 10, east.z0 + 14]) area(k, rect(east.x1 - 7.6, z - 0.07, east.x1 - 0.3, z + 0.07), LINE, 0.035);
  }
}

// ---------------------------------------------------------------------------
// The two bus stops on Wright Street
// ---------------------------------------------------------------------------

function transitPlaza(k: Build): void {
  const b = k.b, z0 = PLAZA_STOP.z0 - 0.5, z1 = PLAZA_STOP.z1 + 0.5;
  // the street is paved in brick where the buses stand, with a white line at each end of it
  area(k, rect(WRIGHT - CARR, z0, WRIGHT + CARR, z1), 0xa9705a, 0.035);
  for (const z of [z0 + 0.15, z1 - 0.15]) area(k, rect(WRIGHT - CARR + 0.1, z - 0.1, WRIGHT + CARR - 0.1, z + 0.1), LINE, 0.046);
  /** A shelter that opens towards the street: a roof on four posts, a back of glass, a bench, and the stop's sign on a post. */
  const shelter = (back: number, out: number): void => {
    const s = out > back ? 1 : -1, za = z0 + 1.2, zb = z1 - 1.2;
    const lo = Math.min(back, out), hi = Math.max(back, out);
    for (const z of [za + 0.15, zb - 0.15]) for (const x of [back + s * 0.1, out - s * 0.1]) b.box(x - 0.07, 0, z - 0.07, x + 0.07, 2.7, z + 0.07, IRON, { faces: 'NESW' });
    b.box(lo - 0.15, 2.7, za - 0.15, hi + 0.15, 2.86, zb + 0.15, 0x27405f, { faces: 'NESWTB' });
    b.box(Math.min(back, back + s * 0.06), 0.3, za + 0.3, Math.max(back, back + s * 0.06), 2.5, zb - 0.3, GLASS, { win: interior(0.5), faces: 'EW' });
    b.box(Math.min(back + s * 0.25, back + s * 0.7), 0.45, za + 0.8, Math.max(back + s * 0.25, back + s * 0.7), 0.58, zb - 0.8, 0x8d6b4a, { faces: 'NESWTB' });
    k.glows.push({ x: (lo + hi) / 2, y: 2.62, z: (za + zb) / 2, sx: 0.25, sy: 0.08, sz: zb - za - 1, color: '#fff3dc' });
    k.lights.push({ x: out + s * 1.5, z: (za + zb) / 2, r: 7, color: '#fff3dc', k: 0.45 });
    // the sign, a little way along from the shelter, read from both ways along the street
    const px = out - s * 0.25, pz = zb + 0.9;
    b.box(px - 0.06, 0, pz - 0.06, px + 0.06, 3.1, pz + 0.06, IRON, { faces: 'NESW' });
    b.box(px - 0.6, 2.5, pz - 0.05, px + 0.6, 3.1, pz + 0.05, 0x27405f, { faces: 'NESWTB' });
    k.sign('scenes-bus', px, 2.8, pz + 0.08, 0, 1, 0.5, 1.2);
    k.sign('scenes-bus', px, 2.8, pz - 0.08, 0, -1, 0.5, 1.2);
    const rand = rng(s > 0 ? 302 : 217);
    for (let i = 0; i < 5; i++) k.person(back + s * (0.9 + rand() * 0.7), za + 0.5 + rand() * (zb - za - 1));
  };
  // west of the street, on the open ground between the building site and the bookstore, and east of it, before Henry's end wall
  shelter(WRIGHT - CARR - 3.4, WRIGHT - CARR - 1.75);
  shelter(WRIGHT + CARR + 2.4, WRIGHT + CARR + 0.75);
}

// ---------------------------------------------------------------------------
// The grove south of Pennsylvania Avenue, and the small cemetery in it
// ---------------------------------------------------------------------------

/**
 * The cemetery is drawn with care: a hedge round a lawn, a gate, a path, and
 * rows of plain stones. Nothing is lettered, and nothing stands, sits or is
 * staged in it.
 */
function grove(k: Build): void {
  const b = k.b, g = areaOf('grove'), c = areaOf('cemetery');
  if (!g || !c) return;
  const HEDGE = 0x4f7a4a, GRAVEL = 0xd9d0bc, STONE = 0xcfcbc2;
  const mx = (c.x0 + c.x1) / 2;
  // the hedge, with a gap for the gate in the middle of its north side, and a stone post either side of the gap
  b.box(c.x0, 0, c.z0, mx - 1.1, 0.6, c.z0 + 0.4, HEDGE);
  b.box(mx + 1.1, 0, c.z0, c.x1, 0.6, c.z0 + 0.4, HEDGE);
  b.box(c.x0, 0, c.z1 - 0.4, c.x1, 0.6, c.z1, HEDGE);
  b.box(c.x0, 0, c.z0 + 0.4, c.x0 + 0.4, 0.6, c.z1 - 0.4, HEDGE, { faces: 'EWT' });
  b.box(c.x1 - 0.4, 0, c.z0 + 0.4, c.x1, 0.6, c.z1 - 0.4, HEDGE, { faces: 'EWT' });
  for (const x of [mx - 1.25, mx + 0.95]) b.box(x, 0, c.z0 - 0.05, x + 0.3, 1.2, c.z0 + 0.45, STONE);
  // the path: in from the gate, and across
  area(k, rect(mx - 0.55, c.z0 - 2.5, mx + 0.55, c.z1 - 1.2), GRAVEL, 0.04);
  area(k, rect(c.x0 + 1.2, (c.z0 + c.z1) / 2 - 0.45, c.x1 - 1.2, (c.z0 + c.z1) / 2 + 0.45), GRAVEL, 0.04);
  // the stones: plain, of slightly different heights, in rows either side of the path
  const rand = rng(1907);
  for (let z = c.z0 + 1.9; z < c.z1 - 1.2; z += 2.05) {
    if (Math.abs(z - (c.z0 + c.z1) / 2) < 1.1) continue;
    for (let x = c.x0 + 1.5; x < c.x1 - 1.2; x += 1.75) {
      if (Math.abs(x - mx) < 1.3) continue;
      const h = 0.5 + rand() * 0.3, w = 0.24 + rand() * 0.08;
      b.box(x - w, 0, z - 0.09, x + w, h, z + 0.09, rand() < 0.3 ? 0xb9b5ad : STONE, { faces: 'NESWT' });
    }
  }
  // in the grove outside it: a walk from end to end, three benches along it, and a few who are out walking
  const wz = c.z1 + 2.2;
  area(k, rect(g.x0 + 1.5, wz - 0.5, g.x1 - 1.5, wz + 0.5), GRAVEL, 0.035);
  for (const x of [g.x0 + 9, mx, g.x1 - 12]) {
    b.box(x - 0.8, 0.35, wz + 0.75, x + 0.8, 0.5, wz + 1.15, 0x8d6b4a, { faces: 'NESWTB' });
    for (const d of [-0.65, 0.65]) b.box(x + d - 0.06, 0, wz + 0.78, x + d + 0.06, 0.35, wz + 1.12, IRON);
  }
  for (const [x, dz] of [[g.x0 + 6, 0.1], [g.x0 + 7, -0.2], [c.x1 + 8, 0.15], [g.x1 - 9, -0.1], [g.x1 - 12.3, 0.95]]) k.person(x, wz + dz);
}

export const MODELS: Record<string, Model> = {};

export function extras(k: Build): void {
  // the screen, on both faces of the board over the stadium's south end: towards the field, and towards
  // Kirby Avenue and the opening view
  const board = lot('stadium').parts?.find((p) => p.id === 'stadium-board');
  if (board) {
    const cx = (board.x0 + board.x1) / 2, y0 = board.y0 ?? 0, cy = (y0 + board.h) / 2;
    const high = board.h - y0 - 0.5, wide = board.x1 - board.x0 - 0.5;
    k.sign('scenes-screen', cx, cy, board.z1 + 0.03, 0, 1, high, wide);
    k.sign('scenes-screen', cx, cy, board.z0 - 0.03, 0, -1, high, wide);
    k.lights.push({ x: cx, z: board.z1 + 5, r: 14, color: '#ffb066', k: 0.5 });
  }
  corn(k);
  tailgate(k);
  transitPlaza(k);
  grove(k);
}
