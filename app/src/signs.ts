// Draws every sign onto one sheet, so all the signs in the city are one draw call.
// Each sign is a dark panel with glowing lettering; at night the sheet is simply
// made brighter and the bloom does the rest.

import * as THREE from 'three';
import { SIGNS, type SignDef } from './scene-data';

/** Where a sign sits on the sheet. v runs downwards, as on the canvas. */
export interface SignRect { u0: number; u1: number; vTop: number; vBottom: number; aspect: number; color: string }

export interface SignAtlas {
  texture: THREE.CanvasTexture;
  rects: Map<string, SignRect>;
}

const SIZE = 2048;
const PAD = 8;
const EN = '"Arial Black", "Segoe UI Black", "Helvetica Neue", Arial, sans-serif';

function pixelSize(s: SignDef): [number, number] {
  if (s.kind === 'screen') return [640, 360];
  if (s.kind === 'shield') return [Math.round(256 * s.aspect), 256];
  if (s.kind === 'score') return [Math.round(240 * s.aspect), 240];
  if (s.kind === 'p') return [160, 160];
  if (s.aspect < 1) return [96, Math.round(96 / s.aspect)];
  if (s.aspect === 1) return [176, 176];
  const h = s.lines.length > 1 ? 176 : 120;
  return [Math.round(h * s.aspect), h];
}

function lighten(hex: string, t: number): string {
  const c = new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), t);
  return '#' + c.getHexString();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Fits a font size so the text is no wider than maxW. */
function fit(ctx: CanvasRenderingContext2D, text: string, family: string, size: number, maxW: number, weight = '900'): number {
  let s = size;
  for (let i = 0; i < 20; i++) {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    s *= 0.92;
  }
  return s;
}

function glowText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.45;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = lighten(color, 0.72);
  ctx.fillText(text, x, y);
}

