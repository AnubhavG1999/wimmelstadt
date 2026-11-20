// Agea's commercial district: kilometre-high blades of steel and glass on a podium, a garden of jewelled blades by night, with Tryst and Temptation, the clubs on their roofs, and the screen.
//
// The books give the towers as kilometre-high skyscrapers of steel and glass
// that by night look like a garden of jewelled blades (RR 16; GS 41), in the
// commercial district south of the north wall (GS 41); the noise bubbles that
// keep each block's sound in (RR 16); and the rooftop clubs, Tryst and
// Temptation (RR 16), Tryst with gravity floors that let its dancers float
// (RR 15). Every shape here is this tile's own drawing: the books give none.
//
// Each tower is a shape of its own, and each has a jewel of its own by night,
// in the light up its edges, in its sky lobbies and in its crown:
//
//   tower-1     the blade: a thin slab with knife-edged ends and creased faces,
//               its top cut on a slant like a blade's point, glazed in amber;
//               the flat roof is the Jackal's perch, with needles. Amber.
//   tower-2     the twisted prism: a square turned a quarter as it rises, its
//               corners four helices that run on past its roof as a crown. Cyan.
//   tower-3     the crystal: a hexagonal shaft under a lattice of lit diamonds,
//               with a crystal's point, a smaller crystal and a cluster of small
//               ones at its foot, kept under its height so that the west ramp
//               shows behind it. Emerald.
//   tower-4     the screen tower: a block that carries the city's big screen, a
//               sky garden on its setback, a shaft and a faceted spire. Violet.
//   tower-5     the split tower: two wedges with a lit cleft between them, the
//               cleft crossed by sky bridges, which the view the tile opens with
//               looks straight into. Rose.
//   tower-6     the star: a four-pointed star in plan under a crown of fins and
//               a halo of a roof, flat and open for the Howlers. Amber.
//   tryst       a tower whose club storeys reach out north over the postern's
//               lane, the club on its roof: the gravity floor and its dancers in
//               the air. Rose.
//   temptation  a tower that flares into a cup, the club inside it. Cyan.
//
// The podium is a raised plaza of pale stone round them, with steps down to
// the avenue and to the south, planters, light posts, a gold pyramid of the
// Society, House Augustus's lions and banners, a fountain, cafés, kiosks, a
// checkpoint of the city's Grays, and a line of cold light under its edge by
// night. The noise bubbles and the dancers are the file's own meshes.
//
// Where the show stands its cast on these roofs (show.ts), they are kept
// flat and clear: the Jackal's beat on tower-1, the Howlers' ring on tower-6,
// and Sevro's landings on Tryst, Temptation and the podium (story 4).

import * as THREE from 'three';
import { interior, rng, type GeoBuilder, type QuadOpts, type V3, type WinSpec } from '../../engine/geo';
import { area, walls } from '../../engine/ground';
import { figure, parasol } from '../../engine/parts';
import { beacon, chamfered, face3, prism } from '../../engine/shapes';
import type { SignDef } from '../../engine/signs';
import type { Build } from '../../engine/tile';
import { AUGUSTUS_GOLD, AUGUSTUS_RED, COLD, GLASS_WIN, GOLD, OFFICE_WIN, banner, lion, parapet, pyramid } from './look';
import type { Model } from './models';
import { F, HERO_SPOTS, STAGES, lotOf, type Lot } from './plan';
import { onStage } from './space';

type XZ = [number, number];

// ---------------------------------------------------------------------------
// The towers' look
// ---------------------------------------------------------------------------

/**
 * A tower's jewel: the colour its light glows by night, the pale trim of its
 * lit bars, and its glass: a dark gem's tint by day, which its light makes
 * glow in the jewel's colour by night (`GEM` is how strongly).
 */
interface Jewel { glow: string; trim: number; glass: number }
const JEWEL: Record<'amber' | 'cyan' | 'rose' | 'violet' | 'emerald', Jewel> = {
  amber: { glow: '#ffae42', trim: 0xffd391, glass: 0x8a5f22 },
  cyan: { glow: '#38d9ff', trim: 0xa8edff, glass: 0x22728a },
  rose: { glow: '#ff4f9f', trim: 0xffadcf, glass: 0x86285a },
  violet: { glow: '#a56cff', trim: 0xd4beff, glass: 0x56359a },
  emerald: { glow: '#34e79b', trim: 0xaaf4d0, glass: 0x217a52 },
};
/** How strongly a jewel's glass glows by night. */
const GEM = interior(3.3);

/** Pale steel between the panes of a glass wall; darker steel for bands, parapets and roofs. */
const MULLION = 0xc6cfd8, MULLION_DARK = 0x8f9aa6, BAND = 0x59626c, ROOF = 0x707981;
/** A lobby's warm glass, lit from inside; the underside of a tower where it stands out over its lobby; a needle. */
const LOBBY = 0x6e553a, SOFFIT = 0xa3acb5, NEEDLE = 0xe3e8ee;
/** A club's deck and its glass rails. */
const DECK = 0x3a3e46, RAIL_GLASS = 0xbfe2ea;
/** The podium: its paving, its granite sides, its steps, its planters and their hedges. */
const PAVE = 0xd3d1cb, GRANITE = 0x5d636b, STEP = 0xbfbcb4, PLANTER = 0x9da2a6, HEDGE = 0x5f8f4e;
/**
 * The towers' windows: look.ts's glass wall and offices, in storeys half as
 * high, so that a tower of sixty reads as a kilometre of floors, and with
 * fewer lit by night, so that the jewels show. Storeys of 2 keep the rows in
 * step with the city's storeys of 4.
 */
const TOWER_GLASS: WinSpec = { ...GLASS_WIN, cell: 1.1, storey: 2, lit: 0.6 };
const TOWER_OFFICE: WinSpec = { ...OFFICE_WIN, cell: 1.5, storey: 2, lit: 0.55 };
/** The pinstripes of the screen tower: tall slits from floor to floor. */
const PIN_WIN: WinSpec = { cell: 1.0, storey: 2, lit: 0.6, kind: 6 };

const SQ = Math.SQRT1_2;

// ---------------------------------------------------------------------------
// Small sums
// ---------------------------------------------------------------------------

const at = (p: XZ, y: number): V3 => [p[0], y, p[1]];
const middle = (l: Lot): XZ => [(l.x0 + l.x1) / 2, (l.z0 + l.z1) / 2];
const along = (c: XZ, d: XZ, t: number): XZ => [c[0] + d[0] * t, c[1] + d[1] * t];
const centroid = (plan: XZ[]): XZ => [plan.reduce((s, p) => s + p[0], 0) / plan.length, plan.reduce((s, p) => s + p[1], 0) / plan.length];
/** Where the towers stand: the podium's top. */
const podiumTop = (): number => lotOf('podium').top;

/**
 * An outline moved in by `d` on every side, or out if `d` is negative. The
 * outline is convex, or one whose middle lies on the inner side of every
 * edge: a star, or the podium's notched oblong.
 */
function inset(plan: XZ[], d: number): XZ[] {
  const n = plan.length, c = centroid(plan);
  const lines = plan.map((p, i) => {
    const q = plan[(i + 1) % n], len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const tx = (q[0] - p[0]) / len, tz = (q[1] - p[1]) / len;
    let nx = -tz, nz = tx;
    if (nx * (c[0] - p[0]) + nz * (c[1] - p[1]) < 0) { nx = -nx; nz = -nz; }
    return { x: p[0] + nx * d, z: p[1] + nz * d, tx, tz };
  });
  return lines.map((b, i): XZ => {
    const a = lines[(i + n - 1) % n];
    const den = a.tx * b.tz - a.tz * b.tx;
    if (Math.abs(den) < 1e-6) return [b.x, b.z];
    const t = ((b.x - a.x) * b.tz - (b.z - a.z) * b.tx) / den;
    return [a.x + a.tx * t, a.z + a.tz * t];
  });
}

/** What is left of an outline where `f`, a function that is straight across the ground, is not negative. */
function clip(plan: XZ[], f: (p: XZ) => number): XZ[] {
  const out: XZ[] = [];
  plan.forEach((p, i) => {
    const q = plan[(i + 1) % plan.length], fp = f(p), fq = f(q);
    if (fp >= 0) out.push(p);
    if (fp >= 0 !== fq >= 0) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  });
  return out;
}

/** The normal of a triangle on the skin of something that stands round `c`, turned to face out. */
function outward(p0: V3, p1: V3, p2: V3, c: XZ): V3 {
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len; ny /= len; nz /= len;
  const mx = (p0[0] + p1[0] + p2[0]) / 3 - c[0], mz = (p0[2] + p1[2] + p2[2]) / 3 - c[1];
  if (nx * mx + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; }
  return [nx, ny, nz];
}

/** The normal of a triangle turned to face the sky. */
function upward(p0: V3, p1: V3, p2: V3): V3 {
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  const len = Math.hypot(nx, ny, nz) || 1;
  if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
  return [nx / len, ny / len, nz / len];
}

// ---------------------------------------------------------------------------
// Parts of a tower
// ---------------------------------------------------------------------------

/**
 * The skin between two outlines with as many corners, one at y0 and one at
 * y1, cut into two triangles a side so that each catches the light on its
 * own: a crown drawn in, a cup that flares, a faceted spire.
 */
function skin(b: GeoBuilder, lo: XZ[], hi: XZ[], y0: number, y1: number, c: XZ, color: number, o: QuadOpts = {}): void {
  lo.forEach((p, i) => {
    const j = (i + 1) % lo.length;
    const A = at(p, y0), B = at(lo[j], y0), C = at(hi[j], y1), D = at(hi[i], y1);
    face3(b, A, B, C, outward(A, B, C, c), color, o);
    face3(b, A, C, D, outward(A, C, D, c), color, o);
  });
}

/** A point over an outline: a triangle from each side up to the apex. */
function point(b: GeoBuilder, plan: XZ[], y: number, apex: V3, color: number, o: QuadOpts = {}): void {
  const c = centroid(plan);
  plan.forEach((p, i) => {
    const A = at(p, y), B = at(plan[(i + 1) % plan.length], y);
    face3(b, A, B, apex, outward(A, B, apex, c), color, o);
  });
}

/** A flat lid on a convex outline at `y`, facing the sky, or facing down. */
function lid(b: GeoBuilder, plan: XZ[], y: number, color: number, down = false, o: QuadOpts = {}): void {
  const c = centroid(plan);
  plan.forEach((p, i) => face3(b, at(c, y), at(p, y), at(plan[(i + 1) % plan.length], y), [0, down ? -1 : 1, 0], color, o));
}

