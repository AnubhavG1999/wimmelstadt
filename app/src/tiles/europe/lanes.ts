// Lanes: the lines that roads are drawn along and that vehicles follow, made
// from straights and circles joined by bends.
//
// The engine's own stretches of road round every corner with one radius. That
// is enough for a grid. Europe's roads go round roundabouts, leave them by
// avenues at any angle and bend along a river, so here a road is a list of
// guides (a straight, or a circle driven round one way) and the bends between
// them are worked out. A lane beside the middle of a road is the same list,
// moved to one side.
//
// On the map, east is +x and south is +z. "Clockwise" is as seen from above
// with north at the top: east, south, west, north. Angles are measured that
// way round from east, which is how the engine's helix measures them.

import type { Seg } from '../../engine/paths';

export type P2 = [number, number];

/** What a lane follows between two bends. */
export type Guide =
  | { t: 'line'; p: P2; d: P2 }
  | { t: 'circle'; c: P2; r: number; cw: boolean };

/** A guide, and the bend that leads from it into the next one. */
export interface Step {
  g: Guide;
  /** The radius of the bend into the next guide. 0 is a sharp corner. */
  r?: number;
  /** Which way that bend turns: 1 to the right, -1 to the left. Worked out if left unsaid. */
  side?: 1 | -1;
  /** The height at the start of this guide and at its end. Level ground, if left unsaid. */
  y?: [number, number];
  /** How fast this guide and the bend after it are driven, in place of the road's own speed. */
  speed?: number;
}

const TAU = Math.PI * 2;
const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const along = (a: P2, d: P2, k: number): P2 => [a[0] + d[0] * k, a[1] + d[1] * k];
const dot = (a: P2, b: P2): number => a[0] * b[0] + a[1] * b[1];
const len = (a: P2): number => Math.hypot(a[0], a[1]);
/** To the right of someone heading along d. */
const rightOf = (d: P2): P2 => [-d[1], d[0]];
const angleAt = (c: P2, p: P2): number => Math.atan2(p[1] - c[1], p[0] - c[0]);
/** An angle brought into the range from just above 0 to a whole turn. */
const turnOf = (a: number): number => {
  const t = ((a % TAU) + TAU) % TAU;
  return t < 1e-9 ? TAU : t;
};

/** The straight through a, heading for b. */
export function line(a: P2, b: P2): Guide {
  const d = sub(b, a), l = len(d) || 1;
  return { t: 'line', p: a, d: [d[0] / l, d[1] / l] };
}

/** A circle, driven round clockwise or the other way. */
export function circle(c: P2, r: number, cw: boolean): Guide {
  return { t: 'circle', c, r, cw };
}

/** The same guide, moved `by` to the right of the way it is driven, or to the left if `by` is negative. */
export function shift(g: Guide, by: number): Guide {
  if (g.t === 'line') return { t: 'line', p: along(g.p, rightOf(g.d), by), d: g.d };
  // driven clockwise, the middle of the circle is on the right
  return { ...g, r: g.r + (g.cw ? -by : by) };
}

/** The same guide, driven the other way. */
export function turned(g: Guide): Guide {
  if (g.t === 'line') return { t: 'line', p: g.p, d: [-g.d[0], -g.d[1]] };
  return { ...g, cw: !g.cw };
}

/** The point of a guide nearest to p. */
function foot(g: Guide, p: P2): P2 {
  if (g.t === 'line') return along(g.p, g.d, dot(sub(p, g.p), g.d));
  const v = sub(p, g.c), l = len(v) || 1;
  return along(g.c, v, g.r / l);
}

/** Where two guides meet. A straight meets a circle twice: `first` picks the meeting that comes first along the straight. */
function meet(a: Guide, b: Guide, first: boolean, what: string): P2 {
  if (a.t === 'line' && b.t === 'line') {
    const den = a.d[0] * b.d[1] - a.d[1] * b.d[0];
    if (Math.abs(den) < 1e-9) throw new Error(`${what}: two straights that never meet`);
    const w = sub(b.p, a.p);
    return along(a.p, a.d, (w[0] * b.d[1] - w[1] * b.d[0]) / den);
  }
  if (a.t === 'circle' && b.t === 'circle') throw new Error(`${what}: a circle cannot lead straight into a circle`);
  const l = (a.t === 'line' ? a : b) as Extract<Guide, { t: 'line' }>;
  const c = (a.t === 'circle' ? a : b) as Extract<Guide, { t: 'circle' }>;
  const m = dot(sub(c.c, l.p), l.d);
  const off = len(sub(along(l.p, l.d, m), c.c));
  // a straight that only touches its circle meets it once: rounding must not make that a miss
  const h2 = Math.max(0, c.r * c.r - off * off);
  if (c.r <= 0 || off > c.r + 1e-6) throw new Error(`${what}: a straight that misses its circle`);
  return along(l.p, l.d, first ? m - Math.sqrt(h2) : m + Math.sqrt(h2));
}

interface Bend { c: P2; r: number; side: 1 | -1; from: P2; to: P2 }

/** The bend that leads from guide a into guide b. */
function bend(a: Guide, b: Guide, r: number, side: 1 | -1 | undefined, what: string): Bend {
  let s = side;
  if (!s) {
    if (a.t === 'line' && b.t === 'line') s = a.d[0] * b.d[1] - a.d[1] * b.d[0] >= 0 ? 1 : -1;
    else {
      // a roundabout is joined and left by turning away from its middle
      const c = (a.t === 'circle' ? a : b) as Extract<Guide, { t: 'circle' }>;
      s = c.cw ? -1 : 1;
    }
  }
  // the middle of the bend is r to the turning side of both guides
  const first = a.t === 'line';
  const c = meet(shift(a, s * r), shift(b, s * r), first, what);
  return { c, r, side: s, from: r > 0 ? foot(a, c) : c, to: r > 0 ? foot(b, c) : c };
}

