// London away from the river: the Tower, St Paul's, Buckingham Palace and its
// guard, Piccadilly Circus, the Gherkin and Ace Cafe, and the small red things
// that stand on London's pavements. Each is written where it stands.

import * as THREE from 'three';
import { GeoBuilder, interior, type V3, type WinSpec } from '../../engine/geo';
import { LAWN, PLAZA, area, flat, rect, walls, type P2 } from '../../engine/ground';
import { EN, fit, roundRect, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { D, GOLD, figure, lantern, lathe, rad, tri, unionFlag, wheel } from './parts';
import { PICCADILLY } from './plan';

const RED = 0xc8202c, BLACK = 0x16171c;

// ---------------------------------------------------------------------------
// What London's signs say
// ---------------------------------------------------------------------------

type Paint = NonNullable<SignDef['paint']>;
type Ctx = CanvasRenderingContext2D;

const lettering = (ctx: Ctx, text: string, x: number, y: number, size: number, maxW: number, color: string): void => {
  fit(ctx, text, EN, size, maxW);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};
const fade = (ctx: Ctx, w: number, h: number, top: string, bottom: string): void => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};
const star = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
  ctx.fill();
};

// The five screens of Piccadilly Circus. What they advertise is invented.

const teaTime: Paint = (ctx, _s, w, h) => {
  fade(ctx, w, h, '#0c4a4a', '#16897a');
  lettering(ctx, 'TEA', w / 2, 62, 70, w - 24, '#fdf3d6');
  lettering(ctx, 'TIME', w / 2, 128, 70, w - 24, '#fdf3d6');
  // a cup on its saucer, and the steam off it
  const cx = w / 2 - 6, cy = 292;
  ctx.fillStyle = '#fdf3d6';
  ctx.beginPath(); ctx.ellipse(cx, cy + 52, 62, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 46, cy - 20); ctx.lineTo(cx + 46, cy - 20); ctx.quadraticCurveTo(cx + 44, cy + 44, cx, cy + 46); ctx.quadraticCurveTo(cx - 44, cy + 44, cx - 46, cy - 20); ctx.fill();
  ctx.strokeStyle = '#fdf3d6';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(cx + 50, cy + 6, 16, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const dx of [-22, 0, 22]) {
    ctx.beginPath(); ctx.moveTo(cx + dx, cy - 34); ctx.bezierCurveTo(cx + dx - 14, cy - 54, cx + dx + 14, cy - 70, cx + dx, cy - 92); ctx.stroke();
  }
  lettering(ctx, 'AT FOUR', w / 2, h - 42, 30, w - 30, '#ffd77a');
};

const westEnd: Paint = (ctx, _s, w, h) => {
  fade(ctx, w, h, '#2c0d52', '#b31f78');
  // two spotlights
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#fff3b0';
  for (const [x0, x1] of [[20, 150], [w - 20, 30]]) {
    ctx.beginPath(); ctx.moveTo(x0, h); ctx.lineTo(x1 - 46, 0); ctx.lineTo(x1 + 46, 0); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffe36b';
  for (const [x, y, r] of [[34, 36, 9], [140, 60, 7], [88, 24, 6], [150, 292, 8], [26, 300, 7], [92, 330, 10]]) star(ctx, x, y, r);
  lettering(ctx, 'WEST', w / 2, 118, 62, w - 22, '#ffe36b');
  lettering(ctx, 'END', w / 2, 180, 62, w - 22, '#ffe36b');
  lettering(ctx, 'LIVE', w / 2, 244, 62, w - 22, '#ffffff');
  lettering(ctx, 'TONIGHT', w / 2, h - 72, 30, w - 30, '#ffe36b');
  lettering(ctx, '7.30', w / 2, h - 34, 34, w - 30, '#ffffff');
};

const brolly: Paint = (ctx, _s, w, h) => {
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(0, 0, w, h);
  // rain
  ctx.strokeStyle = '#1c2f5e';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < 44; i++) {
    const x = (i * 53) % w, y = (i * 97) % h;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // an umbrella: the canopy with its scalloped edge, and the crook
  const cx = w / 2, cy = 268, r = 70;
  ctx.fillStyle = '#16171c';
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2c14e';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(cx - r + r / 4 + (i * r) / 2, cy + 1, r / 4, Math.PI, 0); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#16171c';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(cx, cy - 66); ctx.lineTo(cx, cy + 76); ctx.arc(cx - 12, cy + 76, 12, 0, Math.PI); ctx.stroke();
  lettering(ctx, 'BROLLY', w / 2, 66, 54, w - 20, '#16171c');
  lettering(ctx, 'DAYS', w / 2, 124, 60, w - 24, '#1c2f5e');
  lettering(ctx, 'RAIN OR SHINE', w / 2, h - 36, 22, w - 20, '#16171c');
};

const fizz: Paint = (ctx, _s, w, h) => {
  fade(ctx, w, h, '#d6252f', '#96101c');
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 26; i++) {
    const x = (i * 71 + 17) % w, y = (i * 113 + 40) % h, r = 4 + (i % 5) * 3;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  lettering(ctx, 'FIZZ', w / 2, 84, 78, w - 20, '#ffffff');
  lettering(ctx, 'POP!', w / 2, 158, 60, w - 30, '#ffe36b');
  // a bottle with a label
  const cx = w / 2;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cx - 30, 262, 60, 150, 16);
  ctx.fill();
  roundRect(ctx, cx - 12, 214, 24, 62, 8);
  ctx.fill();
  ctx.fillStyle = '#d6252f';
  ctx.fillRect(cx - 30, 320, 60, 44);
  lettering(ctx, 'FIZZ', cx, 343, 24, 52, '#ffffff');
};