/** The flat ring between an outline and a smaller one inside it, at `y`: a ledge facing up, or an underside facing down. */
function ledge(b: GeoBuilder, outer: XZ[], inner: XZ[], y: number, up: boolean, color: number, o: QuadOpts = {}): void {
  outer.forEach((p, i) => {
    const j = (i + 1) % outer.length;
    b.quad(at(p, y), at(outer[j], y), at(inner[j], y), at(inner[i], y), [0, up ? 1 : -1, 0], color, o);
  });
}

/** A strip of a jewel's light up an upright edge, from y0 to y1. */
function strip(k: Build, p: XZ, y0: number, y1: number, j: Jewel, w = 0.24): void {
  k.glows.push({ x: p[0], y: (y0 + y1) / 2, z: p[1], sx: w, sy: y1 - y0, sz: w, color: j.glow });
}

/** A bar along an edge in a jewel's pale trim, lit by night. It reaches a little past both ends, so that bars meet without a gap. */
function rib(b: GeoBuilder, a: V3, c: V3, j: Jewel, r = 0.15, lit = 2.4): void {
  const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2], l = Math.hypot(dx, dy, dz) || 1, e = r / l;
  b.beam([a[0] - dx * e, a[1] - dy * e, a[2] - dz * e], [c[0] + dx * e, c[1] + dy * e, c[2] + dz * e], r, r, j.trim, { win: interior(lit) });
}

/** Bars round an outline at height `y`. */
function ring(b: GeoBuilder, plan: XZ[], y: number, j: Jewel, r = 0.14, lit = 2.4): void {
  plan.forEach((p, i) => rib(b, at(p, y), at(plan[(i + 1) % plan.length], y), j, r, lit));
}

/**
 * A tower's lobby: a storey of warm lit glass set back under the shaft, from
 * the podium to `y1`, and the shaft's underside where it stands out over it.
 */
function lobby(b: GeoBuilder, outer: XZ[], inner: XZ[], y1: number): void {
  const y0 = podiumTop() - 0.02;
  prism(b, inner, y0, y1, LOBBY, { win: interior(2.6), top: false });
  ledge(b, outer, inner, y1, false, SOFFIT, { win: interior(0.7) });
  // the glass's mullions, pale steel, about every 1.4
  const c = centroid(inner);
  inner.forEach((p, i) => {
    const q = inner[(i + 1) % inner.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.round(len / 1.4));
    // a hair out from the glass, away from the middle
    const mx = (p[0] + q[0]) / 2 - c[0], mz = (p[1] + q[1]) / 2 - c[1], ml = Math.hypot(mx, mz) || 1, ox = (mx / ml) * 0.05, oz = (mz / ml) * 0.05;
    for (let s = 0; s < n; s++) {
      const f = (s + 0.5) / n, x = p[0] + (q[0] - p[0]) * f + ox, z = p[1] + (q[1] - p[1]) * f + oz;
      b.beam([x, y0, z], [x, y1, z], 0.05, 0.05, 0xc7d0d9);
    }
  });
}

/**
 * A tower's shaft round an outline from y0 to y1, its walls glazed, broken
 * by sky lobbies: a storey of the jewel's glass set back by `deep` at each
 * height in `lobbies`, with the ledge under it and the underside over it.
 * The outline is convex, or a star that each of its corners can be seen from
 * the middle of.
 */
function shaft(b: GeoBuilder, plan: XZ[], y0: number, y1: number, win: WinSpec, seed: number, j?: Jewel, lobbies: number[] = [], deep = 0.4, tall = 2): void {
  const back = inset(plan, deep);
  let y = y0;
  for (const yl of [...(j ? lobbies.filter((h) => h > y0 && h + tall < y1) : []), Infinity]) {
    const end = Math.min(yl, y1);
    if (end > y) prism(b, plan, y, end, MULLION, { win, seed: seed + y * 0.017, top: false });
    if (end === y1 || !j) break;
    prism(b, back, yl, yl + tall, j.glass, { win: GEM, top: false });
    ledge(b, plan, back, yl, true, BAND);
    ledge(b, plan, back, yl + tall, false, SOFFIT, { win: interior(0.6) });
    y = yl + tall;
  }
}

/**
 * A thin plate standing out `out` all round an outline at height `y`, `t`
 * thick: the edge of a floor, which repeats a tower's plan up its height.
 */
function plate(b: GeoBuilder, plan: XZ[], y: number, out: number, t: number, color: number): void {
  const edge = inset(plan, -out);
  prism(b, edge, y - t / 2, y + t / 2, color, { top: false });
  ledge(b, edge, plan, y + t / 2, true, color);
  ledge(b, edge, plan, y - t / 2, false, color);
}

/** A fin standing out from a wall: `p` is its foot on the wall, `n` the way the wall faces, `deep` how far it stands out. */
function fin(b: GeoBuilder, p: XZ, n: XZ, y0: number, y1: number, deep: number, color: number): void {
  b.obox(p[0] + n[0] * deep / 2, (y0 + y1) / 2, p[1] + n[1] * deep / 2, deep / 2, (y1 - y0) / 2, 0.06, Math.atan2(n[1], n[0]), color, { faces: 'B' });
}

/** A slim light post on the podium with a cold lamp on its head, and the pool of light it throws. */
function lightPost(k: Build, x: number, z: number, y: number, h = 4.2): void {
  k.b.box(x - 0.09, y, z - 0.09, x + 0.09, y + h, z + 0.09, 0x8d969f);
  k.b.box(x - 0.32, y + h, z - 0.12, x + 0.32, y + h + 0.12, z + 0.12, 0x6c757e, { faces: 'NESWTB' });
  k.glows.push({ x, y: y + h - 0.05, z, sx: 0.56, sy: 0.1, sz: 0.2, color: '#dff4ff' });
  k.lights.push({ x, z, r: 9, color: COLD, k: 0.5 });
}

/** A guard of the city in grey, standing at `y`. */
function guard(k: Build, x: number, z: number, y: number): void {
  figure(k.b, x, z, y, { coat: 0x7d838b, legs: 0x4b5057, hat: 0x5b6067, hatH: 0.34, hatR: 0.33 });
}

// ---------------------------------------------------------------------------
// The noise bubbles and the dancers: the few meshes of the file's own
// ---------------------------------------------------------------------------

/** The noise bubbles the clubs ask for, gathered while the lots are built and made into one mesh by `extras`. */
const BUBBLES: { c: V3; r: V3; color: number }[] = [];

/**
 * The noise bubbles (RR 16): faint domes of shimmer over the clubs that keep
 * their sound in, drawn as light added to whatever is behind them, a little
 * stronger at the foot and stronger by night.
 */
function bubbles(k: Build): void {
  if (BUBBLES.length === 0) return;
  const pos: number[] = [], col: number[] = [];
  const S = 18, R = 5, c0 = new THREE.Color();
  for (const { c, r, color } of BUBBLES) {
    c0.set(color);
    const p = (i: number, j: number): V3 => {
      const a = (i / S) * Math.PI * 2, e = (j / R) * (Math.PI / 2);
      return [c[0] + Math.cos(a) * Math.cos(e) * r[0], c[1] + Math.sin(e) * r[1], c[2] + Math.sin(a) * Math.cos(e) * r[2]];
    };
    const shade = (j: number): number => 0.25 + 0.75 * (1 - j / R) ** 1.6;
    for (let i = 0; i < S; i++) {
      for (let j = 0; j < R; j++) {
        const quad = [p(i, j), p(i + 1, j), p(i + 1, j + 1), p(i, j + 1)], f = [shade(j), shade(j), shade(j + 1), shade(j + 1)];
        for (const n of [0, 1, 2, 0, 2, 3]) {
          pos.push(...quad[n]);
          col.push(c0.r * f[n], c0.g * f[n], c0.b * f[n]);
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'noise bubbles';
  mesh.renderOrder = 2;
  k.group.add(mesh);
  k.each((_dt, _t, night) => {
    mat.opacity = 0.07 + 0.16 * night;
  });
  BUBBLES.length = 0;
}

/** One dancer in the air, arms up and legs apart, her feet at the origin: her clothes take the colour of her instance. */
function dancerShape(): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = [], part: number[] = [];
  const m = new THREE.Matrix4(), c = new THREE.Color();
  /** A box `w` by `h` by `d` hung from a joint at (x, y), turned by `rz` about the joint, of a part and a colour. */
  const limb = (w: number, h: number, d: number, x: number, y: number, rz: number, which: number, color: number): void => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(0, -h / 2, 0);
    g.applyMatrix4(m.makeRotationZ(rz));
    g.translate(x, y, 0);
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    c.set(color);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.r, c.g, c.b);
      part.push(which);
    }
  };
  limb(0.7, 0.95, 0.42, 0, 1.82, 0, 0, 0xffffff); // the body, in her clothes' colour
  limb(0.5, 0.5, 0.5, 0, 2.36, 0, 5, 0xe8c4a0); // the head
  limb(0.27, 0.92, 0.3, -0.19, 0.92, -0.38, 7, 0x2b2b36); // the legs, apart
  limb(0.27, 0.92, 0.3, 0.19, 0.92, 0.38, 7, 0x2b2b36);
  limb(0.2, 0.82, 0.2, -0.4, 1.74, -2.55, 0, 0xffffff); // the arms, raised
  limb(0.2, 0.82, 0.2, 0.4, 1.74, 2.55, 0, 0xffffff);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  return geo;
}

/**
 * Tryst's dancers, floating over its gravity floor (RR 15): one instanced
 * mesh, each dancer bobbing slowly and turning in the air, every frame.
 */
