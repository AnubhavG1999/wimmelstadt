// Materials for buildings and vehicles, carried over from the look prototype.
// Everything is cel-shaded: three.js's toon material with a stepped light ramp,
// extended in the shader with windows that light up at night, lamps on
// vehicles, and snow on whatever faces the sky.
//
// Not carried over yet: the light that street lamps and signs throw on what
// stands near them, and wet streets. Both need the streets themselves first.

import * as THREE from 'three';
import { LOOK, gradientMap } from './shared.ts';

const VERT_PARS = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
`;

const VERT_NORMAL = /* glsl */ `
#ifdef USE_INSTANCING
  vWNrm = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
#else
  vWNrm = normalize(mat3(modelMatrix) * objectNormal);
#endif
`;

const VERT_BEGIN = /* glsl */ `
#ifdef USE_INSTANCING
  vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
`;

const FRAG_PARS = /* glsl */ `
uniform float uNight;
uniform float uSnow;
uniform vec3 uSkyTint;
uniform vec3 uViewDir;
varying vec3 vWPos;
varying vec3 vWNrm;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0)), c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`;

/** GLSL that lays snow on surfaces that face the sky. `k` is how much of it this material takes. */
const snowOn = (k: number): string => /* glsl */ `
  {
    float snowAmt = uSnow * smoothstep(0.5, 0.88, vWNrm.y) * ${k.toFixed(2)} * (0.8 + 0.2 * vnoise(vWPos.xz * 0.45));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.94, 1.0), clamp(snowAmt, 0.0, 1.0));
  }
