// The herald's board at the tourney ground, as it is when nothing is playing:
// a painted bill on a wooden board. The Starks' words stand on it in great
// letters, beside a grey direwolf's head on an ice-white roundel that is the rim
// of a cart wheel sitting in the snow, and it is the wheelwright of Winter Town
// who paid for it.

import { fit, type SignDef } from '../../engine/signs';

const SERIF = "Georgia, 'Times New Roman', serif";
const WOOD = '#6b4426', WOOD_DARK = '#3b2414', IRON = '#2a2a2c', IRON_HI = '#9a9a9e';
const PARCHMENT = '#f1e6c8', PARCHMENT_EDGE = '#d8c294', GOLD = '#c9982e';
const INK = '#1c2733', RED = '#9b2020';
const ICE = '#f6f9fb', SNOW = '#ffffff', SNOW_BLUE = '#a7bccc';
const GREY = '#8a929a', GREY_DARK = '#545c64';

/** The lettering is squeezed to this share of its width, as a tall painted hand. */
const SQUEEZE = 0.8;

/**
 * A grey direwolf's head in profile, snarling, facing right, with its neck
 * ending in the jagged tufts heraldry calls erased. It is drawn about the
 * origin and stands about 200 high.
 */
function wolfHead(ctx: CanvasRenderingContext2D): void {
  const outline = (): void => {
    ctx.beginPath();
    // the tufts down the back of the neck, and the back of the skull
    ctx.moveTo(-72, 80);
    ctx.lineTo(-92, 62);
    ctx.lineTo(-80, 52);
    ctx.lineTo(-94, 28);
    ctx.lineTo(-80, 20);
    ctx.quadraticCurveTo(-82, -12, -62, -34);
    // two ears laid back, the far one and the near one
    ctx.lineTo(-60, -100);
    ctx.lineTo(-34, -58);
    ctx.lineTo(-20, -104);
    ctx.lineTo(0, -52);
    // the brow, the long muzzle and the nose
    ctx.quadraticCurveTo(14, -46, 24, -38);
    ctx.lineTo(84, -24);
    ctx.quadraticCurveTo(100, -22, 96, -6);
    // the open jaws: back along the upper one to the corner of the mouth, out along the lower one
    ctx.lineTo(22, 8);
    ctx.lineTo(80, 26);
    ctx.quadraticCurveTo(84, 36, 72, 40);
    ctx.lineTo(36, 46);
    ctx.quadraticCurveTo(14, 52, 8, 62);
    // the ruff of the throat and the jagged foot of the neck
    ctx.lineTo(16, 76);
    ctx.lineTo(0, 74);
    ctx.lineTo(6, 92);
    ctx.lineTo(-12, 84);
    ctx.lineTo(-20, 102);
    ctx.lineTo(-32, 88);
    ctx.lineTo(-44, 104);
    ctx.lineTo(-52, 88);
    ctx.lineTo(-66, 98);
    ctx.lineTo(-68, 84);
    ctx.closePath();
  };

  // The inside of the mouth is red, and lies under the head so that it shows between the jaws.
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(22, 8);
  ctx.lineTo(90, -4);
  ctx.lineTo(84, 10);
  ctx.lineTo(78, 26);
  ctx.closePath();
  ctx.fill();

  // The head is a grey shape with a heavy dark edge, the edge drawn first so that half of it stays outside.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  outline();
  ctx.stroke();
  ctx.fillStyle = GREY;
  outline();
  ctx.fill();

  // The insides of the ears are a darker grey.
  ctx.fillStyle = GREY_DARK;
  for (const ear of [[[-57, -86], [-42, -60], [-56, -48]], [[-17, -88], [-6, -56], [-26, -60]]]) {
    ctx.beginPath();
    for (const [x, y] of ear) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  }

  // Strokes of darker fur: the line of the cheek and a few down the neck.
  ctx.strokeStyle = GREY_DARK;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(18, 12); ctx.quadraticCurveTo(-6, 24, -12, 50); ctx.stroke();
  for (const [x0, y0, x1, y1] of [[-56, 44, -42, 66], [-36, 34, -24, 58], [-62, 6, -48, 26]]) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  // The teeth: small ones along both jaws and a long fang at the front of each.
  const upper = (x: number): number => 8 + (x - 22) * (-14 / 74);
  const lower = (x: number): number => 8 + (x - 22) * (18 / 58);
  const tooth = (x: number, y: number, len: number, half: number): void => {
    ctx.beginPath();
    ctx.moveTo(x - half, y);
    ctx.lineTo(x, y + len);
    ctx.lineTo(x + half, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  ctx.fillStyle = ICE;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  for (const x of [34, 46, 58, 70]) tooth(x, upper(x), 6, 4);
  tooth(84, upper(84), 14, 4.5);
  for (const x of [38, 50, 62]) tooth(x, lower(x), -6, 4);
  tooth(74, lower(74), -12, 4.5);

  // The nose, the wrinkles of the snarl and a fierce eye under a low brow.
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(94, -14, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 3;
  for (const [x0, y0, x1, y1] of [[52, -21, 60, -14], [63, -23, 71, -16]]) {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.fillStyle = ICE;
  ctx.beginPath();
  ctx.moveTo(24, -24);
  ctx.quadraticCurveTo(34, -34, 46, -28);
  ctx.quadraticCurveTo(36, -19, 24, -24);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(38, -27, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(20, -37); ctx.lineTo(50, -30); ctx.stroke();
}

/** A cart wheel of twelve spokes: wooden rim and spokes, an iron tyre with its nails, and a hub. */
function wheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.lineCap = 'butt';
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = r * 0.07;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.16, y + Math.sin(a) * r * 0.16);
    ctx.lineTo(x + Math.cos(a) * r * 0.84, y + Math.sin(a) * r * 0.84);
    ctx.stroke();
  }
  // the rim of wood, made of six pieces with a joint between each
  ctx.lineWidth = r * 0.12;
  ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = r * 0.025;
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.25) / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
    ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  // the iron tyre round it, and the heads of the nails through it
  ctx.strokeStyle = IRON;
  ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.arc(x, y, r * 0.96, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = IRON_HI;
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.96, y + Math.sin(a) * r * 0.96, r * 0.018, 0, Math.PI * 2); ctx.fill();
  }
  // the hub
  ctx.fillStyle = WOOD;
  ctx.strokeStyle = IRON;
  ctx.lineWidth = r * 0.04;
  ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = IRON;
  ctx.beginPath(); ctx.arc(x, y, r * 0.06, 0, Math.PI * 2); ctx.fill();
}