function arc(c: P2, r: number, from: P2, to: P2, cw: boolean, y0: number, y1: number, whole = false): Seg {
  const a0 = angleAt(c, from), a1 = angleAt(c, to);
  const sweep = whole ? TAU : turnOf(cw ? a1 - a0 : a0 - a1);
  return { t: 'helix', cx: c[0], cz: c[1], R: r, phi0: a0, phi1: cw ? a0 + sweep : a0 - sweep, y0, y1 };
}

function piece(g: Guide, from: P2, to: P2, y: [number, number], what: string): Seg | null {
  if (g.t === 'line') {
    const run = dot(sub(to, from), g.d);
    if (run < -1e-6) console.warn(`${what}: a straight runs ${(-run).toFixed(1)} backwards. Its bends are too wide for it.`);
    if (len(sub(to, from)) < 1e-6) return null;
    return y[0] === y[1] ? { t: 'poly', pts: [from, to], y: y[0], r: 0 } : { t: 'ramp', pts: [from, to], y0: y[0], y1: y[1], r: 0 };
  }
  if (len(sub(to, from)) < 1e-6) return null;
  return arc(g.c, g.r, from, to, g.cw, y[0], y[1]);
}

const heightsOf = (s: Step, y: number): [number, number] => s.y ?? [y, y];
/** A stretch, driven at its step's own speed if it has one. */
const paced = (seg: Seg, s: Step): Seg => (s.speed ? { ...seg, speed: s.speed } : seg);

/** A closed lane: round every guide in turn and back to the first. */
export function loop(steps: Step[], o: { r?: number; y?: number; name?: string } = {}): Seg[] {
  const n = steps.length, what = o.name ?? 'a lane', y = o.y ?? 0;
  if (n === 1 && steps[0].g.t === 'circle') {
    const g = steps[0].g, start: P2 = [g.c[0] + g.r, g.c[1]];
    return [arc(g.c, g.r, start, start, g.cw, y, y, true)];
  }
  const bends = steps.map((s, i) => bend(s.g, steps[(i + 1) % n].g, s.r ?? o.r ?? 0, s.side, `${what}, bend ${i + 1}`));
  const out: Seg[] = [];
  steps.forEach((s, i) => {
    const before = bends[(i + n - 1) % n], after = bends[i], h = heightsOf(s, y);
    const p = piece(s.g, before.to, after.from, h, `${what}, guide ${i + 1}`);
    if (p) out.push(paced(p, s));
    // a bend climbs, if the guide it leads into starts higher or lower than this one ends
    if (after.r > 0) out.push(paced(arc(after.c, after.r, after.from, after.to, after.side > 0, h[1], heightsOf(steps[(i + 1) % n], y)[0]), s));
  });
  return out;
}

/** An open lane: from `from` along every guide in turn to `to`. Both ends are moved onto their guides. */
export function run(from: P2, steps: Step[], to: P2, o: { r?: number; y?: number; name?: string } = {}): Seg[] {
  const n = steps.length, what = o.name ?? 'a lane', y = o.y ?? 0;
  const bends = steps.slice(0, -1).map((s, i) => bend(s.g, steps[i + 1].g, s.r ?? o.r ?? 0, s.side, `${what}, bend ${i + 1}`));
  const out: Seg[] = [];
  steps.forEach((s, i) => {
    const a = i === 0 ? foot(s.g, from) : bends[i - 1].to, b = i === n - 1 ? foot(s.g, to) : bends[i].from, h = heightsOf(s, y);
    const p = piece(s.g, a, b, h, `${what}, guide ${i + 1}`);
    if (p) out.push(paced(p, s));
    const after = bends[i];
    if (after && after.r > 0) out.push(paced(arc(after.c, after.r, after.from, after.to, after.side > 0, h[1], heightsOf(steps[i + 1], y)[0]), s));
  });
  return out;
}

/**
 * The same road, `by` to the right of its middle (to the left if negative).
 * Its bends keep the middles they had, so lanes stay side by side round them.
 */
export function beside(steps: Step[], by: number, o: { r?: number } = {}): Step[] {
  const n = steps.length;
  return steps.map((s, i) => {
    const next = steps[(i + 1) % n];
    const r = s.r ?? o.r ?? 0;
    let side = s.side;
    if (!side) {
      if (s.g.t === 'line' && next.g.t === 'line') side = s.g.d[0] * next.g.d[1] - s.g.d[1] * next.g.d[0] >= 0 ? 1 : -1;
      else {
        const c = (s.g.t === 'circle' ? s.g : next.g) as Extract<Guide, { t: 'circle' }>;
        side = c.cw ? -1 : 1;
      }
    }
    return { ...s, g: shift(s.g, by), r: r > 0 ? Math.max(0.5, r - side * by) : 0, side };
  });
}

/** The same road, driven the other way. */
export function backwards(steps: Step[]): Step[] {
  const n = steps.length;
  // the bend that led from guide i into guide i + 1 now leads from i + 1 into i
  return steps.map((_, k) => {
    const i = n - 1 - k, into = steps[(i + n - 1) % n];
    const s = steps[i];
    return { g: turned(s.g), r: into.r, side: into.side ? (-into.side as 1 | -1) : undefined, y: s.y ? [s.y[1], s.y[0]] : undefined };
  });
}
