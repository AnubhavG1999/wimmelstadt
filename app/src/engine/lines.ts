// A road's middle line, drawn as with a pen: straight stretches and arcs, each
// with a height at its ends. From one such line come the deck, and the lane on
// either side of it, at the same height at every place along it. The plain
// stretches in paths.ts cannot say that: a ramp rises evenly along its own
// length, so the inside and the outside of a bend would part company.
//
// Headings are in degrees: 0 faces east and 90 faces south, as on the map. A
// turn by a positive angle is to the right.
//
// Japan's builder wrote this, for the pass up Fuji and for the Wangan: a road
// that climbs through hairpins, and one on stilts that goes there and back.

import type { Seg } from './paths';

export type P2 = [number, number];

export type Piece = (
  | { t: 'line'; a: P2; b: P2; y0: number; y1: number }
  /** An arc round `c`: from angle a0 to a1 in radians, as the engine's helix has them. */
  | { t: 'arc'; c: P2; r: number; a0: number; a1: number; y0: number; y1: number }
) & {
  /** How fast it is driven, where that is not the road's own speed. */
  speed?: number;
};

const RAD = Math.PI / 180;

/** Where a line of pieces ends, and which way it is heading there. */
export interface End { x: number; z: number; heading: number; y: number }

/** A pen that draws a line of pieces. */
export class Trace {
  readonly pieces: Piece[] = [];
  x: number;
  z: number;
  /** In degrees. */
  heading: number;
  y: number;

  constructor(x: number, z: number, heading: number, y = 0) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.y = y;
  }

  /** Straight on for `len`, ending at height `y`. */
  go(len: number, y = this.y): this {
    if (len <= 1e-6) {
      this.y = y;
      return this;
    }
    const h = this.heading * RAD;
    const nx = this.x + Math.cos(h) * len, nz = this.z + Math.sin(h) * len;
    this.pieces.push({ t: 'line', a: [this.x, this.z], b: [nx, nz], y0: this.y, y1: y });
    this.x = nx;
    this.z = nz;
    this.y = y;
    return this;
  }

  /** Straight on until x (or z) reaches a value. The pen must be heading along that axis. */
  goToX(x: number, y = this.y): this {
    return this.go(Math.abs(x - this.x), y);
  }
  goToZ(z: number, y = this.y): this {
    return this.go(Math.abs(z - this.z), y);
  }

  /** Round a bend of radius `r`: to the right if `deg` is positive, to the left if negative. */
  turn(deg: number, r: number, y = this.y): this {
    const s = Math.sign(deg) || 1;
    const h = this.heading * RAD;
    // the middle of the bend is to the right of the way it heads, for a right turn
    const cx = this.x - Math.sin(h) * r * s, cz = this.z + Math.cos(h) * r * s;
    const a0 = h - (s * Math.PI) / 2, a1 = a0 + deg * RAD;
    this.pieces.push({ t: 'arc', c: [cx, cz], r, a0, a1, y0: this.y, y1: y });
    this.x = cx + Math.cos(a1) * r;
    this.z = cz + Math.sin(a1) * r;
    this.heading += deg;
    this.y = y;
    return this;
  }

  /**
   * Turns round to come back alongside: a loop to the right that ends heading
   * the other way, `gap` to the right of where it began. It swings out to the
   * left first, as a lorry does, so that the loop can be wider than the gap.
   */
  loopBack(gap: number, r: number, y = this.y): this {
    const a = Math.acos(Math.min(1, (gap / 2 + r) / (2 * r))) / RAD;
    const y0 = this.y, total = 180 + 4 * a;
    const at = (deg: number): number => y0 + ((y - y0) * deg) / total;
    return this.turn(-a, r, at(a)).turn(180 + 2 * a, r, at(180 + 3 * a)).turn(-a, r, y);
  }

  get end(): End {
    return { x: this.x, z: this.z, heading: this.heading, y: this.y };
  }
}

/** How long a piece is, measured on the ground. */
export function lengthOf(p: Piece): number {
  return p.t === 'line' ? Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) : Math.abs(p.a1 - p.a0) * p.r;
}

export function totalLength(pieces: Piece[]): number {
  return pieces.reduce((s, p) => s + lengthOf(p), 0);
}