/** A snowflake of six arms, each with a pair of little branches. */
function snowflake(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.17;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const c = Math.cos(a), s = Math.sin(a);
    ctx.moveTo(x, y);
    ctx.lineTo(x + c * r, y + s * r);
    // the branches leave the arm at three fifths of its length
    const bx = x + c * r * 0.6, by = y + s * r * 0.6;
    for (const t of [-0.7, 0.7]) {
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a + t) * r * 0.35, by + Math.sin(a + t) * r * 0.35);
    }
  }
  ctx.stroke();
}

/** The round head of an iron nail that holds the board to its frame. */
function nail(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = IRON;
  ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = IRON_HI;
  ctx.beginPath(); ctx.arc(x - 1.3, y - 1.3, 1.6, 0, Math.PI * 2); ctx.fill();
}

/**
 * One of the great words, centred on x, its first letter a red initial as in an
 * illuminated hand, the whole word edged in gold.
 */
function greatWord(ctx: CanvasRenderingContext2D, word: string, x: number, y: number, size: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(SQUEEZE, 1);
  ctx.font = `900 ${size}px ${SERIF}`;
  ctx.textAlign = 'left';
  const x0 = -ctx.measureText(word).width / 2;
  const initial = word.slice(0, 1), rest = word.slice(1);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = size * 0.1;
  ctx.strokeText(word, x0, 0);
  ctx.fillStyle = RED;
  ctx.fillText(initial, x0, 0);
  ctx.fillStyle = INK;
  ctx.fillText(rest, x0 + ctx.measureText(initial).width, 0);
  ctx.restore();
}

