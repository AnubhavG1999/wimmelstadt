// Every sign the tile hangs. Hong Kong's signs are in traditional Chinese and
// in English, as the real ones are. The name of a real place or business is
// plain lettering on a plain board, and NOTES.md says how each was checked.

import { CHINESE, type SignDef } from '../../engine/signs';
import { MODELS } from './landmarks';
import { LOTS } from './plan';

/** A painted board: lettering of one colour on a ground of another. */
const board = (id: string, lines: string[], color: string, ink: string, aspect: number, more: Partial<SignDef> = {}): SignDef =>
  ({ id, lines, color, ink, aspect, kind: 'board', font: CHINESE, ...more });

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

/** The signs of the things that have been modelled. */
const NAMED: SignDef[] = [
  board('star-ferry', ['天星小輪', 'STAR FERRY'], '#f2efe6', '#1f5a3e', 3.2, { real: true }),
  board('peak-tram', ['山頂纜車', 'PEAK TRAM'], '#1d5a3c', '#f2e6c4', 2.9, { real: true }),
  board('man-mo', ['文武廟'], '#5e1410', '#e8c15a', 3.3, { real: true, size: [240, 72] }),
  board('peninsula', ['THE PENINSULA', '半島酒店'], '#1f4a3a', '#f2e6c4', 4.4, { real: true, size: [560, 128] }),
  board('wong-tai-sin', ['黃大仙祠'], '#8f1f18', '#f2cf6a', 4, { real: true, size: [288, 72] }),
  board('temple-street', ['廟街  TEMPLE STREET'], '#8f1f18', '#f2cf6a', 6.6, { real: true, size: [528, 80] }),
  board('dai-pai-dong', ['大牌檔'], '#f2efe6', '#b3261e', 3.6, { size: [260, 72] }),
  board('works', ['工程進行中', 'WORKS IN PROGRESS'], '#f2c94c', '#23252b', 3.4, { size: [326, 96] }),
  board('tunnel', ['海底隧道', 'CROSS-HARBOUR TUNNEL'], '#f4f1e8', '#1c1c22', 6, { real: true, size: [576, 96] }),
  { id: 'clock', lines: [], color: '#f6f2e6', aspect: 1, size: [96, 96], paint: clockFace },
];

/** A lot that has no model yet carries its name on a plain board, so that the blockout can be read. */
const BLOCKOUT: SignDef[] = LOTS.filter((l) => l.name && !MODELS[l.id]).map((l): SignDef => {
  const aspect = Math.min(7, Math.max(2.4, l.name.length * 0.62));
  return { id: l.id, lines: [l.name], color: '#f4f1e8', ink: '#1c1c22', aspect, size: [Math.round(72 * aspect), 72], kind: 'board' };
});

export const SIGNS: SignDef[] = [
  ...NAMED,
  ...BLOCKOUT,
  { id: 'happy-valley', lines: ['HAPPY VALLEY RACECOURSE'], color: '#f4f1e8', ink: '#1c1c22', aspect: 7, size: [504, 72], kind: 'board' },
];
