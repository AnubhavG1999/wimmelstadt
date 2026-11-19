// The light at every hour of the day: a handful of hand-set moments, blended.
// Colours here are linear values, as the renderer works with them.

import * as THREE from 'three';

export interface Atmo {
  /** 0 by day, 1 at night. Drives windows, signs, lamps and headlights. */
  night: number;
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  sunI: number;
  sky: THREE.Color;
  ground: THREE.Color;
  hemiI: number;
  fog: THREE.Color;
  fogFar: number;
  fogNear: number;
  /** How dark the sun's shadows are, from 0 to 1. */
  shadow: number;
  /** Weather: how hard it rains and snows, how much snow lies, and lightning. */
  rain: number;
  snowfall: number;
  snow: number;
  flash: number;
  saturation: number;
  bgTop: THREE.Color;
  bgBot: THREE.Color;
  bloom: number;
  exposure: number;
  /** How wet the streets look. */
  wet: number;
  outline: number;
}

type RGB = [number, number, number];

interface Key {
  h: number;
  night: number;
  sunI: number; sun: RGB;
  sky: RGB; gnd: RGB; hemiI: number;
  fog: RGB; fogFar: number;
  top: RGB; bot: RGB;
  bloom: number; exp: number; wet: number; outline: number;
}

const NIGHT: Omit<Key, 'h'> = {
  night: 1,
  sunI: 0.6, sun: [0.5, 0.6, 1.0],
  sky: [0.16, 0.19, 0.44], gnd: [0.1, 0.07, 0.17], hemiI: 0.95,
  fog: [0.085, 0.055, 0.19], fogFar: 640,
  top: [0.006, 0.006, 0.025], bot: [0.03, 0.016, 0.065],
  bloom: 0.9, exp: 1.1, wet: 1, outline: 0.55,
};

const DAY: Omit<Key, 'h'> = {
  night: 0,
  sunI: 3.5, sun: [1.0, 0.95, 0.86],
  sky: [0.6, 0.75, 0.98], gnd: [0.6, 0.52, 0.42], hemiI: 1.25,
  fog: [0.82, 0.88, 0.95], fogFar: 2600,
  top: [0.4, 0.64, 0.93], bot: [0.85, 0.91, 0.97],
  bloom: 0.1, exp: 1.08, wet: 0, outline: 1,
};

/** The light direction switches from sun to moon at these hours, while the light is dark. */
const DAWN = 5.45, DUSK = 19.3;

const KEYS: Key[] = [
  { h: 0, ...NIGHT },
  { h: 4.9, ...NIGHT },
  { h: DAWN, ...NIGHT, night: 0.9, sunI: 0, sky: [0.25, 0.25, 0.5], fog: [0.2, 0.14, 0.3], fogFar: 720, top: [0.03, 0.03, 0.1], bot: [0.2, 0.1, 0.17], wet: 0.85, bloom: 0.85 },
  { h: 6.3, night: 0.45, sunI: 1.3, sun: [1.0, 0.55, 0.36], sky: [0.55, 0.47, 0.62], gnd: [0.36, 0.26, 0.25], hemiI: 1.15, fog: [0.86, 0.6, 0.54], fogFar: 900, top: [0.24, 0.3, 0.56], bot: [0.98, 0.66, 0.5], bloom: 0.5, exp: 1.05, wet: 0.45, outline: 0.8 },
  { h: 7.6, ...DAY, sunI: 3.1, sun: [1.0, 0.88, 0.72], fogFar: 2100, bloom: 0.12 },
  { h: 12.5, ...DAY },
  { h: 16.5, ...DAY, sunI: 3.2, sun: [1.0, 0.88, 0.7], fogFar: 2100 },
  { h: 18.2, night: 0.1, sunI: 2.2, sun: [1.0, 0.6, 0.34], sky: [0.74, 0.6, 0.7], gnd: [0.56, 0.4, 0.33], hemiI: 1.4, fog: [0.98, 0.7, 0.5], fogFar: 1300, top: [0.3, 0.38, 0.7], bot: [1.0, 0.68, 0.45], bloom: 0.3, exp: 1.1, wet: 0.08, outline: 0.95 },
  { h: 19.0, night: 0.6, sunI: 0.35, sun: [0.9, 0.5, 0.6], sky: [0.36, 0.32, 0.62], gnd: [0.2, 0.14, 0.24], hemiI: 1.05, fog: [0.36, 0.24, 0.46], fogFar: 780, top: [0.05, 0.05, 0.17], bot: [0.42, 0.2, 0.3], bloom: 0.75, exp: 1.1, wet: 0.6, outline: 0.7 },
  { h: DUSK, ...NIGHT, night: 0.82, sunI: 0, sky: [0.24, 0.24, 0.52], fog: [0.2, 0.13, 0.32], fogFar: 700, top: [0.02, 0.02, 0.08], bot: [0.14, 0.06, 0.16], bloom: 0.9, exp: 1.12, wet: 0.85, outline: 0.6 },
  { h: 20.3, ...NIGHT },
  { h: 24, ...NIGHT },
];