/** The herald's board at the tourney ground, as it is when nothing is playing. */
export function paintHerald(ctx: CanvasRenderingContext2D, _s: SignDef, w: number, h: number): void {
  // Laid out at 640 by 360 and scaled to the size the board is given; W is the width in those units.
  const k = h / 360;
  const W = w / k, H = 360, F = 18;
  ctx.save();
  ctx.scale(k, k);

  // The timber frame, with two lines of moulding along it.
  ctx.fillStyle = WOOD;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = WOOD_DARK;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.2;
  for (const d of [6, 12]) ctx.strokeRect(d, d, W - 2 * d, H - 2 * d);
  ctx.globalAlpha = 1;

  // The painted field: parchment, darker towards its edges as old paint goes, with a shadow where it meets the frame.
  const field = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.62);
  field.addColorStop(0, PARCHMENT);
  field.addColorStop(1, PARCHMENT_EDGE);
  ctx.fillStyle = field;
  ctx.fillRect(F, F, W - 2 * F, H - 2 * F);
  ctx.strokeStyle = WOOD_DARK;
  ctx.lineWidth = 3;
  ctx.strokeRect(F, F, W - 2 * F, H - 2 * F);

  // Two snowflakes falling in the top corners of the badge.
  ctx.strokeStyle = SNOW_BLUE;
  for (const [x, y, r] of [[50, 52, 10], [250, 50, 8]]) snowflake(ctx, x, y, r);

  // The badge: a cart wheel whose rim rings an ice-white field, the Starks' grey direwolf on it, and a ring of gold round all.
  const bx = 146, by = 170, br = 104;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(bx, by, br + 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = ICE;
  ctx.beginPath(); ctx.arc(bx, by, br * 0.9, 0, Math.PI * 2); ctx.fill();
  wheel(ctx, bx, by, br);
  ctx.save();
  ctx.translate(bx - 4, by - 2);
  ctx.scale(0.85, 0.85);
  wolfHead(ctx);
  ctx.restore();

  // The wheel stands in a drift of snow that fills the foot of the board on the left.
  ctx.fillStyle = SNOW;
  ctx.strokeStyle = SNOW_BLUE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(F, H - F);
  ctx.lineTo(F, 288);
  ctx.bezierCurveTo(70, 262, 200, 254, 262, 280);
  ctx.quadraticCurveTo(292, 292, 296, H - F);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(F, 288);
  ctx.bezierCurveTo(70, 262, 200, 254, 262, 280);
  ctx.quadraticCurveTo(292, 292, 296, H - F);
  ctx.stroke();

  // The painted border of the bill: a gold rule and a fine dark one inside it.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(33, 33, W - 66, H - 66);

  // The great words, both in one size, in a column to the right of the badge.
  const colL = 272, colR = W - 40, cx = (colL + colR) / 2, colW = colR - colL;
  const size = Math.min(fit(ctx, 'WINTER', SERIF, 110, colW / SQUEEZE), fit(ctx, 'COMING', SERIF, 110, colW / SQUEEZE));
  ctx.textBaseline = 'alphabetic';
  greatWord(ctx, 'WINTER', cx, 116, size);
  greatWord(ctx, 'COMING', cx, 232, size);

  // The little word between them, in red, with a snowflake on either side.
  ctx.textAlign = 'center';
  ctx.font = `italic 700 32px ${SERIF}`;
  ctx.fillStyle = RED;
  ctx.fillText('is', cx, 150);
  ctx.strokeStyle = SNOW_BLUE;
  for (const sx of [-1, 1]) snowflake(ctx, cx + sx * 64, 140, 10);

  // A gold rule with a snowflake at its middle, and the wheelwright's line under it.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + sx * 16, 250); ctx.lineTo(cx + sx * 130, 250); ctx.stroke();
  }
  snowflake(ctx, cx, 250, 9);
  const tag = 'fit your winter wheels';
  const tz = fit(ctx, tag, SERIF, 34, colW, 'italic 700');
  ctx.font = `italic 700 ${tz}px ${SERIF}`;
  ctx.fillStyle = RED;
  ctx.fillText(tag, cx, 287);

  // At the foot, who paid for the bill, between two little wheels.
  const foot = 'The wheelwright, Winter Town';
  const fz = fit(ctx, foot, SERIF, 17, colW - 50, '700');
  ctx.font = `700 ${fz}px ${SERIF}`;
  ctx.fillStyle = WOOD_DARK;
  ctx.fillText(foot, cx, 320);
  const half = ctx.measureText(foot).width / 2;
  for (const sx of [-1, 1]) wheel(ctx, cx + sx * (half + 16), 314, 10);

  // Snow lying along the top of the frame.
  ctx.fillStyle = SNOW;
  ctx.fillRect(0, 0, W, 4);
  for (const [x, r] of [[30, 9], [92, 6], [150, 11], [236, 7], [318, 10], [400, 6], [470, 12], [556, 8], [616, 10]]) {
    ctx.beginPath(); ctx.arc((x * W) / 640, 3, r, 0, Math.PI); ctx.fill();
  }

  // The heads of the nails that hold the board, at its corners and the middles of its sides.
  for (const [x, y] of [[9, 12], [W / 2, 12], [W - 9, 12], [9, H / 2], [W - 9, H / 2], [9, H - 9], [W / 2, H - 9], [W - 9, H - 9]]) nail(ctx, x, y);

  ctx.restore();
}
