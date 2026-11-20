// Delhi's signs: what its shops say, the boards along its roads, and the
// screen on Connaught Place.
//
// A shop's board says what is sold and not whose shop it is, in Hindi above
// and English below, as most of Delhi's boards do. Every Hindi word here was
// checked in its own script before it was written: NOTES.md says against what.

import { DEVANAGARI, type SignDef } from '../../engine/signs';
import type { Quarter } from './plan';

/** A sign's size on the sheet, for its shape: small, so that the tile's many signs fit on one sheet. */
const sized = (aspect: number, h: number): [number, number] => [Math.round(h * aspect), h];

const shop = (id: string, hindi: string, english: string, color: string, ink: string, kind: 'board' | 'box' = 'board'): SignDef => {
  const aspect = Math.max(2.4, english.length * 0.42);
  return { id: `shop-${id}`, lines: [hindi, english], color, ink, aspect, size: sized(aspect, 104), kind, font: DEVANAGARI };
};

/** What is over the shopfronts of each quarter. */
export const SHOPS: Record<Quarter, SignDef[]> = {
  'old-delhi': [
    shop('sweets', 'मिठाई', 'SWEETS', '#b3202a', '#fbe9b7'), shop('chaat', 'चाट', 'CHAAT', '#f2c14e', '#5e1a1a', 'box'), shop('tea', 'चाय', 'TEA', '#1f5d48', '#f4f1e8'),
    shop('spices', 'मसाले', 'SPICES', '#c8742a', '#fff6e0'), shop('jalebi', 'जलेबी', 'JALEBI', '#f08a24', '#3a1a08', 'box'),
  ],
  centre: [
    shop('tyres', 'टायर', 'TYRES', '#1b1b20', '#f2c14e'), shop('parts', 'ऑटो पार्ट्स', 'AUTO PARTS', '#f2c14e', '#1b1b20', 'box'), shop('sweets-2', 'मिठाई', 'SWEETS', '#7a1f5e', '#fbe9b7'),
    shop('tea-2', 'चाय', 'TEA', '#f4f1e8', '#1f5d48', 'box'),
  ],
  south: [shop('chaat-2', 'चाट', 'CHAAT', '#b3202a', '#fbe9b7', 'box'), shop('tea-3', 'चाय', 'TEA', '#1f5d48', '#f4f1e8'), shop('puncture', 'पंचर', 'PUNCTURE', '#1b1b20', '#f4f1e8')],
  river: [shop('tea-4', 'चाय', 'TEA', '#1f5d48', '#f4f1e8')],
};

/** A board over a road, as Delhi's are: white lettering on green, Hindi above and English below. */
const road = (id: string, hindi: string, english: string): SignDef => {
  const aspect = Math.max(2.6, english.length * 0.46);
  return { id: `road-${id}`, lines: [hindi, english], color: '#12784a', ink: '#ffffff', aspect, size: sized(aspect, 120), kind: 'board', font: DEVANAGARI, real: true };
};

export const ROAD_SIGNS: SignDef[] = [
  road('ring-road', 'रिंग रोड', 'RING ROAD'), road('moti-bagh', 'मोती बाग', 'MOTI BAGH'), road('aiims', 'एम्स', 'AIIMS'), road('dhaula-kuan', 'धौला कुआँ', 'DHAULA KUAN'),
  road('kartavya-path', 'कर्तव्य पथ', 'KARTAVYA PATH'), road('chandni-chowk', 'चांदनी चौक', 'CHANDNI CHOWK'), road('connaught-place', 'कनॉट प्लेस', 'CONNAUGHT PLACE'),
  road('kashmere-gate', 'कश्मीरी गेट', 'KASHMERE GATE'), road('karol-bagh', 'करोल बाग', 'KAROL BAGH'), road('india-gate', 'इंडिया गेट', 'INDIA GATE'),
];

// ---------------------------------------------------------------------------
// The screen on Connaught Place, and the picture it shows when nothing plays
// ---------------------------------------------------------------------------

/**
 * Words bent along a circle. They are written once, straight, on a canvas of
 * their own, and then laid round the circle strip by strip: Devanagari joins
 * its letters, so a word cannot be set down a letter at a time. `over` puts
 * them over the top of the circle, and otherwise they run under its foot.
 */
function bent(ctx: CanvasRenderingContext2D, words: string, size: number, cx: number, cy: number, radius: number, over: boolean, fill: string, edge: string): void {
  const font = `900 ${size}px ${DEVANAGARI}`, off = document.createElement('canvas'), o = off.getContext('2d');
  if (!o) return;
  o.font = font;
  const tw = Math.ceil(o.measureText(words).width + size * 0.5), th = Math.ceil(size * 2);
  off.width = tw;
  off.height = th;
  o.font = font;
  o.textAlign = 'center';
  o.textBaseline = 'middle';
  o.lineJoin = 'round';
  o.lineWidth = size * 0.2;
  o.strokeStyle = edge;
  o.strokeText(words, tw / 2, th / 2);
  o.fillStyle = fill;
  o.fillText(words, tw / 2, th / 2);
  const step = 2;
  for (let x = 0; x < tw; x += step) {
    const a = (x + step / 2 - tw / 2) / radius;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(over ? a : -a);
    ctx.drawImage(off, x, 0, Math.min(step + 1, tw - x), th, -step / 2, (over ? -radius : radius) - th / 2, Math.min(step + 1, tw - x), th);
    ctx.restore();
  }
}

