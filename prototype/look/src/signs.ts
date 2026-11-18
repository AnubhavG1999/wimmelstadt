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
const JP = '"Yu Gothic UI", "Yu Gothic", Meiryo, "Hiragino Sans", "Noto Sans JP", sans-serif';
const EN = '"Arial Black", "Segoe UI Black", "Helvetica Neue", Arial, sans-serif';

function pixelSize(s: SignDef): [number, number] {
  if (s.kind === 'screen') return [640, 360];
  if (s.kind === 'p') return [160, 160];
  if (s.aspect < 1) return [112, Math.round(112 / s.aspect)];
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
  const family = s.jp ? JP : EN;

  if (s.vertical) {
    const chars = [...s.lines[0]];
    const cellH = (h - 24) / chars.length;
    const size = Math.min(w - 26, cellH * 0.92);
    ctx.font = `900 ${size}px ${family}`;
    chars.forEach((ch, i) => {
      const cy = 12 + cellH * (i + 0.5);
      if (ch === 'ー') {
        // the long-vowel mark stands upright in vertical writing
        ctx.save();
        ctx.translate(w / 2, cy);
        ctx.rotate(Math.PI / 2);
        glowText(ctx, ch, 0, 0, s.color, size);
        ctx.restore();
      } else {
        glowText(ctx, ch, w / 2, cy + size * 0.04, s.color, size);
      }
    });
    return;
  }

  const lineH = (h - 22) / s.lines.length;
  s.lines.forEach((line, i) => {
    const size = fit(ctx, line, family, lineH * 0.86, w - 34);
    glowText(ctx, line, w / 2, 11 + lineH * (i + 0.5) + size * 0.05, s.color, size);
  });
}

function drawBox(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
  // a lightbox: a bright panel with dark lettering
  const dark = s.id === 'mochi' ? '#c2183a' : s.id === 'billboard' ? '#0b2a4a' : '#0f3b66';
  ctx.fillStyle = lighten(s.color, s.id === 'mochi' ? 0 : 0.35);
  roundRect(ctx, 0, 0, w, h, 8);
  ctx.fill();
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
    // a little cat's face, the made-up cola's mascot
    ctx.fillStyle = dark;
    const cx = w - 46, cy = 44;
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 19, cy - 8); ctx.lineTo(cx - 14, cy - 30); ctx.lineTo(cx - 3, cy - 16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 19, cy - 8); ctx.lineTo(cx + 14, cy - 30); ctx.lineTo(cx + 3, cy - 16); ctx.fill();
  }
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
    else if (s.kind === 'box') drawBox(ctx, s, w, h);
    else drawNeon(ctx, s, w, h);
    ctx.restore();
    rects.set(s.id, { u0: x / SIZE, u1: (x + w) / SIZE, vTop: y / SIZE, vBottom: (y + h) / SIZE, aspect: w / h, color: s.color });
    x += w + PAD;
  }

  const texture = new THREE.CanvasTexture(cv);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return { texture, rects };
}
