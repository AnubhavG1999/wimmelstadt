// Delhi's signs: what its shops say, the boards along its roads, and the
// screen on Connaught Place.
//
// A shop's board says what is sold and not whose shop it is, in Hindi above
// and English below, as most of Delhi's boards do. Every Hindi word here was
// checked in its own script before it was written: NOTES.md says against what.

import { DEVANAGARI, EN, fit, type SignDef } from '../../engine/signs';
import type { Quarter } from './plan';

const shop = (id: string, hindi: string, english: string, color: string, ink: string, kind: 'board' | 'box' = 'board'): SignDef =>
  ({ id: `shop-${id}`, lines: [hindi, english], color, ink, aspect: Math.max(2.4, english.length * 0.42), kind, font: DEVANAGARI });

/** What is over the shopfronts of each quarter. */
export const SHOPS: Record<Quarter, SignDef[]> = {
  'old-delhi': [
    shop('sweets', 'मिठाई', 'SWEETS', '#b3202a', '#fbe9b7'), shop('chaat', 'चाट', 'CHAAT', '#f2c14e', '#5e1a1a', 'box'), shop('tea', 'चाय', 'TEA', '#1f5d48', '#f4f1e8'),
    shop('spices', 'मसाले', 'SPICES', '#c8742a', '#fff6e0'), shop('jalebi', 'जलेबी', 'JALEBI', '#f08a24', '#3a1a08', 'box'), shop('kites', 'पतंग', 'KITES', '#2a6fb0', '#fff6e0'),
  ],
  centre: [
    shop('tyres', 'टायर', 'TYRES', '#1b1b20', '#f2c14e'), shop('parts', 'ऑटो पार्ट्स', 'AUTO PARTS', '#f2c14e', '#1b1b20', 'box'), shop('sweets-2', 'मिठाई', 'SWEETS', '#7a1f5e', '#fbe9b7'),
    shop('tea-2', 'चाय', 'TEA', '#f4f1e8', '#1f5d48', 'box'),
  ],
  south: [shop('chaat-2', 'चाट', 'CHAAT', '#b3202a', '#fbe9b7', 'box'), shop('tea-3', 'चाय', 'TEA', '#1f5d48', '#f4f1e8'), shop('puncture', 'पंक्चर', 'PUNCTURE', '#1b1b20', '#f4f1e8')],
  river: [shop('tea-4', 'चाय', 'TEA', '#1f5d48', '#f4f1e8')],
};

/** A board over a road, as Delhi's are: white lettering on green, Hindi above and English below. */
const road = (id: string, hindi: string, english: string): SignDef =>
  ({ id: `road-${id}`, lines: [hindi, english], color: '#12784a', ink: '#ffffff', aspect: Math.max(2.6, english.length * 0.46), kind: 'board', font: DEVANAGARI, real: true });

export const ROAD_SIGNS: SignDef[] = [
  road('ring-road', 'रिंग रोड', 'RING ROAD'), road('moti-bagh', 'मोती बाग', 'MOTI BAGH'), road('aiims', 'एम्स', 'AIIMS'), road('dhaula-kuan', 'धौला कुआं', 'DHAULA KUAN'),
  road('kartavya-path', 'कर्तव्य पथ', 'KARTAVYA PATH'), road('chandni-chowk', 'चांदनी चौक', 'CHANDNI CHOWK'), road('connaught-place', 'कनॉट प्लेस', 'CONNAUGHT PLACE'),
  road('kashmere-gate', 'कश्मीरी गेट', 'KASHMERE GATE'), road('karol-bagh', 'करोल बाग', 'KAROL BAGH'), road('india-gate', 'इंडिया गेट', 'INDIA GATE'),
];

// ---------------------------------------------------------------------------
// The screen on Connaught Place, and the picture it shows when nothing plays
// ---------------------------------------------------------------------------

/**
 * The tailboard of a lorry, in the colours of truck art: HORN OK PLEASE in
 * three panels, lotus flowers, a painted pair of eyes, and under it the line
 * lorries carry too: "we'll meet again". It draws the whole rectangle each
 * time and keeps nothing between calls.
 */
