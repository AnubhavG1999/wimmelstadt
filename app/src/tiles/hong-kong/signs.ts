// Every sign the tile hangs. Hong Kong's signs are in traditional Chinese and
// in English, as the real ones are. A shop's sign says what it sells and not
// whose it is, so that no real shop is named by accident. The name of a real
// place or business is plain lettering on a plain board, and NOTES.md says how
// each was checked.

import type { SignPool } from '../../engine/buildings';
import { CHINESE, EN, fit, glowText, lighten, type SignDef } from '../../engine/signs';

/** A painted board: lettering of one colour on a ground of another. */
const board = (id: string, lines: string[], color: string, ink: string, aspect: number, more: Partial<SignDef> = {}): SignDef =>
  ({ id, lines, color, ink, aspect, kind: 'board', font: CHINESE, ...more });

/** Neon lettering on a dark panel: Chinese above, English below. */
const neon = (id: string, lines: string[], color: string, aspect = 2): SignDef => ({ id, lines, color, aspect, font: CHINESE });

/** Neon characters one above another, on a sign that stands out from a wall. */
const blade = (id: string, text: string, color: string): SignDef =>
  ({ id, lines: [text], color, vertical: true, aspect: Math.min(0.42, 1.25 / [...text].length), font: CHINESE });

/** A real name, in plain dark lettering on a plain pale board. */
const real = (id: string, lines: string[], aspect: number): SignDef =>
  ({ id, lines, color: '#d6d3c8', ink: '#16161a', aspect, kind: 'box', real: true, font: CHINESE });

/** The face of a clock, at ten past ten. */
function clockFace(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.44;
  ctx.fillStyle = '#f6f2e6';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#23252b';
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.09;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74);
    ctx.lineTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
    ctx.stroke();
  }
  const hand = (turn: number, len: number, wide: number): void => {
    const a = turn * Math.PI * 2 - Math.PI / 2;
    ctx.lineWidth = r * wide;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * len, cy + Math.sin(a) * r * len);
    ctx.stroke();
  };
  hand(10.17 / 12, 0.46, 0.15);
  hand(10 / 60, 0.68, 0.1);
}

/** The board at a racecourse that shows the odds: rows of amber figures on black. */
function toteBoard(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#15161a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffb83d';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `900 ${h * 0.15}px ${EN}`;
  ['1   3.2     6   12', '2   5.5     7   9.4', '3   21      8   4.1', '4   8.0     9   15', '5   2.6    10   33'].forEach((row, i) => ctx.fillText(row, w * 0.07, h * (0.14 + i * 0.18)));
}

/**
 * A pawnshop's sign, as every pawnshop in Hong Kong has it: a bat with its
 * wings spread, hanging head down over a coin, and on the coin the character
 * for a pledge.
 */