const toyCars: Paint = (ctx, _s, w, h) => {
  fade(ctx, w, h, '#1f55b5', '#0d2a6b');
  lettering(ctx, 'TOY', w / 2, 66, 70, w - 24, '#ffd23f');
  lettering(ctx, 'CARS', w / 2, 132, 70, w - 24, '#ffd23f');
  // a little car, at speed
  const y = 250;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.7;
  for (const [x0, dy, l] of [[8, -22, 26], [4, -4, 20], [10, 14, 24]]) {
    ctx.beginPath(); ctx.moveTo(x0, y + dy); ctx.lineTo(x0 + l, y + dy); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath(); ctx.moveTo(40, y + 20); ctx.lineTo(40, y - 2); ctx.lineTo(66, y - 8); ctx.lineTo(84, y - 34); ctx.lineTo(128, y - 34); ctx.lineTo(146, y - 8); ctx.lineTo(166, y - 2); ctx.lineTo(166, y + 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#bfe6ff';
  ctx.beginPath(); ctx.moveTo(74, y - 10); ctx.lineTo(88, y - 28); ctx.lineTo(124, y - 28); ctx.lineTo(136, y - 10); ctx.closePath(); ctx.fill();
  for (const x of [70, 138]) {
    ctx.fillStyle = '#16171c';
    ctx.beginPath(); ctx.arc(x, y + 20, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9e9e9';
    ctx.beginPath(); ctx.arc(x, y + 20, 6, 0, Math.PI * 2); ctx.fill();
  }
  lettering(ctx, '1:64', w / 2, 346, 64, w - 24, '#ffffff');
  lettering(ctx, 'COLLECT THEM', w / 2, h - 36, 22, w - 20, '#ffd23f');
};

/** Black and white squares, two rows deep: the band along the front of Ace Cafe. */
const chequer: Paint = (ctx, _s, w, h) => {
  const sq = h / 2;
  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#16171c';
  for (let i = 0; i * sq < w; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) ctx.fillRect(i * sq, j * sq, sq, sq);
};

const AD: [number, number] = [176, 448];
const SCREENS: [string, Paint, string][] = [
  ['ad-tea', teaTime, '#7fe0d0'], ['ad-show', westEnd, '#ff7ad0'], ['ad-brolly', brolly, '#ffd77a'], ['ad-fizz', fizz, '#ff7a7a'], ['ad-toys', toyCars, '#7fb0ff'],
];

export const LONDON_SIGNS: SignDef[] = [
  ...SCREENS.map(([id, paint]): SignDef => ({ id, lines: [], color: '#ffffff', aspect: AD[0] / AD[1], size: AD, paint })),
  { id: 'chequer', lines: [], color: '#ffffff', aspect: 49, size: [1960, 40], paint: chequer },
  // Ace Cafe London is a real cafe, open on the North Circular Road: its name, in plain lettering on a plain board
  { id: 'ace-cafe', lines: ['ACE CAFE LONDON'], color: '#f4f1e8', ink: '#b3202a', aspect: 9.4, kind: 'board', real: true },
];

/**
 * Where these things stand, as boxes on the ground, for the check that nothing
 * stands in a street. (The curved front of Piccadilly Circus is not among
 * them: it is laid out from the middle of the circus, to stand behind its pavement.)
 */
export const LONDON_GROUND: [string, number, number, number, number][] = [
  ['The Tower of London', -73.6, -84.4, -61.1, -62.3],
  ['The Tower of London', -78.9, -79.9, -61.1, -62.3],
  ["St Paul's", -76.0, -61.5, -64.0, -40.8],
  ["St Paul's, its transepts", -78.7, -53.7, -61.3, -48.7],
  ["St Paul's, its steps", -73.7, -41.2, -66.3, -38.0],
  ['Buckingham Palace', -103.8, -79, -99.0, -45],
  ["Buckingham Palace's railings", -94.95, -79, -94.0, -45],
  ['Piccadilly Circus, the back of it', -103.8, -40.4, -101.0, -19.6],
  ['The Gherkin', -74.9, -112.4, -62.1, -99.6],
  ['Ace Cafe', -100, 9.2, -70, 13.6],
];

// ---------------------------------------------------------------------------
// The Tower of London
// ---------------------------------------------------------------------------

/** A stretch of castle wall between two points, with battlements along its top. */
function rampart(b: GeoBuilder, a: P2, c: P2, h: number, color: number, shade: number): void {
  const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz), yaw = Math.atan2(dz, dx);
  b.obox((a[0] + c[0]) / 2, h / 2, (a[1] + c[1]) / 2, len / 2, h / 2, 0.35, yaw, color, { top: shade });
  const n = Math.max(1, Math.round(len / 2.2));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    b.obox(a[0] + dx * t, h + 0.3, a[1] + dz * t, (len / n) * 0.28, 0.3, 0.35, yaw, color);
  }
}

/**
 * The Tower of London: the White Tower with its four capped turrets, inside a
 * curtain wall with a drum at every corner, and the gate in the wall that
 * faces the river. Ravens on the green, and Yeoman Warders in red.
 */
export function towerOfLondon(k: Build): void {
  const b = k.b;
  const STONE = 0xc9c0a8, PALE = 0xddd5c0, SHADE = 0xb3a991, LEAD = 0x7f8a92, WOOD = 0x3a2f26;
  const loops: WinSpec = { cell: 1.0, storey: 2.9, lit: 0.25, kind: 4 };

  // --- the curtain wall. Its north-west corner is cut off, where Tower Hill's circus comes close. ---
  const wall: P2[] = [[-72.2, -82.9], [-62.6, -82.9], [-62.6, -63.8], [-77.4, -63.8], [-77.4, -78.4]];
  wall.forEach((p, i) => rampart(b, p, wall[(i + 1) % wall.length], 4.0, STONE, SHADE));
  const drum = (x: number, z: number, r: number, h: number): void => {
    b.cyl(x, z, 0, h, r, r, 8, STONE, { win: loops, seed: x * 0.13 + z * 0.07, cap: false });
    b.cyl(x, z, h - 0.9, h + 0.5, r + 0.22, r + 0.22, 8, PALE, { cap: SHADE });
  };
  for (const [x, z] of wall) drum(x, z, 1.3, 5.6);
  for (const [x, z] of [[-70, -63.8], [-77.4, -71.1], [-67.4, -82.9]]) drum(x, z, 1.15, 5.2);
  // the gate: two drums, and the way in between them
  const gx = -62.6, gz = -73.0;
  for (const z of [gz - 1.55, gz + 1.55]) drum(gx, z, 1.2, 6.6);
  b.box(gx - 0.5, 0, gz - 0.75, gx + 0.5, 5.2, gz + 0.75, STONE, { top: SHADE });
  b.box(gx + 0.5, 0, gz - 0.55, gx + 0.56, 2.9, gz + 0.55, WOOD, { faces: 'E' });

  // --- the green inside, and the path in from the gate ---
  area(k, [[-72.0, -82.4], [-63.1, -82.4], [-63.1, -64.3], [-76.9, -64.3], [-76.9, -78.2]], LAWN);
  area(k, rect(-65.2, gz - 0.9, -63.1, gz + 0.9), PLAZA, 0.03);

  // --- the White Tower ---
  const cx = -69.6, cz = -73.0, hx = 4.3, hz = 4.8, top = 11.4;
  b.box(cx - hx, 0, cz - hz, cx + hx, top, cz + hz, PALE, { win: { cell: 1.45, storey: 3.8, lit: 0.35, kind: 4 }, seed: 0.42, top: LEAD });
  // its battlements
  for (const s of [-1, 1]) {
    for (let x = cx - hx + 1.9; x < cx + hx - 1.5; x += 1.5) b.box(x, top, cz + s * hz - (s > 0 ? 0.4 : 0), x + 0.8, top + 0.7, cz + s * hz + (s < 0 ? 0.4 : 0), PALE);
    for (let z = cz - hz + 1.9; z < cz + hz - 1.5; z += 1.5) b.box(cx + s * hx - (s > 0 ? 0.4 : 0), top, z, cx + s * hx + (s < 0 ? 0.4 : 0), top + 0.7, z + 0.8, PALE);
  }
  // a turret at each corner, three of them square and one round, each with a lead cap and a gilded vane
  const turret = top + 3.3;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const x = cx + sx * (hx - 0.65), z = cz + sz * (hz - 0.65);
    const round = sx > 0 && sz < 0;
    if (round) b.cyl(x, z, 0, turret, 1.1, 1.1, 8, PALE, { win: loops, seed: 0.3, cap: false });
    else b.box(x - 0.95, 0, z - 0.95, x + 0.95, turret, z + 0.95, PALE, { win: { cell: 1.9, storey: 3.8, lit: 0.3, kind: 4 }, seed: 0.6 + sx * 0.1 + sz * 0.03, faces: 'NESW' });
    const r = round ? 1.1 : 0.95 * D;
    lathe(b, x, z, [[r * 1.1, turret], [r * 0.95, turret + 0.7], [r * 0.52, turret + 1.4], [r * 0.17, turret + 2.0], [0.04, turret + 2.8]], round ? 8 : 4, LEAD);
    b.cyl(x, z, turret + 2.8, turret + 3.6, 0.05, 0.05, 4, GOLD, { cap: false });
    b.box(x, turret + 3.2, z - 0.03, x + 0.55, turret + 3.5, z + 0.03, GOLD, { faces: 'NS' });
  }

  // --- who lives here: the ravens, and the Yeoman Warders ---
  for (const [x, z] of [[-75.6, -67.2], [-74.7, -66.3], [-66.3, -65.6], [-64.4, -79.6], [-75.3, -75.9], [-68.2, -80.6]]) b.box(x - 0.17, 0.02, z - 0.3, x + 0.17, 0.42, z + 0.3, 0x15161a);
  for (const [x, z] of [[-63.8, gz - 1.5], [-63.8, gz + 1.5], [-68.2, -66.4]]) figure(b, x, z, 0.02, { coat: 0xb3202a, legs: 0xb3202a, hat: BLACK, hatH: 0.28, hatR: 0.38 });
  for (let i = 0; i < 5; i++) k.person(-76 + k.rand() * 12, -67.2 + k.rand() * 2.2);
  for (let i = 0; i < 2; i++) k.person(-64.7 + k.rand() * 1.1, -81 + k.rand() * 5);
  for (let i = 0; i < 3; i++) k.person(-71 + k.rand() * 6, -81.7 + k.rand() * 2.4);

  k.lights.push({ x: cx, z: cz + 7.5, r: 12, color: '#ffe2ae', k: 0.55 }, { x: cx + 6.5, z: cz, r: 11, color: '#ffe2ae', k: 0.5 }, { x: cx - 2, z: cz - 7, r: 10, color: '#ffe2ae', k: 0.4 });
}

