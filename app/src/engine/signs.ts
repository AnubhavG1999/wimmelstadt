// Draws every sign of a tile onto one sheet, so all its signs are one draw call.
// Each sign is a dark panel with glowing lettering; at night the sheet is simply
// made brighter and the bloom does the rest.

import * as THREE from 'three';
import type { V3 } from './geo';

export interface SignDef {
  id: string;
  lines: string[];
  color: string;
  /** Characters stacked top to bottom. */
  vertical?: boolean;
  /** Width over height. */
  aspect: number;
  /**
   * How it is drawn. Neon lettering on a dark panel unless it says otherwise:
   * `box` is a lit board with dark lettering, `board` a painted one in exactly
   * its own colour, `p` a parking sign and `screen` the big screen.
   */
  kind?: 'neon' | 'box' | 'board' | 'screen' | 'p';
  /** For a board: the colour of the lettering. */
  ink?: string;
  /**
   * The lettering it is set in, as a CSS font family. Leave it out for Latin
   * letters. For another script, give a family that has it: JAPANESE, CHINESE
   * and DEVANAGARI below, or a list of the tile's own.
   */
  font?: string;
  /** The name of a real company or place. */
  real?: boolean;
  /** For a sign that a tile draws itself: its size on the sheet in pixels, and what draws it. */
  size?: [number, number];
  paint?: (ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number) => void;
}

/** Where a sign sits on the sheet. v runs downwards, as on the canvas. */
export interface SignRect { u0: number; u1: number; vTop: number; vBottom: number; aspect: number; color: string }

export interface SignAtlas {
  texture: THREE.CanvasTexture;
  rects: Map<string, SignRect>;
}

const SIZE = 2048;
const PAD = 8;
export const EN = '"Arial Black", "Segoe UI Black", "Helvetica Neue", Arial, sans-serif';
// Lettering for other scripts. Each names what Windows, Apple and Android call theirs.
export const JAPANESE = '"Yu Gothic UI", "Yu Gothic", Meiryo, "Hiragino Sans", "Noto Sans JP", sans-serif';
/** Traditional characters, as Hong Kong writes them. */
export const CHINESE = '"Microsoft JhengHei UI", "Microsoft JhengHei", "PingFang HK", "PingFang TC", "Noto Sans TC", sans-serif';
export const DEVANAGARI = '"Nirmala UI", "Kohinoor Devanagari", "Devanagari Sangam MN", "Noto Sans Devanagari", sans-serif';

/** A line of lettering as the pieces a reader sees as single characters, so that stacking them breaks no letter in two. */
function characters(text: string): string[] {
  if (typeof Intl.Segmenter !== 'function') return [...text];
  return [...new Intl.Segmenter().segment(text)].map((g) => g.segment);
}

function pixelSize(s: SignDef): [number, number] {
  if (s.size) return s.size;
  if (s.kind === 'screen') return [640, 360];
  if (s.kind === 'p') return [160, 160];
  if (s.aspect < 1) return [96, Math.round(96 / s.aspect)];
  if (s.aspect === 1) return [176, 176];
  const h = s.lines.length > 1 ? 176 : 120;
  return [Math.round(h * s.aspect), h];
}

export function lighten(hex: string, t: number): string {
  const c = new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), t);
  return '#' + c.getHexString();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Fits a font size so the text is no wider than maxW. */
export function fit(ctx: CanvasRenderingContext2D, text: string, family: string, size: number, maxW: number, weight = '900'): number {
  let s = size;
  for (let i = 0; i < 20; i++) {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    s *= 0.92;
  }
  return s;
}