/**
 * दिल्ली दिलवालों की, "Delhi belongs to the big-hearted", written round a
 * heart: the first word over it and the other two under it. Behind it a
 * sunburst, either side of it a marigold and small hearts, in the colours a
 * lorry is painted in. It draws the whole rectangle each time and keeps
 * nothing between calls.
 */
function paintDilwale(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  const NAVY = '#16296b', BLUE = '#20409c', RED = '#d81e3a', RED_DARK = '#8f1026', YELLOW = '#ffd23f', ORANGE = '#ff8a24', WHITE = '#fff8e6', PINK = '#ff7fb0', INK = '#0e1a47';
  const cx = w / 2, cy = h / 2;
  // the ground, and a sunburst behind the heart
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  const far = Math.hypot(w, h);
  ctx.fillStyle = BLUE;
  for (let i = 0; i < 14; i++) {
    const a0 = (i / 14) * Math.PI * 2 + 0.11, a1 = a0 + Math.PI / 14;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * far, cy + Math.sin(a0) * far);
    ctx.lineTo(cx + Math.cos(a1) * far, cy + Math.sin(a1) * far);
    ctx.closePath();
    ctx.fill();
  }
  // a frame of yellow with scallops along its top and its foot, as on a lorry's boards
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = h * 0.03;
  ctx.strokeRect(h * 0.03, h * 0.03, w - h * 0.06, h - h * 0.06);
  ctx.fillStyle = YELLOW;
  for (let i = 0; i < 18; i++) {
    const x = h * 0.06 + ((i + 0.5) * (w - h * 0.12)) / 18, r = (w - h * 0.12) / 36;
    ctx.beginPath();
    ctx.arc(x, h * 0.06, r, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, h * 0.94, r, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  /** A heart whose middle is (x, y): `r` is about half its width. */
  const heart = (x: number, y: number, r: number): void => {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.62);
    ctx.bezierCurveTo(x - r * 1.25, y - r * 0.2, x - r * 0.6, y - r, x, y - r * 0.42);
    ctx.bezierCurveTo(x + r * 0.6, y - r, x + r * 1.25, y - r * 0.2, x, y + r * 0.62);
    ctx.closePath();
  };
  // the heart: red, with a darker shadow under it, a yellow line round it and a shine on its left side
  const hy = cy + h * 0.045, hr = h * 0.33;
  ctx.fillStyle = INK;
  heart(cx + h * 0.012, hy + h * 0.018, hr);
  ctx.fill();
  ctx.fillStyle = RED;
  heart(cx, hy, hr);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = h * 0.02;
  ctx.stroke();
  ctx.strokeStyle = RED_DARK;
  ctx.lineWidth = h * 0.008;
  heart(cx, hy, hr * 0.84);
  ctx.stroke();
  ctx.strokeStyle = WHITE;
  ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.022;
  ctx.beginPath();
  ctx.arc(cx - hr * 0.42, hy - hr * 0.28, hr * 0.26, Math.PI * 1.05, Math.PI * 1.5);
  ctx.stroke();

  // a marigold either side, with a small heart over it and one under it
  for (const side of [-1, 1]) {
    const mx = cx + side * h * 0.64, r = h * 0.085;
    for (let p = 0; p < 12; p++) {
      const a = (p / 12) * Math.PI * 2;
      ctx.fillStyle = p % 2 ? YELLOW : ORANGE;
      ctx.beginPath();
      ctx.ellipse(mx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, r * 0.44, r * 0.26, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(mx, cy, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = YELLOW;
    ctx.beginPath();
    ctx.arc(mx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PINK;
    for (const dy of [-0.25, 0.25]) {
      heart(mx + side * h * 0.055, cy + h * dy, h * 0.045);
      ctx.fill();
    }
  }

  // the words round the heart: Delhi over it in yellow, "of the big-hearted" under it in white
  bent(ctx, 'दिल्ली', h * 0.17, cx, cy, h * 0.335, true, YELLOW, INK);
  bent(ctx, 'दिलवालों की', h * 0.128, cx, cy, h * 0.365, false, WHITE, INK);
}

/** The big screen on Connaught Place. The engine fills it with what is playing: this is what it shows when nothing is. */
export const SCREEN: SignDef = {
  id: 'delhi-screen', lines: ['NOW PLAYING', 'Dilli Dilwalon Ki', 'Delhi'], color: '#ffd23f', aspect: 16 / 9, kind: 'screen', paint: paintDilwale,
};