function dancers(k: Build, x0: number, z0: number, x1: number, z1: number, y: number): void {
  const r = rng(0x7e157);
  const clothes = [0xff5fa8, 0x45d8ff, 0xffd34a, 0xb98bff, 0x5ef0a8, 0xff8a4a, 0xf4f0ff];
  const n = 7;
  const ds = Array.from({ length: n }, (_, i) => ({
    x: x0 + ((i + 0.5) / n) * (x1 - x0) + (r() - 0.5) * 0.5,
    z: z0 + (i % 2 ? 0.3 : 0.7) * (z1 - z0) + (r() - 0.5) * 0.4,
    y: y + 0.7 + r() * 0.6,
    phase: r() * Math.PI * 2,
    speed: 0.55 + r() * 0.35,
    spin: (r() - 0.5) * 0.5,
    yaw: r() * Math.PI * 2,
  }));
  const mesh = new THREE.InstancedMesh(dancerShape(), k.mat.vehicle(), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(0.86, 0.86, 0.86), c = new THREE.Color();
  ds.forEach((_, i) => mesh.setColorAt(i, c.set(clothes[i % clothes.length])));
  let t = 0;
  const place = (): void => {
    ds.forEach((d, i) => {
      p.set(d.x + 0.2 * Math.sin(t * 0.21 + d.phase), d.y + 0.45 * Math.sin(t * d.speed + d.phase), d.z + 0.15 * Math.cos(t * 0.17 + d.phase));
      e.set(0.4 * Math.sin(t * 0.33 + d.phase), d.yaw + t * d.spin, 0.35 * Math.cos(t * 0.29 + d.phase * 1.3));
      m4.compose(p, q.setFromEuler(e), s);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  place();
  mesh.frustumCulled = false;
  mesh.name = 'the dancers of Tryst';
  k.group.add(mesh);
  k.each((dt) => {
    t += dt;
    place();
  });
}

// ---------------------------------------------------------------------------
// The podium
// ---------------------------------------------------------------------------

/**
 * The raised plaza under the towers: pale stone on granite sides, with steps
 * down to the avenue on the east and to the south, planters with trees,
 * benches, light posts, the Society's pyramid in gold, and a line of cold
 * light under its edge by night. It stops short of the postern's stage, which
 * is the ground's.
 */
const podium: Model = (k, l) => {
  const b = k.b, y = l.top, st = STAGES.postern;
  const nx = st.x0 - 0.6, nz = st.z1 + 0.4;
  const outline: XZ[] = [[l.x0, l.z0], [nx, l.z0], [nx, nz], [l.x1, nz], [l.x1, l.z1], [l.x0, l.z1]];
  area(k, outline, PAVE, y, { size: 2, bond: 0 });
  walls(b, outline, F - 0.3, y - 0.1, GRANITE);
  // a coping of pale stone along the top of its sides, standing out a little and a hair above the paving
  plate(b, outline, y - 0.04, 0.1, 0.12, 0xe2ded6);
  // the line of light under the edge, a hair out from the side
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length], mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2;
    const horizontal = Math.abs(q[1] - p[1]) < 1e-6;
    // which way is out: away from the middle of the podium
    const ox = horizontal ? 0 : mx < (l.x0 + l.x1) / 2 ? -1 : 1, oz = horizontal ? (mz < (l.z0 + l.z1) / 2 ? -1 : 1) : 0;
    k.glows.push({ x: mx + ox * 0.05, y: y - 0.16, z: mz + oz * 0.05, sx: horizontal ? Math.abs(q[0] - p[0]) : 0.08, sy: 0.09, sz: horizontal ? 0.08 : Math.abs(q[1] - p[1]), color: '#bfeaff' });
  });

  // steps: three treads down from the podium's edge, reaching out 1.5 where no road is
  const east = (z0: number, z1: number): void => {
    for (let i = 1; i <= 3; i++) b.box(l.x1 + (i - 1) * 0.5, F - 0.05, z0, l.x1 + i * 0.5, y - 0.3 * i, z1, STEP, { faces: 'TENS' });
  };
  const south = (x0: number, x1: number): void => {
    for (let i = 1; i <= 3; i++) b.box(x0, F - 0.05, l.z1 + (i - 1) * 0.5, x1, y - 0.3 * i, l.z1 + i * 0.5, STEP, { faces: 'TSEW' });
  };
  east(nz + 1.2, -26.4);
  east(-23.6, -15.4);
  east(-12.6, l.z1 - 0.6);
  south(-45.5, l.x1 - 0.6);
  south(-66, -50);

  // planters with trees, and hedges along their tops
  const planter = (x0: number, z0: number, x1: number, z1: number, trees: [number, number, number][]): void => {
    b.box(x0, y - 0.02, z0, x1, y + 0.7, z1, PLANTER, { top: HEDGE });
    for (const [tx, tz, s] of trees) k.tree(tx, tz, s, false, y + 0.7);
  };
  planter(-18.9, -25.9, -17.1, -24.1, [[-18, -25, 0.62]]);
  planter(-18.9, -14.9, -17.1, -13.1, [[-18, -14, 0.62]]);
  planter(-18.9, -34.6, -17.1, -32.8, [[-18, -33.7, 0.55]]);
  planter(-49.4, -12.2, -46.6, -10.0, [[-48, -11.1, 0.7]]);
  planter(-67.6, -11.8, -64.4, -9.6, [[-66, -10.7, 0.7]]);
  planter(-83.4, -30, -81.2, -22, [[-82.3, -28, 0.6], [-82.3, -24, 0.6]]);
  planter(-50.6, -22.4, -47.4, -20.8, [[-49, -21.6, 0.55]]);
  planter(-66.6, -28.2, -63.4, -26.6, []);
  planter(-35.4, -30.8, -33.6, -26.0, [[-34.5, -29.2, 0.5]]);
  // and a row along the north edge, under the forest inside the wall
  planter(-63.0, -41.7, -58.0, -40.7, [[-61.8, -41.2, 0.5], [-59.2, -41.2, 0.5]]);
  planter(-42.0, -41.7, -38.0, -40.7, [[-40.0, -41.2, 0.5]]);
  planter(-79.0, -41.7, -76.6, -40.7, [[-77.8, -41.2, 0.45]]);

  // benches
  const bench = (x: number, z: number, alongX: boolean): void => {
    const hx = alongX ? 0.8 : 0.22, hz = alongX ? 0.22 : 0.8;
    b.box(x - hx, y, z - hz, x + hx, y + 0.45, z + hz, 0x8a6d50, { top: 0x9d7b5a });
  };
  bench(-21, -27.8, true);
  bench(-21, -21.6, true);
  bench(-45.2, -9.3, true);
  bench(-57, -11, true);
  bench(-60.5, -28.2, true);
  bench(-33.5, -24.6, false);

  // two gold lions of House Augustus on their plinths, looking out over the avenue from the head of the grand stair
  for (const z of [-22.9, -16.1]) lion(b, l.x1 - 1.3, z, y - 0.02, 0.75, 0, GOLD, GRANITE);
  // the house's banners, red with a gold stripe, along the stair and the south edge
  for (const z of [-25.0, -14.0]) banner(b, l.x1 - 3.6, z, y, 4.6, AUGUSTUS_RED, AUGUSTUS_GOLD, 0);
  for (const x of [-27, -47.4, -58, -71, -80]) banner(b, x, l.z1 - 0.7, y, 4.6, AUGUSTUS_RED, AUGUSTUS_GOLD, Math.PI / 2);

  // a fountain before the star: a round basin, its water lit from under by night, and its jet
  {
    const fx = (lotOf('tower-6').x0 + lotOf('tower-6').x1) / 2, fz = l.z1 - 4.8;
    const circle = (r: number): XZ[] => Array.from({ length: 12 }, (_, i): XZ => [fx + Math.cos((i * Math.PI) / 6) * r, fz + Math.sin((i * Math.PI) / 6) * r]);
    const outer = circle(1.9), inner = circle(1.6);
    prism(b, outer, y - 0.02, y + 0.55, STEP, { top: false });
    walls(b, inner, y + 0.3, y + 0.55, STEP, { inward: true });
    ledge(b, outer, inner, y + 0.55, true, 0xd8d5ce);
    lid(b, inner, y + 0.3, 0x7fc6e0, false, { win: interior(1.1) });
    b.cyl(fx, fz, y + 0.3, y + 2.4, 0.16, 0.05, 6, 0xdff3ff, { win: interior(1.4), cap: false });
    k.glows.push({ x: fx, y: y + 2.45, z: fz, sx: 0.3, sy: 0.2, sz: 0.3, color: '#dff6ff' });
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      k.glows.push({ x: fx + Math.cos(a) * 0.8, y: y + 1.3, z: fz + Math.sin(a) * 0.8, sx: 0.08, sy: 0.5, sz: 0.08, color: '#cfeeff' });
    }
    k.lights.push({ x: fx, z: fz, r: 7, color: '#bfe6ff', k: 0.45 });
  }

  // café tables under parasols, south of Temptation and at the west end; the one south of Temptation under a noise bubble of its own (RR 16)
  BUBBLES.push({ c: [(lotOf('temptation').x0 + lotOf('temptation').x1) / 2, y, l.z1 - 3.4], r: [4.2, 3.1, 2.8], color: 0xbfefff });
  for (const [x, z, shade] of [[-30.0, -11.8, AUGUSTUS_RED], [-23.6, -12.4, 0xe8e2d0], [-77.2, -9.7, 0x2f6f8f], [-82.0, -10.2, AUGUSTUS_RED]] as [number, number, number][]) parasol(b, x, z, shade, y);
  // two kiosks along the south edge, their fronts lit
  for (const [x, glow] of [[-63.2, 0xffb45a], [-37.4, 0x6fe0ff]] as [number, number][]) {
    const z = l.z1 - 1.5;
    b.box(x - 0.8, y - 0.02, z - 0.6, x + 0.8, y + 2.3, z + 0.6, 0x4b525b, { top: 0x39404a });
    b.box(x - 0.7, y + 0.9, z + 0.6, x + 0.7, y + 1.9, z + 0.64, glow, { win: interior(2.2), faces: 'ESWT' });
    b.box(x - 0.95, y + 2.0, z + 0.6, x + 0.95, y + 2.12, z + 1.25, 0xe8e2d0, { faces: 'NESWTB', top: AUGUSTUS_RED });
  }

  // the Society's pyramid in gold on a dark plinth, lit from its corners, between the star and Temptation
  const px = (lotOf('tower-6').x1 + lotOf('temptation').x0) / 2, pz = l.z1 - 3.4;
  b.box(px - 1.3, y - 0.02, pz - 1.3, px + 1.3, y + 0.6, pz + 1.3, 0x2c3036);
  pyramid(b, px, y + 0.6, pz, 2.1, GOLD);
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.glows.push({ x: px + dx * 1.15, y: y + 0.66, z: pz + dz * 1.15, sx: 0.16, sy: 0.08, sz: 0.16, color: '#ffe2a8' });
  k.lights.push({ x: px, z: pz, r: 7, color: '#ffd9a0', k: 0.45 });

  // light posts along the promenades
  // (none at the south end of the east promenade, where the show lands Sevro off the roofs, story 4)
  for (const [x, z] of [[-19.4, -30.5], [-19.4, -19.2], [-22.2, -9.4], [-30, -9.6], [-40, -9.6], [-52, -9.6], [-62, -9.6], [-75, -9.6], [-82.4, -20], [-82.4, -36], [-65, -25.0], [-49.5, -28.4], [-34.6, -21], [-66, -41.2], [-48, -41.2]] as XZ[]) lightPost(k, x, z, y);

  // people: a few about the plaza, some sheltering under the towers' lobbies, guards at the steps
  const r = rng(0x90d1);
  const spots: XZ[] = [
    [-20.5, -29.8], [-21.4, -17.6], [-20.2, -12.3], [-25.6, -11.1], [-28.8, -10.4], [-37.8, -12.6], [-41.5, -15.6], [-44.2, -10.2], [-53.6, -12.4], [-55.4, -10.1],
    [-59.6, -12.2], [-70.4, -10.4], [-73.8, -10.9], [-82.6, -13.4], [-82.6, -15.2], [-66.2, -22.4], [-64.6, -33.2], [-50.2, -33.8], [-48.6, -24.6], [-35.6, -18.4],
    [-24.1, -27.4], [-58.4, -28.6], [-71.4, -26.1], [-39.4, -15.4], [-43.9, -14.9], [-46.0, -13.4], [-36.9, -14.9], [-58.0, -13.0], [-61.0, -11.0], [-69.0, -11.2],
    [-82.6, -38.6], [-56.0, -41.0], [-44.0, -41.2], [-75.0, -41.0], [-22.6, -23.4], [-21.0, -33.6],
  ];
  // and under the overhangs of the star, Temptation and Tryst, out of the Rain
  spots.push([-41.5, -17.9], [-37.9, -21.5], [-27, -15.85], [-27, -30.5]);
  for (const [x, z] of spots) {
    const px2 = x + (r() - 0.5) * 0.5, pz2 = z + (r() - 0.5) * 0.5;
    if (!onStage(px2, pz2, 0.5)) k.person(px2, pz2, y);
  }
  for (const [x, z] of [[-17.3, -28.6], [-18.8, -21.3], [-18.8, -17.7], [-17.3, -12.3]] as XZ[]) guard(k, x, z, y);
  // a crowd under the screen, looking up at the forecast
  for (const [x, z] of [[-75.4, -9.2], [-74.2, -9.8], [-73.0, -9.3], [-72.2, -10.2], [-74.6, -11.1], [-76.0, -11.3]] as XZ[]) k.person(x, z, y);
  // a checkpoint of the city's Grays at the head of the north flight: a booth with its window lit, a striped boom, and its guards
  {
    const bx = l.x1 - 1.8, bz = -31.6;
    b.box(bx - 0.6, y - 0.02, bz - 0.6, bx + 0.6, y + 2.4, bz + 0.6, 0x6b7179, { top: 0x4b5057 });
    b.box(bx + 0.6, y + 1.2, bz - 0.4, bx + 0.64, y + 1.9, bz + 0.4, 0xffd9a0, { win: interior(2.4), faces: 'ESWT' });
    b.box(bx - 0.75, y + 2.4, bz - 0.75, bx + 0.75, y + 2.55, bz + 0.75, 0x3d434a, { faces: 'NESWTB' });
    const boomX = l.x1 - 0.45;
    b.box(boomX - 0.12, y - 0.02, -27.5, boomX + 0.12, y + 1.1, -27.26, 0x4b5057);
    for (let i = 0; i < 6; i++) b.beam([boomX, y + 1.0, -27.5 - i * 0.6], [boomX, y + 1.0, -27.5 - (i + 1) * 0.6], 0.07, 0.07, i % 2 ? 0xf2f2f2 : 0xc8202c);
    guard(k, bx, bz + 1.6, y);
  }

  // the cold light of the towers on the plaza
  for (const [x, z] of [[-20, -30], [-20, -17], [-28, -11], [-44, -12], [-60, -12], [-76, -12], [-82, -26], [-58, -28], [-47, -36]] as XZ[]) k.lights.push({ x, z, r: 11, color: COLD, k: 0.5 });
};

