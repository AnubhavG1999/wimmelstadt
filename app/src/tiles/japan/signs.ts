// The tile's signs. They are in Japanese, as the real ones are. Every business
// is invented: the names on the tall signs are the look prototype's own
// (Kaiju Karaoke, Tornado Ramen, Dream Electric, Neon Sushi, Doughnut Galaxy,
// Cat Cola), and the rest say only what a shop sells.

import { JAPANESE, fit, type SignDef } from '../../engine/signs';
import type { SignPool } from '../../engine/buildings';

const neon = (id: string, lines: string[], color: string, aspect: number): SignDef => ({ id, lines, color, aspect, font: JAPANESE });
/** A sign that stands out from a wall, its characters stacked top to bottom. */
const blade = (id: string, text: string, color: string): SignDef => ({
  id, lines: [text], color, vertical: true, aspect: Math.min(0.42, 1.25 / [...text].length), font: JAPANESE,
});

export const SIGNS: SignDef[] = [
  // Tokyo: what stands out from the walls
  blade('kaiju-v', '怪獣カラオケ', '#ff3d9a'),
  blade('ramen-v', 'らーめん竜巻', '#ffb02e'),
  blade('yume-v', 'ゆめ電気', '#7dff9b'),
  blade('sushi-v', 'ネオン寿司', '#ff5a4f'),
  blade('donut-v', 'ドーナツ銀河', '#ffd23f'),
  blade('neko-v', 'ネココーラ', '#35e0ff'),
  blade('game-v', 'ゲーム', '#c77dff'),
  // Tokyo: over the shopfronts
  neon('ramen', ['ラーメン'], '#ffb02e', 3.4),
  neon('karaoke', ['カラオケ'], '#ff3d9a', 3.4),
  neon('pachinko', ['パチンコ'], '#35e0ff', 3.4),
  neon('konbini', ['コンビニ 24'], '#7dff9b', 4.4),
  neon('sushi', ['寿司'], '#ff5a4f', 2.2),
  neon('izakaya', ['居酒屋'], '#ffd23f', 2.8),
  neon('yakitori', ['焼き鳥'], '#ff7a1a', 2.8),
  neon('kusuri', ['薬'], '#7dff9b', 1.6),
  // on the rooftops
  { id: 'neko-cola', lines: ['ネココーラ'], color: '#8fecff', ink: '#0b2a4a', aspect: 3.6, kind: 'box', font: JAPANESE },
  { id: 'yume-denki', lines: ['ゆめ電気'], color: '#d8ffe0', ink: '#14402a', aspect: 3.2, kind: 'box', font: JAPANESE },

  // Kyoto: tea, sweets, noodles and inns
  neon('ocha', ['お茶'], '#b8e986', 2.2),
  neon('wagashi', ['和菓子'], '#ff9ccb', 2.8),
  neon('soba', ['そば'], '#ffd9a0', 2.2),
  neon('udon', ['うどん'], '#ffe2ae', 2.8),
  neon('ryokan', ['旅館'], '#ffd9a0', 2.2),
  neon('yu', ['ゆ'], '#9fd8ff', 1.4),
];

/** A board in an expressway's green, with white lettering. */
const green = (id: string, lines: string[], aspect: number): SignDef => ({ id, lines, color: '#12784a', ink: '#ffffff', aspect, kind: 'board', font: JAPANESE });

/**
 * Signs on the Wangan. Their names are those of the road and of the places it
 * leads to: the Wangan line, Daikoku pier, Tatsumi and Tokyo.
 */
export const ROAD_SIGNS: SignDef[] = [
  green('g-daikoku', ['湾岸線', '大黒ふ頭'], 2.3),
  green('g-tatsumi', ['湾岸線', '辰巳'], 2.3),
  green('g-tokyo', ['湾岸線', '東京'], 2.3),
  green('daikoku-pa', ['大黒PA'], 3.6),
  green('tatsumi-pa', ['辰巳PA'], 3.6),
  // the two kinds of lane at a toll gate: for cars that pay by card as they pass, and for the rest
  { id: 'etc', lines: ['ETC'], color: '#5b3fa8', ink: '#ffffff', aspect: 2.6, kind: 'board' },
  { id: 'ippan', lines: ['一般'], color: '#12784a', ink: '#ffffff', aspect: 2.6, kind: 'board', font: JAPANESE },
];

/**
 * The names of places, on the places themselves: the gate called Kaminarimon,
 * whose name is written on its lantern, and the two stations.
 */