// ---------------------------------------------------------------------------
// St Paul's Cathedral
// ---------------------------------------------------------------------------

/**
 * St Paul's: the west front with its two tiers of columns between two towers,
 * and the dome over the crossing, on its ring of columns, with the lantern,
 * the ball and the cross. The west front looks south here, down to the street
 * from Westminster Bridge.
 */
export function stPauls(k: Build): void {
  const b = k.b;
  const STONE = 0xe3ddcc, SHADE = 0xcfc8b4, LEAD = 0x8f9aa2, DOOR = 0x4a3a2a, WHITE = 0xf2efe6;
  /** The line down the middle of the nave, the west front and the east end, half its width and its height. */
  const ax = -70, front = -41.2, back = -58.4, hw = 5.6, h = 10.5;
  const win: WinSpec = { cell: 1.85, storey: h / 2, lit: 0.3, kind: 0 };
  /** The course round the top of a block, which is its roof as well. */
  const crown = (x0: number, z0: number, x1: number, z1: number, lift = 0.02): void =>
    b.box(x0 - 0.14, h - 0.45, z0 - 0.14, x1 + 0.14, h + lift, z1 + 0.14, SHADE, { top: LEAD });

  // the churchyard: paving, cut back at the corner where Piccadilly Circus comes close
  area(k, [[-78, -61.6], [-62, -61.6], [-62, -38], [-74, -38], [-78, -43]], PLAZA);

  // --- the body of the church: nave and choir in one, the transepts across it, and the round east end ---
  b.box(ax - hw, 0, back, ax + hw, h, front, STONE, { win, seed: 0.37, faces: 'NESW' });
  crown(ax - hw, back, ax + hw, front);
  b.box(ax - hw - 0.1, h / 2 - 0.18, back - 0.1, ax + hw + 0.1, h / 2 + 0.18, front + 0.1, SHADE, { faces: 'NESWTB' });
  const dz = -51.2, tw = 7.0, tl = 2.4;
  b.box(ax - tw, 0, dz - tl, ax + tw, h, dz + tl, STONE, { win, seed: 0.52, faces: 'NESW' });
  crown(ax - tw, dz - tl, ax + tw, dz + tl, 0.03);
  for (const s of [-1, 1]) b.cyl(ax + s * tw, dz, 0, 4.6, 1.6, 1.6, 10, STONE, { cap: SHADE });
  b.cyl(ax, back, 0, h, 3.0, 3.0, 12, STONE, { win: { cell: 1.57, storey: h / 2, lit: 0.3, kind: 0 }, seed: 0.2, cap: LEAD });

  // --- the two west towers: a belfry, a lantern, a lead cap and a gilded pineapple ---
  for (const s of [-1, 1]) {
    const tx = ax + s * (hw - 1.4), tz = front - 1.4;
    b.box(tx - 1.7, 0, tz - 1.7, tx + 1.7, h, tz + 1.7, STONE, { win: { cell: 1.7, storey: h / 2, lit: 0.3, kind: 0 }, seed: 0.7 + s * 0.1, faces: 'NESW' });
    crown(tx - 1.7, tz - 1.7, tx + 1.7, tz + 1.7, 0.04);
    const y1 = h * 1.5;
    b.box(tx - 1.45, h, tz - 1.45, tx + 1.45, y1, tz + 1.45, STONE, { win: { cell: 2.9, storey: h / 2, lit: 0.5, kind: 6 }, seed: 0.3 });
    b.box(tx - 1.6, y1 - 0.3, tz - 1.6, tx + 1.6, y1 + 0.05, tz + 1.6, SHADE);
    b.cyl(tx, tz, y1, y1 + 3.3, 1.3, 1.3, 8, STONE, { win: interior(0.35), cap: false });
    b.cyl(tx, tz, y1 + 3.3, y1 + 3.6, 1.55, 1.55, 8, SHADE, { cap: SHADE });
    lathe(b, tx, tz, [[1.25, y1 + 3.6], [1.1, y1 + 4.2], [0.6, y1 + 4.9], [0.28, y1 + 5.4]], 8, LEAD, { win: interior(0.3) });
    b.cyl(tx, tz, y1 + 5.4, y1 + 6.6, 0.3, 0.05, 6, GOLD, { win: interior(0.9), cap: false });
  }

  // --- the west front between them: steps, two tiers of columns, and the pediment ---
  const pz = front + 1.0;
  const column = (x: number, y0: number, y1: number): void => b.box(x - 0.18, y0, pz - 0.48, x + 0.18, y1, pz - 0.12, STONE, { faces: 'NESW' });
  b.box(ax - 3.6, 0, front, ax + 3.6, 0.3, pz + 0.9, SHADE);
  b.box(ax - 3.1, 0.3, front, ax + 3.1, 0.6, pz + 0.45, SHADE);
  for (let i = 0; i < 6; i++) column(ax - 2.2 + i * 0.88, 0.6, 5.0);
  b.box(ax - 2.5, 5.0, front, ax + 2.5, 5.6, pz, SHADE, { faces: 'NESWTB' });
  for (let i = 0; i < 4; i++) column(ax - 1.8 + i * 1.2, 5.6, 9.6);
  b.box(ax - 2.2, 9.6, front, ax + 2.2, 10.2, pz, SHADE, { faces: 'NESWTB' });
  const py = 10.2, pa = 12.3;
  tri(b, [ax - 2.4, py, pz], [ax + 2.4, py, pz], [ax, pa, pz], [0, 0, 1], STONE);
  b.quad([ax + 2.4, py, pz], [ax + 2.4, py, front - 0.6], [ax, pa, front - 0.6], [ax, pa, pz], [0.66, 0.75, 0], LEAD);
  b.quad([ax - 2.4, py, front - 0.6], [ax - 2.4, py, pz], [ax, pa, pz], [ax, pa, front - 0.6], [-0.66, 0.75, 0], LEAD);
  b.box(ax - 0.6, 0.6, front, ax + 0.6, 3.6, front + 0.05, DOOR, { faces: 'S' });

  // --- the dome over the crossing ---
  // a podium above the roofs, and on it a drum inside a ring of columns
  const yc = h + 1.6, ye = yc + 6.0;
  b.cyl(ax, dz, h, yc, 5.9, 5.9, 16, STONE, { cap: SHADE });
  b.cyl(ax, dz, yc, ye, 4.4, 4.4, 16, SHADE, { win: interior(0.5), cap: false });
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI * 2, x = ax + Math.cos(a) * 5.2, z = dz + Math.sin(a) * 5.2;
    b.box(x - 0.2, yc, z - 0.2, x + 0.2, ye, z + 0.2, STONE, { faces: 'NESW' });
  }
  b.cyl(ax, dz, ye, ye + 0.8, 5.65, 5.65, 16, STONE, { cap: SHADE });
  // the attic above the columns, with a window in every bay
  const yd = ye + 0.8 + 2.7;
  b.cyl(ax, dz, ye + 0.8, yd, 4.5, 4.5, 16, STONE, { win: { cell: 1.767, storey: 2.7, lit: 0.6, kind: 4 }, seed: 0.4, cap: false });
  b.cyl(ax, dz, yd - 0.05, yd + 0.25, 4.85, 4.85, 16, SHADE, { cap: SHADE });
  // the dome itself, in lead: taller than it is wide
  const rise = (t: number): [number, number] => [4.65 * Math.cos(rad(t)), yd + 0.25 + 6.6 * Math.sin(rad(t))];
  lathe(b, ax, dz, [0, 15, 30, 45, 60, 72].map(rise), 16, LEAD, { win: interior(0.45) });
  // the lantern, the ball and the cross
  const yl = rise(72)[1];
  b.cyl(ax, dz, yl - 0.1, yl + 0.4, 1.65, 1.65, 8, STONE, { cap: SHADE });
  b.cyl(ax, dz, yl + 0.4, yl + 3.6, 1.0, 1.0, 8, STONE, { win: interior(1.0), cap: false });
  b.cyl(ax, dz, yl + 3.6, yl + 3.9, 1.25, 1.25, 8, SHADE, { cap: SHADE });
  lathe(b, ax, dz, [[1.05, yl + 3.9], [0.9, yl + 4.5], [0.5, yl + 5.0], [0.2, yl + 5.3]], 8, LEAD);
  b.cyl(ax, dz, yl + 5.3, yl + 5.75, 0.12, 0.45, 6, GOLD, { win: interior(0.9), cap: false });
  b.cyl(ax, dz, yl + 5.75, yl + 6.2, 0.45, 0.1, 6, GOLD, { win: interior(0.9), cap: false });
  b.box(ax - 0.07, yl + 6.2, dz - 0.07, ax + 0.07, yl + 8.4, dz + 0.07, GOLD, { win: interior(0.9) });
  b.box(ax - 0.55, yl + 7.5, dz - 0.07, ax + 0.55, yl + 7.75, dz + 0.07, GOLD, { win: interior(0.9), faces: 'NESWTB' });

  // --- in front of it: the statue of the queen on her plinth, and people on the steps ---
  b.box(ax - 0.45, 0, -38.95, ax + 0.45, 1.5, -38.05, SHADE);
  figure(b, ax, -38.5, 1.5, { coat: WHITE, legs: WHITE, skin: WHITE, hat: GOLD, hatH: 0.18, hatR: 0.24 });
  for (let i = 0; i < 8; i++) {
    const x = ax - 3.8 + k.rand() * 7.6;
    if (Math.abs(x - ax) > 0.9) k.person(x, -39.2 + k.rand() * 1.2);
  }
  for (let i = 0; i < 4; i++) k.person(-63.7 + k.rand() * 1.2, -47.5 + k.rand() * 5.5);
  for (let i = 0; i < 3; i++) k.person(-77.6 + k.rand() * 1.2, -47.6 + k.rand() * 3);
  k.tree(-63.3, -57.2, 0.5);
  k.tree(-76.7, -57.2, 0.5);

  k.lights.push(
    { x: ax, z: front + 3, r: 13, color: '#fff0d0', k: 0.6 }, { x: ax + 8, z: dz, r: 12, color: '#fff0d0', k: 0.5 },
    { x: ax - 8, z: dz, r: 12, color: '#fff0d0', k: 0.5 }, { x: ax, z: back - 3, r: 10, color: '#fff0d0', k: 0.4 },
  );
}