`;

interface Patch {
  /** How much snow settles on this material, from 0 to 1. */
  snow?: number;
  vertPars?: string;
  /** Replaces the colour chunk. */
  vertColor?: string;
  vertBegin?: string;
  fragPars?: string;
  /** Runs after the base colour is known. */
  fragColor?: string;
  /** Runs where emitted light is collected. */
  fragEmissive?: string;
}

function patch(mat: THREE.Material, key: string, p: Patch): void {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, LOOK);
    let vs = shader.vertexShader, fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', '#include <common>\n' + VERT_PARS + (p.vertPars ?? ''));
    if (p.vertColor) vs = vs.replace('#include <color_vertex>', p.vertColor);
    vs = vs.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + VERT_NORMAL);
    vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_BEGIN + (p.vertBegin ?? ''));
    fs = fs.replace('#include <common>', '#include <common>\n' + FRAG_PARS + (p.fragPars ?? ''));
    const colour = (p.fragColor ?? '') + (p.snow ? snowOn(p.snow) : '');
    if (colour) fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' + colour);
    if (p.fragEmissive) fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + p.fragEmissive);
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => key;
}

const toon = (): THREE.MeshToonMaterial => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap });

/**
 * For buildings, made with the builder in geo.ts. Each wall says how it is
 * glazed; the windows are drawn here, and some of them are lit after dark.
 */
export function makeCityMaterial(): THREE.MeshToonMaterial {
  const m = toon();
  patch(m, 'city', {
    snow: 0.95,
    vertPars: /* glsl */ `
      attribute vec4 aWall;
      attribute vec4 aWin;
      varying vec4 vWall;
      varying vec4 vWin;
    `,
    vertBegin: /* glsl */ `
      vWall = aWall;
      vWin = aWin;
    `,
    fragPars: /* glsl */ `
      varying vec4 vWall;
      varying vec4 vWin;
    `,
    fragColor: /* glsl */ `
      vec3 wmEmis = vec3(0.0);
      {
        float cell = vWin.x;
        float kind = vWin.w;
        // the window grid is worked out for every pixel so its derivatives are always defined
        float wallLen = max(vWall.z, 0.001);
        float nCol = max(1.0, floor(wallLen / max(cell, 0.01) + 0.5));
        vec2 g = vec2(vWall.x / wallLen * nCol, vWall.y / max(vWin.y, 0.01));
        vec2 aa = fwidth(g) * 0.8 + 1e-4;
        if (cell > 0.0 && abs(vWNrm.y) < 0.5) {
          vec2 id = floor(g);
          vec2 f = fract(g);
          float seed = vWall.w;
          float r1 = hash21(id + seed * 37.0);
          float r2 = hash21(id * 1.31 + seed * 11.0 + 3.7);

          vec2 lo = vec2(0.2, 0.22);
          vec2 hi = vec2(0.8, 0.8);
          bool curtain = kind > 0.5 && kind < 1.5;
          if (curtain) { lo = vec2(0.06, 0.08); hi = vec2(0.94, 0.92); }
          if (kind > 3.5 && kind < 4.5) { lo = vec2(0.3, 0.3); hi = vec2(0.7, 0.72); }
          if (kind > 5.5) { lo = vec2(0.3, 0.02); hi = vec2(0.7, 0.98); } // tall slits: a pinstripe facade
          bool shop = kind > 1.5 && kind < 3.5 && vWall.y < vWin.y;
          if (shop) { lo = vec2(0.07, 0.14); hi = vec2(0.93, 0.78); }

          float win = smoothstep(lo.x - aa.x, lo.x + aa.x, f.x) * (1.0 - smoothstep(hi.x - aa.x, hi.x + aa.x, f.x))
                    * smoothstep(lo.y - aa.y, lo.y + aa.y, f.y) * (1.0 - smoothstep(hi.y - aa.y, hi.y + aa.y, f.y));
          // From far off a wall's windows are finer than a pixel. There the wall is drawn
          // as the average of its windows, lit ones included, instead of shimmering.
          float far = smoothstep(0.4, 1.0, max(aa.x, aa.y));
          win = mix(win, 0.3, far);
          r2 = mix(r2, 0.5, far);

          vec3 glass = mix(vec3(0.05, 0.08, 0.13), uSkyTint, 0.28 + 0.3 * r2);
          if (curtain) glass = mix(vec3(0.07, 0.13, 0.2), uSkyTint, 0.5 + 0.25 * r2);
          diffuseColor.rgb = mix(diffuseColor.rgb, glass, win);

          if (shop) {
            // every shopfront glows in a colour of its own
            float pick = hash21(vec2(seed * 91.0, id.x * 0.37 + 2.0));
            vec3 neon = mix(vec3(1.0, 0.35, 0.65), vec3(0.3, 0.9, 1.0), step(0.5, pick));
            vec3 sc = mix(vec3(1.0, 0.82, 0.55), neon, step(0.45, fract(pick * 7.0)) * 0.7);
            wmEmis = sc * win * uNight * 1.5;
          } else {
            // some buildings are mostly dark, and most rooms are warm with a few cool or pink ones
            float mood = mix(0.3, 1.25, hash21(vec2(seed * 53.0, 1.7)));
            float litProb = vWin.z * mood * smoothstep(0.05, 0.9, uNight);
            float lit = mix(step(1.0 - litProb, r1), min(litProb, 1.0), far);
            float pickc = hash21(id * 0.71 + seed * 5.0);
            vec3 wcol = mix(vec3(1.0, 0.58, 0.24), vec3(1.0, 0.8, 0.5), r2);
            if (pickc > 0.76) wcol = vec3(0.42, 0.78, 1.0);
            if (pickc > 0.94) wcol = vec3(1.0, 0.32, 0.68);
            wmEmis = wcol * win * lit * uNight * (0.5 + 0.9 * r2);
          }
        } else if (kind > 4.5 && kind < 5.5) {
          // a floodlit or lit-from-within surface
          wmEmis = diffuseColor.rgb * vWin.z * uNight;
        }
      }
    `,
    fragEmissive: /* glsl */ `
      totalEmissiveRadiance += wmEmis;
      // a little of the city's own light on every wall, so that a tower is not a black shape at night
      totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.82, 0.62) * 0.1 * uNight;
    `,
  });
  return m;
}

/**
 * For traffic, drawn many at a time: the colour of each vehicle tints only its
 * paint, and its lamps come on as it gets dark.
 */
export function makeVehicleMaterial(): THREE.MeshToonMaterial {
  const m = toon();
  patch(m, 'vehicle', {
    snow: 0.35,
    vertPars: /* glsl */ `
      attribute float aPart;
      varying float vPart;
    `,
    // Only the paint takes the colour of the vehicle; glass, tyres and lamps keep theirs.
    vertColor: /* glsl */ `
      #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
        vColor = vec4(1.0);
      #endif
      #ifdef USE_COLOR
        vColor.rgb *= color;
      #endif
      #ifdef USE_INSTANCING_COLOR
        vColor.rgb *= mix(vec3(1.0), instanceColor.rgb, step(aPart, 0.5));
      #endif
    `,
    vertBegin: /* glsl */ `
      vPart = aPart;
    `,
    fragPars: /* glsl */ `
      varying float vPart;
    `,
    fragEmissive: /* glsl */ `
      float isPaint = step(vPart, 0.5);
      float isGlass = step(0.5, vPart) * step(vPart, 1.5);
      float isHead = step(2.5, vPart) * step(vPart, 3.5);
      float isTail = step(3.5, vPart) * step(vPart, 4.5);
      totalEmissiveRadiance += isHead * vec3(1.0, 0.93, 0.75) * (0.2 + 3.4 * uNight);
      totalEmissiveRadiance += isTail * vec3(1.0, 0.08, 0.05) * (0.12 + 2.6 * uNight);
      // lit by the road's own lamps after dark
      totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.8, 0.55) * 0.34 * uNight;
      // paint and glass pick up a soft sheen of sky by day
      vec3 refl = reflect(uViewDir, normalize(vWNrm));
      float up = smoothstep(0.1, 0.9, refl.y);
      totalEmissiveRadiance += uSkyTint * up * (1.0 - uNight) * (0.1 * isPaint + 0.3 * isGlass);
    `,
  });
  return m;
}