// ---------------------------------------------------------------------------
// tower-1: the blade
// ---------------------------------------------------------------------------

/**
 * The tallest, furthest west: a blade. A slab long from north-east to
 * south-west and thin across, its long faces creased so that each catches the
 * light in two tones, its ends sharpened to knife edges. Its top is cut on a
 * slant like a blade's point, glazed in amber, falling from the flat roof to
 * its south-west tip. The flat roof is the Jackal's perch: the show has him
 * pace in the middle of the lot, so the roof is flat there and for most of
 * the blade's length. A needle stands at the north-east end.
 */
const blade: Model = (k, l) => {
  const b = k.b, j = JEWEL.amber, c = middle(l), half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2, top = l.top;
  const ne: XZ = [SQ, -SQ], se: XZ = [SQ, SQ];
  const tip = half * Math.SQRT2 - 0.8, shoulder = tip - 2.5, thick = half * 0.4, crease = thick + 0.6;
  /** A place on the blade, by how far it is towards the north-east and towards the south-east of the middle. */
  const pt = (u: number, v: number): XZ => [c[0] + ne[0] * u + se[0] * v, c[1] + ne[1] * u + se[1] * v];
  const uOf = (p: XZ): number => (p[0] - c[0]) * ne[0] + (p[1] - c[1]) * ne[1];
  const body: XZ[] = [pt(tip, 0), pt(shoulder, thick), pt(0, crease), pt(-shoulder, thick), pt(-tip, 0), pt(-shoulder, -thick), pt(0, -crease), pt(shoulder, -thick)];
  // the bevel: the roof is flat north-east of uFlat, over the Jackal's beat, and falls from there to the south-west tip
  const uFlat = -2.6, yLow = top - 13, yWalls = yLow - 3;
  const roofAt = (p: XZ): number => (uOf(p) >= uFlat ? top : top - ((uFlat - uOf(p)) * (top - yLow)) / (uFlat + tip));
  const y1 = 28;
  lobby(b, body, inset(body, 0.9), y1);
  shaft(b, body, y1, yWalls, TOWER_GLASS, 1.1, j, [44, 60]);
  // the walls up to the roof's line, the flat roof and the bevel
  const flatPart = clip(body, (p) => uOf(p) - uFlat), bevel = clip(body, (p) => uFlat - uOf(p));
  for (const part of [flatPart, bevel]) {
    const pc = centroid(part);
    part.forEach((p, i) => {
      const q = part[(i + 1) % part.length];
      if (Math.abs(uOf(p) - uFlat) < 1e-6 && Math.abs(uOf(q) - uFlat) < 1e-6) return; // the cut between the two
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      let nx = (q[1] - p[1]) / len, nz = -(q[0] - p[0]) / len;
      if (nx * ((p[0] + q[0]) / 2 - pc[0]) + nz * ((p[1] + q[1]) / 2 - pc[1]) < 0) { nx = -nx; nz = -nz; }
      b.quad(at(p, yWalls), at(q, yWalls), at(q, roofAt(q)), at(p, roofAt(p)), [nx, 0, nz], MULLION, { win: TOWER_GLASS, seed: 1.7 + i * 0.13, L: len });
      rib(b, at(p, roofAt(p)), at(q, roofAt(q)), j, part === bevel ? 0.15 : 0.11);
    });
  }
  lid(b, flatPart, top, ROOF);
  const b0 = at(bevel[0], roofAt(bevel[0]));
  for (let i = 1; i + 1 < bevel.length; i++) {
    const b1 = at(bevel[i], roofAt(bevel[i])), b2 = at(bevel[i + 1], roofAt(bevel[i + 1]));
    face3(b, b0, b1, b2, upward(b0, b1, b2), j.glass, { win: GEM });
  }
  // the ridge where the bevel leaves the roof, a fuller of light down the bevel's middle to the tip, and the edges lit from the lobby up
  const ridge = bevel.filter((p) => Math.abs(uOf(p) - uFlat) < 1e-6);
  if (ridge.length === 2) rib(b, at(ridge[0], top), at(ridge[1], top), j, 0.15);
  rib(b, at(pt(uFlat, 0), top), at(pt(-tip, 0), yLow), j, 0.12);
  // and lines of light fanning from the tip across the bevel, as the facets of a cut stone meet
  if (ridge.length === 2) {
    for (const f of [0.22, 0.4, 0.6, 0.78]) {
      const rp: XZ = [ridge[0][0] + (ridge[1][0] - ridge[0][0]) * f, ridge[0][1] + (ridge[1][1] - ridge[0][1]) * f];
      rib(b, at(pt(-tip, 0), yLow), at(rp, top), j, 0.06, 2.0);
    }
  }
  body.forEach((p) => strip(k, p, y1, roofAt(p) - 0.1, j));
  // fins up its long faces, a third and two thirds of the way along each
  for (let i = 0; i < body.length; i++) {
    const p = body[i], q = body[(i + 1) % body.length];
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 5) continue; // only the long faces, not the knife edges' bevels
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    let nx = (q[1] - p[1]) / len, nz = -(q[0] - p[0]) / len;
    if (nx * ((p[0] + q[0]) / 2 - c[0]) + nz * ((p[1] + q[1]) / 2 - c[1]) < 0) { nx = -nx; nz = -nz; }
    for (const f of [1 / 3, 2 / 3]) {
      const fp: XZ = [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
      fin(b, fp, [nx, nz], y1, Math.min(yWalls, roofAt(fp)) - 0.2, 0.22, 0xd5dbe1);
    }
  }
  // a spine down each crease, its outer edge lit: the blade's back, seen edge on from the view
  for (const s of [1, -1]) {
    const foot = pt(0, s * crease), out: XZ = [se[0] * s, se[1] * s], yTop = roofAt(foot) - 0.3;
    fin(b, foot, out, y1, yTop, 0.7, MULLION);
    rib(b, at(along(foot, out, 0.7), y1), at(along(foot, out, 0.7), yTop), j, 0.08);
  }
  // the needle at the north-east end, two shorter ones beside it, and their lamps
  const n = pt(tip - 1.5, 0);
  b.cyl(n[0], n[1], top, top + 3.6, 0.28, 0.04, 6, NEEDLE, { cap: false });
  beacon(k, n[0], top + 3.75, n[1], 0.4, '#ff5a3c');
  for (const s of [1, -1]) {
    const m = pt(tip - 2.6, s * 0.9);
    b.cyl(m[0], m[1], top, top + 2.2, 0.18, 0.03, 6, NEEDLE, { cap: false });
    k.glows.push({ x: m[0], y: top + 2.3, z: m[1], sx: 0.22, sy: 0.22, sz: 0.22, color: j.glow });
  }
  k.lights.push({ x: c[0] + 5, z: c[1] + 5, r: 10, color: COLD, k: 0.55 });
};

// ---------------------------------------------------------------------------
// tower-2: the twisted prism
// ---------------------------------------------------------------------------

/**
 * A square that turns a quarter as it rises, storey by storey. Its corners
 * are four helices of lit trim that run on past the roof as the tines of a
 * crown. Its corners stay inside the lot at every turn.
 */