// ---------------------------------------------------------------------------
// Buckingham Palace, and the Changing of the Guard
// ---------------------------------------------------------------------------

const GUARD = { coat: RED, legs: 0x1c2233, hat: 0x121316, hatH: 0.95, hatR: 0.33 };

/**
 * Buckingham Palace: its east front, with the balcony in the middle under the
 * pediment, the forecourt behind its railings and gates, sentries at their
 * boxes, and the guard marching up and down the forecourt.
 */
export function buckinghamPalace(k: Build): void {
  const b = k.b;
  const STONE = 0xe7e0d0, SHADE = 0xd2cab7, LEAD = 0x8f9aa2, IRON = 0x24262b, GRAVEL = 0xcdaa94, DOOR = 0x2a2622, BOX = 0x2b2f36;
  const x0 = -103.8, x1 = -99.6, xp = -99.0, z0 = -79, z1 = -45, zc = (z0 + z1) / 2;
  const storey = 3.8, h = storey * 3, roof = h + 1.3;
  const win: WinSpec = { cell: 1.7, storey, lit: 0.45, kind: 0 };

  // --- the front: a long range, with a pavilion at each end and a wider one in the middle ---
  b.box(x0, 0, z0, x1, h, z1, STONE, { win, seed: 0.27, faces: 'NESW' });
  b.box(x0 - 0.1, h, z0 - 0.1, x1 + 0.12, roof, z1 + 0.1, SHADE, { top: LEAD });
  const pavilion = (za: number, zb: number, more: number): void => {
    b.box(x1 - 0.4, 0, za, xp, h, zb, STONE, { win, seed: 0.3 + za * 0.01, faces: 'NES' });
    b.box(x1 - 0.4, h, za - 0.08, xp + 0.1, roof + more, zb + 0.08, SHADE, { top: LEAD });
  };
  pavilion(z0 - 0.02, z0 + 4.6, 0.5);
  pavilion(z1 - 4.6, z1 + 0.02, 0.5);
  pavilion(zc - 3.6, zc + 3.6, 0.9);
  // the pediment over the middle
  const py = roof + 0.9, pa = py + 2.2, pw = 3.7, pb = x1 - 0.4, pf = xp + 0.1;
  tri(b, [pf, py, zc + pw], [pf, py, zc - pw], [pf, pa, zc], [1, 0, 0], STONE);
  tri(b, [pb, py, zc - pw], [pb, py, zc + pw], [pb, pa, zc], [-1, 0, 0], STONE);
  b.quad([pf, py, zc - pw], [pb, py, zc - pw], [pb, pa, zc], [pf, pa, zc], [0, 0.86, -0.51], LEAD);
  b.quad([pb, py, zc + pw], [pf, py, zc + pw], [pf, pa, zc], [pb, pa, zc], [0, 0.86, 0.51], LEAD);
  // columns up the two storeys above the balcony, the balcony itself, and the door under it
  for (let i = 0; i < 6; i++) {
    const z = zc - 3.1 + i * 1.24;
    b.box(xp, storey, z - 0.16, xp + 0.22, h, z + 0.16, SHADE, { faces: 'NES' });
  }
  b.box(xp, storey - 0.3, zc - 2.5, xp + 0.8, storey, zc + 2.5, SHADE, { faces: 'NESTB' });
  b.box(xp + 0.68, storey, zc - 2.5, xp + 0.8, storey + 0.75, zc + 2.5, STONE);
  for (const s of [-1, 1]) b.box(xp, storey, zc + s * 2.5 - (s > 0 ? 0.12 : 0), xp + 0.68, storey + 0.75, zc + s * 2.5 + (s < 0 ? 0.12 : 0), STONE);
  b.box(xp, 0, zc - 0.7, xp + 0.06, 3.0, zc + 0.7, DOOR, { faces: 'E' });
  unionFlag(b, (x0 + x1) / 2 + 0.6, zc, roof + 0.9, 6.5, 2.9, 1.7);

  // --- the forecourt, behind its railings: iron, with gilded tips, between stone piers ---
  area(k, rect(xp, z0, -94.3, z1), GRAVEL);
  const rx = -94.45;
  const pier = (z: number, lit: boolean): void => {
    b.box(rx - 0.45, 0, z - 0.45, rx + 0.45, 3.3, z + 0.45, STONE, { top: SHADE });
    b.box(rx - 0.55, 3.3, z - 0.55, rx + 0.55, 3.55, z + 0.55, SHADE);
    if (lit) lantern(k, rx, z, 3.55, 0.8, IRON);
  };
  const railing = (za: number, zb: number): void => {
    b.box(rx - 0.14, 0, za, rx + 0.14, 0.4, zb, SHADE);
    const n = Math.max(1, Math.round((zb - za) / 1.25));
    for (let i = 0; i <= n; i++) {
      const z = za + ((zb - za) * i) / n;
      b.box(rx - 0.06, 0.4, z - 0.06, rx + 0.06, 2.45, z + 0.06, IRON, { faces: 'NESW' });
    }
    b.box(rx - 0.05, 2.2, za, rx + 0.05, 2.32, zb, IRON, { faces: 'NESWTB' });
    b.box(rx - 0.05, 2.45, za, rx + 0.05, 2.56, zb, GOLD);
  };
  // the great gate in the middle, and a lesser one to either side of it
  let from = z0 + 0.45;
  pier(from, true);
  for (const [gz, half] of [[zc - 11, 1.3], [zc, 1.7], [zc + 11, 1.3]]) {
    railing(from + 0.45, gz - half - 0.45);
    pier(gz - half, gz === zc);
    pier(gz + half, gz === zc);
    b.box(rx - 0.05, 0.1, gz - half + 0.45, rx + 0.05, 2.9, gz + half - 0.45, IRON);
    b.box(rx - 0.08, 1.9, gz - 0.35, rx + 0.08, 2.6, gz + 0.35, GOLD, { faces: 'NESWTB' });
    from = gz + half;
  }
  railing(from + 0.45, z1 - 0.9);
  pier(z1 - 0.45, true);

  // --- the guard ---
  // a sentry at his box, on either side of the door
  for (const s of [-1, 1]) {
    const z = zc + s * 5.4;
    b.box(xp + 0.1, 0, z - 0.5, xp + 1.0, 2.5, z + 0.5, BOX, { faces: 'NESW' });
    b.cyl(xp + 0.55, z, 2.5, 3.3, 0.5 * D + 0.12, 0.03, 4, BOX, { cap: false });
    figure(b, xp + 1.3, z, 0.02, GUARD);
  }
  // and the new guard, two by two behind their officer, marching the length of the forecourt and back
  const g = new GeoBuilder();
  for (let r = 0; r < 5; r++) for (const f of [-0.65, 0.65]) figure(g, f, 2.6 - r * 1.3, 0, GUARD);
  figure(g, 0, 4.4, 0, GUARD);
  const troop = new THREE.Mesh(g.build(), k.mat.city());
  troop.name = 'the-guard';
  troop.castShadow = true;
  k.group.add(troop);
  const mx = -96.2, za = z0 + 9, zb = z1 - 9, pace = 1.5, rest = 2.2;
  const leg = (zb - za) / pace, lap = 2 * (leg + rest);
  let t = 0;
  k.each((dt) => {
    t = (t + dt) % lap;
    const back = t >= leg + rest, u = back ? t - leg - rest : t;
    const along = Math.min(u, leg) * pace, turning = Math.max(0, u - leg) / rest;
    // they step in time while they march, and wheel about at each end
    troop.position.set(mx, u < leg ? 0.02 + 0.07 * Math.abs(Math.sin(t * 6.5)) : 0.02, back ? zb - along : za + along);
    troop.rotation.y = (back ? Math.PI : 0) + turning * Math.PI;
  });

  // those who have come to watch, along the railings
  for (let i = 0; i < 12; i++) k.person(-93.7 + k.rand() * 1.7, z0 + 3 + k.rand() * (z1 - z0 - 6));
  for (const d of [-12, 0, 12]) k.lights.push({ x: -97, z: zc + d, r: 12, color: '#ffe6bc', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Piccadilly Circus
// ---------------------------------------------------------------------------

/**
 * Piccadilly Circus: the fountain with the winged archer in the middle, and
 * the lights, a curved front of great screens that looks onto it.
 */
export function piccadillyCircus(k: Build): void {
  const b = k.b;
  const [cx, cz] = PICCADILLY;
  const STEP = 0xcfc8b8, BRONZE = 0x4d6b5c, ALU = 0xc9ced3;

  // --- the fountain: steps, two bronze basins one above the other, and the archer on one foot ---
  b.cyl(cx, cz, 0, 0.35, 2.7, 2.7, 8, STEP, { cap: STEP });
  b.cyl(cx, cz, 0.35, 0.7, 2.1, 2.1, 8, STEP, { cap: STEP });
  b.cyl(cx, cz, 0.7, 1.05, 1.5, 1.5, 8, STEP, { cap: STEP });
  lathe(b, cx, cz, [[1.0, 1.05], [0.85, 1.7], [1.3, 2.0], [1.3, 2.15], [0.4, 2.3], [0.32, 3.3], [0.8, 3.55], [0.8, 3.65], [0.2, 3.8], [0.16, 4.5]], 8, BRONZE);
  b.beam([cx, 4.5, cz], [cx + 0.45, 5.45, cz], 0.12, 0.2, ALU);
  b.beam([cx + 0.2, 5.0, cz], [cx - 0.5, 4.95, cz], 0.09, 0.06, ALU);
  b.box(cx + 0.4, 5.42, cz - 0.13, cx + 0.66, 5.68, cz + 0.13, ALU);
  b.beam([cx + 0.45, 5.3, cz], [cx + 0.9, 5.4, cz], 0.06, 0.05, ALU);
  b.beam([cx + 0.8, 4.95, cz], [cx + 1.0, 5.85, cz], 0.04, 0.04, ALU);
  for (const s of [-1, 1]) {
    // a wing, seen from above and from below
    const w: [V3, V3, V3] = [[cx + 0.32, 5.3, cz + s * 0.1], [cx - 0.55, 6.15, cz + s * 0.6], [cx - 0.15, 5.15, cz + s * 0.32]];
    tri(b, w[0], w[1], w[2], [0.3, 0.9, s * 0.3], ALU);
    tri(b, w[0], w[1], w[2], [-0.3, -0.9, -s * 0.3], ALU);
  }
  for (let i = 0; i < 8; i++) {
    const a = k.rand() * Math.PI * 2, r = 3.3 + k.rand() * 1.6;
    k.person(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
  }
  k.lights.push({ x: cx, z: cz, r: 9, color: '#ffe9c4', k: 0.5 });

  // --- the lights: five stretches of a front that curves round the west side of the circus, each with a screen ---
  const RF = 14.6, back = -103.8, H = 18;
  const front: P2[] = Array.from({ length: 6 }, (_, i): P2 => [cx + Math.cos(rad(135 + i * 18)) * RF, cz + Math.sin(rad(135 + i * 18)) * RF]);
  const shape: P2[] = [...front, [back, front[5][1]], [back, front[0][1]]];
  walls(b, shape, 0, H, 0xe4dccb, { win: { cell: 2.25, storey: 4.5, lit: 0.4, kind: 2 }, seed: 0.61 });
  flat(b, shape, H, 0x6d6f76);
  SCREENS.forEach(([id, , glow], i) => {
    const am = rad(135 + i * 18 + 9), nx = -Math.cos(am), nz = -Math.sin(am);
    const r = RF * Math.cos(rad(9));
    const x = cx - nx * r, z = cz - nz * r;
    b.obox(x + nx * 0.06, 10.9, z + nz * 0.06, 2.24, 5.75, 0.06, am + Math.PI / 2, BLACK);
    k.sign(id, x + nx * 0.2, 10.9, z + nz * 0.2, nx, nz, 11, 4.34);
    k.lights.push({ x: x + nx * 4, z: z + nz * 4, r: 8, color: glow, k: 0.55 });
  });
  for (let i = 0; i < 9; i++) {
    const a = rad(140 + k.rand() * 80), r = 12 + k.rand() * 1.6;
    k.person(cx + Math.cos(a) * r, cz + Math.sin(a) * r);
  }
}

// ---------------------------------------------------------------------------
// The Gherkin
// ---------------------------------------------------------------------------

/** The Gherkin: a glass tower that swells and then tapers to a rounded tip, with dark bands winding up it. */
export function gherkin(k: Build): void {
  const b = k.b;
  const GLASS = 0x9cc3d3, DARK = 0x2c4a5e;
  // (180 m in life, which is 56 at the city's scale of 3.2 m to a unit: it stands a little above Big Ben, as it does in life)
  const cx = -68.5, cz = -106, H = 58, R = 6.4, sides = 18, twist = 3.9;
  /** How far up each ring is, and how wide, as parts of the whole. */
  const rings: [number, number][] = [
    [0, 0.86], [0.07, 0.915], [0.14, 0.955], [0.21, 0.985], [0.28, 0.998], [0.35, 1], [0.42, 0.99], [0.49, 0.965], [0.56, 0.925], [0.63, 0.87],
    [0.7, 0.8], [0.77, 0.705], [0.83, 0.6], [0.88, 0.49], [0.92, 0.385], [0.955, 0.27], [0.98, 0.155], [1, 0.03],
  ];
  area(k, rect(-75.4, -112.8, -61.6, -99.7), PLAZA);
  b.cyl(cx, cz, 0, 0.5, R * 0.86 + 0.18, R * 0.86 + 0.18, sides, 0x3a3f46, { cap: false });
  // Every ring is turned a little from the one below, so the panes lean and the dark ones wind round it.
  const at = (j: number, i: number): V3 => {
    const [u, w] = rings[j], a = (i / sides) * Math.PI * 2 + u * twist;
    return [cx + Math.cos(a) * R * w, u * H, cz + Math.sin(a) * R * w];
  };
  for (let j = 0; j + 1 < rings.length; j++) {
    const slope = ((rings[j][1] - rings[j + 1][1]) * R) / ((rings[j + 1][0] - rings[j][0]) * H);
    const lit = interior(rings[j][0] >= 0.9 ? 1.1 : 0.22);
    for (let i = 0; i < sides; i++) {
      const p0 = at(j, i), p1 = at(j, i + 1), p2 = at(j + 1, i + 1), p3 = at(j + 1, i);
      const mx = (p0[0] + p1[0] + p2[0] + p3[0]) / 4 - cx, mz = (p0[2] + p1[2] + p2[2] + p3[2]) / 4 - cz, ml = Math.hypot(mx, mz) || 1;
      const nl = Math.hypot(1, slope);
      const dark = i % 3 === 0 && rings[j][0] < 0.9;
      b.quad(p0, p1, p2, p3, [mx / ml / nl, slope / nl, mz / ml / nl], dark ? DARK : GLASS, { win: dark ? interior(0.04) : lit });
    }
  }
  k.glows.push({ x: cx, y: H + 0.3, z: cz, sx: 0.5, sy: 0.5, sz: 0.5, color: '#ff3b3b' });
  for (let i = 0; i < 6; i++) {
    const a = rad(20 + k.rand() * 140), r = 6.4 + k.rand() * 0.8;
    k.person(cx + Math.cos(a) * r, Math.min(-100.1, cz + Math.sin(a) * r));
  }
  k.lights.push({ x: cx, z: cz + 5.5, r: 11, color: '#cfe8ff', k: 0.5 });
}

// ---------------------------------------------------------------------------
// Ace Cafe
// ---------------------------------------------------------------------------

/** A motorbike on its stand: two wheels, the tank and the saddle between them, and the handlebars. */
function motorbike(b: GeoBuilder, x: number, z: number, yaw: number, color: number): void {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const l of [-0.68, 0.68]) b.obox(x + c * l, 0.33, z + s * l, 0.33, 0.33, 0.09, yaw, BLACK);
  b.obox(x, 0.6, z, 0.62, 0.2, 0.15, yaw, color);
  b.obox(x + c * 0.5, 0.92, z + s * 0.5, 0.05, 0.14, 0.36, yaw, 0xc9ced3);
}

/**
 * Ace Cafe: long, low and white, with one great window after another, a band
 * of black and white squares over them, and its name over the door. The
 * motorbikes stand in a row outside, and the cars line up beyond them.
 */
export function aceCafe(k: Build): void {
  const b = k.b;
  const WHITE = 0xf1eee6, TRIM = 0x1b1b1f, ROOF = 0x8d8a83;
  const x0 = -100, x1 = -70, z0 = 9.2, z1 = 13.6, h = 5.6, xc = (x0 + x1) / 2;

  // the forecourt, with the bays marked on it
  area(k, rect(x0 - 1.5, z1, -66.5, 21.6), 0x55575d);
  for (let x = -100.75; x < -66.6; x += 8.5) area(k, rect(x - 0.09, 16.3, x + 0.09, 20.1), 0xe9e6dc, 0.03);

  b.box(x0, 0, z0, x1, h, z1, WHITE, { win: { cell: 2.5, storey: h, lit: 0.9, kind: 2 }, seed: 0.77, faces: 'NESW' });
  b.box(x0 - 0.08, h - 0.5, z0 - 0.08, x1 + 0.08, h + 0.12, z1 + 0.08, TRIM, { top: ROOF });
  // the higher part over the door, which carries the name
  b.box(xc - 7.5, h + 0.12, z0 + 0.6, xc + 7.5, h + 2.0, z1 + 0.02, WHITE, { top: ROOF });
  b.box(xc - 7.6, h + 1.85, z0 + 0.5, xc + 7.6, h + 2.15, z1 + 0.12, TRIM, { top: ROOF });
  k.sign('ace-cafe', xc, h + 1.0, z1 + 0.14, 0, 1, 1.45, 14.4);
  k.sign('chequer', xc, h - 0.85, z1 + 0.1, 0, 1, 0.62, x1 - x0 - 0.4);
  // the door, and the canopy over it
  b.box(xc - 0.9, 0, z1, xc + 0.9, 3.3, z1 + 0.06, 0x2a2622, { faces: 'S' });
  b.box(xc - 2.4, 3.45, z1, xc + 2.4, 3.65, z1 + 1.4, 0xb3202a, { faces: 'NESWTB' });
  // a line of red neon along the edge of the roof
  k.glows.push({ x: xc, y: h + 0.17, z: z1 + 0.16, sx: x1 - x0, sy: 0.1, sz: 0.08, color: '#ff5a4a' });

  const paints = [BLACK, 0xb3202a, 0x1f4d3a, 0xc9ced3, 0x1c2f5e, BLACK, 0xd98a1f, 0xb3202a];
  paints.forEach((paint, i) => motorbike(b, xc - 12.4 + i * 1.25, z1 + 1.15, 1.2, paint));
  for (let i = 0; i < 12; i++) k.person(xc - 2.2 + k.rand() * 16, z1 + 0.5 + k.rand() * 1.5);
  for (const x of [x0 + 4, xc - 6, xc + 6, x1 - 4]) k.lights.push({ x, z: z1 + 2.5, r: 10, color: '#ffd9a0', k: 0.55 });
  k.lights.push({ x: xc, z: z1 + 2, r: 8, color: '#ff6a5a', k: 0.35 });
}

// ---------------------------------------------------------------------------
// The square behind Parliament, and what stands on London's pavements
// ---------------------------------------------------------------------------

/**
 * A double-decker bus, standing. The traffic has no vehicle of this shape, so
 * London's moving buses have one deck, and this one waits at its stand.
 */
function doubleDecker(b: GeoBuilder, x: number, z: number, yaw: number): void {
  const GLASS = 0x1c2733, CREAM = 0xf2ead8, L = 4.4, W = 1.65;
  b.moved(x, 0, z, yaw, () => {
    // two decks of windows, with a cream band between them
    b.box(-L, 0.55, -W, L, 2.0, W, RED, { faces: 'NESWTB' });
    b.box(-L + 0.15, 2.0, -W + 0.06, L - 0.15, 3.0, W - 0.06, GLASS, { faces: 'NESW' });
    b.box(-L, 3.0, -W, L, 3.2, W, CREAM, { faces: 'NESWB' });
    b.box(-L, 3.2, -W, L, 3.8, W, RED, { faces: 'NESWT' });
    b.box(-L + 0.15, 3.8, -W + 0.06, L - 0.15, 4.75, W - 0.06, GLASS, { faces: 'NESW' });
    b.box(-L, 4.75, -W, L, 5.2, W, RED, { faces: 'NESWTB' });
    for (const y of [2.0, 3.8]) for (const px of [-L + 0.15, -1.3, 1.5, L - 0.4]) b.box(px, y, -W, px + 0.25, y + 1.0, W, RED, { faces: 'NS' });
    for (const wx of [-2.7, 2.7]) for (const s of [-1, 1]) wheel(b, wx, 1.05, s * (W - 0.4), 1.05, 0.42, s);
    // where it is going, over the windscreen, and its lamps
    b.box(L, 3.25, -1.0, L + 0.04, 3.7, 1.0, 0x16171c, { faces: 'E', win: interior(0.6) });
    for (const s of [-1, 1]) {
      b.box(L, 0.85, s * 1.05 - 0.3, L + 0.05, 1.2, s * 1.05 + 0.3, 0xfff4d6, { faces: 'E', win: interior(1.4) });
      b.box(-L - 0.05, 1.05, s * 1.05 - 0.3, -L, 1.35, s * 1.05 + 0.3, 0xc81e1e, { faces: 'W', win: interior(1.2) });
    }
  });
}

/** Parliament Square, with its statues, the bus stand, and London's telephone boxes, pillar boxes and park trees. */
export function londonStreets(k: Build): void {
  const b = k.b;
  const BRONZE = 0x3d4a44;

  // --- the bus stand at the end of the road, by Ace Cafe: a double-decker waits, and so do the people under the shelter ---
  area(k, rect(-103.6, -9.5, -99.4, 6.5), 0x55575d);
  doubleDecker(b, -101.5, -2.6, -Math.PI / 2);
  b.box(-98.95, 0.3, 2.4, -98.87, 2.4, 6.0, 0x9cc3d3, { win: interior(0.5) });
  b.box(-99.1, 2.45, 2.2, -97.7, 2.6, 6.2, RED, { faces: 'NESWTB' });
  for (const z of [2.3, 6.1]) b.box(-98.98, 0, z - 0.06, -98.86, 2.45, z + 0.06, 0x4b4f57, { faces: 'NESW' });
  b.box(-98.3, 0, 1.3, -98.2, 3.3, 1.4, 0x4b4f57, { faces: 'NESW' });
  b.box(-98.6, 2.7, 1.32, -97.9, 3.3, 1.38, RED, { faces: 'NESWTB' });
  for (let i = 0; i < 5; i++) k.person(-98.3 + k.rand() * 0.3, 2.7 + i * 0.75);
  k.lights.push({ x: -99.5, z: 0, r: 10, color: '#ffd9a0', k: 0.5 });

  // --- Parliament Square: a lawn with a statue on a plinth at each corner ---
  area(k, rect(-75.2, -7.2, -60.4, 7.2), LAWN);
  for (const [x, z] of [[-73.6, -5.6], [-62, -5.6], [-73.6, 5.6], [-62, 5.6]]) {
    b.box(x - 0.5, 0, z - 0.5, x + 0.5, 1.7, z + 0.5, 0xcfc8b4);
    figure(b, x, z, 1.7, { coat: BRONZE, legs: BRONZE, skin: BRONZE, hat: BRONZE, hatH: 0.12, hatR: 0.26 });
  }
  for (const [x, z] of [[-70, -3.2], [-66, 2.6], [-70.4, 4.2]]) k.tree(x, z, 0.62);
  for (let i = 0; i < 7; i++) k.person(-74.6 + k.rand() * 13.6, -6.6 + k.rand() * 13.2);

  // --- telephone boxes: red, glazed all round, lit at night ---
  for (const [x, z] of [[-57.4, -23.7], [-56.2, -23.7], [-64.2, -36.3], [-17.7, -77.5], [-63.8, -85.7], [-68.7, 12.9], [-77.6, -9.4]]) {
    b.box(x - 0.45, 0, z - 0.45, x + 0.45, 2.5, z + 0.45, RED, { win: { cell: 0.9, storey: 2.5, lit: 0.95, kind: 6 }, seed: x * 0.31 + z * 0.17, faces: 'NESW' });
    b.box(x - 0.5, 2.5, z - 0.5, x + 0.5, 2.7, z + 0.5, RED);
  }
  // --- pillar boxes ---
  for (const [x, z] of [[-58.7, -23.7], [-65.6, -36.3], [-92.6, -43.4], [-65.4, -85.7], [-16.9, -46], [-60.9, 8.4]]) {
    b.cyl(x, z, 0, 1.35, 0.32, 0.32, 6, RED, { cap: false });
    b.cyl(x, z, 1.35, 1.6, 0.4, 0.14, 6, RED, { cap: BLACK });
    b.cyl(x, z, 0, 0.16, 0.37, 0.37, 6, BLACK, { cap: false });
  }

  // --- the gardens behind the South Bank: a lawn under the wall of trees where London ends ---
  area(k, [[-3.4, -80], [-1.6, -80], [1.4, -70.5], [8.2, -60.5], [1.0, -38.6], [-3.4, -38.6]], LAWN);
  for (let i = 0; i < 9; i++) {
    const z = -78 + k.rand() * 38;
    k.person(-2.8 + k.rand() * (z < -62 ? 2.2 : 3.2), z);
  }

  // --- the park beside the palace ---
  for (const [x, z] of [[-102.4, -101], [-102.6, -94.5], [-102.4, -88], [-102.2, -82.2], [-101.6, -42.7]]) k.tree(x, z, 0.62);
}