/**
 * The same line, moved `off` to the left of the way it runs (to the right if
 * negative). Heights stay as they are, so a lane made this way lies on the deck
 * made from the line itself.
 */
export function lane(pieces: Piece[], off: number): Piece[] {
  return pieces.map((p): Piece => {
    if (p.t === 'line') {
      const dx = p.b[0] - p.a[0], dz = p.b[1] - p.a[1], l = Math.hypot(dx, dz) || 1;
      const lx = (dz / l) * off, lz = (-dx / l) * off; // to the left of the way it runs
      return { ...p, a: [p.a[0] + lx, p.a[1] + lz], b: [p.b[0] + lx, p.b[1] + lz] };
    }
    // on a bend to the right the left side is the outside
    return { ...p, r: p.a1 > p.a0 ? p.r + off : p.r - off };
  });
}

/** The same line, run the other way. */
export function back(pieces: Piece[]): Piece[] {
  return [...pieces].reverse().map((p): Piece =>
    p.t === 'line' ? { ...p, a: p.b, b: p.a, y0: p.y1, y1: p.y0 } : { ...p, a0: p.a1, a1: p.a0, y0: p.y1, y1: p.y0 });
}

/** Where a line of pieces starts or ends, and which way it heads there. */
export function endOf(pieces: Piece[], start = false): End {
  const p = start ? pieces[0] : pieces[pieces.length - 1];
  if (p.t === 'line') {
    const heading = Math.atan2(p.b[1] - p.a[1], p.b[0] - p.a[0]) / RAD;
    const q = start ? p.a : p.b;
    return { x: q[0], z: q[1], heading, y: start ? p.y0 : p.y1 };
  }
  const a = start ? p.a0 : p.a1, s = p.a1 > p.a0 ? 1 : -1;
  return { x: p.c[0] + Math.cos(a) * p.r, z: p.c[1] + Math.sin(a) * p.r, heading: a / RAD + s * 90, y: start ? p.y0 : p.y1 };
}

/** A pen that goes on from where a line of pieces ends. */
export function from(e: End): Trace {
  return new Trace(e.x, e.z, e.heading, e.y);
}

/** The pieces as stretches the engine's paths are built from. */
export function toSegs(pieces: Piece[]): Seg[] {
  return pieces.map((p): Seg =>
    p.t === 'line'
      ? { t: 'ramp', pts: [p.a, p.b], y0: p.y0, y1: p.y1, r: 0, speed: p.speed }
      : { t: 'helix', cx: p.c[0], cz: p.c[1], R: p.r, phi0: p.a0, phi1: p.a1, y0: p.y0, y1: p.y1, speed: p.speed });
}

/** The same pieces, driven at a speed of their own. */
export function paced(pieces: Piece[], speed: number): Piece[] {
  return pieces.map((p) => ({ ...p, speed }));
}

/** Points along a line of pieces, about `step` apart: [x, y, z]. */
export function sample(pieces: Piece[], step = 1): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const p of pieces) {
    const n = Math.max(1, Math.ceil(lengthOf(p) / step));
    for (let i = out.length === 0 ? 0 : 1; i <= n; i++) {
      const u = i / n, y = p.y0 + (p.y1 - p.y0) * u;
      if (p.t === 'line') out.push([p.a[0] + (p.b[0] - p.a[0]) * u, y, p.a[1] + (p.b[1] - p.a[1]) * u]);
      else {
        const a = p.a0 + (p.a1 - p.a0) * u;
        out.push([p.c[0] + Math.cos(a) * p.r, y, p.c[1] + Math.sin(a) * p.r]);
      }
    }
  }
  return out;
}

/**
 * A road that goes there and back along one line, keeping to the left: out in
 * the lane `off` to the left of the line, round a loop at the far end, back in
 * the lane on the other side, and round a loop at the near end. `rFar` and
 * `rNear` are how wide the two loops are.
 */
export function thereAndBack(line: Piece[], off: number, rFar: number, rNear: number): Piece[] {
  const out = lane(line, off);
  const far = from(endOf(out)).loopBack(2 * off, rFar).pieces;
  const home = lane(back(line), off);
  const near = from(endOf(home)).loopBack(2 * off, rNear).pieces;
  return [...out, ...far, ...home, ...near];
}