const twisted: Model = (k, l) => {
  const b = k.b, j = JEWEL.cyan, c = middle(l), a = (Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2) * 0.68;
  const square = (turn: number, s: number): XZ[] => [0, 1, 2, 3].map((i): XZ => {
    const t = turn + Math.PI / 4 + (i * Math.PI) / 2;
    return [c[0] + Math.cos(t) * s * Math.SQRT2, c[1] + Math.sin(t) * s * Math.SQRT2];
  });
  const y0 = 24, y1 = l.top - 6, roofY = l.top - 2, TURN = Math.PI / 2;
  const turnAt = (y: number): number => (TURN * (y - y0)) / (y1 - y0);
  lobby(b, square(0, a), square(0, a - 0.8), y0);
  // the shaft, a storey of 2 at a time, each turned a little from the one below
  for (let y = y0; y < y1; y += 2) {
    const ta = turnAt(y), tb = turnAt(y + 2), lo = square(ta, a), hi = square(tb, a);
    for (let s = 0; s < 4; s++) {
      const s2 = (s + 1) % 4, tm = (ta + tb) / 2 + Math.PI / 2 + (s * Math.PI) / 2;
      b.quad(at(lo[s], y), at(lo[s2], y), at(hi[s2], y + 2), at(hi[s], y + 2), [Math.cos(tm), 0, Math.sin(tm)], MULLION, { win: TOWER_GLASS, seed: 2.3 + s * 0.17, L: 2 * a });
    }
  }
  // the edges of its floors, every two storeys, standing out a little: a stack of turning plates
  for (let y = y0 + 4; y < y1; y += 4) plate(b, square(turnAt(y), a), y, 0.12, 0.16, 0xd7dde3);
  // a storey of lit glass at the top, still turning, and the roof
  const lo = square(TURN, a), hi = square(turnAt(roofY), a - 0.3);
  skin(b, lo, hi, y1, roofY, c, j.glass, { win: GEM });
  lid(b, hi, roofY, ROOF);
  // the corners: helices from the lobby to the crown, and on up as tines
  for (let s = 0; s < 4; s++) {
    const pts: V3[] = [];
    for (let y = y0; y <= y1; y += 2) pts.push(at(square(turnAt(y), a)[s], y));
    pts.push(at(square(turnAt(roofY), a - 0.05)[s], roofY), at(square(turnAt(l.top), a + 0.25)[s], l.top));
    b.sweep(pts, pts.map((_, i) => (i === pts.length - 1 ? 0.04 : 0.17)), j.trim, { win: interior(2.4) });
  }
  ring(b, hi, roofY + 0.02, j, 0.1);
  // a ring of light that joins the four tines halfway up them, so that they read as a crown
  const tineAt = (f: number): XZ[] => square(turnAt(roofY) + (turnAt(l.top) - turnAt(roofY)) * f, a - 0.05 + 0.3 * f);
  ring(b, tineAt(0.5), (roofY + l.top) / 2, j, 0.07);
  // the plant on the roof inside the crown: two housings, a tank, and the mast with its lamp
  const tr = turnAt(roofY);
  b.moved(c[0], 0, c[1], tr, () => {
    b.box(-2.2, roofY - 0.02, -1.2, -0.6, roofY + 0.9, 0.6, 0x8d969f, { top: 0x6c757e });
    b.box(0.7, roofY - 0.02, 0.5, 2.1, roofY + 0.7, 1.9, 0x8d969f, { top: 0x6c757e });
  });
  b.cyl(c[0] + Math.cos(tr) * 1.2 - Math.sin(tr) * -1.3, c[1] + Math.sin(tr) * 1.2 + Math.cos(tr) * -1.3, roofY - 0.02, roofY + 1.1, 0.55, 0.55, 8, 0xa9b1b9, { cap: 0x7f8891 });
  b.cyl(c[0], c[1], roofY, l.top + 3.6, 0.24, 0.05, 6, NEEDLE, { cap: false });
  beacon(k, c[0], l.top + 3.75, c[1], 0.4, '#ff5a3c');
  k.lights.push({ x: c[0] + 4, z: c[1] + 5, r: 10, color: COLD, k: 0.5 });
};

// ---------------------------------------------------------------------------
// tower-3: the crystal
// ---------------------------------------------------------------------------

/**
 * A hexagonal shaft with a crystal's point, a corner of it turned to the
 * view, and a smaller crystal at its south-east foot. Nothing rises above its
 * lot's height, so that the opening view sees the west ramp behind it.
 */
const crystal: Model = (k, l) => {
  const b = k.b, j = JEWEL.emerald, c = middle(l), half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2;
  const turn = Math.atan2(0.743, 0.669);
  const hex = (cc: XZ, r: number): XZ[] => Array.from({ length: 6 }, (_, i): XZ => [cc[0] + Math.cos(turn + (i * Math.PI) / 3) * r, cc[1] + Math.sin(turn + (i * Math.PI) / 3) * r]);
  /** One crystal: its lobby, its glazed shaft, its point, and its lit edges. */
  const one = (cc: XZ, r: number, yPoint: number, apex: number, lean: XZ, seed: number): void => {
    const plan = hex(cc, r);
    lobby(b, plan, hex(cc, r - 0.7), 24);
    shaft(b, plan, 24, yPoint, TOWER_GLASS, seed);
    // a lattice of lit emerald over its faces, in diamonds, as a cut stone's facets show
    plan.forEach((p, i) => {
      const q = plan[(i + 1) % 6], a = turn + (i + 0.5) * (Math.PI / 3), o: XZ = [Math.cos(a) * 0.08, Math.sin(a) * 0.08];
      const P0: XZ = [p[0] + o[0], p[1] + o[1]], Q0: XZ = [q[0] + o[0], q[1] + o[1]];
      for (let y = 24; y + 8 <= yPoint; y += 8) {
        rib(b, at(P0, y), at(Q0, y + 8), j, 0.07, 1.8);
        rib(b, at(Q0, y), at(P0, y + 8), j, 0.07, 1.8);
      }
    });
    for (let y = 32; y < yPoint; y += 8) ring(b, plan, y, j, 0.07, 1.8);
    const tipAt: V3 = [cc[0] + lean[0], apex, cc[1] + lean[1]];
    point(b, plan, yPoint, tipAt, j.glass, { win: GEM });
    plan.forEach((p) => {
      strip(k, p, 24, yPoint, j);
      rib(b, at(p, yPoint), tipAt, j, 0.13);
    });
    ring(b, plan, yPoint, j, 0.13);
  };
  one([c[0] - 0.5, c[1] - 0.5], half - 0.75, l.top - 10, l.top, [-0.35, -0.35], 3.1);
  one([c[0] + 2.1, c[1] + 2.1], 2.15, l.top - 18, l.top - 12, [0.2, 0.15], 3.6);
  // small crystals of lit emerald at its foot, in the lot's free corners, as a crystal grows in a cluster
  for (const [dx, dz, r, h, lean] of [[3.3, -3.1, 0.75, 3.4, 0.3], [2.6, -3.7, 0.5, 2.2, -0.2], [-3.3, 3.2, 0.8, 4.0, -0.3], [-2.4, 3.8, 0.5, 2.4, 0.25]]) {
    const cc: XZ = [c[0] + dx, c[1] + dz], P = podiumTop(), plan = hex(cc, r), yb = P + h * 0.55;
    prism(b, plan, P - 0.02, yb, j.glass, { win: GEM, top: false });
    const apex: V3 = [cc[0] + lean, P + h, cc[1] - lean * 0.6];
    point(b, plan, yb, apex, j.glass, { win: GEM });
    plan.forEach((p) => rib(b, at(p, yb), apex, j, 0.05, 2.0));
  }
  k.lights.push({ x: c[0] + 4, z: c[1] + 4, r: 9, color: COLD, k: 0.5 });
};

// ---------------------------------------------------------------------------
// tower-4: the screen tower
// ---------------------------------------------------------------------------

/**
 * A pinstriped block that carries the city's big screen on its south face,
 * thirty-two over the floor, framed as a city's big screen is; a sky garden on
 * its setback; a glazed shaft, a storey of lit glass, and a faceted spire with
 * a needle.
 */
