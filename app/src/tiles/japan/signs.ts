// The tile's signs. They are in Japanese, as the real ones are. Every business
// is invented: the names on the tall signs are the look prototype's own
// (Kaiju Karaoke, Tornado Ramen, Dream Electric, Neon Sushi, Doughnut Galaxy,
// Cat Cola), and the rest say only what a shop sells.

import { JAPANESE, type SignDef } from '../../engine/signs';
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
