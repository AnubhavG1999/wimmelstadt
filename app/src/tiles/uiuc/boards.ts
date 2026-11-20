// The university's boards: before each of its buildings a dark blue board on
// two legs with the building's name in white, as on the campus. In life each
// has the university's mark in the strip along its top. That is a logo and is
// not drawn: a plain square of orange stands where it would be.
//
// Where each stands was found on the built tile, not typed in by eye: a free
// place by the building's front, on a side the opening view sees where there
// is one, with no steps, lamp, tree or figure in it, and nothing behind it
// that the opening view is to see. Each place is kept as a side of its lot, how
// far along that side and how far out, so that a board moves with its
// building.

import { fit, type SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { NAVY, ORANGE } from './look';
import { lot, type Model } from './plan';

type Side = 'N' | 'E' | 'S' | 'W';

/**
 * A board: its own id, its building's lot, the name as the university writes
 * it, the side of the lot it stands on, how far along that side its middle is
 * (from the west end of a north or south side, from the north end of an east
 * or west one), and how far out from the lot.
 */
type Board = [id: string, lot: string, lines: string[], side: Side, along: number, out: number];

const BOARDS: Board[] = [
  // north of Green Street
  ['everitt', 'everitt', ['Everitt', 'Laboratory'], 'S', 8.2, 0.5],
  ['talbot', 'talbot', ['Talbot', 'Laboratory'], 'E', 3.95, 0.5],
  ['engineering-hall', 'engineering-hall', ['Engineering', 'Hall'], 'S', 11.95, 0.5],
  ['grainger', 'grainger', ['Grainger', 'Engineering', 'Library'], 'S', 13.2, 0.5],
  ['siebel', 'siebel', ['Thomas M. Siebel', 'Center for', 'Computer Science'], 'S', 13.45, 0.5],
  // the Quad
  ['altgeld', 'altgeld', ['Altgeld', 'Hall'], 'E', 0.95, 0.5],
  ['union', 'union', ['Illini', 'Union'], 'E', 9.45, 0.5],
  ['union-green', 'union', ['Illini', 'Union'], 'N', 4.7, 0.5],
  ['harker', 'harker', ['Harker', 'Hall'], 'S', 1.7, 0.5],
  ['henry', 'henry', ['Henry', 'Administration', 'Building'], 'E', 0.7, 0.5],
  ['english', 'english', ['English', 'Building'], 'E', 0.7, 1.2],
  ['lincoln-hall', 'lincoln-hall', ['Lincoln', 'Hall'], 'E', 8.95, 0.5],
  ['gregory-hall', 'gregory-hall', ['Gregory', 'Hall'], 'E', 2.2, 0.5],
  ['natural-history', 'natural-history', ['Natural History', 'Building'], 'W', 5.7, 2.6],
  ['noyes', 'noyes', ['Noyes', 'Laboratory'], 'W', 6.45, 2.6],
  ['davenport', 'davenport', ['Davenport', 'Hall'], 'E', 4.2, 0.5],
  ['smith', 'smith', ['Smith', 'Memorial Hall'], 'S', 3.2, 0.5],
  ['foellinger', 'foellinger', ['Foellinger', 'Auditorium'], 'S', 5.95, 0.5],
  ['library', 'library', ['Main', 'Library'], 'E', 5.45, 2.8],
  ['observatory', 'observatory', ['Astronomical', 'Observatory'], 'S', 2.2, 2.2],
  // chemistry and Urbana
  ['adams', 'adams', ['Roger Adams', 'Laboratory'], 'E', 3.2, 0.5],
  ['clsl', 'clsl', ['Chemical and', 'Life Sciences', 'Laboratory'], 'S', 6.45, 0.5],
  ['krannert', 'krannert', ['Krannert Center', 'for the', 'Performing Arts'], 'E', 12.45, 1.2],
  ['busey', 'busey-evans', ['Busey', 'Hall'], 'S', 5.95, 0.5],
  ['evans', 'busey-evans', ['Evans', 'Hall'], 'S', 20.95, 0.5],
  // between Fourth Street and Wright Street
  ['bookstore', 'bookstore', ['Illini Union', 'Bookstore'], 'E', 0.7, 0.6],
  ['ice-arena', 'ice-arena', ['Ice', 'Arena'], 'E', 3.95, 0.5],
  ['armory', 'armory', ['Armory'], 'E', 7.45, 0.5],
  ['sherman', 'sherman', ['Sherman', 'Hall'], 'E', 1.7, 0.5],
  // the Six Pack
  ['wassaja', 'wassaja', ['Wassaja', 'Hall'], 'S', 5, 6.5],
  ['nugent', 'nugent', ['Nugent', 'Hall'], 'N', 13.2, 0.5],
  ['ikenberry-dining', 'ikenberry-dining', ['Ikenberry', 'Dining Center'], 'E', 4.7, 0.5],
  ['hopkins', 'hopkins', ['Hopkins', 'Hall'], 'W', 3.95, 2.8],
  ['weston', 'weston', ['Weston', 'Hall'], 'E', 0.7, 0.5],
  ['bousfield', 'bousfield', ['Bousfield', 'Hall'], 'S', 5.45, 0.4],
  ['scott', 'scott', ['Scott', 'Hall'], 'S', 5.2, 0.4],
  ['snyder', 'snyder', ['Snyder', 'Hall'], 'S', 5.45, 0.5],
  // the south campus
  ['huff', 'huff', ['Huff', 'Hall'], 'E', 4.2, 0.5],
  ['art-museum', 'art-museum', ['Krannert', 'Art Museum'], 'S', 7.95, 0.5],
  ['business', 'business', ['Business', 'Instructional', 'Facility'], 'E', 4.95, 0.5],
  ['kinley', 'kinley', ['David Kinley', 'Hall'], 'S', 6.2, 0.5],
  ['stock-pavilion', 'stock-pavilion', ['Stock', 'Pavilion'], 'S', 9.95, 0.5],
  ['mumford', 'mumford', ['Mumford', 'Hall'], 'E', 4.95, 0.5],
  ['aces-library', 'aces-library', ['ACES Library,', 'Information and', 'Alumni Center'], 'S', 8.7, 2.2],
  ['par', 'par', ['Pennsylvania', 'Avenue', 'Residence Halls'], 'E', 3.2, 0.5],
  ['oglesby', 'oglesby', ['Oglesby', 'Hall'], 'S', 0.15, 0.5],
  ['trelease', 'trelease', ['Trelease', 'Hall'], 'E', 4.95, 0.5],
];

// ---------------------------------------------------------------------------
// The board on the sheet
// ---------------------------------------------------------------------------

/** A board on the sheet, in pixels, which is also its shape. */
const PX: [number, number] = [256, 176];
/** Plain lettering, as near to the campus's as the reader's machine has. */
const SANS = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const OWNER = 'University of Illinois';
const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** A strip along the top with a square of orange, a fine rule and whose building it is, and under it the building's name. */
function paint(ctx: CanvasRenderingContext2D, s: SignDef, w: number, h: number): void {
  const strip = Math.round(h * 0.24), pad = Math.round(w * 0.06);
  ctx.fillStyle = css(NAVY);
  ctx.fillRect(0, 0, w, h);

  const side = Math.round(strip * 0.56), top = Math.round((strip - side) / 2);
  ctx.fillStyle = css(ORANGE);
  ctx.fillRect(pad, top, side, side);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillRect(pad + side + Math.round(pad * 0.55), top, 2, side);
  const tx = pad + side + Math.round(pad * 1.1) + 2;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const small = fit(ctx, OWNER, SANS, strip * 0.5, w - tx - pad, '400');
  ctx.font = `400 ${small}px ${SANS}`;
  ctx.fillText(OWNER, tx, strip / 2 + 1);

  // the joint between the strip and the panel
  ctx.fillStyle = '#0a1830';
  ctx.fillRect(0, strip, w, 3);

  // the name, every line at the size its longest line allows
  const room = h - strip - 3, lineH = Math.min(room * 0.4, (room * 0.88) / s.lines.length);
  let size = lineH * 0.82;
  for (const line of s.lines) size = Math.min(size, fit(ctx, line, SANS, size, w - 2 * pad, '600'));
  ctx.font = `600 ${size}px ${SANS}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const y0 = strip + 3 + (room - lineH * s.lines.length) / 2;
  s.lines.forEach((line, i) => ctx.fillText(line, w / 2, y0 + lineH * (i + 0.5) + size * 0.04));
}

/** The sign that carries a board's name: its own, or that of the first board with the same name. The Union's two boards share one. */
const signOf = (b: Board): string => `boards-${BOARDS.find((o) => o[2].join(' ') === b[2].join(' '))![0]}`;

/** One sign for each name. */
export const SIGNS: SignDef[] = BOARDS.filter((b) => signOf(b) === `boards-${b[0]}`).map((b) => ({
  id: signOf(b), lines: b[2], color: css(NAVY), ink: '#ffffff', aspect: PX[0] / PX[1], kind: 'board' as const, real: true, size: PX, paint,
}));

// ---------------------------------------------------------------------------
// The board on the ground
// ---------------------------------------------------------------------------

/** How wide a board is, how high its panel, how far its panel is off the ground, and how thick it is. */
const W = 3, H = (W * PX[1]) / PX[0], LIFT = 0.38, THICK = 0.16;
const FRAME = 0x1b1e24;
const NORMAL: Record<Side, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

/** A board with its middle at (cx, cz), read from the side `side` and from behind as well. */
function stand(k: Build, sign: string, cx: number, cz: number, side: Side): void {
  const b = k.b, [nx, nz] = NORMAL[side];
  // half its length along x and along z, and half its thickness the other way
  const hx = nz !== 0 ? W / 2 : THICK / 2, hz = nz !== 0 ? THICK / 2 : W / 2;
  b.box(cx - hx, LIFT, cz - hz, cx + hx, LIFT + H, cz + hz, FRAME, { faces: 'NESWTB' });
  for (const s of [-1, 1]) {
    const px = cx + (nz !== 0 ? s * (W / 2 - 0.32) : 0), pz = cz + (nz !== 0 ? 0 : s * (W / 2 - 0.32));
    b.box(px - 0.07, 0, pz - 0.07, px + 0.07, LIFT, pz + 0.07, FRAME, { faces: 'NESW' });
  }
  const y = LIFT + H / 2, off = THICK / 2 + 0.03;
  for (const f of [1, -1]) k.sign(sign, cx + nx * off * f, y, cz + nz * off * f, nx * f, nz * f, H - 0.12, W - 0.12);
}

/** Where a board stands: on its side of its lot, so far along and so far out. */
function place(b: Board): { x: number; z: number } {
  const [, id, , side, along, out] = b, l = lot(id);
  if (side === 'S') return { x: l.x0 + along, z: l.z1 + out };
  if (side === 'N') return { x: l.x0 + along, z: l.z0 - out };
  if (side === 'E') return { x: l.x1 + out, z: l.z0 + along };
  return { x: l.x0 - out, z: l.z0 + along };
}

export const MODELS: Record<string, Model> = {};

export function extras(k: Build): void {
  for (const b of BOARDS) {
    const { x, z } = place(b);
    stand(k, signOf(b), x, z, b[3]);
  }
}
