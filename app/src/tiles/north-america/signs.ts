// The signs North America draws for itself: the highway marker on the arch for
// Route 66, the face of Wrigley Field's scoreboard, and the billboard of the
// made-up cola with its rocket.

import { EN, drawBox, fit, glowText, lighten, roundRect, type SignDef } from '../../engine/signs';

/** A lit board like any other, with a little rocket on it: the made-up cola's mascot. */
export function paintBillboard(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
  drawBox(ctx, s, w, h);
  const dark = s.ink ?? '#0f3b66';
  // a little rocket, the made-up cola's mascot
  ctx.save();
  ctx.translate(w - 48, 48);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(14, -12, 10, 12); ctx.lineTo(-10, 12); ctx.quadraticCurveTo(-14, -12, 0, -30); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-21, 19); ctx.lineTo(-10, 12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(21, 19); ctx.lineTo(10, 12); ctx.fill();
  ctx.fillStyle = lighten(s.color, 0.35);
  ctx.beginPath(); ctx.arc(0, -8, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** A highway marker in neon: the outline of the shield, the word across its top and the number below. */
export function paintShield(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#0b0b14';
  roundRect(ctx, 0, 0, w, h, 12);
  ctx.fill();
  const X = (u: number) => w * (0.07 + 0.86 * u), Y = (v: number) => h * (0.06 + 0.88 * v);
  const outline = (): void => {
    ctx.beginPath();
    ctx.moveTo(X(0.5), Y(0.07));
    ctx.quadraticCurveTo(X(0.74), Y(0.13), X(0.95), Y(0));
    ctx.bezierCurveTo(X(0.8), Y(0.24), X(1.07), Y(0.44), X(0.94), Y(0.66));
    ctx.quadraticCurveTo(X(0.85), Y(0.88), X(0.5), Y(1));
    ctx.quadraticCurveTo(X(0.15), Y(0.88), X(0.06), Y(0.66));
    ctx.bezierCurveTo(X(-0.07), Y(0.44), X(0.2), Y(0.24), X(0.05), Y(0));
    ctx.quadraticCurveTo(X(0.26), Y(0.13), X(0.5), Y(0.07));
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  ctx.shadowColor = s.color;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = 7;
  outline(); ctx.stroke();
  outline(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = lighten(s.color, 0.72);
  ctx.lineWidth = 3;
  outline(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X(0.13), Y(0.37)); ctx.lineTo(X(0.87), Y(0.37)); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const small = fit(ctx, s.lines[0], EN, h * 0.15, w * 0.5);
  glowText(ctx, s.lines[0], w / 2, Y(0.27), '#ff5a4f', small);
  const big = fit(ctx, s.lines[1], EN, h * 0.46, w * 0.62);
  ctx.font = `900 ${big}px ${EN}`;
  glowText(ctx, s.lines[1], w / 2, Y(0.67), s.color, big);
}

/** A ballpark's scoreboard: two line scores, one above the other, in white on green. */
export function paintScore(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
  const ink = s.ink ?? '#f2efe6';
  ctx.fillStyle = s.color;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(7, 7, w - 14, h - 14);
  ctx.textBaseline = 'middle';
  const nameW = w * 0.3, x0 = 22 + nameW, cell = (w - 40 - nameW) / 12.8;
  const column = (k: number): number => x0 + cell * (k + 0.5 + (k > 8 ? 0.8 : 0));
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = `900 ${h * 0.1}px ${EN}`;
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'R', 'H', 'E'].forEach((c, k) => ctx.fillText(c, column(k), h * 0.2));
  // every game on this board ends the same way
  const innings = ['0 1 0 0 2 0 0 0 0  3 7 1', '1 0 0 3 0 0 1 0 x  5 9 0'];
  s.lines.forEach((name, r) => {
    const y = h * (0.45 + r * 0.29);
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    const size = fit(ctx, name, EN, h * 0.15, nameW - 8);
    ctx.font = `900 ${size}px ${EN}`;
    ctx.fillText(name, 20, y);
    ctx.textAlign = 'center';
    innings[r % innings.length].split(/\s+/).forEach((c, k) => {
      ctx.fillStyle = '#16261f';
      ctx.fillRect(column(k) - cell * 0.4, y - h * 0.09, cell * 0.8, h * 0.18);
      ctx.fillStyle = k > 8 ? '#ffd23f' : ink;
      ctx.font = `900 ${h * 0.13}px ${EN}`;
      ctx.fillText(c, column(k), y + h * 0.01);
    });
  });
}
