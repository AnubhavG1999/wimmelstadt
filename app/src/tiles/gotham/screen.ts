// The screen's own picture, which it shows whenever nothing is playing: the
// Joker has borrowed the city's big screen. A giant playing card, the joker of
// the pack, on purple, and HA HA HA in his green.
//
// It is the tile's own drawing: a plain jester's cap and a grin, not the
// lettering or the art of any comic. The engine calls `paint` whenever no
// track is showing, so it draws the whole rectangle each time and keeps
// nothing.

import { EN, type SignDef } from '../../engine/signs';

function paint(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  // the ground: purple, in a harlequin's diamonds
  ctx.fillStyle = '#3a1457';
  ctx.fillRect(0, 0, w, h);
  const d = h / 4;
  ctx.fillStyle = '#4c1c72';
  for (let j = -1; j < 5; j++) {
    for (let i = -1; i < Math.ceil(w / d) + 1; i++) {
      if ((i + j) % 2) continue;
      const cx = i * d + d / 2, cy = j * d + d / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - d / 2); ctx.lineTo(cx + d / 2, cy); ctx.lineTo(cx, cy + d / 2); ctx.lineTo(cx - d / 2, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  // the card, tilted, on the left
  const cw = h * 0.56, ch = h * 0.82;
  ctx.save();
  ctx.translate(w * 0.22, h * 0.5);
  ctx.rotate(-0.16);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-cw / 2 + 8, -ch / 2 + 10, cw, ch);
  ctx.fillStyle = '#f6f1e2';
  ctx.beginPath();
  ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cw * 0.08);
  ctx.fill();
  ctx.lineWidth = Math.max(2, h * 0.012);
  ctx.strokeStyle = '#3a1457';
  ctx.stroke();
  // its corners
  ctx.fillStyle = '#7b2aa8';
  ctx.font = `900 ${Math.round(ch * 0.13)}px ${EN}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('J', -cw / 2 + cw * 0.13, -ch / 2 + ch * 0.1);
  ctx.save();
  ctx.rotate(Math.PI);
  ctx.fillText('J', -cw / 2 + cw * 0.13, -ch / 2 + ch * 0.1);
  ctx.restore();
  // a jester's cap of three points with bells, in purple and green
  const cap = (x0: number, x1: number, tipX: number, tipY: number, col: string): void => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x0, -ch * 0.02); ctx.quadraticCurveTo((x0 + tipX) / 2 - cw * 0.05, tipY * 0.6, tipX, tipY); ctx.quadraticCurveTo((x1 + tipX) / 2 + cw * 0.05, tipY * 0.5, x1, -ch * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8b93a';
    ctx.beginPath();
    ctx.arc(tipX, tipY, cw * 0.045, 0, Math.PI * 2);
    ctx.fill();
  };
  cap(-cw * 0.3, -cw * 0.04, -cw * 0.36, -ch * 0.3, '#7b2aa8');
  cap(-cw * 0.12, cw * 0.12, 0, -ch * 0.38, '#39a845');
  cap(cw * 0.04, cw * 0.3, cw * 0.36, -ch * 0.3, '#7b2aa8');
  // the face under it: white, with a wide red grin
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, ch * 0.1, cw * 0.27, ch * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a1457';
  ctx.lineWidth = Math.max(1.5, h * 0.008);
  ctx.stroke();
  ctx.fillStyle = '#1b1b1f';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * cw * 0.1, ch * 0.05, cw * 0.035, ch * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#d3202e';
  ctx.lineWidth = Math.max(3, h * 0.022);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, ch * 0.07, cw * 0.19, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();
  ctx.restore();

  // HA HA HA, climbing, in green with a dark edge
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const words: [string, number, number, number, number][] = [['HA', 0.44, 0.7, 0.3, -0.1], ['HA', 0.6, 0.47, 0.38, -0.04], ['HA!', 0.74, 0.24, 0.3, 0.06]];
  for (const [t, x, y, size, turn] of words) {
    ctx.save();
    ctx.translate(w * x, h * y);
    ctx.rotate(turn);
    ctx.font = `900 ${Math.round(h * size)}px ${EN}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, h * 0.035);
    ctx.strokeStyle = '#1c0b2b';
    ctx.strokeText(t, 0, 0);
    ctx.fillStyle = '#5bff4a';
    ctx.fillText(t, 0, 0);
    ctx.restore();
  }
  // the small print along the foot
  ctx.fillStyle = '#e9dcff';
  ctx.font = `700 ${Math.round(h * 0.062)}px ${EN}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('THIS SCREEN HAS BEEN BORROWED', w * 0.975, h * 0.95);
}

/** The screen: it shows what is playing, and this picture when nothing is. */
export const SCREEN: SignDef = { id: 'screen', lines: ['HA HA HA'], color: '#3a1457', aspect: 16 / 9, kind: 'screen', paint };
