// What stands on the tile that is not a building: the screen on the stadium's
// board, and the small scenes on the ground between the lots.

import { EN, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { lot, type Model } from './plan';

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
];

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
}