const MOON = new THREE.Vector3(0.42, 0.78, 0.46).normalize();
const GRID_TURN = THREE.MathUtils.degToRad(40);
const GRID_COS = Math.cos(GRID_TURN), GRID_SIN = Math.sin(GRID_TURN);

export function makeAtmo(): Atmo {
  return {
    night: 0,
    sunDir: new THREE.Vector3(0, 1, 0), sunColor: new THREE.Color(), sunI: 1,
    sky: new THREE.Color(), ground: new THREE.Color(), hemiI: 1,
    fog: new THREE.Color(), fogFar: 1500, fogNear: 500, shadow: 1,
    rain: 0, snowfall: 0, snow: 0, flash: 0, saturation: 1.14,
    bgTop: new THREE.Color(), bgBot: new THREE.Color(),
    bloom: 0, exposure: 1, wet: 0, outline: 1,
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mixRGB(out: THREE.Color, a: RGB, b: RGB, t: number): void {
  out.setRGB(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}

export function atmosphereAt(hour: number, out: Atmo): Atmo {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  let t = (h - a.h) / Math.max(1e-6, b.h - a.h);
  t = t * t * (3 - 2 * t);

  out.night = lerp(a.night, b.night, t);
  out.sunI = lerp(a.sunI, b.sunI, t);
  mixRGB(out.sunColor, a.sun, b.sun, t);
  mixRGB(out.sky, a.sky, b.sky, t);
  mixRGB(out.ground, a.gnd, b.gnd, t);
  out.hemiI = lerp(a.hemiI, b.hemiI, t);
  mixRGB(out.fog, a.fog, b.fog, t);
  out.fogFar = lerp(a.fogFar, b.fogFar, t);
  mixRGB(out.bgTop, a.top, b.top, t);
  mixRGB(out.bgBot, a.bot, b.bot, t);
  out.bloom = lerp(a.bloom, b.bloom, t);
  out.exposure = lerp(a.exp, b.exp, t);
  out.wet = lerp(a.wet, b.wet, t);
  out.outline = lerp(a.outline, b.outline, t);
  // the weather changes these afterwards; this is the clear-sky state
  out.fogNear = 500;
  out.shadow = 1;
  out.rain = 0;
  out.snowfall = 0;
  out.snow = 0;
  out.flash = 0;
  out.saturation = 1.14;

  if (h >= DAWN && h < DUSK) {
    // the sun rises in the east, stands in the south at midday and sets in the west
    const arc = ((h - DAWN) / (DUSK - DAWN)) * Math.PI;
    const el = THREE.MathUtils.degToRad(10 + 52 * Math.sin(arc));
    const x = Math.cos(arc) * Math.cos(el), z = (0.3 + 0.7 * Math.sin(arc)) * Math.cos(el);
    // The street grid is turned against the compass, as Manhattan's is, so that the midday
    // sun rakes across the streets instead of shining straight down them.
    out.sunDir.set(x * GRID_COS - z * GRID_SIN, Math.sin(el), x * GRID_SIN + z * GRID_COS).normalize();
  } else {
    out.sunDir.copy(MOON);
  }
  return out;
}

export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
