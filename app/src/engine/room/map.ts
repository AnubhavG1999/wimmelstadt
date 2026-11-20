// The old map of the world that lies on the collector's desk, under the table
// the tiles stand on. It is drawn as the double-hemisphere maps of the
// seventeenth century were: the New World on the left and the Old World on the
// right, each a round picture, with the two poles in the corners above and
// below, a compass rose, and washes of colour along the coasts.
//
// Nearly all of it is painted once on a sheet, in two dimensions. Only the
// coasts and the compass rose are also built as shapes, which stay sharp when
// the view comes close. The coastlines are Natural Earth's: see land.ts.

import * as THREE from 'three';
import { GeoBuilder, rng } from '../geo';
import type { Rect } from '../tile';
import { LAND } from './land';
import { roomToon } from './look';

/** One of the map's round pictures of the world. */
interface Disc {
  /** Where its middle is on the desk, and how large it is. */
  cx: number;
  cz: number;
  r: number;
  /** The place in its middle, in degrees. */
  lon0: number;
  lat0: number;
  /** How far from its middle it shows, in degrees: 90 is half the world. */
  reach: number;
}

export interface WorldMap {
  /** The ground the sheet covers. */
  sheet: Rect;
  /** How large its two great round pictures are. */
  r: number;
  /** The sheet, and what is drawn on it as shapes. */
  group: THREE.Group;
  /** The ink that is only worth drawing while the view is near. */
  fine: THREE.Object3D;
  /** Where a place in the world is on the sheet. */
  place(lon: number, lat: number): { x: number; z: number } | null;
  /** The middles of the sheet's four corner ornaments, where nothing tall should stand, and of the clear margins, where something may. */
  rose: { x: number; z: number; r: number };
}

/** A place a tile stands for, to be marked on the map. One that is in no atlas brings its own land, and words to letter beside it. */
export interface MapPin { name: string; lon: number; lat: number; land?: [number, number][]; words?: string }

/** A coast, as longitude and latitude in turn, in hundredths of a degree. */
type Coast = readonly number[];

const RAD = Math.PI / 180;
const INK = '#4a3524';

/**
 * Where a place falls on a disc, as shares of its radius east and north of
 * its middle, and how far from the middle it is in degrees. The drawing is
 * stereographic, as on the old maps: shapes keep their angles, and the middle
 * is drawn smaller than the rim.
 */
function project(d: Disc, lon: number, lat: number): { x: number; y: number; c: number } {
  const la = lat * RAD, la0 = d.lat0 * RAD, dl = (lon - d.lon0) * RAD;
  const cosc = Math.sin(la0) * Math.sin(la) + Math.cos(la0) * Math.cos(la) * Math.cos(dl);
  // The far side of the world would run off to infinity. It is held a long
  // way off instead, which is all that a coast needs to be filled rightly.
  const k = 1 / (1 + Math.max(cosc, -0.985)) / Math.tan((d.reach * RAD) / 2);
  return {
    x: k * Math.cos(la) * Math.sin(dl),
    y: k * (Math.cos(la0) * Math.sin(la) - Math.sin(la0) * Math.cos(la) * Math.cos(dl)),
    c: Math.acos(Math.min(1, Math.max(-1, cosc))) / RAD,
  };
}

/** The sheet and everything on it, laid out round the table: `tray` is the ground the table covers. */
function layOut(tray: Rect): { sheet: Rect; r: number; west: Disc; east: Disc; north: Disc; south: Disc; rose: { x: number; z: number; r: number }; panel: Rect; title: { x: number; z: number; w: number }; foot: { x: number; z: number } } {
  const mx = (tray.x0 + tray.x1) / 2, mz = (tray.z0 + tray.z1) / 2, tx = (tray.x1 - tray.x0) / 2, tz = (tray.z1 - tray.z0) / 2;
  const r = Math.min(400, Math.max(150, tz * 0.98)), gap = r * 0.14;
  const hx = tx + gap + 2 * r + r * 0.42, hz = Math.max(tz, r) + r * 0.52;
  const sheet: Rect = { x0: mx - hx, z0: mz - hz, x1: mx + hx, z1: mz + hz };
  const off = tx + gap + r, small = r * 0.3, in0 = small + r * 0.17;
  return {
    sheet, r,
    // the old division of the world: the two halves meet at 20 degrees west and 160 east
    west: { cx: mx - off, cz: mz, r, lon0: -110, lat0: 0, reach: 90 },
    east: { cx: mx + off, cz: mz, r, lon0: 70, lat0: 0, reach: 90 },
    north: { cx: sheet.x0 + in0, cz: sheet.z0 + in0, r: small, lon0: 0, lat0: 90, reach: 50 },
    south: { cx: sheet.x0 + in0, cz: sheet.z1 - in0, r: small, lon0: 0, lat0: -90, reach: 50 },
    rose: { x: sheet.x1 - in0, z: sheet.z0 + in0, r: small },
    panel: { x0: sheet.x1 - in0 - small * 1.05, z0: sheet.z1 - in0 - small * 0.62, x1: sheet.x1 - in0 + small * 1.05, z1: sheet.z1 - in0 + small * 0.62 },
    title: { x: mx, z: (sheet.z0 + r * 0.1 + tray.z0) / 2, w: 2 * (tx + gap) },
    foot: { x: mx, z: (sheet.z1 - r * 0.1 + tray.z1) / 2 },
  };
}

