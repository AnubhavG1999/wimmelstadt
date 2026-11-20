// The screen's own picture, for when nothing is playing: Agea's weather
// forecast for the day of the Lion's Rain. A bright board, as a city's
// forecast is: a cartoon cloud over a cartoon canyon, raining little
// starShells, each with its glow and its trail, and beside it the day's
// forecast in plain capitals. IRON RAIN, 100%. Bring a helmet.

import type { SignDef } from '../../engine/signs';

const PLAIN = "'Arial Black', 'Segoe UI Black', Arial, sans-serif";
const SANS = "'Segoe UI', Arial, sans-serif";

/** A starShell falling, drawn about the origin, its nose down: a glowing pod with a trail behind it. */
function shell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, tilt: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // the trail, fading up behind it
  const g = ctx.createLinearGradient(0, -60 * s, 0, 0);
  g.addColorStop(0, 'rgba(255,214,140,0)');
  g.addColorStop(1, 'rgba(255,170,70,0.85)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-5 * s, 0);
  ctx.lineTo(0, -64 * s);
  ctx.lineTo(5 * s, 0);
  ctx.closePath();
  ctx.fill();
  // the pod: a rounded capsule, red, with a dark visor
  ctx.fillStyle = '#b8261d';
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, 8 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1b18';
  ctx.fillRect(-5 * s, 2 * s, 10 * s, 3.5 * s);
  // the glow at its nose, where the air burns
  ctx.fillStyle = 'rgba(255,236,170,0.95)';
  ctx.beginPath();
  ctx.ellipse(0, 14 * s, 6 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A fat cartoon cloud, about 300 across, its middle at (x, y). */
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#5d6676';
  for (const [dx, dy, r] of [[-95, 18, 52], [-30, -8, 70], [45, 4, 62], [105, 22, 46], [0, 30, 60]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#7c8698';
  for (const [dx, dy, r] of [[-60, 2, 42], [-10, -22, 50], [52, -10, 40]] as [number, number, number][]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintForecast(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  ctx.save();
  const k = Math.min(w / 640, h / 360);
  // the sky of a forecast board: bright, a little too blue
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2f7fd6');
  sky.addColorStop(1, '#8cc6f2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // the left half: the canyon under the cloud, and the rain of shells
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w * 0.52, h);
  ctx.clip();
  // the canyon: two banded walls and its floor, red as Mars is where it is bare
  const floorY = h * 0.86;
  ctx.fillStyle = '#c0703f';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.lineTo(w * 0.12, h * 0.6);
  ctx.lineTo(w * 0.17, floorY);
  ctx.lineTo(w * 0.36, floorY);
  ctx.lineTo(w * 0.42, h * 0.66);
  ctx.lineTo(w * 0.52, h * 0.64);
  ctx.lineTo(w * 0.52, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8f4528';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(0, h * (0.68 + i * 0.07), w * 0.14 - i * 4 * k, 5 * k);
    ctx.fillRect(w * 0.4 + i * 5 * k, h * (0.7 + i * 0.07), w * 0.13, 5 * k);
  }
  // green on top, for the planet is terraformed
  ctx.fillStyle = '#6f9a4c';
  ctx.fillRect(0, h * 0.6, w * 0.12, 7 * k);
  ctx.fillRect(w * 0.42, h * 0.62, w * 0.1, 7 * k);
  // the little city on the canyon's floor
  ctx.fillStyle = '#e8e2d4';
  for (const [x0, hh] of [[0.19, 0.12], [0.22, 0.2], [0.255, 0.15], [0.29, 0.24], [0.325, 0.11]] as [number, number][]) ctx.fillRect(w * x0, floorY - h * hh, w * 0.025, h * hh);
  // the shells, falling at a slant out of the cloud
  for (const [x, y, s] of [[0.1, 0.42, 0.9], [0.2, 0.58, 1], [0.31, 0.46, 0.85], [0.41, 0.6, 0.95], [0.16, 0.33, 0.7], [0.36, 0.34, 0.75], [0.26, 0.72, 0.8]] as [number, number, number][]) {
    shell(ctx, w * x, h * y, s * k, 0.25);
  }
  cloud(ctx, w * 0.26, h * 0.17, 1.05 * k);
  ctx.restore();

  // the right half: the forecast
  const x0 = w * 0.56;
  ctx.fillStyle = 'rgba(10,24,52,0.28)';
  ctx.fillRect(x0 - 10 * k, 18 * k, w - x0 - 8 * k, h - 36 * k);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(24 * k)}px ${SANS}`;
  ctx.fillText('AGEA  ·  TODAY', x0, 58 * k);
  ctx.font = `900 ${Math.round(60 * k)}px ${PLAIN}`;
  ctx.fillStyle = '#ffe08a';
  ctx.fillText('IRON', x0, 128 * k);
  ctx.fillText('RAIN', x0, 192 * k);
  ctx.font = `900 ${Math.round(54 * k)}px ${PLAIN}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('100%', x0, 254 * k);
  ctx.font = `700 ${Math.round(23 * k)}px ${SANS}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Heavy from the east.', x0, 294 * k);
  ctx.fillStyle = '#ffe08a';
  ctx.fillText('Bring a helmet.', x0, 326 * k);
  ctx.restore();
}

/** The screen: a forecast board on a tower's face over the commercial district. */
export const FORECAST: SignDef = { id: 'forecast', lines: ['AGEA TODAY', 'IRON RAIN 100%', 'Bring a helmet.'], color: '#2f7fd6', aspect: 640 / 360, kind: 'screen', paint: paintForecast };