const screenTower: Model = (k, l) => {
  const b = k.b, j = JEWEL.violet, c = middle(l), P = podiumTop();
  // the block stands 0.2 in from the lot, so that its cornice and fins stay inside it
  const x0 = l.x0 + 0.2, x1 = l.x1 - 0.2, z0 = l.z0 + 0.2, z1 = l.z1 - 0.2;
  const yBlock = 56, yShaft = 64, yCrown = 66;
  b.box(x0, P - 0.02, z0, x1, yBlock, z1, MULLION_DARK, { win: PIN_WIN, seed: 4.4, top: 0x8c8378 });
  const block: XZ[] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  for (const p of block) strip(k, p, P + 2.8, yBlock - 0.3, j, 0.26);
  // a cornice round the block's top, a line of violet light under it, and fins up the faces that have no screen
  plate(b, block, yBlock, 0.15, 0.3, 0xb9c1ca);
  for (const [x, z, sx, sz] of [[c[0], z0 - 0.18, x1 - x0 + 0.3, 0.05], [c[0], z1 + 0.18, x1 - x0 + 0.3, 0.05], [x0 - 0.18, c[1], 0.05, z1 - z0 + 0.3], [x1 + 0.18, c[1], 0.05, z1 - z0 + 0.3]]) {
    k.glows.push({ x, y: yBlock - 0.24, z, sx, sy: 0.08, sz, color: j.glow });
  }
  for (const f of [0.25, 0.5, 0.75]) {
    fin(b, [x0 + (x1 - x0) * f, z0], [0, -1], P + 3, yBlock - 0.15, 0.15, 0xb9c1ca);
    fin(b, [x0, z0 + (z1 - z0) * f], [-1, 0], P + 3, yBlock - 0.15, 0.15, 0xb9c1ca);
    fin(b, [x1, z0 + (z1 - z0) * f], [1, 0], P + 3, yBlock - 0.15, 0.15, 0xb9c1ca);
  }

  // the lobby's doors and the canopy over them, on the south side
  b.box(c[0] - 2.4, P, z1, c[0] + 2.4, P + 2.6, z1 + 0.06, LOBBY, { win: interior(2.6), faces: 'ESWT' });
  b.box(c[0] - 3.2, P + 2.9, z1, c[0] + 3.2, P + 3.15, z1 + 1.4, BAND, { faces: 'ESWTB' });
  k.glows.push({ x: c[0], y: P + 2.86, z: z1 + 0.8, sx: 5.6, sy: 0.05, sz: 0.4, color: '#e9f3ff' });

  // the screen: a dark board 0.1 proud of the wall, the sign 0.03 before it, a frame round it, and a line of light under it
  // as high on the block as its cornice allows, so that the Citadel's spires hide as little of it as may be
  const sy = F + 32.2, sw = 11, sh = sw / (640 / 360), bx = sw / 2 + 0.15, by = sh / 2 + 0.15;
  b.box(c[0] - bx, sy - by, z1, c[0] + bx, sy + by, z1 + 0.1, 0x101216, { faces: 'ESWTB' });
  k.sign('forecast', c[0], sy, z1 + 0.13, 0, 1, sh, sw);
  const t = 0.22, out = 0.26, FR = 0x3b4149;
  b.box(c[0] - bx - t, sy + by, z1, c[0] + bx + t, sy + by + t, z1 + out, FR, { faces: 'ESWTB' });
  b.box(c[0] - bx - t, sy - by - t, z1, c[0] + bx + t, sy - by, z1 + out, FR, { faces: 'ESWTB' });
  b.box(c[0] - bx - t, sy - by, z1, c[0] - bx, sy + by, z1 + out, FR, { faces: 'ESW' });
  b.box(c[0] + bx, sy - by, z1, c[0] + bx + t, sy + by, z1 + out, FR, { faces: 'ESW' });
  k.glows.push({ x: c[0], y: sy - by - t - 0.06, z: z1 + 0.16, sx: 2 * (bx + t), sy: 0.07, sz: 0.12, color: j.glow });
  // the brackets that carry it, and the light it throws on the plaza by night
  for (const s of [-1, 1]) b.box(c[0] + s * (bx - 1.2) - 0.15, sy - by - 1.3, z1, c[0] + s * (bx - 1.2) + 0.15, sy - by - t, z1 + 0.22, FR, { faces: 'ESWB' });
  k.lights.push({ x: c[0], z: z1 + 4, r: 12, color: '#c7b8ff', k: 0.55 });

  // the setback: a sky garden round the shaft, behind a glass rail
  const sp = chamfered(c[0], c[1], 4.1, 1.3);
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const tx = c[0] + dx * 4.95, tz = c[1] + dz * 4.95;
    b.box(tx - 0.55, yBlock, tz - 0.55, tx + 0.55, yBlock + 0.45, tz + 0.55, PLANTER, { top: HEDGE });
    k.tree(tx, tz, 0.4, false, yBlock + 0.45);
  }
  for (const [ax, az, bx2, bz] of [[x0, z0, x1, z0 + 0.08], [x0, z1 - 0.08, x1, z1], [x0, z0 + 0.08, x0 + 0.08, z1 - 0.08], [x1 - 0.08, z0 + 0.08, x1, z1 - 0.08]]) b.box(ax, yBlock, az, bx2, yBlock + 0.9, bz, RAIL_GLASS, { faces: 'NESWT' });
  // benches in the garden, and a few up there to look out over the city
  for (const dx of [-1.6, 1.6]) b.box(c[0] + dx - 0.7, yBlock, c[1] + 4.75, c[0] + dx + 0.7, yBlock + 0.42, c[1] + 5.15, 0x8a6d50, { top: 0x9d7b5a });
  for (const [dx, dz] of [[0, 5.0], [-5.0, 0.6], [5.0, -1.2], [2.8, -5.0]] as XZ[]) k.person(c[0] + dx, c[1] + dz, yBlock);
  // the shaft, its storey of lit glass, and the spire
  shaft(b, sp, yBlock, yShaft, TOWER_GLASS, 4.9);
  const crown = inset(sp, 0.25);
  prism(b, crown, yShaft, yCrown, j.glass, { win: GEM, top: false });
  ledge(b, sp, crown, yShaft, true, BAND);
  point(b, crown, yCrown, [c[0], l.top, c[1]], j.glass, { win: GEM });
  sp.forEach((p) => strip(k, p, yBlock + 0.9, yShaft, j, 0.2));
  crown.forEach((p) => rib(b, at(p, yCrown), [c[0], l.top, c[1]], j, 0.12));
  ring(b, crown, yCrown, j, 0.12);
  // a ring of light halfway up the spire, and a lattice of diamonds over its faces
  const mid = (yCrown + l.top) / 2, half2 = crown.map((p): XZ => [c[0] + (p[0] - c[0]) * 0.5, c[1] + (p[1] - c[1]) * 0.5]);
  ring(b, half2, mid, j, 0.08);
  crown.forEach((p, i) => {
    const q = crown[(i + 1) % crown.length], hm = half2[i], hq = half2[(i + 1) % crown.length];
    rib(b, at(p, yCrown), at(hq, mid), j, 0.05, 2.0);
    rib(b, at(q, yCrown), at(hm, mid), j, 0.05, 2.0);
  });
  b.cyl(c[0], c[1], l.top - 0.5, l.top + 3.6, 0.22, 0.04, 6, NEEDLE, { cap: false });
  beacon(k, c[0], l.top + 3.75, c[1], 0.4, '#ff5a3c');
};

// ---------------------------------------------------------------------------
// tower-5: the split tower
// ---------------------------------------------------------------------------

/**
 * Two wedges: the lot cut along its diagonal from north-west to south-east,
 * with a cleft between the halves that the view the tile opens with looks
 * straight into. The cleft's walls are lit glass, and sky bridges cross it.
 * Each half's roof falls from the cleft to its outer corner, like a blade's
 * bevel.
 */
