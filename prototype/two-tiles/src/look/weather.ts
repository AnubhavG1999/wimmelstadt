// Carried over from the look prototype, unchanged but for an import.
//
// The weather. It is the city's own: it does not follow any forecast. Each kind
// is a handful of amounts (cloud, rain, fog, snow) that bend the light of the
// hour, and the city eases from one kind to the next.

import * as THREE from 'three';
import type { Atmo } from './atmosphere.ts';

export type WeatherName = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog' | 'snow';
export const WEATHER_NAMES: WeatherName[] = ['clear', 'cloudy', 'rain', 'storm', 'fog', 'snow'];

interface Amounts { cloud: number; rain: number; fog: number; snow: number; wet: number; storm: number }

const KINDS: Record<WeatherName, Amounts> = {
  clear: { cloud: 0, rain: 0, fog: 0, snow: 0, wet: 0, storm: 0 },
  cloudy: { cloud: 0.8, rain: 0, fog: 0.1, snow: 0, wet: 0, storm: 0 },
  rain: { cloud: 0.9, rain: 0.7, fog: 0.25, snow: 0, wet: 1, storm: 0 },
  storm: { cloud: 1, rain: 1, fog: 0.35, snow: 0, wet: 1, storm: 1 },
  fog: { cloud: 0.65, rain: 0, fog: 1, snow: 0, wet: 0.3, storm: 0 },
  snow: { cloud: 0.8, rain: 0, fog: 0.3, snow: 1, wet: 0.1, storm: 0 },
};

/** How likely each kind is when the city chooses for itself, out of 100. */
const ODDS: [WeatherName, number][] = [['clear', 44], ['cloudy', 20], ['rain', 16], ['fog', 8], ['storm', 6], ['snow', 6]];
/** The city's own weather holds for this many minutes at a time. */
const SPELL_MINUTES = 6;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const tmp = new THREE.Color();

export class Weather {
  /** What was asked for: one kind of weather, or 'auto' to let the city choose. */
  choice: WeatherName | 'auto' = 'auto';
  /** The amounts as they are this instant, on their way to the kind that is wanted. */
  readonly now: Amounts = { ...KINDS.clear };
  /** Snow lying on the ground. It builds up and melts more slowly than it falls. */
  cover = 0;
  /** Lightning: 1 at the instant of a flash, fading within a fraction of a second. */
  flash = 0;
  private untilFlash = 2;
  private echo = -1;

  /** The kind the city would choose by itself at this moment. The same for everyone at the same time. */
  static own(ms = Date.now()): WeatherName {
    let a = (Math.floor(ms / (SPELL_MINUTES * 60000)) * 2654435761) >>> 0;
    a ^= a >>> 15;
    a = Math.imul(a, 2246822519) >>> 0;
    a ^= a >>> 13;
    let pick = a % 100;
    for (const [name, odds] of ODDS) {
      if (pick < odds) return name;
      pick -= odds;
    }
    return 'clear';
  }

  /** The kind of weather that is wanted right now. */
  get name(): WeatherName {
    return this.choice === 'auto' ? Weather.own() : this.choice;
  }

  /** Moves on to the next choice: auto, then each kind in turn. */
  next(): void {
    const all: (WeatherName | 'auto')[] = ['auto', ...WEATHER_NAMES];
    this.choice = all[(all.indexOf(this.choice) + 1) % all.length];
  }

  update(dt: number): void {
    const want = KINDS[this.name];
    const k = 1 - Math.exp(-dt * 0.9);
    for (const key of Object.keys(want) as (keyof Amounts)[]) this.now[key] += (want[key] - this.now[key]) * k;
    this.cover = Math.min(1, Math.max(0, this.cover + (this.now.snow > 0.4 ? dt / 12 : -dt / 18)));

    this.flash *= Math.exp(-dt * 10);
    if (this.now.storm > 0.6) {
      this.untilFlash -= dt;
      if (this.untilFlash <= 0) {
        this.flash = 1;
        this.untilFlash = 4 + Math.random() * 12;
        this.echo = Math.random() < 0.6 ? 0.13 : -1;
      }
      if (this.echo > 0) {
        this.echo -= dt;
        if (this.echo <= 0) this.flash = 0.8;
      }
    }
  }

  /** Bends the light of the hour to the weather. */
  apply(a: Atmo): void {
    const m = this.now;
    const c = m.cloud;
    const day = 1 - a.night;

    // under cloud the sun is weak and the light is flat and grey
    a.sunI *= 1 - 0.8 * c;
    a.sunColor.lerp(tmp.setRGB(0.86, 0.89, 0.95), 0.6 * c);
    a.sky.lerp(tmp.setRGB(lerp(0.13, 0.66, day), lerp(0.14, 0.7, day), lerp(0.22, 0.76, day)), 0.75 * c);
    a.ground.lerp(tmp.setRGB(lerp(0.09, 0.5, day), lerp(0.08, 0.49, day), lerp(0.13, 0.48, day)), 0.6 * c);
    a.hemiI *= 1 + 0.22 * c * day;
    a.shadow = 1 - 0.8 * c;
    a.bgTop.lerp(tmp.setRGB(lerp(0.02, 0.5, day), lerp(0.022, 0.55, day), lerp(0.04, 0.62, day)), 0.85 * c);
    a.bgBot.lerp(tmp.setRGB(lerp(0.06, 0.74, day), lerp(0.055, 0.77, day), lerp(0.09, 0.8, day)), 0.85 * c);
    a.exposure *= 1 - 0.1 * c;
    a.saturation *= 1 - 0.22 * c;

    // fog and rain thicken the haze, which takes the colour of the sky behind it
    tmp.copy(a.bgBot).lerp(a.bgTop, 0.4);
    a.fog.lerp(tmp, Math.min(1, 0.5 * c + 0.45 * m.fog));
    // both distances bracket the board, so that in thick fog its near side stays
    // clear while its far side all but disappears
    a.fogFar = lerp(a.fogFar, 150, m.fog);
    a.fogNear = 500 + 60 * m.fog;
    a.bloom += 0.25 * m.fog + 0.1 * m.rain;

    a.wet = Math.max(a.wet, m.wet) * (1 - 0.7 * this.cover);
    a.rain = m.rain;
    a.snowfall = m.snow;
    a.snow = this.cover;
    // in bad weather the lamps and windows come on, whatever the hour
    a.night = Math.max(a.night, 0.45 * m.storm, 0.3 * m.rain, 0.35 * m.fog, 0.22 * m.snow);

    // lightning lifts everything for an instant: enough to notice, never a white screen
    a.flash = this.flash * m.storm;
    a.hemiI += 1.0 * a.flash;
    a.bgTop.lerp(tmp.setRGB(0.7, 0.75, 0.95), 0.42 * a.flash);
    a.bgBot.lerp(tmp.setRGB(0.7, 0.75, 0.95), 0.28 * a.flash);
  }
}