function pawnSign(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(0, 0, w, h);
  const tube = (shape: () => void, color: string, wide: number): void => {
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = color;
    ctx.lineWidth = wide;
    shape(); ctx.stroke();
    shape(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = lighten(color, 0.7);
    ctx.lineWidth = wide * 0.4;
    shape(); ctx.stroke();
  };
  tube(() => {
    ctx.beginPath();
    ctx.moveTo(w * 0.08, h * 0.08);
    ctx.quadraticCurveTo(w * 0.3, h * 0.26, w * 0.5, h * 0.14);
    ctx.quadraticCurveTo(w * 0.7, h * 0.26, w * 0.92, h * 0.08);
    ctx.quadraticCurveTo(w * 0.84, h * 0.34, w * 0.5, h * 0.38);
    ctx.quadraticCurveTo(w * 0.16, h * 0.34, w * 0.08, h * 0.08);
    ctx.closePath();
  }, '#ff3d3d', 7);
  tube(() => { ctx.beginPath(); ctx.arc(w / 2, h * 0.68, w * 0.36, 0, Math.PI * 2); }, '#3dff8a', 7);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${w * 0.44}px ${CHINESE}`;
  glowText(ctx, '押', w / 2, h * 0.695, '#ff3d3d', w * 0.44);
}

/** What the great screen on M+ shows: blocks of colour, as a work of art might be. */
function artScreen(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#101216';
  ctx.fillRect(0, 0, w, h);
  const COLOURS = ['#ff3d9a', '#35e0ff', '#ffd23f', '#7dff9b', '#c77dff', '#ff7a1a', '#f4f1e8'];
  let n = 3;
  for (let y = 0; y < h - 1; y += h / 9) {
    for (let x = 0; x < w - 1; x += w / 5) {
      n = (n * 7 + 5) % 31;
      if (n % 3 === 0) continue;
      ctx.fillStyle = COLOURS[n % COLOURS.length];
      ctx.globalAlpha = 0.55 + (n % 4) * 0.15;
      ctx.fillRect(x + 4, y + 4, w / 5 - 8, h / 9 - 8);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * What the big screen on Nathan Road shows when no music plays: yum cha drawn
 * in neon on black, a bamboo steamer seen from the side with three dumplings in
 * it and steam rising, beside the words for yum cha and "taking a break". Each
 * line is a tube: a wide soft halo, and a bright thin core of the same colour.
 * It draws the whole screen every time.
 */
function yumCha(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  const PINK = '#ff3d9a', CYAN = '#35e0ff', YELLOW = '#ffd23f';
  ctx.fillStyle = '#07070d';
  ctx.fillRect(0, 0, w, h);
  const k = h / 360;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const tube = (shape: () => void, color: string, wide = 9): void => {
    ctx.shadowColor = color;
    ctx.shadowBlur = 22 * k;
    ctx.strokeStyle = color;
    ctx.lineWidth = wide * k;
    shape(); ctx.stroke();
    shape(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = lighten(color, 0.72);
    ctx.lineWidth = wide * 0.38 * k;
    shape(); ctx.stroke();
  };

  // the steamer: its rim as an ellipse, its sides, the curve of its bottom, and two bands of weave
  const cx = w * 0.29, rimY = h * 0.55, rx = w * 0.22, ry = h * 0.06, botY = h * 0.88;
  // the dumplings first, so that the front of the rim passes over their feet
  for (const dx of [-0.6, 0, 0.6]) {
    const x = cx + dx * rx, r = rx * 0.29, base = rimY + ry * 0.35;
    tube(() => {
      ctx.beginPath();
      ctx.moveTo(x - r, base);
      ctx.bezierCurveTo(x - r, base - r * 1.15, x - r * 0.25, base - r * 1.3, x, base - r * 1.35);
      ctx.bezierCurveTo(x + r * 0.25, base - r * 1.3, x + r, base - r * 1.15, x + r, base);
      // the pleats, gathered at the top
      ctx.moveTo(x - r * 0.35, base - r * 1.05);
      ctx.lineTo(x, base - r * 1.35);
      ctx.lineTo(x + r * 0.35, base - r * 1.05);
    }, PINK, 11);
  }
  tube(() => {
    ctx.beginPath();
    ctx.ellipse(cx, rimY, rx, ry, 0, 0, Math.PI * 2);
    ctx.moveTo(cx - rx, rimY);
    ctx.lineTo(cx - rx * 0.94, botY);
    ctx.ellipse(cx, botY, rx * 0.94, ry, 0, Math.PI, 0, true);
    ctx.lineTo(cx + rx, rimY);
  }, YELLOW, 10);
  for (const t of [0.36, 0.68]) {
    const y = rimY + (botY - rimY) * t, r = rx * (1 - 0.06 * t);
    tube(() => {
      ctx.beginPath();
      ctx.ellipse(cx, y, r, ry, 0, Math.PI * 0.08, Math.PI * 0.92);
    }, YELLOW, 6);
  }

  // three wisps of steam rising from the dumplings, each a long wave that thins out at its top
  for (const dx of [-0.6, 0, 0.6]) {
    const x = cx + dx * rx, y0 = h * 0.33, y1 = h * 0.06, s = rx * 0.16, d = (y0 - y1) / 2;
    tube(() => {
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.bezierCurveTo(x - s * 1.6, y0 - d * 0.35, x - s * 1.6, y0 - d * 0.65, x, y0 - d);
      ctx.bezierCurveTo(x + s * 1.6, y0 - d * 1.35, x + s * 1.6, y0 - d * 1.65, x + s * 0.3, y1);
    }, CYAN, 9);
  }

  // the words: yum cha, large, and "taking a break" under them
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tx = w * 0.75;
  const big = fit(ctx, '飲茶', CHINESE, h * 0.42, w * 0.42);
  ctx.font = `900 ${big}px ${CHINESE}`;
  glowText(ctx, '飲茶', tx, h * 0.4, PINK, big);
  const small = fit(ctx, '休息一下', CHINESE, h * 0.15, w * 0.4);
  ctx.font = `900 ${small}px ${CHINESE}`;
  glowText(ctx, '休息一下', tx, h * 0.77, YELLOW, small);
}

export const SIGNS: SignDef[] = [
  // the big screen, which shows what is playing; its own picture is yum cha in neon
  { id: 'screen', lines: ['飲茶', '休息一下'], color: '#ff3d9a', aspect: 16 / 9, kind: 'screen', paint: yumCha, font: CHINESE },
  // the names of real places and businesses, each checked, each plain lettering on a plain board
  board('star-ferry', ['天星小輪', 'STAR FERRY'], '#f2efe6', '#1f5a3e', 3.2, { real: true }),
  board('peak-tram', ['山頂纜車', 'PEAK TRAM'], '#1d5a3c', '#f2e6c4', 2.9, { real: true }),
  board('man-mo', ['文武廟'], '#5e1410', '#e8c15a', 3.3, { real: true, size: [240, 72] }),
  board('peninsula', ['THE PENINSULA', '半島酒店'], '#1f4a3a', '#f2e6c4', 4.4, { real: true, size: [560, 128] }),
  board('wong-tai-sin', ['黃大仙祠'], '#8f1f18', '#f2cf6a', 4, { real: true, size: [288, 72] }),
  board('temple-street', ['廟街  TEMPLE STREET'], '#8f1f18', '#f2cf6a', 6.6, { real: true, size: [528, 80] }),
  board('happy-valley', ['跑馬地馬場', 'HAPPY VALLEY RACECOURSE'], '#1d5a3c', '#f2e6c4', 5.2, { real: true, size: [624, 120] }),
  board('noonday-gun', ['午炮  NOONDAY GUN'], '#3a4250', '#f2e6c4', 4.4, { real: true, size: [308, 70] }),
  board('tunnel', ['海底隧道', 'CROSS-HARBOUR TUNNEL'], '#f4f1e8', '#1c1c22', 6, { real: true, size: [576, 96] }),
  real('tiny', ['TINY 微影'], 3.4),
  real('tarmac', ['TARMAC WORKS'], 4.6),
  real('minigt', ['MINI GT'], 3.6),

  // boards that say what a thing is
  board('dai-pai-dong', ['大牌檔'], '#f2efe6', '#b3261e', 3.6, { size: [260, 72] }),
  board('works', ['工程進行中', 'WORKS IN PROGRESS'], '#f2c94c', '#23252b', 3.4, { size: [326, 96] }),
  board('car-ferry', ['汽車渡輪  VEHICULAR FERRY'], '#2f4f7a', '#f7f4ea', 7, { size: [504, 72] }),
  board('tram-stop', ['電車站'], '#1f6b3a', '#f2e6c4', 3.2, { size: [192, 60] }),
  { id: 'sale', lines: ['大減價', 'SALE'], color: '#ffd23f', ink: '#b3261e', aspect: 2.2, kind: 'box', font: CHINESE },
  { id: 'welcome', lines: ['歡迎光臨', 'WELCOME'], color: '#b9e2ff', ink: '#0f3b66', aspect: 2.6, kind: 'box', font: CHINESE },

  // signs that the tile draws itself
  { id: 'clock', lines: [], color: '#f6f2e6', aspect: 1, size: [96, 96], paint: clockFace },
  { id: 'tote', lines: [], color: '#ffb83d', aspect: 2.17, size: [416, 192], paint: toteBoard },
  { id: 'pawn-bat', lines: [], color: '#ff3d3d', aspect: 0.62, size: [150, 242], paint: pawnSign },
  { id: 'm-plus-screen', lines: [], color: '#35e0ff', aspect: 0.6, size: [216, 360], paint: artScreen },

  // over shopfronts: what the shop sells, in Chinese and in English
  neon('cha-chaan-teng', ['茶餐廳', 'CAFE'], '#ffd23f'),
  neon('dim-sum', ['點心', 'DIM SUM'], '#ff5a4f'),
  neon('noodles', ['粥麵', 'NOODLES'], '#7dff9b'),
  neon('herbal-tea', ['涼茶', 'HERBAL TEA'], '#ffb02e'),
  neon('bakery', ['餅家', 'BAKERY'], '#ff9ccb'),
  neon('pharmacy', ['藥房', 'PHARMACY'], '#35e0ff'),
  neon('tailor', ['洋服', 'TAILOR'], '#c77dff'),
  neon('roast', ['燒臘', 'ROAST MEATS'], '#ff5a4f'),
  neon('tea', ['茶莊', 'TEA'], '#7dff9b'),
  neon('goldfish', ['金魚', 'GOLDFISH'], '#ff7a1a'),
  neon('model-cars', ['模型車', 'MODEL CARS'], '#35e0ff'),
  neon('cameras', ['相機', 'CAMERAS'], '#ffe45c'),
  neon('pawn-shop', ['當舖', 'PAWN SHOP'], '#ff3d3d'),
  neon('mahjong', ['麻雀耍樂', 'MAHJONG'], '#7dff9b'),
  neon('jewellery', ['珠寶金行', 'JEWELLERY'], '#ffd23f'),
  neon('exchange', ['找換店', 'EXCHANGE'], '#35e0ff'),
  neon('karaoke', ['卡拉OK', 'KARAOKE'], '#ff3d9a'),
  neon('foot', ['足浴', 'FOOT MASSAGE'], '#c77dff'),
  neon('watches', ['鐘錶', 'WATCHES'], '#ffe45c'),
  neon('seafood', ['海鮮酒家', 'SEAFOOD'], '#35e0ff'),

  // standing out from walls, and hung out over the street
  blade('v-restaurant', '酒家', '#ff5a4f'),
  blade('v-teahouse', '茶樓', '#ffb02e'),
  blade('v-nightclub', '夜總會', '#ff3d9a'),
  blade('v-sauna', '桑拿', '#35e0ff'),
  blade('v-mahjong', '麻雀', '#7dff9b'),
  blade('v-pawn', '押', '#ff3d3d'),
  blade('v-gold', '金行', '#ffd23f'),
  blade('v-pharmacy', '藥房', '#7dff9b'),
  blade('v-seafood', '海鮮酒家', '#35e0ff'),
  blade('v-hotel', '酒店', '#ffe45c'),
  blade('v-tailor', '洋服', '#c77dff'),
];

/** Which signs an ordinary building draws from, on each shore: over shopfronts, standing out from walls, and on rooftops. */
export const SIGN_POOLS: Record<'island' | 'kowloon', SignPool> = {
  island: {
    fascia: ['cha-chaan-teng', 'dim-sum', 'noodles', 'herbal-tea', 'bakery', 'pharmacy', 'tailor', 'roast', 'tea'],
    blade: ['v-restaurant', 'v-teahouse', 'v-pharmacy', 'v-pawn', 'v-tailor'],
    billboard: ['tarmac', 'welcome'],
  },
  kowloon: {
    fascia: ['goldfish', 'model-cars', 'cameras', 'pawn-shop', 'mahjong', 'jewellery', 'exchange', 'karaoke', 'foot', 'watches', 'seafood', 'cha-chaan-teng'],
    blade: ['v-restaurant', 'v-nightclub', 'v-sauna', 'v-mahjong', 'v-pawn', 'v-gold', 'v-seafood', 'v-hotel'],
    billboard: ['tiny', 'minigt', 'sale', 'tarmac'],
  },
};

/** The colours of the strips of light on a neon block, and of the light that its signs throw on the street. */
export const NEON = ['#ff3d9a', '#35e0ff', '#ffb02e', '#7dff9b', '#c77dff', '#ff5a4f'];