function drawNeon(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#0b0b14';
  roundRect(ctx, 0, 0, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = s.color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3;
  roundRect(ctx, 5, 5, w - 10, h - 10, 8);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const family = EN;

  if (s.vertical) {
    const chars = [...s.lines[0]];
    const cellH = (h - 24) / chars.length;
    const size = Math.min(w - 26, cellH * 0.92);
    ctx.font = `900 ${size}px ${family}`;
    chars.forEach((ch, i) => glowText(ctx, ch, w / 2, 12 + cellH * (i + 0.5) + size * 0.04, s.color, size));
    return;
  }

  const lineH = (h - 22) / s.lines.length;
  s.lines.forEach((line, i) => {
    const size = fit(ctx, line, family, lineH * 0.86, w - 34);
    glowText(ctx, line, w / 2, 11 + lineH * (i + 0.5) + size * 0.05, s.color, size);
  });
}

function drawBox(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
  // a lightbox: a bright panel with dark lettering. A painted board keeps exactly
  // its own colour and has a line round its edge in the colour of its lettering.
  const dark = s.ink ?? '#0f3b66';
  const painted = s.kind === 'board';
  ctx.fillStyle = lighten(s.color, painted ? 0 : 0.35);
  roundRect(ctx, 0, 0, w, h, 8);
  ctx.fill();
  if (painted) {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    roundRect(ctx, 7, 7, w - 14, h - 14, 5);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = dark;
  const lineH = (h - 18) / s.lines.length;
  s.lines.forEach((line, i) => {
    const size = fit(ctx, line, EN, lineH * 0.84, w - 30);
    ctx.font = `900 ${size}px ${EN}`;
    ctx.fillText(line, w / 2, 9 + lineH * (i + 0.5) + size * 0.05);
  });
  if (s.id === 'billboard') {
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
}

/** A highway marker in neon: the outline of the shield, the word across its top and the number below. */
function drawShield(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
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
function drawScore(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
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

function drawP(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#1565d8';
  roundRect(ctx, 0, 0, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  roundRect(ctx, 9, 9, w - 18, h - 18, 12);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${h * 0.72}px ${EN}`;
  ctx.fillText('P', w / 2, h / 2 + h * 0.04);
}

function drawScreen(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
  // a stand-in for the screen that will later show what Spotify is playing
  ctx.fillStyle = '#07070d';
  ctx.fillRect(0, 0, w, h);
  const cover = h - 64;
  const g = ctx.createLinearGradient(32, 32, 32, 32 + cover);
  g.addColorStop(0, '#2a1a6e');
  g.addColorStop(0.55, '#ff3d9a');
  g.addColorStop(1, '#ffb02e');
  ctx.fillStyle = g;
  roundRect(ctx, 32, 32, cover, cover, 14);
  ctx.fill();
  // a low sun and a road running to the horizon
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(32 + cover / 2, 32 + cover * 0.56, cover * 0.2, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#16102e';
  ctx.fillRect(32, 32 + cover * 0.56, cover, cover * 0.44);
  ctx.strokeStyle = '#35e0ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(32 + cover * 0.5, 32 + cover * 0.56); ctx.lineTo(32 + cover * 0.12, 32 + cover);
  ctx.moveTo(32 + cover * 0.5, 32 + cover * 0.56); ctx.lineTo(32 + cover * 0.88, 32 + cover);
  ctx.stroke();

  const tx = 32 + cover + 30;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#35e0ff';
  ctx.font = `900 24px ${EN}`;
  ctx.fillText(s.lines[0], tx, 84);
  const size = fit(ctx, s.lines[1], EN, 44, w - tx - 28);
  ctx.font = `900 ${size}px ${EN}`;
  ctx.fillStyle = '#ffffff';
  // the title is wrapped onto two lines if it is long
  const words = s.lines[1].split(' ');
  const half = Math.ceil(words.length / 2);
  ctx.font = `900 40px ${EN}`;
  ctx.fillText(words.slice(0, half).join(' '), tx, 150);
  ctx.fillText(words.slice(half).join(' '), tx, 198);
  ctx.fillStyle = '#ff9ccb';
  ctx.font = `700 26px ${EN}`;
  ctx.fillText(s.lines[2], tx, 246);
  ctx.fillStyle = '#3a3a4c';
  ctx.fillRect(tx, 284, w - tx - 36, 8);
  ctx.fillStyle = '#ff3d9a';
  ctx.fillRect(tx, 284, (w - tx - 36) * 0.42, 8);
}

export function buildSignAtlas(): SignAtlas {
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const rects = new Map<string, SignRect>();
  const items = SIGNS.map((s) => ({ s, size: pixelSize(s) })).sort((a, b) => b.size[1] - a.size[1]);
  let x = PAD, y = PAD, shelf = 0;
  for (const { s, size } of items) {
    const [w, h] = size;
    if (x + w + PAD > SIZE) {
      x = PAD;
      y += shelf + PAD;
      shelf = 0;
    }
    shelf = Math.max(shelf, h);
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    if (s.kind === 'screen') drawScreen(ctx, s, w, h);
    else if (s.kind === 'p') drawP(ctx, w, h);
    else if (s.kind === 'box' || s.kind === 'board') drawBox(ctx, s, w, h);
    else if (s.kind === 'shield') drawShield(ctx, s, w, h);
    else if (s.kind === 'score') drawScore(ctx, s, w, h);
    else drawNeon(ctx, s, w, h);
    ctx.restore();
    rects.set(s.id, { u0: x / SIZE, u1: (x + w) / SIZE, vTop: y / SIZE, vBottom: (y + h) / SIZE, aspect: w / h, color: s.color });
    x += w + PAD;
  }
  if (y + shelf > SIZE) console.warn(`The sign sheet is full: ${y + shelf} rows of ${SIZE} are needed, so some signs are cut off.`);

  const texture = new THREE.CanvasTexture(cv);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return { texture, rects };
}