export function glowText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, size: number): void {
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
  const family = s.font ?? EN;

  if (s.vertical) {
    const chars = characters(s.lines[0]);
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

export function drawBox(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
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
    const size = fit(ctx, line, s.font ?? EN, lineH * 0.84, w - 30);
    ctx.font = `900 ${size}px ${s.font ?? EN}`;
    ctx.fillText(line, w / 2, 9 + lineH * (i + 0.5) + size * 0.05);
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

export function buildSignAtlas(signs: SignDef[]): SignAtlas {
  // Where each sign goes: the tallest first, in rows across the sheet.
  const items = signs.map((s) => ({ s, size: pixelSize(s), x: 0, y: 0 })).sort((a, b) => b.size[1] - a.size[1]);
  {
    let x = PAD, y = PAD, shelf = 0;
    for (const it of items) {
      const [w, h] = it.size;
      if (x + w + PAD > SIZE) {
        x = PAD;
        y += shelf + PAD;
        shelf = 0;
      }
      shelf = Math.max(shelf, h);
      it.x = x;
      it.y = y;
      x += w + PAD;
    }
  }
  // The sheet is as tall as its signs need: one square, or two for a tile with a great many.
  const need = items.reduce((m, it) => Math.max(m, it.y + it.size[1] + PAD), PAD);
  const HEIGHT = need <= SIZE ? SIZE : SIZE * 2;
  if (need > HEIGHT) console.warn(`This tile has more signs than fit on its sheet: ${need} rows are needed and ${HEIGHT} is the most there is, so the last of them are cut off. Use fewer signs, or smaller ones.`);

  const cv = document.createElement('canvas');
  cv.width = SIZE;
  cv.height = HEIGHT;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, SIZE, HEIGHT);

  const rects = new Map<string, SignRect>();
  for (const { s, size, x, y } of items) {
    const [w, h] = size;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    if (s.paint) s.paint(ctx, s, w, h);
    else if (s.kind === 'screen') drawScreen(ctx, s, w, h);
    else if (s.kind === 'p') drawP(ctx, w, h);
    else if (s.kind === 'box' || s.kind === 'board') drawBox(ctx, s, w, h);
    else drawNeon(ctx, s, w, h);
    ctx.restore();
    rects.set(s.id, { u0: x / SIZE, u1: (x + w) / SIZE, vTop: y / HEIGHT, vBottom: (y + h) / HEIGHT, aspect: w / h, color: s.color });
  }

  const texture = new THREE.CanvasTexture(cv);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return { texture, rects };
}

// ---------------------------------------------------------------------------
// Hanging signs
// ---------------------------------------------------------------------------

/** Which way is to the right of someone who reads a sign on each face of a building, and which way the face looks. */
export const FACE_RIGHT: Record<string, V3> = { S: [1, 0, 0], N: [-1, 0, 0], E: [0, 0, -1], W: [0, 0, 1] };
export const FACE_NORMAL: Record<string, V3> = { S: [0, 0, 1], N: [0, 0, -1], E: [1, 0, 0], W: [-1, 0, 0] };

/** What a tile hangs its signs with. */
export interface Signs {
  /** The sheet the tile's signs are drawn on, and where each is on it. */
  readonly atlas: SignAtlas;
  /** Adds a sign centred at the given point, facing `face` (N, E, S or W) and `h` tall. Returns its width. */
  add(id: string, cx: number, cy: number, cz: number, face: string, h: number, maxW?: number): number;
  /** The same, for a sign that faces any way: (nx, nz) is the way it faces. */
  addFacing(id: string, cx: number, cy: number, cz: number, nx: number, nz: number, h: number, maxW?: number): number;
}

/** Collects every sign a tile hangs into one mesh. */
export class SignBuilder implements Signs {
  private pos: number[] = [];
  private uv: number[] = [];
  readonly atlas: SignAtlas;

  constructor(atlas: SignAtlas) {
    this.atlas = atlas;
  }

  /** How many signs have been hung. */
  get count(): number {
    return this.pos.length / 18;
  }

  /** Adds a sign centred at the given point, facing `face` (N, E, S or W) and `h` tall. Returns its width. */
  add(id: string, cx: number, cy: number, cz: number, face: string, h: number, maxW = Infinity): number {
    const n = FACE_NORMAL[face];
    return this.addFacing(id, cx, cy, cz, n[0], n[2], h, maxW);
  }

  /** The same, for a sign that faces any way: (nx, nz) is the way it faces. */
  addFacing(id: string, cx: number, cy: number, cz: number, nx: number, nz: number, h: number, maxW = Infinity): number {
    const r = this.atlas.rects.get(id);
    if (!r) {
      console.warn(`There is no sign called "${id}" on this tile's sheet.`);
      return 0;
    }
    let w = h * r.aspect;
    if (w > maxW) {
      w = maxW;
      h = w / r.aspect;
    }
    const R: V3 = [nz, 0, -nx]; // to the right of someone who reads it
    const hw = w / 2, hh = h / 2;
    const p = (sx: number, sy: number): V3 => [cx + R[0] * hw * sx, cy + hh * sy, cz + R[2] * hw * sx];
    const corners = [p(-1, -1), p(1, -1), p(1, 1), p(-1, 1)];
    const uvs = [[r.u0, r.vBottom], [r.u1, r.vBottom], [r.u1, r.vTop], [r.u0, r.vTop]];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      this.pos.push(...corners[i]);
      this.uv.push(uvs[i][0], uvs[i][1]);
    }
    return w;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}