const split: Model = (k, l) => {
  const b = k.b, j = JEWEL.rose, P = podiumTop();
  // 0.2 in from the lot, so that the fins on the outer faces stay inside it
  const rect: XZ[] = [[l.x0 + 0.2, l.z0 + 0.2], [l.x1 - 0.2, l.z0 + 0.2], [l.x1 - 0.2, l.z1 - 0.2], [l.x0 + 0.2, l.z1 - 0.2]];
  const nw: XZ = [l.x0, l.z0], len = Math.hypot(l.x1 - l.x0, l.z1 - l.z0);
  const d: XZ = [(l.x1 - l.x0) / len, (l.z1 - l.z0) / len], n: XZ = [d[1], -d[0]];
  const gap = 1.5;
  /** How far a place is across the diagonal, towards the north-east. */
  const across = (p: XZ): number => n[0] * (p[0] - nw[0]) + n[1] * (p[1] - nw[1]);
  const halves: { plan: XZ[]; side: number; inner: number; outer: number; seed: number }[] = [
    { plan: clip(rect, (p) => -across(p) - gap), side: -1, inner: l.top, outer: l.top - 8, seed: 5.1 },
    { plan: clip(rect, (p) => across(p) - gap), side: 1, inner: l.top - 6, outer: l.top - 12, seed: 5.6 },
  ];
  for (const h of halves) {
    const e = (p: XZ): number => h.side * across(p) - gap;
    const far = Math.max(...h.plan.map(e));
    const roofAt = (p: XZ): number => h.inner - ((h.inner - h.outer) * e(p)) / far;
    const c = centroid(h.plan);
    h.plan.forEach((p, i) => {
      const q = h.plan[(i + 1) % h.plan.length], len2 = Math.hypot(q[0] - p[0], q[1] - p[1]);
      let wx = (q[1] - p[1]) / len2, wz = -(q[0] - p[0]) / len2;
      if (wx * ((p[0] + q[0]) / 2 - c[0]) + wz * ((p[1] + q[1]) / 2 - c[1]) < 0) { wx = -wx; wz = -wz; }
      const innerWall = e(p) < 0.01 && e(q) < 0.01;
      const yp = roofAt(p), yq = roofAt(q), lob = 24;
      // the lobby's storey of warm glass, then the wall above it
      b.quad(at(p, P - 0.02), at(q, P - 0.02), at(q, lob), at(p, lob), [wx, 0, wz], LOBBY, { win: interior(2.4) });
      if (innerWall) b.quad(at(p, lob), at(q, lob), at(q, yq), at(p, yp), [wx, 0, wz], j.glass, { win: GEM });
      else {
        b.quad(at(p, lob), at(q, lob), at(q, yq), at(p, yp), [wx, 0, wz], MULLION, { win: TOWER_GLASS, seed: h.seed + i * 0.21, L: len2 });
        // fins up the outer faces, each as tall as the wall where it stands
        for (const f of [1 / 3, 2 / 3]) {
          const fp: XZ = [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
          fin(b, fp, [wx, wz], lob, roofAt(fp) - 0.3, 0.18, 0xd5dbe1);
        }
      }
      strip(k, p, lob, yp, j, 0.22);
      rib(b, at(p, yp), at(q, yq), j, 0.13);
    });
    // the edges of its floors every eight, standing out a little, below the lowest of its roof
    for (let y = 32; y < h.outer - 2; y += 8) plate(b, h.plan, y, 0.12, 0.16, 0xd5dbe1);
    // the bevelled roof
    const r0 = at(h.plan[0], roofAt(h.plan[0]));
    for (let i = 1; i + 1 < h.plan.length; i++) {
      const r1 = at(h.plan[i], roofAt(h.plan[i])), r2 = at(h.plan[i + 1], roofAt(h.plan[i + 1]));
      face3(b, r0, r1, r2, upward(r0, r1, r2), 0x56718a, { win: interior(0.25) });
    }
    // a mast on the high edge over the cleft, set back from it, with its lamp
    const edge = h.plan.filter((p) => e(p) < 0.01);
    if (edge.length === 2) {
      // a little way along the edge, and half a unit in from it, into the half
      const f = h.side < 0 ? 0.3 : 0.7, mp: XZ = [edge[0][0] + (edge[1][0] - edge[0][0]) * f + n[0] * h.side * 0.5, edge[0][1] + (edge[1][1] - edge[0][1]) * f + n[1] * h.side * 0.5];
      const base = roofAt(mp);
      b.cyl(mp[0], mp[1], base - 0.4, h.inner + 3.5, 0.18, 0.04, 6, NEEDLE, { cap: false });
      beacon(k, mp[0], h.inner + 3.65, mp[1], 0.32, '#ff5a3c');
    }
  }
  // the sky bridges across the cleft, glass lit by night between a steel floor and roof
  const yaw = Math.atan2(n[1], n[0]);
  for (const [f, y] of [[0.24, 30], [0.62, 34], [0.4, 40], [0.76, 45], [0.3, 50], [0.55, 55]]) {
    const m = along(nw, d, len * f);
    b.obox(m[0], y, m[1], gap + 0.3, 0.55, 0.8, yaw, j.glass, { faces: 'B', win: GEM });
    b.obox(m[0], y + 0.61, m[1], gap + 0.32, 0.06, 0.92, yaw, BAND, { faces: 'B' });
    b.obox(m[0], y - 0.61, m[1], gap + 0.32, 0.06, 0.92, yaw, 0xc9d0d8, { faces: 'B' });
  }
  k.lights.push({ x: l.x1 + 2, z: l.z1 + 2, r: 12, color: '#ffb8d8', k: 0.55 });
};

// ---------------------------------------------------------------------------
// tower-6: the star
// ---------------------------------------------------------------------------

/**
 * A four-pointed star in plan, its points to north, east, south and west and
 * its faces folded in between them: eight faces that each catch the light its
 * own way. A storey of lit glass, and over it an eight-sided roof that stands
 * out all round like a halo: flat and open, with a parapet no higher than
 * 0.5, where the Howlers drop in.
 */
const star: Model = (k, l) => {
  const b = k.b, j = JEWEL.amber, c = middle(l), half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2, top = l.top, yCrown = top - 4;
  const starOf = (point: number, fold: number): XZ[] => Array.from({ length: 8 }, (_, i): XZ => {
    const a = (i * Math.PI) / 4, r = i % 2 ? fold : point;
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
  });
  const body = starOf(half - 0.35, half * 0.56);
  lobby(b, body, starOf(half - 1.4, half * 0.56 - 0.6), 24);
  shaft(b, body, 24, yCrown, TOWER_OFFICE, 6.3, j, [40]);
  // the edges of its floors, standing out, which draw the star again every two storeys
  for (const y of [28, 32, 36, 44, 48, 52]) plate(b, body, y, 0.2, 0.18, 0xd5dbe1);
  // the crown's storey of lit glass, set back a little
  const crown = starOf(half - 0.75, half * 0.56 - 0.3);
  prism(b, crown, yCrown, top - 0.6, j.glass, { win: GEM, top: false });
  ledge(b, body, crown, yCrown, true, BAND);
  // a crown of fins round the lit storey, one at each point and fold, lit at their edges
  crown.forEach((p) => {
    const d = Math.hypot(p[0] - c[0], p[1] - c[1]), o: XZ = [(p[0] - c[0]) / d, (p[1] - c[1]) / d];
    fin(b, p, o, yCrown + 0.1, top - 0.65, 0.45, 0xd5dbe1);
    rib(b, at(along(p, o, 0.45), yCrown + 0.1), at(along(p, o, 0.45), top - 0.65), j, 0.05, 2.2);
  });
  // the halo: an eight-sided roof whose sides stand just beyond the star's points
  const apothem = half - 0.2, R = apothem / Math.cos(Math.PI / 8);
  const halo = Array.from({ length: 8 }, (_, i): XZ => [c[0] + Math.cos(Math.PI / 8 + (i * Math.PI) / 4) * R, c[1] + Math.sin(Math.PI / 8 + (i * Math.PI) / 4) * R]);
  prism(b, halo, top - 0.6, top, j.glass, { top: ROOF, win: GEM });
  lid(b, halo, top - 0.6, SOFFIT, true, { win: interior(0.8) });
  parapet(b, [...halo, halo[0]].map((p): [number, number] => [c[0] + (p[0] - c[0]) * 0.97, c[1] + (p[1] - c[1]) * 0.97]), top, 0.5, 0.16, BAND);
  // light up the four points only, so that the folds between them stand dark
  body.forEach((p, i) => { if (i % 2 === 0) strip(k, p, 24, yCrown, j, 0.26); });
  ring(b, halo, top - 0.6, j, 0.12);
  ring(b, body, yCrown, j, 0.12);
  // small lamps on the parapet's corners, to land by
  for (let i = 0; i < 8; i += 2) k.glows.push({ x: c[0] + (halo[i][0] - c[0]) * 0.97, y: top + 0.44, z: c[1] + (halo[i][1] - c[1]) * 0.97, sx: 0.22, sy: 0.1, sz: 0.22, color: j.glow });
  k.lights.push({ x: c[0] + 4, z: c[1] + 4.5, r: 10, color: COLD, k: 0.5 });
};

// ---------------------------------------------------------------------------
// tryst: the club whose storeys reach out over the postern's lane
// ---------------------------------------------------------------------------

/**
 * Tryst (RR 15, 16): a glass shaft south of the postern's stage, and three
 * storeys of the club over the whole lot, reaching out north over the lane
 * the infantry march in by, lit rose underneath. On the roof: a place for a
 * hero, lit round its edge; north of it the gravity floor, whose dancers
 * float in the air over it (RR 15), under a noise bubble; the bar at its west
 * end, the music at its east end, light masts, and glass rails round it all.
 */
const tryst: Model = (k, l) => {
  const b = k.b, j = JEWEL.rose, P = podiumTop(), deck = l.top, st = STAGES.postern;
  const spot = HERO_SPOTS.find((s) => s.id === 'tryst')!;
  const x0 = l.x0 + 0.15, x1 = l.x1 - 0.25, z0 = l.z0 + 0.15, z1 = l.z1 - 0.15;
  // the shaft stands south of the stage, and the club's storeys reach out over it
  const zs = Math.min(z1 - 4, Math.max(z0, st.z1 + 0.6)), yJut = 36, yBand = deck - 4;
  const shaftPlan: XZ[] = [[x0, zs], [x1, zs], [x1, z1], [x0, z1]];
  lobby(b, shaftPlan, inset(shaftPlan, 0.8), 24);
  shaft(b, shaftPlan, 24, yJut, TOWER_GLASS, 7.1);
  const club: XZ[] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  shaft(b, club, yJut, yBand, TOWER_GLASS, 7.4);
  // the edges of its floors, standing out a little
  for (const y of [28, 32]) plate(b, shaftPlan, y, 0.1, 0.14, 0xd5dbe1);
  plate(b, club, 40, 0.1, 0.14, 0xd5dbe1);
  b.quad(at([x0, z0], yJut), at([x1, z0], yJut), at([x1, zs], yJut), at([x0, zs], yJut), [0, -1, 0], j.glass, { win: GEM });
  // the band under the deck, which carries the name; its top is the deck
  b.box(x0 - 0.1, yBand, z0 - 0.1, x1 + 0.05, deck, z1 + 0.1, BAND, { top: DECK, faces: 'NESWTB' });
  // lines of rose light along the band's foot and its top
  for (const [x, z, sx, sz] of [[(x0 + x1) / 2, z0 - 0.16, x1 - x0 + 0.2, 0.06], [(x0 + x1) / 2, z1 + 0.16, x1 - x0 + 0.2, 0.06], [x0 - 0.16, (z0 + z1) / 2, 0.06, z1 - z0 + 0.2], [x1 + 0.11, (z0 + z1) / 2, 0.06, z1 - z0 + 0.2]]) {
    for (const y of [yBand + 0.12, deck - 0.14]) k.glows.push({ x, y, z, sx, sy: 0.1, sz, color: j.glow });
  }
  for (const p of [[x0, z1], [x1, z1], [x1, zs], [x0, zs]] as XZ[]) strip(k, p, 24, yJut, j, 0.22);
  for (const p of club) strip(k, p, yJut, yBand, j, 0.22);
  // TRYST in rose neon on the band's east face, over the avenue
  const zm = (z0 + z1) / 2;
  b.box(x1 + 0.05, yBand + 0.7, zm - 3.6, x1 + 0.15, deck - 0.5, zm + 3.6, 0x121318, { faces: 'NESTB' });
  k.sign('towers-tryst', x1 + 0.18, (yBand + 0.7 + deck - 0.5) / 2, zm, 1, 0, deck - 0.5 - yBand - 0.9, 7.0);

  // the place for a hero, kept clear, with small lamps round it in the deck
  const hx0 = spot.x - 4.2, hx1 = spot.x + 4.2, hz0 = spot.z - 1.9, hz1 = spot.z + 1.9;
  for (const [x, z] of [[hx0, hz0], [hx1, hz0], [hx1, hz1], [hx0, hz1], [spot.x, hz0], [spot.x, hz1]] as XZ[]) k.glows.push({ x, y: deck + 0.04, z, sx: 0.3, sy: 0.06, sz: 0.3, color: '#ffe4f0' });
  k.lights.push({ x: spot.x, z: spot.z, r: 8, color: '#ffc4dc', k: 0.6 });

  // the gravity floor: tiles of light in three colours, north of the hero's place. Its east end is
  // left clear, for the show lands Sevro there (story 4)
  const fx0 = x0 + 1.5, fx1 = x1 - 1.9, fz0 = z0 + 0.95, fz1 = hz0 - 0.4, cols = 6, rows = 2;
  const tiles = [0xff6fb5, 0x9c7bff, 0x55dcff];
  for (let i = 0; i < cols; i++) {
    for (let r = 0; r < rows; r++) {
      const ax = fx0 + ((fx1 - fx0) * i) / cols, bx = fx0 + ((fx1 - fx0) * (i + 1)) / cols, az = fz0 + ((fz1 - fz0) * r) / rows, bz = fz0 + ((fz1 - fz0) * (r + 1)) / rows;
      b.box(ax + 0.04, deck, az + 0.04, bx - 0.04, deck + 0.05, bz - 0.04, tiles[(i + r) % 3], { faces: 'T', win: interior(1.7) });
    }
  }
  dancers(k, fx0 + 0.4, fz0 + 0.3, fx1 - 0.4, fz1 - 0.3, deck);
  BUBBLES.push({ c: [(fx0 + fx1) / 2, deck, (fz0 + fz1) / 2], r: [(fx1 - fx0) / 2 + 1.0, 3.9, (fz1 - fz0) / 2 + 0.6], color: 0xff7ac0 });

  // the bar at the west end: its counter, the shelves behind it lit, a bartender
  b.box(x0 + 0.85, deck, fz0, x0 + 1.25, deck + 1.05, fz1, 0x2a2d33, { top: 0xd8dde3 });
  b.box(x0 + 0.05, deck, fz0, x0 + 0.3, deck + 1.6, fz1, 0x24262c);
  for (let i = 0; i < 3; i++) k.glows.push({ x: x0 + 0.34, y: deck + 0.6 + i * 0.4, z: (fz0 + fz1) / 2, sx: 0.06, sy: 0.12, sz: fz1 - fz0 - 0.4, color: ['#ffd27a', '#ff8ac4', '#8ae9ff'][i] });
  k.person(x0 + 0.55, (fz0 + fz1) / 2 + 0.6, deck);
  // a pergola over the bar, hung with strings of lamps
  {
    const px0 = x0 + 0.12, px1 = x0 + 1.45, ph = deck + 2.6, STEELP = 0xb3bcc6;
    for (const [x, z] of [[px0, fz0], [px1, fz0], [px0, fz1], [px1, fz1]] as XZ[]) b.beam([x, deck, z], [x, ph, z], 0.06, 0.06, STEELP);
    for (const x of [px0, px1]) b.beam([x, ph, fz0 - 0.1], [x, ph, fz1 + 0.1], 0.06, 0.06, STEELP);
    for (let i = 0; i <= 4; i++) {
      const z = fz0 + ((fz1 - fz0) * i) / 4;
      b.beam([px0 - 0.15, ph + 0.1, z], [px1 + 0.15, ph + 0.1, z], 0.05, 0.05, STEELP);
    }
    for (let i = 0; i < 7; i++) {
      const z = fz0 + 0.2 + ((fz1 - fz0 - 0.4) * i) / 6;
      for (const x of [px0, px1]) k.glows.push({ x, y: ph - 0.25 - 0.12 * Math.sin((i / 6) * Math.PI), z, sx: 0.1, sy: 0.1, sz: 0.1, color: '#ffe0a0' });
    }
  }
  // the music: a desk along the north rail, its lit front to the floor
  const dx = (fx0 + fx1) / 2;
  b.box(dx - 1.2, deck, z0 + 0.12, dx + 1.2, deck + 1.0, z0 + 0.62, 0x24262c, { top: 0x3a3e46 });
  k.glows.push({ x: dx, y: deck + 0.62, z: z0 + 0.65, sx: 2.2, sy: 0.4, sz: 0.05, color: '#7af0ff' });
  k.person(dx + 0.3, z0 + 1.1, deck);
  // the light masts at the north corners, their lamps turned on the floor
  for (const [mx, mz] of [[x0 + 0.25, z0 + 0.25], [x1 - 0.25, z0 + 0.25]] as XZ[]) {
    b.box(mx - 0.1, deck, mz - 0.1, mx + 0.1, deck + 3.6, mz + 0.1, 0x9aa3ac);
    k.glows.push({ x: mx, y: deck + 3.5, z: mz + 0.25, sx: 0.36, sy: 0.3, sz: 0.36, color: mx < spot.x ? '#ff5fb0' : '#5fe0ff' });
    k.glows.push({ x: mx, y: deck + 2.8, z: mz + 0.25, sx: 0.3, sy: 0.26, sz: 0.3, color: '#c49bff' });
  }
  // glass rails round the deck
  const rx0 = x0 - 0.05, rx1 = x1, rz0 = z0 - 0.05, rz1 = z1 + 0.05, rh = 1.0;
  for (const [ax, az, bx2, bz] of [[rx0, rz0, rx1, rz0 + 0.08], [rx0, rz1 - 0.08, rx1, rz1], [rx0, rz0 + 0.08, rx0 + 0.08, rz1 - 0.08], [rx1 - 0.08, rz0 + 0.08, rx1, rz1 - 0.08]]) {
    b.box(ax, deck, az, bx2, deck + rh, bz, RAIL_GLASS, { faces: 'NESWT' });
  }
  // a few more of the club, along the west rail and at the bar
  for (const [x, z] of [[x0 + 2.0, fz0 + 0.4], [x0 + 0.5, spot.z], [x0 + 0.5, z1 - 0.7], [fx1 - 0.6, fz1 - 0.4]] as XZ[]) k.person(x, z, deck);
  k.lights.push({ x: (x0 + x1) / 2, z: (fz0 + fz1) / 2, r: 9, color: '#ff9fd0', k: 0.6 });
};

// ---------------------------------------------------------------------------
// temptation: the cup
// ---------------------------------------------------------------------------

/**
 * Temptation (RR 16): an eight-sided glass shaft that flares at the top into
 * a cup of lit glass facets, its name lit along the cup's south rim, and the
 * club inside the cup, a storey down from the rim: a round floor of light, a
 * bar, low seats, light masts and its people, under a noise bubble.
 */
const temptation: Model = (k, l) => {
  const b = k.b, j = JEWEL.cyan, c = middle(l), half = Math.min(l.x1 - l.x0, l.z1 - l.z0) / 2, rim = l.top;
  const yCup = rim - 8, deck = rim - 1.1;
  const body = chamfered(c[0], c[1], half - 1.5, 1.0);
  lobby(b, body, inset(body, 0.7), 24);
  shaft(b, body, 24, yCup, TOWER_GLASS, 8.2, j, [28]);
  const lip = chamfered(c[0], c[1], half - 0.2, 1.6), inner = inset(lip, 0.35);
  skin(b, body, lip, yCup, rim, c, j.glass, { win: GEM });
  ledge(b, lip, inner, rim, true, BAND);
  walls(b, inner, deck, rim, BAND, { inward: true });
  lid(b, inner, deck, DECK);
  body.forEach((p, i) => {
    strip(k, p, 24, yCup, j, 0.22);
    rib(b, at(p, yCup), at(lip[i], rim - 0.15), j, 0.13);
    // and the diagonal of each face, so that the cup is cut in lit facets
    rib(b, at(p, yCup), at(lip[(i + 1) % lip.length], rim - 0.15), j, 0.08, 1.8);
  });
  ring(b, lip, rim - 0.15, j, 0.12);
  ring(b, body, yCup, j, 0.12);

  // TEMPTATION in cyan neon along the cup's south rim, hung on a dark board
  const zr = c[1] + half - 0.2;
  b.box(c[0] - 3.25, rim - 1.7, zr, c[0] + 3.25, rim - 0.15, zr + 0.1, 0x121318, { faces: 'NESWTB' });
  k.sign('towers-temptation', c[0], rim - 0.925, zr + 0.13, 0, 1, 1.4, 6.2);

  // the club in the cup: a round floor of light
  const disc = Array.from({ length: 12 }, (_, i): XZ => [c[0] + Math.cos((i * Math.PI) / 6) * 2.3, c[1] + 0.3 + Math.sin((i * Math.PI) / 6) * 2.3]);
  prism(b, disc, deck, deck + 0.06, 0x6fe0ff, { win: interior(1.6), top: false });
  lid(b, disc, deck + 0.06, 0x8fe6ff, false, { win: interior(1.6) });
  b.box(c[0] - 2.6, deck, c[1] - 3.6, c[0] + 2.6, deck + 1.0, c[1] - 3.0, 0x2a2d33, { top: 0xd8dde3 });
  k.glows.push({ x: c[0], y: deck + 0.5, z: c[1] - 2.97, sx: 5.0, sy: 0.08, sz: 0.04, color: '#ff8ac4' });
  // the stage in the south-east corner, raised to the rim, its front lit: the show lands Sevro on it (story 4)
  const stage = clip(inner, (p) => p[0] - c[0] + (p[1] - c[1]) - 6.2);
  lid(b, stage, rim, 0x2d3138);
  const front = stage.filter((p) => Math.abs(p[0] - c[0] + (p[1] - c[1]) - 6.2) < 1e-6);
  if (front.length === 2) {
    b.quad(at(front[0], deck), at(front[1], deck), at(front[1], rim), at(front[0], rim), [-SQ, 0, -SQ], JEWEL.rose.glass, { win: GEM });
    rib(b, at(front[0], rim - 0.11), at(front[1], rim - 0.11), j, 0.08);
  }
  for (const [sx, sz] of [[-3.0, 2.4], [-1.2, 3.4], [0.8, 3.3], [2.2, 1.9]] as XZ[]) b.box(c[0] + sx - 0.6, deck, c[1] + sz - 0.35, c[0] + sx + 0.6, deck + 0.45, c[1] + sz + 0.35, 0x7a3e6a, { top: 0x94507f });
  for (const [mx, mz] of [[-3.3, -3.3], [3.3, -3.3]] as XZ[]) {
    b.box(c[0] + mx - 0.09, deck, c[1] + mz - 0.09, c[0] + mx + 0.09, deck + 3.6, c[1] + mz + 0.09, 0x9aa3ac);
    k.glows.push({ x: c[0] + mx, y: deck + 3.5, z: c[1] + mz + 0.2, sx: 0.34, sy: 0.3, sz: 0.34, color: mx < 0 ? '#5fe0ff' : '#ff5fb0' });
  }
  for (const [x, z] of [[-0.6, 0.1], [0.8, 0.6], [-1.4, 1.2], [0.2, -0.9], [1.6, -0.3], [-2.2, -2.5], [1.9, -2.5], [-3.0, 1.6], [2.6, 1.7]] as XZ[]) k.person(c[0] + x, c[1] + z, deck);
  // high tables round the floor, each with a small lamp on it
  for (const [x, z] of [[-3.4, -0.6], [-3.0, -1.9], [3.4, -0.4], [3.1, 0.9], [-3.6, 0.9]] as XZ[]) {
    b.cyl(c[0] + x, c[1] + z, deck, deck + 0.95, 0.07, 0.07, 6, 0x9aa3ac, { cap: false });
    b.cyl(c[0] + x, c[1] + z, deck + 0.95, deck + 1.02, 0.36, 0.36, 8, 0x2a2d33, { cap: 0xd8dde3 });
    k.glows.push({ x: c[0] + x, y: deck + 1.08, z: c[1] + z, sx: 0.1, sy: 0.1, sz: 0.1, color: '#ffd28a' });
  }
  BUBBLES.push({ c: [c[0], rim - 0.2, c[1]], r: [half - 0.4, 3.6, half - 0.4], color: 0x7ae8ff });
  k.lights.push({ x: c[0], z: c[1], r: 10, color: '#a8ecff', k: 0.6 });
  k.lights.push({ x: c[0] + 2, z: l.z1 + 3, r: 10, color: COLD, k: 0.5 });
};

/** A model for each lot this file builds, by the id of the lot in plan.ts. */
export const MODELS: Record<string, Model> = {
  podium,
  'tower-1': blade,
  'tower-2': twisted,
  'tower-3': crystal,
  'tower-4': screenTower,
  'tower-5': split,
  'tower-6': star,
  tryst,
  temptation,
};
/** Lots built as part of another lot's model or by `extras`, which get no box either. */
export const COVERS: string[] = [];
/** Every sign this file hangs. Each id begins with this file's name and a hyphen. */
export const SIGNS: SignDef[] = [
  { id: 'towers-tryst', lines: ['TRYST'], color: '#ff5aa8', aspect: 3.4, kind: 'neon', size: [326, 96] },
  { id: 'towers-temptation', lines: ['TEMPTATION'], color: '#5ee2ff', aspect: 5.2, kind: 'neon', size: [458, 88] },
];
/** Whatever this file builds that is not one of the plan's lots: the noise bubbles over the clubs, as one mesh. */
export function extras(k: Build): void {
  bubbles(k);
}
