// The board at the top of the climb to the Dragonpit, as it is when nothing
// is playing: a road sign as a sign-painter of King's Landing would paint it.
// A red-bordered triangle with a black dragon coming in to land, GIVE WAY TO
// DRAGONS in plain capitals beside it, and "by order of the Dragonkeepers"
// small at the foot. The toy cars have a sign to obey, and the dragons have
// the right of way.

import { fit, type SignDef } from '../../engine/signs';

const SERIF = "Georgia, 'Times New Roman', serif";
const PLAIN = "'Arial Black', 'Segoe UI Black', Arial, sans-serif";
const WOOD = '#6a4326', WOOD_DARK = '#3a2213', WOOD_LIGHT = '#8a5a33';
const PAINT = '#efe4c6', PAINT_EDGE = '#d6c395', RED = '#b3181f', INK = '#17130f', IRON = '#2b2b2e';

/**
 * A black dragon coming in to land, seen from the side, facing right: its
 * wings flung up and cupped to brake, its two legs reaching down, its neck
 * curved and its head down, its tail sweeping behind. Drawn about the origin,
 * about 200 across.
 */
function landingDragon(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = INK;
  // the far wing, a little behind and higher
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(-30, -78);
  ctx.lineTo(-58, -96);
  ctx.quadraticCurveTo(-62, -70, -76, -58);
  ctx.quadraticCurveTo(-74, -40, -86, -26);
  ctx.quadraticCurveTo(-66, -22, -58, -6);
  ctx.closePath();
  ctx.fill();
  // the tail, sweeping down and back to a barbed tip
  ctx.beginPath();
  ctx.moveTo(-30, 10);
  ctx.quadraticCurveTo(-70, 30, -96, 18);
  ctx.quadraticCurveTo(-112, 12, -118, 26);
  ctx.lineTo(-108, 22);
  ctx.quadraticCurveTo(-98, 28, -70, 38);
  ctx.quadraticCurveTo(-46, 34, -22, 22);
  ctx.closePath();
  ctx.fill();
  // the body, the chest high
  ctx.beginPath();
  ctx.ellipse(-4, 6, 34, 15, -0.32, 0, Math.PI * 2);
  ctx.fill();
  // the neck, curving up and over, and the head pointing down at the ground ahead
  ctx.beginPath();
  ctx.moveTo(18, -10);
  ctx.quadraticCurveTo(40, -44, 64, -38);
  ctx.quadraticCurveTo(80, -34, 86, -18);
  ctx.lineTo(104, -6);
  ctx.lineTo(84, -6);
  ctx.lineTo(90, 2);
  ctx.lineTo(74, -4);
  ctx.quadraticCurveTo(70, -24, 58, -24);
  ctx.quadraticCurveTo(40, -24, 26, 6);
  ctx.closePath();
  ctx.fill();
  // two horns swept back from the head
  ctx.beginPath();
  ctx.moveTo(70, -36);
  ctx.lineTo(56, -52);
  ctx.lineTo(76, -38);
  ctx.closePath();
  ctx.fill();
  // the near wing: the arm up and out, the fingers fanned, the skin scalloped between them
  ctx.beginPath();
  ctx.moveTo(4, -6);
  ctx.lineTo(18, -70);
  ctx.lineTo(-8, -118);
  ctx.quadraticCurveTo(-14, -88, -36, -76);
  ctx.lineTo(-44, -84);
  ctx.quadraticCurveTo(-42, -58, -64, -46);
  ctx.lineTo(-70, -52);
  ctx.quadraticCurveTo(-62, -26, -40, -4);
  ctx.closePath();
  ctx.fill();
  // the wing's claw at its wrist
  ctx.beginPath();
  ctx.moveTo(18, -70);
  ctx.lineTo(28, -78);
  ctx.lineTo(20, -64);
  ctx.closePath();
  ctx.fill();
  // the legs reaching down, claws spread for the ground
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  for (const [hx, kx, fx] of [[-18, -10, -24], [0, 12, 4]]) {
    ctx.beginPath();
    ctx.moveTo(hx, 14);
    ctx.lineTo(kx, 36);
    ctx.lineTo(fx, 54);
    ctx.stroke();
  }
  ctx.lineWidth = 4;
  for (const fx of [-24, 4]) {
    for (const d of [-9, 0, 9]) {
      ctx.beginPath();
      ctx.moveTo(fx, 54);
      ctx.lineTo(fx + d, 63);
      ctx.stroke();
    }
  }
}

/** The warning triangle: a red border, a cream field, and the dragon in it. Drawn about its middle, `size` tall. */
function triangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 1.5, pts = [0, 1, 2].map((i) => [cx + r * Math.sin((i * 2 * Math.PI) / 3), cy - r * Math.cos((i * 2 * Math.PI) / 3) + r * 0.25]);
  const path = (k: number): void => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const px = cx + (x - cx) * k, py = cy + r * 0.25 + (y - cy - r * 0.25) * k;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  path(1);
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.lineWidth = size * 0.03;
  ctx.strokeStyle = WOOD_DARK;
  ctx.stroke();
  path(0.72);
  ctx.fillStyle = PAINT;
  ctx.fill();
  ctx.save();
  ctx.translate(cx, cy + r * 0.3);
  const s = (size * 0.48) / 220;
  ctx.scale(s, s);
  landingDragon(ctx);
  ctx.restore();
}

export function paintGiveWay(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  const u = h / 360;
  // the timber board: planks, darker at their joins
  ctx.fillStyle = WOOD;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    const y = (i * h) / 6;
    ctx.fillStyle = i % 2 ? WOOD : WOOD_LIGHT;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, y, w, h / 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = WOOD_DARK;
    ctx.fillRect(0, y, w, 3 * u);
  }
  // the painted panel, a little in from the edge, with a band of red round it
  const m = 16 * u;
  ctx.fillStyle = PAINT_EDGE;
  ctx.fillRect(m - 4 * u, m - 4 * u, w - 2 * m + 8 * u, h - 2 * m + 8 * u);
  ctx.fillStyle = PAINT;
  ctx.fillRect(m, m, w - 2 * m, h - 2 * m);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 7 * u;
  ctx.strokeRect(m + 10 * u, m + 10 * u, w - 2 * m - 20 * u, h - 2 * m - 20 * u);
  // iron nails at the corners
  ctx.fillStyle = IRON;
  for (const [x, y] of [[m + 22 * u, m + 22 * u], [w - m - 22 * u, m + 22 * u], [m + 22 * u, h - m - 22 * u], [w - m - 22 * u, h - m - 22 * u]]) {
    ctx.beginPath();
    ctx.arc(x, y, 5 * u, 0, Math.PI * 2);
    ctx.fill();
  }

  triangle(ctx, w * 0.27, h * 0.44, 230 * u);

  // the words, in plain capitals, as tall as the panel allows
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const tx = w * 0.69, tw = w * 0.5;
  fit(ctx, 'GIVE WAY', PLAIN, 86 * u, tw);
  ctx.fillText('GIVE WAY', tx, h * 0.39);
  fit(ctx, 'TO DRAGONS', PLAIN, 74 * u, tw);
  ctx.fillText('TO DRAGONS', tx, h * 0.62);
  ctx.fillStyle = RED;
  ctx.fillRect(tx - tw * 0.42, h * 0.68, tw * 0.84, 5 * u);
  ctx.fillStyle = INK;
  fit(ctx, 'by order of the Dragonkeepers', SERIF, 30 * u, tw, 'italic 600');
  ctx.fillText('by order of the Dragonkeepers', tx, h * 0.8);
}
