// The signs North America draws for itself: the highway marker on the arch for
// Route 66, the face of Wrigley Field's scoreboard, and the billboard of the
// made-up cola with its rocket, and the cola's advertisement on the big screen.

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

/** A star of four points, as the roadside signs of the fifties drew them. */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * 0.28 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * The big screen's own picture, shown when nothing is playing: a roadside
 * advertisement for the made-up cola, in the manner of the fifties. A bottle
 * flies up across a night sky as a rocket, on fins and a flame, and the name
 * stands beside it in chunky letters. Its words are the sign's `lines`.
 */
export function paintRocketCola(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
  const RED = '#e2332a', CREAM = '#fff1d0', YELLOW = '#ffd23f', NAVY = '#07113a';
  // laid out at 640 by 360, and scaled to whatever size the screen is given
  const k = h / 360;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0a1650');
  sky.addColorStop(1, '#1f47a8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = CREAM;
  for (const [x, y, r] of [[38, 44, 13], [262, 30, 9], [606, 34, 12], [300, 326, 10], [610, 330, 8], [36, 210, 8]]) sparkle(ctx, x * k, y * k, r * k);
  ctx.fillStyle = YELLOW;
  for (const [x, y, r] of [[118, 88, 7], [560, 252, 7], [230, 168, 6]]) sparkle(ctx, x * k, y * k, r * k);

  // the rocket, drawn nose up about its own middle and then turned to fly up and to the right
  ctx.save();
  ctx.translate(150 * k, 186 * k);
  ctx.rotate(0.62);
  ctx.scale(1.3 * k, 1.3 * k);
  // the trail of round puffs it leaves, fading behind it
  ctx.fillStyle = CREAM;
  for (const [x, y, r, a] of [[0, 166, 15, 0.95], [-7, 204, 19, 0.8], [5, 250, 24, 0.65], [-4, 304, 30, 0.5]]) {
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // the flame: yellow outside, red within
  ctx.fillStyle = YELLOW;
  ctx.beginPath(); ctx.moveTo(-20, 74); ctx.quadraticCurveTo(-18, 118, 0, 150); ctx.quadraticCurveTo(18, 118, 20, 74); ctx.closePath(); ctx.fill();
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.moveTo(-10, 74); ctx.quadraticCurveTo(-9, 100, 0, 120); ctx.quadraticCurveTo(9, 100, 10, 74); ctx.closePath(); ctx.fill();
  // the fins at its foot
  ctx.fillStyle = RED;
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(sx * 22, 26); ctx.quadraticCurveTo(sx * 48, 52, sx * 46, 88); ctx.lineTo(sx * 22, 70); ctx.closePath(); ctx.fill();
  }
  // the bottle: a long neck that swells at the shoulder into a round-bottomed body
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.moveTo(-10, -80);
  ctx.lineTo(-10, -44);
  ctx.bezierCurveTo(-10, -26, -24, -22, -24, -4);
  ctx.lineTo(-24, 66);
  ctx.quadraticCurveTo(-24, 80, 0, 80);
  ctx.quadraticCurveTo(24, 80, 24, 66);
  ctx.lineTo(24, -4);
  ctx.bezierCurveTo(24, -22, 10, -26, 10, -44);
  ctx.lineTo(10, -80);
  ctx.closePath();
  ctx.fill();
  // its cap is the nose cone, and its label a red band with a wave of cream through it
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.moveTo(-12, -78); ctx.quadraticCurveTo(-10, -98, 0, -108); ctx.quadraticCurveTo(10, -98, 12, -78); ctx.closePath(); ctx.fill();
  ctx.fillRect(-24, 10, 48, 34);
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-24, 30); ctx.bezierCurveTo(-8, 18, 8, 40, 24, 24); ctx.stroke();
  // a porthole on its shoulder
  ctx.fillStyle = NAVY;
  ctx.beginPath(); ctx.arc(0, -10, 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // the name, in red letters edged in cream, with a hard shadow under them, and the line beneath it
  const [top, bottom, tag] = [s.lines[0] ?? '', s.lines[1] ?? '', s.lines[2] ?? ''];
  const mid = 452 * k, maxW = 330 * k;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  for (const [text, y, size] of [[top, 142, 88], [bottom, 250, 116]] as [string, number, number][]) {
    const sz = fit(ctx, text, EN, size * k, maxW);
    ctx.font = `900 ${sz}px ${EN}`;
    ctx.lineWidth = sz * 0.14;
    const d = sz * 0.08;
    ctx.fillStyle = NAVY;
    ctx.strokeStyle = NAVY;
    ctx.strokeText(text, mid + d, y * k + d);
    ctx.fillText(text, mid + d, y * k + d);
    ctx.strokeStyle = CREAM;
    ctx.strokeText(text, mid, y * k);
    ctx.fillStyle = RED;
    ctx.fillText(text, mid, y * k);
  }
  const tz = fit(ctx, tag, EN, 30 * k, maxW);
  ctx.font = `900 ${tz}px ${EN}`;
  ctx.fillStyle = YELLOW;
  ctx.fillText(tag, mid, 312 * k);
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