/** Lettering with air between the letters, as engraved capitals have, centred on a place. Returns how wide it came out. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, air: number): number {
  const widths = [...text].map((ch) => ctx.measureText(ch).width + air);
  const total = widths.reduce((s, w) => s + w, 0) - air;
  let at = x - total / 2;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, at, y);
    at += widths[i];
  });
  return total;
}

/** Paints the sheet. `px` is how many points of the picture go to one unit of the desk. */
function paint(L: ReturnType<typeof layOut>, tray: Rect, lands: Coast[], pins: MapPin[], place: WorldMap['place'], px: number): HTMLCanvasElement {
  const { sheet, r } = L;
  const W = Math.round((sheet.x1 - sheet.x0) * px), H = Math.round((sheet.z1 - sheet.z0) * px);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const X = (x: number): number => (x - sheet.x0) * px, Z = (z: number): number => (z - sheet.z0) * px;
  /** A length on the desk, in points of the picture. */
  const u = (n: number): number => n * px;
  /** A length that is so many thousandths of the great discs' radius. */
  const k = (n: number): number => (n / 1000) * r * px;
  const rand = rng(1651);
  const serif = 'Georgia, "Times New Roman", serif';

  // --- the paper: old, a little yellowed, darker towards its edges ---
  ctx.fillStyle = '#dfcc9d';
  ctx.fillRect(0, 0, W, H);
  // clouds of lighter and darker paper
  for (let i = 0; i < 520; i++) {
    const x = rand() * W, y = rand() * H, rr = k(60 + rand() * 260), dark = rand() < 0.55;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, dark ? 'rgba(146, 106, 58, 0.12)' : 'rgba(255, 244, 208, 0.13)');
    g.addColorStop(1, dark ? 'rgba(150, 112, 62, 0)' : 'rgba(255, 246, 214, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // foxing: the small brown spots of old paper
  for (let i = 0; i < 260; i++) {
    const x = rand() * W, y = rand() * H, rr = k(2 + rand() * 9);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, `rgba(120, 78, 38, ${0.06 + rand() * 0.12})`);
    g.addColorStop(1, 'rgba(120, 78, 38, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  // the edges, browned by the years
  for (const [x0, y0, x1, y1] of [[0, 0, k(210), 0], [W, 0, W - k(210), 0], [0, 0, 0, k(210)], [0, H, 0, H - k(210)]]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, 'rgba(112, 74, 36, 0.4)');
    g.addColorStop(0.45, 'rgba(112, 74, 36, 0.09)');
    g.addColorStop(1, 'rgba(112, 74, 36, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // --- lines of bearing, ruled from the compass rose and from two other points, as on a sea chart ---
  ctx.lineWidth = Math.max(1, k(1.6));
  for (const [fx, fz, alpha] of [[L.rose.x, L.rose.z, 0.2], [L.title.x, sheet.z0 + r * 0.1, 0.11], [L.foot.x, sheet.z1 - r * 0.1, 0.11]]) {
    ctx.strokeStyle = `rgba(92, 64, 40, ${alpha})`;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(X(fx), Z(fz));
      ctx.lineTo(X(fx) + Math.cos(a) * W * 2, Z(fz) + Math.sin(a) * W * 2);
      ctx.stroke();
    }
  }

  // --- the round pictures of the world ---
  const world = (d: Disc, fineness: number): void => {
    const at = (lon: number, lat: number): [number, number, number] => {
      const p = project(d, lon, lat);
      return [X(d.cx + d.r * p.x), Z(d.cz - d.r * p.y), p.c];
    };
    // every coast that comes into the picture, or near it
    const coast = new Path2D();
    for (const ring of lands) {
      const pts: [number, number, number][] = [];
      for (let i = 0; i < ring.length; i += 2) pts.push(at(ring[i] / 100, ring[i + 1] / 100));
      if (!pts.some((p) => p[2] < d.reach + 20)) continue;
      pts.forEach((p, i) => (i ? coast.lineTo(p[0], p[1]) : coast.moveTo(p[0], p[1])));
      coast.closePath();
    }
    const cx = X(d.cx), cz = Z(d.cz), R = u(d.r), q = fineness;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cz, R, 0, Math.PI * 2);
    ctx.clip();
    // the sea: a thin wash, deeper where it meets the land
    ctx.fillStyle = 'rgba(116, 158, 156, 0.38)';
    ctx.fillRect(cx - R, cz - R, R * 2, R * 2);
    ctx.lineJoin = 'round';
    for (const [w, a] of [[46, 0.08], [30, 0.1], [16, 0.12], [7, 0.15]]) {
      ctx.lineWidth = k(w) * q;
      ctx.strokeStyle = `rgba(62, 112, 122, ${a})`;
      ctx.stroke(coast);
    }
    // the land: bare paper, a shade warmer
    ctx.fillStyle = '#e5d2a0';
    ctx.fill(coast, 'evenodd');
    ctx.save();
    ctx.clip(coast, 'evenodd');
    // each part of the world in a wash of its own, as a colourist would lay it
    const washes: [number, number, number, string][] = [
      [-100, 48, 0.62, '203, 122, 104'], [-60, -15, 0.5, '128, 160, 104'], [-42, 74, 0.26, '176, 190, 190'],
      [18, 5, 0.6, '214, 168, 84'], [12, 50, 0.3, '200, 116, 110'], [95, 48, 0.75, '136, 158, 98'], [78, 22, 0.24, '214, 150, 92'],
      [134, -25, 0.34, '216, 146, 88'], [115, 2, 0.25, '200, 116, 110'], [0, -82, 0.6, '186, 198, 200'], [140, 38, 0.14, '203, 122, 104'],
    ];
    for (const [lon, lat, size, rgb] of washes) {
      const [x, y, c] = at(lon, lat);
      if (c > d.reach + 30) continue;
      const rr = R * size * q;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(${rgb}, 0.44)`);
      g.addColorStop(0.7, `rgba(${rgb}, 0.27)`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    // and a darker edge just inside every coast
    for (const [w, a] of [[26, 0.13], [12, 0.17]]) {
      ctx.lineWidth = k(w) * q;
      ctx.strokeStyle = `rgba(138, 84, 44, ${a})`;
      ctx.stroke(coast);
    }
    ctx.restore();

    // the net of meridians and parallels
    const line = (pts: [number, number, number][], dash: number[] = []): void => {
      ctx.setLineDash(dash);
      ctx.beginPath();
      let pen = false;
      for (const p of pts) {
        if (p[2] > d.reach + 1) { pen = false; continue; }
        if (pen) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
        pen = true;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const polar = Math.abs(d.lat0) > 45;
    ctx.strokeStyle = 'rgba(74, 53, 36, 0.3)';
    ctx.lineWidth = Math.max(0.8, k(1.5));
    for (let lon = -180; lon < 180; lon += polar ? 30 : 15) {
      const pts: [number, number, number][] = [];
      for (let lat = -90; lat <= 90; lat += 2) pts.push(at(lon, lat));
      line(pts);
    }
    for (let lat = -75; lat <= 75; lat += polar ? 10 : 15) {
      if (lat === 0) continue;
      const pts: [number, number, number][] = [];
      for (let lon = -180; lon <= 180; lon += 2) pts.push(at(lon, lat));
      line(pts);
    }
    // the equator, the tropics and the polar circles
    for (const [lat, w, dash] of [[0, 3, 0], [23.44, 1.8, 1], [-23.44, 1.8, 1], [66.56, 1.8, 1], [-66.56, 1.8, 1]]) {
      const pts: [number, number, number][] = [];
      for (let lon = -180; lon <= 180; lon += 2) pts.push(at(lon, lat));
      ctx.strokeStyle = 'rgba(74, 53, 36, 0.5)';
      ctx.lineWidth = Math.max(0.9, k(w));
      line(pts, dash ? [k(9), k(7)] : []);
    }
    // the coasts, in ink
    ctx.strokeStyle = 'rgba(64, 44, 28, 0.9)';
    ctx.lineWidth = Math.max(1, k(2.1));
    ctx.stroke(coast);
    ctx.restore();

    // its rim: two rings, with a band between them divided like a ruler
    const band0 = R + k(9) * q, band1 = R + k(24) * q;
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
    ctx.lineWidth = Math.max(1.2, k(3.2) * q);
    ctx.beginPath();
    ctx.arc(cx, cz, R, 0, Math.PI * 2);
    ctx.stroke();
    const keys = polar ? 36 : 72;
    for (let i = 0; i < keys; i += 2) {
      const a0 = (i / keys) * Math.PI * 2, a1 = ((i + 1) / keys) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cz, band1, a0, a1);
      ctx.arc(cx, cz, band0, a1, a0, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineWidth = Math.max(1, k(2) * q);
    for (const rr of [band0, band1]) {
      ctx.beginPath();
      ctx.arc(cx, cz, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1.4, k(4.4) * q);
    ctx.beginPath();
    ctx.arc(cx, cz, band1 + k(9) * q, 0, Math.PI * 2);
    ctx.stroke();
  };
  world(L.west, 1);
  world(L.east, 1);
  world(L.north, 0.62);
  world(L.south, 0.62);

  // --- lettering ---
  ctx.textBaseline = 'middle';
  const named = (d: Disc, text: string, lon: number, lat: number, size: number, style: 'land' | 'sea'): void => {
    const p = project(d, lon, lat);
    ctx.font = `${style === 'sea' ? 'italic ' : ''}${Math.round(k(size))}px ${serif}`;
    ctx.fillStyle = style === 'sea' ? 'rgba(52, 84, 96, 0.82)' : 'rgba(64, 44, 28, 0.86)';
    text.split('\n').forEach((row, i, rows) => {
      spaced(ctx, row, X(d.cx + d.r * p.x), Z(d.cz - d.r * p.y) + (i - (rows.length - 1) / 2) * k(size * 1.25), k(size * (style === 'sea' ? 0.3 : 0.42)));
    });
  };
  named(L.west, 'AMERICA\nSEPTENTRIONALIS', -103, 50, 30, 'land');
  named(L.west, 'AMERICA\nMERIDIONALIS', -59, -12, 28, 'land');
  named(L.west, 'MARE PACIFICUM', -150, -28, 34, 'sea');
  named(L.west, 'OCEANUS\nATLANTICUS', -44, 30, 26, 'sea');
  named(L.east, 'EUROPA', 24, 53, 26, 'land');
  named(L.east, 'AFRICA', 20, 9, 40, 'land');
  named(L.east, 'ASIA', 92, 50, 46, 'land');
  named(L.east, 'NOVA\nHOLLANDIA', 134, -25, 22, 'land');
  named(L.east, 'OCEANUS INDICUS', 76, -30, 30, 'sea');
  named(L.east, 'MARE\nPACIFICUM', 152, 14, 22, 'sea');
  // --- what the old maps put in an empty sea: a ship under sail, and a serpent ---
  const sea = (d: Disc, lon: number, lat: number, size: number, draw: () => void): void => {
    const p = project(d, lon, lat);
    ctx.save();
    ctx.translate(X(d.cx + d.r * p.x), Z(d.cz - d.r * p.y));
    ctx.scale(k(size), k(size));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    draw();
    // the water it rides on
    ctx.strokeStyle = 'rgba(52, 84, 96, 0.65)';
    ctx.lineWidth = 0.018;
    for (const [wx, wy] of [[-0.66, 0.2], [-0.22, 0.27], [0.24, 0.26], [0.68, 0.2], [-0.44, 0.36], [0.06, 0.38], [0.5, 0.36]]) {
      ctx.beginPath();
      ctx.arc(wx, wy, 0.07, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.restore();
  };
  sea(L.east, 93, -44, 150, () => {
    ctx.strokeStyle = 'rgba(64, 44, 28, 0.9)';
    ctx.lineWidth = 0.022;
    // the hull, high at the stern
    ctx.beginPath();
    ctx.moveTo(-0.54, -0.17);
    ctx.lineTo(-0.5, 0.03);
    ctx.quadraticCurveTo(-0.3, 0.2, 0, 0.2);
    ctx.quadraticCurveTo(0.34, 0.2, 0.5, -0.04);
    ctx.lineTo(0.66, -0.12);
    ctx.lineTo(0.3, -0.03);
    ctx.lineTo(-0.3, -0.03);
    ctx.lineTo(-0.34, -0.17);
    ctx.closePath();
    ctx.fillStyle = 'rgba(122, 84, 48, 0.6)';
    ctx.fill();
    ctx.stroke();
    // three masts, each with two sails that belly out ahead, and a pennant
    for (const [mx, top, wide] of [[-0.3, -0.62, 0.2], [0, -0.84, 0.27], [0.3, -0.6, 0.2]]) {
      ctx.beginPath();
      ctx.moveTo(mx, -0.03);
      ctx.lineTo(mx, top - 0.09);
      ctx.stroke();
      for (const [y0, y1, w] of [[top, top + 0.27, wide * 0.8], [top + 0.31, -0.1, wide]]) {
        ctx.beginPath();
        ctx.moveTo(mx - w / 2, y0);
        ctx.lineTo(mx + w / 2, y0);
        ctx.quadraticCurveTo(mx + w / 2 + 0.09, (y0 + y1) / 2, mx + w / 2, y1);
        ctx.lineTo(mx - w / 2, y1);
        ctx.quadraticCurveTo(mx - w / 2 + 0.09, (y0 + y1) / 2, mx - w / 2, y0);
        ctx.fillStyle = 'rgba(245, 237, 210, 0.92)';
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(mx, top - 0.09);
      ctx.lineTo(mx + 0.13, top - 0.055);
      ctx.lineTo(mx, top - 0.02);
      ctx.fillStyle = 'rgba(158, 36, 30, 0.85)';
      ctx.fill();
    }
  });
  sea(L.west, -118, -47, 150, () => {
    ctx.strokeStyle = 'rgba(40, 56, 46, 0.9)';
    ctx.fillStyle = 'rgba(92, 136, 116, 0.62)';
    ctx.lineWidth = 0.02;
    // coils that rise out of the sea and go under again, smaller towards the tail
    for (const [cx, rr] of [[-0.56, 0.1], [-0.3, 0.14], [0.02, 0.18]]) {
      ctx.beginPath();
      ctx.arc(cx, 0.16, rr, Math.PI, 0);
      ctx.arc(cx, 0.16, rr * 0.5, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // the tip of the tail
    ctx.beginPath();
    ctx.moveTo(-0.74, 0.16);
    ctx.quadraticCurveTo(-0.8, -0.02, -0.7, -0.08);
    ctx.quadraticCurveTo(-0.72, 0.04, -0.69, 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // the neck, and a head with its jaws apart
    ctx.beginPath();
    ctx.moveTo(0.26, 0.16);
    ctx.quadraticCurveTo(0.24, -0.26, 0.44, -0.32);
    ctx.quadraticCurveTo(0.62, -0.36, 0.72, -0.24);
    ctx.lineTo(0.54, -0.21);
    ctx.lineTo(0.68, -0.13);
    ctx.quadraticCurveTo(0.5, -0.12, 0.44, 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // its eye, and the fin down its neck
    ctx.fillStyle = 'rgba(30, 30, 24, 0.95)';
    ctx.beginPath();
    ctx.arc(0.52, -0.27, 0.018, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const fy = -0.2 + i * 0.09, fx = 0.27 - i * 0.004;
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx - 0.07, fy + 0.02);
      ctx.lineTo(fx + 0.005, fy + 0.07);
    }
    ctx.stroke();
  });

  // what each round picture is
  ctx.fillStyle = INK;
  for (const [d, text, size] of [[L.west, 'HEMISPHAERIUM OCCIDENTALE', 36], [L.east, 'HEMISPHAERIUM ORIENTALE', 36], [L.north, 'POLUS ARCTICUS', 22], [L.south, 'POLUS ANTARCTICUS', 22]] as [Disc, string, number][]) {
    ctx.font = `${Math.round(k(size))}px ${serif}`;
    const below = d === L.south ? -1 : 1;
    spaced(ctx, text, X(d.cx), Z(d.cz - below * (d.r + (d.r > r * 0.5 ? r * 0.24 : r * 0.17))), k(size * 0.4));
  }

  // --- the title, above the table, and the imprint below it ---
  ctx.fillStyle = INK;
  ctx.font = `${Math.round(k(118))}px ${serif}`;
  const tw = spaced(ctx, 'ORBIS TERRARUM', X(L.title.x), Z(L.title.z) - k(34), k(34));
  ctx.strokeStyle = INK;
  for (const [dy, w] of [[40, 3], [50, 1.4]]) {
    ctx.lineWidth = Math.max(1, k(w));
    ctx.beginPath();
    ctx.moveTo(X(L.title.x) - tw * 0.36, Z(L.title.z) + k(dy));
    ctx.lineTo(X(L.title.x) + tw * 0.36, Z(L.title.z) + k(dy));
    ctx.stroke();
  }
  ctx.font = `italic ${Math.round(k(54))}px ${serif}`;
  ctx.fillStyle = 'rgba(74, 53, 36, 0.92)';
  ctx.textAlign = 'center';
  ctx.fillText('the world, with the places of Wimmelstadt', X(L.title.x), Z(L.title.z) + k(96));
  ctx.font = `italic ${Math.round(k(40))}px ${serif}`;
  ctx.fillStyle = 'rgba(74, 53, 36, 0.8)';
  ctx.fillText('drawn for the table of a collector of small cars', X(L.foot.x), Z(L.foot.z));

  // --- the panel in the corner: the scale of the toys ---
  {
    const p = L.panel, x0 = X(p.x0), y0 = Z(p.z0), w = X(p.x1) - x0, h = Z(p.z1) - y0, mid = x0 + w / 2;
    ctx.fillStyle = 'rgba(240, 228, 190, 0.55)';
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.2, k(3.4));
    ctx.strokeRect(x0, y0, w, h);
    ctx.lineWidth = Math.max(1, k(1.4));
    ctx.strokeRect(x0 + k(9), y0 + k(9), w - k(18), h - k(18));
    ctx.fillStyle = INK;
    ctx.font = `${Math.round(k(46))}px ${serif}`;
    spaced(ctx, 'SCALA', mid, y0 + h * 0.24, k(20));
    ctx.font = `italic ${Math.round(k(38))}px ${serif}`;
    ctx.textAlign = 'center';
    ctx.fillText('one to sixty-four', mid, y0 + h * 0.47);
    // a ruler, in lengths of a car
    const bar = w * 0.66, bx = mid - bar / 2, by = y0 + h * 0.7, bh = k(15);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#efe3bd' : INK;
      ctx.fillRect(bx + (bar * i) / 8, by, bar / 8, bh);
    }
    ctx.lineWidth = Math.max(1, k(1.6));
    ctx.strokeRect(bx, by, bar, bh);
  }

  // --- the compass rose's rings and its north (its points are built as shapes, and lie over this) ---
  {
    const cx = X(L.rose.x), cz = Z(L.rose.z), R = u(L.rose.r);
    ctx.strokeStyle = INK;
    for (const [rr, w] of [[0.9, 3.2], [0.85, 1.3], [0.5, 2.2], [0.45, 1.2]]) {
      ctx.lineWidth = Math.max(1, k(w));
      ctx.beginPath();
      ctx.arc(cx, cz, R * rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.font = `${Math.round(k(44))}px ${serif}`;
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cz - R * 0.9 - k(34));
  }

  // --- the frame: two lines, and a band of light and dark between them ---
  {
    const a = k(52), b = k(78), n = Math.round((W - 2 * a) / k(60) / 2) * 2, m = Math.round((H - 2 * a) / k(60) / 2) * 2;
    ctx.fillStyle = INK;
    for (let i = 0; i < n; i += 2) {
      const x = a + ((W - 2 * a) * i) / n, w = (W - 2 * a) / n;
      ctx.fillRect(x, a, w, b - a);
      ctx.fillRect(x + w, H - b, w, b - a);
    }
    for (let i = 0; i < m; i += 2) {
      const y = a + ((H - 2 * a) * i) / m, h = (H - 2 * a) / m;
      ctx.fillRect(a, y + h, b - a, h);
      ctx.fillRect(W - b, y, b - a, h);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, k(4.6));
    ctx.strokeRect(a, a, W - 2 * a, H - 2 * a);
    ctx.lineWidth = Math.max(1, k(2.2));
    ctx.strokeRect(b, b, W - 2 * b, H - 2 * b);
    ctx.strokeRect(b + k(11), b + k(11), W - 2 * b - k(22), H - 2 * b - k(22));
  }

  // --- the places of the tiles: a red ring round each, and its name ---
  for (const pin of pins) {
    const at = place(pin.lon, pin.lat);
    if (!at) continue;
    ctx.strokeStyle = 'rgba(158, 36, 30, 0.9)';
    ctx.lineWidth = Math.max(1.2, k(3));
    ctx.beginPath();
    ctx.arc(X(at.x), Z(at.z), k(15), 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `italic ${Math.round(k(31))}px ${serif}`;
    ctx.textAlign = 'left';
    // A little paper under the name, so that it reads over whatever it lies on.
    // The thread runs from the pin towards the table, so the name goes on the other side.
    const w = ctx.measureText(pin.name).width;
    const x0 = (tray.x0 + tray.x1) / 2 > at.x ? X(at.x) - k(22) - w - k(14) : X(at.x) + k(22);
    ctx.fillStyle = 'rgba(238, 226, 188, 0.72)';
    ctx.fillRect(x0, Z(at.z) - k(20), w + k(14), k(40));
    ctx.fillStyle = 'rgba(128, 26, 22, 0.95)';
    ctx.fillText(pin.name, x0 + k(7), Z(at.z) + k(1));
    if (pin.words) {
      // lettered in the sea beside it, as a chart letters a warning
      const south = Math.min(...(pin.land ?? [[0, 0]]).map((c) => c[1]));
      const below = place(pin.lon, pin.lat + south - 4) ?? at;
      ctx.font = `italic ${Math.round(k(24))}px ${serif}`;
      ctx.fillStyle = 'rgba(52, 84, 96, 0.85)';
      spaced(ctx, pin.words.toUpperCase(), X(below.x), Z(below.z), k(8));
    }
  }

  // --- creases, where the sheet was once folded ---
  for (let i = 1; i < 8; i++) {
    const x = (W * i) / 8;
    ctx.fillStyle = 'rgba(96, 66, 36, 0.13)';
    ctx.fillRect(x - k(1.2), 0, k(2.4), H);
    ctx.fillStyle = 'rgba(255, 248, 222, 0.16)';
    ctx.fillRect(x + k(1.2), 0, k(2.2), H);
  }
  ctx.fillStyle = 'rgba(96, 66, 36, 0.13)';
  ctx.fillRect(0, H / 2 - k(1.2), W, k(2.4));
  ctx.fillStyle = 'rgba(255, 248, 222, 0.16)';
  ctx.fillRect(0, H / 2 + k(1.2), W, k(2.2));

  // --- the ring a cup once left, and the shade the table throws round itself ---
  ctx.strokeStyle = 'rgba(110, 70, 34, 0.22)';
  ctx.lineWidth = u(0.55);
  ctx.beginPath();
  ctx.arc(X(L.foot.x + r * 0.62), Z(L.foot.z - r * 0.02), u(4.3), 0.3, Math.PI * 2 - 0.5);
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = 'rgba(46, 28, 10, 0.62)';
  ctx.shadowBlur = u(13);
  ctx.fillStyle = '#3a2a1a';
  for (let i = 0; i < 2; i++) ctx.fillRect(X(tray.x0), Z(tray.z0), u(tray.x1 - tray.x0), u(tray.z1 - tray.z0));
  ctx.restore();
  return cv;
}

/** The coasts as thin strips of ink, for when the view comes close. */
function coastInk(discs: Disc[], lands: Coast[], y: number, width: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const strip = (ax: number, az: number, bx: number, bz: number): void => {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    if (len < 1e-4) return;
    const nx = (-dz / len) * width * 0.5, nz = (dx / len) * width * 0.5;
    // two triangles that face the sky
    pos.push(ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz, ax - nx, y, az - nz, ax + nx, y, az + nz, bx + nx, y, bz + nz);
  };
  for (const d of discs) {
    for (const ring of lands) {
      let last: { x: number; z: number; c: number; lon: number; lat: number } | null = null;
      for (let i = 0; i <= ring.length; i += 2) {
        const lon = ring[i % ring.length] / 100, lat = ring[(i + 1) % ring.length] / 100;
        const p = project(d, lon, lat);
        const here = { x: d.cx + d.r * p.x, z: d.cz - d.r * p.y, c: p.c, lon, lat };
        // not along the cut at 180 degrees, nor along the line that closes the south pole: neither is a coast
        const seam = last !== null && ((Math.abs(lon) > 179.98 && Math.abs(last.lon) > 179.98) || (lat < -89.9 && last.lat < -89.9));
        if (last && !seam && (last.c <= d.reach || here.c <= d.reach)) {
          let a = last, b = here;
          if (a.c > d.reach || b.c > d.reach) {
            // it crosses the rim: only the part inside is drawn
            const inside = a.c <= d.reach ? a : b, outside = a.c <= d.reach ? b : a;
            const t = (d.reach - inside.c) / (outside.c - inside.c);
            const cut = { ...outside, x: inside.x + (outside.x - inside.x) * t, z: inside.z + (outside.z - inside.z) * t };
            a = inside;
            b = cut;
          }
          strip(a.x, a.z, b.x, b.z);
        }
        last = here;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}

/** The points of the compass rose: sixteen of them, each half dark and half light. */
function rosePoints(cx: number, cz: number, r: number, y: number): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const DARK = 0x3f2d20, LIGHT = 0xf0e4c0, RED = 0x8d3a2c, TEAL = 0x3d6a68, GOLD = 0xb98a2e;
  // the shortest first, so that the long ones lie over them
  const rounds: [number, number, number, number, number][] = [[8, 22.5, 0.5, 0.07, TEAL], [4, 45, 0.74, 0.1, RED], [4, 0, 1, 0.13, DARK]];
  rounds.forEach(([count, first, long, wide, dark], layer) => {
    for (let i = 0; i < count; i++) {
      // north is towards the top of the sheet, which is the far side of the desk
      const a = ((first + (i * 360) / count) * Math.PI) / 180, h = y + layer * 0.012;
      const tip: [number, number, number] = [cx + Math.sin(a) * r * long, h, cz - Math.cos(a) * r * long];
      const side = (s: number): [number, number, number] => [cx + Math.sin(a + s * 0.78) * r * wide, h, cz - Math.cos(a + s * 0.78) * r * wide];
      b.up([cx, h, cz], side(-1), tip, dark);
      b.up([cx, h, cz], side(1), tip, LIGHT);
    }
  });
  b.cyl(cx, cz, y, y + 0.05, r * 0.05, r * 0.05, 20, GOLD, { cap: GOLD });
  return b.build();
}

/**
 * Builds the map for a table that covers `tray`, with its surface at height
 * `y`. `pins` are the places of the tiles. A small screen gets a smaller
 * picture.
 */
export function buildWorldMap(tray: Rect, y: number, pins: MapPin[], small: boolean): WorldMap {
  const L = layOut(tray);
  const { sheet } = L;
  const place: WorldMap['place'] = (lon, lat) => {
    for (const d of [L.west, L.east]) {
      const p = project(d, lon, lat);
      if (p.c <= d.reach) return { x: d.cx + d.r * p.x, z: d.cz - d.r * p.y };
    }
    return null;
  };
  // the coasts of the world, and those of any place that brought its own
  const lands: Coast[] = [...LAND, ...pins.flatMap((p) => (p.land ? [p.land.flatMap(([east, north]) => [Math.round((p.lon + east) * 100), Math.round((p.lat + north) * 100)])] : []))];
  const wide = sheet.x1 - sheet.x0;
  const canvas = paint(L, tray, lands, pins, place, (small ? 2048 : 4096) / wide);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;

  const group = new THREE.Group();
  const paper = new THREE.BufferGeometry();
  paper.setAttribute('position', new THREE.Float32BufferAttribute([sheet.x0, y, sheet.z1, sheet.x1, y, sheet.z1, sheet.x1, y, sheet.z0, sheet.x0, y, sheet.z1, sheet.x1, y, sheet.z0, sheet.x0, y, sheet.z0], 3));
  paper.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  paper.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
  group.add(new THREE.Mesh(paper, roomToon({ vertexColors: false, map: tex }, { kind: 'paper' })));

  const fine = new THREE.Mesh(coastInk([L.west, L.east, L.north, L.south], lands, y + 0.03, Math.max(0.3, L.r * 0.0016)), roomToon({ vertexColors: false, color: 0x3a2618 }));
  group.add(fine);
  group.add(new THREE.Mesh(rosePoints(L.rose.x, L.rose.z, L.rose.r * 0.82, y + 0.04), roomToon()));
  group.traverse((o) => o.layers.set(1));
  return { sheet, r: L.r, group, fine, place, rose: L.rose };
}