function paintTailboard(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  const BLUE = '#1b3f8f', RED = '#c8202c', YELLOW = '#ffd23f', GREEN = '#1f8f4f', WHITE = '#fff8e6', BLACK = '#15161c', PINK = '#ff7fb0';
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, w, h);
  // a frame of yellow, and a band of scallops along the top
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = h * 0.03;
  ctx.strokeRect(h * 0.03, h * 0.03, w - h * 0.06, h - h * 0.06);
  ctx.fillStyle = YELLOW;
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.arc(h * 0.06 + ((i + 0.5) * (w - h * 0.12)) / 16, h * 0.06, (w - h * 0.12) / 32, 0, Math.PI);
    ctx.fill();
  }
  // three panels: red, green, red
  const top = h * 0.2, ph = h * 0.44, gap = w * 0.015, x0 = w * 0.05, pw = (w - 2 * x0 - 2 * gap) / 3;
  const panels = [RED, GREEN, RED], words = ['HORN', 'OK', 'PLEASE'];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  panels.forEach((color, i) => {
    const x = x0 + i * (pw + gap);
    ctx.fillStyle = color;
    ctx.fillRect(x, top, pw, ph);
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = h * 0.014;
    ctx.strokeRect(x + h * 0.02, top + h * 0.02, pw - h * 0.04, ph - h * 0.04);
    if (i === 1) {
      // OK stands in a ring of lotus petals
      const cx = x + pw / 2, cy = top + ph / 2, r = ph * 0.36;
      for (let p = 0; p < 12; p++) {
        const a = (p / 12) * Math.PI * 2;
        ctx.fillStyle = p % 2 ? PINK : WHITE;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.34, r * 0.17, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
      ctx.fill();
    }
    const size = fit(ctx, words[i], EN, ph * (i === 1 ? 0.34 : 0.4), pw * (i === 1 ? 0.42 : 0.82));
    ctx.font = `900 ${size}px ${EN}`;
    ctx.fillStyle = BLACK;
    ctx.fillText(words[i], x + pw / 2 + size * 0.05, top + ph / 2 + size * 0.09);
    ctx.fillStyle = i === 1 ? RED : YELLOW;
    ctx.fillText(words[i], x + pw / 2, top + ph / 2 + size * 0.04);
  });
  // a painted eye at either end of the lower band, and the line between them
  const by = top + ph + h * 0.04, bh = h - by - h * 0.07;
  for (const ex of [w * 0.12, w * 0.88]) {
    const ey = by + bh / 2;
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.ellipse(ex, ey, bh * 0.62, bh * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BLACK;
    ctx.beginPath();
    ctx.arc(ex, ey, bh * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = h * 0.012;
    ctx.beginPath();
    ctx.ellipse(ex, ey, bh * 0.62, bh * 0.34, 0, Math.PI, 0);
    ctx.stroke();
  }
  const line = 'फिर मिलेंगे';
  const size = fit(ctx, line, DEVANAGARI, bh * 0.78, w * 0.5);
  ctx.font = `900 ${size}px ${DEVANAGARI}`;
  ctx.fillStyle = BLACK;
  ctx.fillText(line, w / 2 + size * 0.04, by + bh / 2 + size * 0.08);
  ctx.fillStyle = WHITE;
  ctx.fillText(line, w / 2, by + bh / 2 + size * 0.03);
  // red and yellow diamonds, as reflectors, between the line and the eyes
  for (const dx of [w * 0.23, w * 0.77]) {
    ctx.fillStyle = dx < w / 2 ? RED : YELLOW;
    ctx.beginPath();
    ctx.moveTo(dx, by + bh * 0.2); ctx.lineTo(dx + bh * 0.3, by + bh / 2); ctx.lineTo(dx, by + bh * 0.8); ctx.lineTo(dx - bh * 0.3, by + bh / 2);
    ctx.fill();
  }
}

/** The big screen on Connaught Place. The engine fills it with what is playing: this is what it shows when nothing is. */
export const SCREEN: SignDef = {
  id: 'delhi-screen', lines: ['NOW PLAYING', 'Horn OK Please', 'Delhi'], color: '#ffd23f', aspect: 16 / 9, kind: 'screen', paint: paintTailboard,
};