export const PLACE_SIGNS: SignDef[] = [
  { id: 'kaminarimon', lines: ['雷', '門'], color: '#c8322a', ink: '#1d1a1a', aspect: 0.62, kind: 'board', font: JAPANESE },
  { id: 'tokyo-eki', lines: ['東京駅'], color: '#f2efe6', ink: '#1d1a1a', aspect: 3.2, kind: 'board', font: JAPANESE },
  { id: 'kyoto-eki', lines: ['京都駅'], color: '#f2efe6', ink: '#1d1a1a', aspect: 3.2, kind: 'board', font: JAPANESE },
];

// ---------------------------------------------------------------------------
// Signs that are pictures: the screens at the scramble, and a few boards
// ---------------------------------------------------------------------------

type Ctx = CanvasRenderingContext2D;

/** One line of lettering, as large as fits in `maxW`, with its middle at (x, y). */
function letter(ctx: Ctx, text: string, x: number, y: number, size: number, maxW: number, color: string): void {
  const s = fit(ctx, text, JAPANESE, size, maxW);
  ctx.font = `900 ${s}px ${JAPANESE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Cat Cola's screen: a white cat's face over a blue that fizzes, and the name. */
function paintNeko(ctx: Ctx, _s: SignDef, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0b2a6b');
  g.addColorStop(0.6, '#1c9bd6');
  g.addColorStop(1, '#9af0ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    ctx.arc((((i * 73) % 97) / 97) * w, h - (((i * 131) % 89) / 89) * h * 0.62, 4 + (i % 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const cx = w / 2, cy = h * 0.33, r = w * 0.31;
  ctx.fillStyle = '#ffffff';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + s * r * 0.95, cy - r * 0.25);
    ctx.lineTo(cx + s * r * 0.82, cy - r * 1.3);
    ctx.lineTo(cx + s * r * 0.15, cy - r * 0.9);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b2a4a';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * r * 0.42, cy - r * 0.1, r * 0.11, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff5a8a';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.12, cy + r * 0.2);
  ctx.lineTo(cx + r * 0.12, cy + r * 0.2);
  ctx.lineTo(cx, cy + r * 0.36);
  ctx.fill();
  ctx.strokeStyle = '#0b2a4a';
  ctx.lineWidth = 3;
  for (const s of [-1, 1]) {
    for (const dy of [0.3, 0.46]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * r * 0.3, cy + r * dy);
      ctx.lineTo(cx + s * r * 1.02, cy + r * (dy + (dy - 0.38) * 0.9));
      ctx.stroke();
    }
  }
  letter(ctx, 'ネコ', cx, h * 0.66, h * 0.16, w - 30, '#ffffff');
  letter(ctx, 'コーラ', cx, h * 0.84, h * 0.16, w - 30, '#ffe45c');
}

/** Doughnut Galaxy's screen: a doughnut with a ring round it like a planet's, among stars. */
function paintDonut(ctx: Ctx, _s: SignDef, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2a1259');
  g.addColorStop(1, '#7a1f6b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffe9a8';
  for (let i = 0; i < 40; i++) ctx.fillRect((((i * 61) % 101) / 101) * w, (((i * 37) % 103) / 103) * h, 2 + (i % 3), 2 + (i % 3));
  const cx = w / 2, cy = h * 0.33, r = w * 0.29;
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.5, r * 0.42, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#d9a05b';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff7ab8';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.06, r * 0.86, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a1a5e';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  const hues = ['#ffffff', '#35e0ff', '#ffe45c', '#7dff9b'];
  for (let i = 0; i < 14; i++) {
    const a = i * 0.9, d = r * (0.45 + ((i * 7) % 5) * 0.07);
    ctx.fillStyle = hues[i % 4];
    ctx.save();
    ctx.translate(cx + Math.cos(a) * d, cy - r * 0.06 + Math.sin(a) * d);
    ctx.rotate(a * 1.7);
    ctx.fillRect(-5, -2, 10, 4);
    ctx.restore();
  }
  letter(ctx, 'ドーナツ', cx, h * 0.66, h * 0.15, w - 26, '#ffd23f');
  letter(ctx, '銀河', cx, h * 0.84, h * 0.17, w - 30, '#ffffff');
}

/** Dream Electric's screen: a bolt of lightning, and the name. */
function paintYume(ctx: Ctx, _s: SignDef, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#0d3b2a');
  g.addColorStop(1, '#17a36b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffe45c';
  const x = w * 0.14, y = h * 0.12, s = h * 0.76;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.28, y);
  ctx.lineTo(x - s * 0.08, y + s * 0.56);
  ctx.lineTo(x + s * 0.1, y + s * 0.56);
  ctx.lineTo(x - s * 0.02, y + s);
  ctx.lineTo(x + s * 0.36, y + s * 0.4);
  ctx.lineTo(x + s * 0.18, y + s * 0.4);
  ctx.lineTo(x + s * 0.3, y);
  ctx.fill();
  letter(ctx, 'ゆめ', w * 0.66, h * 0.3, h * 0.36, w * 0.56, '#ffffff');
  letter(ctx, '電気', w * 0.66, h * 0.72, h * 0.36, w * 0.56, '#d8ffe0');
}

/** The board at a hairpin: black arrows on yellow. */
function paintChevron(ctx: Ctx, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1b1b20';
  ctx.lineWidth = w * 0.16;
  for (const x of [0.16, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(w * x, h * 0.16);
    ctx.lineTo(w * (x + 0.3), h * 0.5);
    ctx.lineTo(w * x, h * 0.84);
    ctx.stroke();
  }
}

/** The konbini's sign on its pole: its two stripes, and the hours it keeps. */
function paintKonbini(ctx: Ctx, _s: SignDef, w: number, h: number): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#22b8c8';
  ctx.fillRect(0, 0, w, h * 0.2);
  ctx.fillStyle = '#ff5aa8';
  ctx.fillRect(0, h * 0.8, w, h * 0.2);
  letter(ctx, '24', w / 2, h * 0.52, h * 0.5, w - 24, '#12808f');
}

/**
 * The signs of the smaller scenes. The three screens advertise the tile's own
 * invented brands. The tuner's garage is "Habahiro Works", which says "wide",
 * and is nobody's name; the tofu shop is "the tofu shop on the corner"; the
 * rest say what is sold. The plate under the dog is what the real one says.
 */
export const SCENE_SIGNS: SignDef[] = [
  { id: 'ad-neko', lines: ['ネココーラ'], color: '#35e0ff', aspect: 0.54, size: [270, 500], paint: paintNeko, font: JAPANESE },
  { id: 'ad-donut', lines: ['ドーナツ銀河'], color: '#ffd23f', aspect: 0.54, size: [270, 500], paint: paintDonut, font: JAPANESE },
  { id: 'ad-yume', lines: ['ゆめ電気'], color: '#7dff9b', aspect: 1.35, size: [351, 260], paint: paintYume, font: JAPANESE },
  { id: 'hachiko', lines: ['忠犬ハチ公'], color: '#4a3d2a', ink: '#ecdcae', aspect: 2.4, kind: 'board', font: JAPANESE, real: true },
  neon('habahiro', ['幅広ワークス'], '#ff4d5e', 4.8),
  neon('tuning', ['チューニング'], '#35e0ff', 4.2),
  { id: 'parts', lines: ['中古パーツ'], color: '#ffd23f', ink: '#1b1b20', aspect: 3.6, kind: 'box', font: JAPANESE },
  { id: 'used-cars', lines: ['中古車センター'], color: '#d8322a', ink: '#ffffff', aspect: 4.4, kind: 'board', font: JAPANESE },
  { id: 'konbini-box', lines: ['コンビニ'], color: '#ffffff', ink: '#12808f', aspect: 4.2, kind: 'box', font: JAPANESE },
  { id: 'konbini-pole', lines: ['24'], color: '#ffffff', aspect: 1, size: [176, 176], paint: paintKonbini },
  neon('gasoline', ['ガソリン'], '#ff7a1a', 3.6),
  { id: 'tofu', lines: ['角の豆腐店'], color: '#f2e6c8', ink: '#2a1a14', aspect: 4.6, kind: 'board', font: JAPANESE },
  blade('tofu-v', 'とうふ', '#ffe2ae'),
  { id: 'chevron', lines: ['>>'], color: '#ffd23f', aspect: 1, size: [96, 96], paint: paintChevron },
  { id: 'p', lines: ['P'], color: '#ffffff', aspect: 1, kind: 'p' },
];

export const TOKYO_SIGNS: SignPool = {
  fascia: ['ramen', 'karaoke', 'pachinko', 'konbini', 'sushi', 'izakaya', 'yakitori', 'kusuri'],
  blade: ['kaiju-v', 'ramen-v', 'yume-v', 'sushi-v', 'donut-v', 'neko-v', 'game-v'],
  billboard: ['neko-cola', 'yume-denki'],
};

export const KYOTO_SIGNS: SignPool = {
  fascia: ['ocha', 'wagashi', 'soba', 'udon', 'ryokan', 'yu'],
  blade: ['sushi-v'],
  billboard: ['neko-cola'],
};

/** Neon colours for the strips of light on a dark building. */
export const NEON = ['#ff3d9a', '#35e0ff', '#ffb02e', '#7dff9b', '#c77dff', '#ff5a4f'];
