// Materials. Everything solid is cel-shaded: three.js's toon material with a
// stepped light ramp, extended in the shader with windows that light up, wet
// streets, and the light that street lamps and signs throw at night.

import * as THREE from 'three';
import type { Rect } from '../tile';

/** Values shared by every material on every tile. Changing one here changes it everywhere. */
export const U = {
  uNight: { value: 0 },
  uTime: { value: 0 },
  uSkyTint: { value: new THREE.Color(0.5, 0.7, 1.0) },
  uWet: { value: 0 },
  uSnow: { value: 0 },
  uRefl: { value: null as THREE.Texture | null },
  uReflOn: { value: 0 },
  uMirrorVP: { value: new THREE.Matrix4() },
  uViewDir: { value: new THREE.Vector3(0, -1, 0) },
};

/**
 * Values that belong to one tile: the map of its lights at night, where its
 * ground lies in the city, and where its own (0, 0) is. Every material made
 * for a tile carries that tile's.
 */
export interface TileLook {
  uLightMap: { value: THREE.Texture | null };
  uBoard: { value: THREE.Vector4 };
  uOrigin: { value: THREE.Vector2 };
}

export function makeTileLook(board: Rect, ox: number, oz: number): TileLook {
  return {
    uLightMap: { value: null },
    uBoard: { value: new THREE.Vector4(ox + board.x0, oz + board.z0, 1 / (board.x1 - board.x0), 1 / (board.z1 - board.z0)) },
    uOrigin: { value: new THREE.Vector2(ox, oz) },
  };
}

/** A look that stands for no tile yet, for something that will be put on one later. */
export function looseLook(): TileLook {
  return { uLightMap: { value: null }, uBoard: { value: new THREE.Vector4(0, 0, 1, 1) }, uOrigin: { value: new THREE.Vector2() } };
}

/** Makes one look the same as another, so that whatever carries it is lit by that tile. */
export function copyLook(to: TileLook, from: TileLook): void {
  to.uLightMap.value = from.uLightMap.value;
  to.uBoard.value.copy(from.uBoard.value);
  to.uOrigin.value.copy(from.uOrigin.value);
}

/** The light ramp: unlit, then three flat bands. This is what makes the shading "cel". */
export const gradientMap = (() => {
  const steps = [0, 0, 0, 0, 112, 184, 255, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const COMMON_VERT_PARS = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
`;

const COMMON_VERT_NORMAL = /* glsl */ `
#ifdef USE_INSTANCING
  vWNrm = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
#else
  vWNrm = normalize(mat3(modelMatrix) * objectNormal);
#endif
`;

const COMMON_VERT_BEGIN = /* glsl */ `
#ifdef USE_INSTANCING
  vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif
`;

const COMMON_FRAG_PARS = /* glsl */ `
uniform float uNight;
uniform float uTime;
uniform float uSnow;
uniform vec3 uSkyTint;
uniform sampler2D uLightMap;
uniform vec4 uBoard;
uniform vec2 uOrigin;
uniform vec3 uViewDir;
varying vec3 vWPos;
varying vec3 vWNrm;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0)), c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// The light that street lamps, shopfronts and signs throw. It is painted once into
// a small map of the tile and fades with height above the street.
vec3 streetLightRaw(vec3 wp) {
  vec2 uv = (wp.xz - uBoard.xy) * uBoard.zw;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  return texture2D(uLightMap, uv).rgb * inside;
}
vec3 streetLight(vec3 wp) {
  return streetLightRaw(wp) * exp(-max(wp.y, 0.0) / 9.0);
}
`;

/** GLSL that lays snow on surfaces that face the sky. `k` is how much of it this material takes. */
const snowOn = (k: number): string => /* glsl */ `
  {
    float snowAmt = uSnow * smoothstep(0.5, 0.88, vWNrm.y) * ${k.toFixed(2)} * (0.8 + 0.2 * vnoise(vWPos.xz * 0.45));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.94, 1.0), clamp(snowAmt, 0.0, 1.0));
  }
`;

export interface Patch {
  /** How much snow settles on this material, from 0 to 1. */
  snow?: number;
  vertPars?: string;
  vertColor?: string; // replaces the colour chunk
  vertBegin?: string;
  fragPars?: string;
  fragColor?: string; // runs after the base colour is known
  fragEmissive?: string; // runs where emitted light is collected
  uniforms?: Record<string, THREE.IUniform>;
}

/**
 * Extends one of three.js's materials with pieces of shader. `key` names the
 * result: two materials with the same key share one compiled program, so a
 * tile that writes a material of its own gives it a key of its own.
 */
export function patch(mat: THREE.Material, key: string, look: TileLook, p: Patch): void {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U, look, p.uniforms ?? {});
    let vs = shader.vertexShader, fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', '#include <common>\n' + COMMON_VERT_PARS + (p.vertPars ?? ''));
    if (p.vertColor) vs = vs.replace('#include <color_vertex>', p.vertColor);
    vs = vs.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + COMMON_VERT_NORMAL);
    vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + COMMON_VERT_BEGIN + (p.vertBegin ?? ''));
    fs = fs.replace('#include <common>', '#include <common>\n' + COMMON_FRAG_PARS + (p.fragPars ?? ''));
    const colour = (p.fragColor ?? '') + (p.snow ? snowOn(p.snow) : '');
    if (colour) fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' + colour);
    if (p.fragEmissive) fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + p.fragEmissive);
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => key;
}

export function toon(extra: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ vertexColors: true, gradientMap, ...extra });
}

// ---------------------------------------------------------------------------
// Buildings and other static structure
// ---------------------------------------------------------------------------

export function makeCityMaterial(look: TileLook): THREE.MeshToonMaterial {
  const m = toon();
  patch(m, 'city', look, {
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
          if (kind > 5.5 && kind < 6.5) { lo = vec2(0.3, 0.02); hi = vec2(0.7, 0.98); } // tall slits: a pinstripe facade
          // a castle's arrow loops: narrow, and dark by day, for nothing in them catches the sky
          bool loopSlit = kind > 6.5 && kind < 7.5;
          if (loopSlit) { lo = vec2(0.44, 0.3); hi = vec2(0.56, 0.66); }
          bool shop = kind > 1.5 && kind < 3.5 && vWall.y < vWin.y;
          if (shop) { lo = vec2(0.07, 0.14); hi = vec2(0.93, 0.78); }

          float win = smoothstep(lo.x - aa.x, lo.x + aa.x, f.x) * (1.0 - smoothstep(hi.x - aa.x, hi.x + aa.x, f.x))
                    * smoothstep(lo.y - aa.y, lo.y + aa.y, f.y) * (1.0 - smoothstep(hi.y - aa.y, hi.y + aa.y, f.y));

          vec3 glass = mix(vec3(0.05, 0.08, 0.13), uSkyTint, 0.28 + 0.3 * r2);
          if (curtain) glass = mix(vec3(0.07, 0.13, 0.2), uSkyTint, 0.5 + 0.25 * r2);
          if (loopSlit) glass = vec3(0.055, 0.05, 0.045);
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
            float lit = step(1.0 - litProb, r1);
            float pickc = hash21(id * 0.71 + seed * 5.0);
            vec3 wcol = mix(vec3(1.0, 0.58, 0.24), vec3(1.0, 0.8, 0.5), r2);
            // a loop is lit by a torch or a fire, never by a cool lamp
            if (pickc > 0.76 && !loopSlit) wcol = vec3(0.42, 0.78, 1.0);
            if (pickc > 0.94 && !loopSlit) wcol = vec3(1.0, 0.32, 0.68);
            wmEmis = wcol * win * lit * uNight * (0.5 + 0.9 * r2);
          }
        } else if (kind > 4.5 && kind < 5.5) {
          wmEmis = diffuseColor.rgb * vWin.z * uNight;
        }
      }
    `,
    fragEmissive: /* glsl */ `
      totalEmissiveRadiance += wmEmis;
      totalEmissiveRadiance += diffuseColor.rgb * streetLight(vWPos) * uNight * 1.0;
    `,
  });
  return m;
}

// ---------------------------------------------------------------------------
// Road decks above the ground: the expressway and the ramps
// ---------------------------------------------------------------------------

export function makeDeckMaterial(look: TileLook): THREE.MeshToonMaterial {
  const m = toon();
  patch(m, 'deck', look, {
    snow: 0.45,
    uniforms: {
      uAsphalt: { value: new THREE.Color(0x4f5157) },
      uPaint: { value: new THREE.Color(0xf2efe6) },
    },
    vertPars: /* glsl */ `
      attribute vec4 aWin;
      varying vec4 vWin;
      varying vec2 vDeckUv;
    `,
    vertBegin: /* glsl */ `
      vWin = aWin;
      vDeckUv = uv;
    `,
    fragPars: /* glsl */ `
      varying vec4 vWin;
      varying vec2 vDeckUv;
      uniform vec3 uAsphalt, uPaint;
      uniform float uWet;
    `,
    fragColor: /* glsl */ `
      float deckW = vWin.y;
      float dd = (vDeckUv.x - 0.5) * deckW;
      float daa = fwidth(dd) * 0.8 + 1e-4;
      float edgeLine = 1.0 - smoothstep(0.1 - daa, 0.1 + daa, abs(abs(dd) - (deckW * 0.5 - 0.9)));
      float centre = (1.0 - smoothstep(0.14 - daa, 0.14 + daa, abs(dd))) * step(0.5, fract(vDeckUv.y / 7.0)) * step(1.5, vWin.x);
      vec3 asp = uAsphalt * (0.92 + 0.16 * vnoise(vWPos.xz * 0.9));
      asp *= mix(1.0, 0.72, uWet);
      diffuseColor.rgb = mix(asp, uPaint, clamp(edgeLine * 0.7 + centre, 0.0, 1.0));
    `,
    fragEmissive: /* glsl */ `
      // a road deck is lit by its own lamps
      totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.78, 0.5) * 0.55 * uNight;
    `,
  });
  return m;
}

// ---------------------------------------------------------------------------
// Vehicles and people
// ---------------------------------------------------------------------------

const VEHICLE_PATCH: Patch = {
  snow: 0.35,
  vertPars: /* glsl */ `
    attribute float aPart;
    attribute float aLit;
    varying float vPart;
    varying float vLit;
  `,
  // Only the paint takes the colour of the instance; glass, tyres and lamps keep theirs.
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
    vLit = aLit;
  `,
  fragPars: /* glsl */ `
    varying float vPart;
    varying float vLit;
  `,
  fragEmissive: /* glsl */ `
    float isPaint = step(vPart, 0.5);
    float isGlass = step(0.5, vPart) * step(vPart, 1.5);
    float isHead = step(2.5, vPart) * step(vPart, 3.5);
    float isTail = step(3.5, vPart) * step(vPart, 4.5);
    totalEmissiveRadiance += isHead * vec3(1.0, 0.93, 0.75) * (0.2 + 3.4 * uNight);
    totalEmissiveRadiance += isTail * vec3(1.0, 0.08, 0.05) * (0.12 + 2.6 * uNight);

    // lit by the street around it, by the lamps of a road deck, or by an interior
    vec3 around = streetLight(vWPos) * 1.15
                + vec3(1.0, 0.8, 0.55) * smoothstep(10.0, 20.0, vWPos.y) * 0.4
                + vec3(0.85, 0.92, 1.0) * vLit * 0.8;
    totalEmissiveRadiance += diffuseColor.rgb * around * uNight;

    // paint and glass pick up a soft sheen: neon at night, sky by day
    vec3 refl = reflect(uViewDir, normalize(vWNrm));
    float up = smoothstep(0.1, 0.9, refl.y);
    vec3 neon = streetLightRaw(vWPos + vec3(refl.x, 0.0, refl.z) * 9.0);
    float streak = 0.6 + 0.4 * sin(refl.x * 9.0 + refl.z * 6.0 + vWPos.x * 0.4 + vWPos.z * 0.3);
    totalEmissiveRadiance += neon * streak * up * uNight * (0.9 * isPaint + 1.3 * isGlass);
    totalEmissiveRadiance += uSkyTint * up * (1.0 - uNight) * (0.1 * isPaint + 0.3 * isGlass);
  `,
};

/** For instanced traffic and for people: the instance colour tints only the paint. */
export function makeVehicleMaterial(look: TileLook): THREE.MeshToonMaterial {
  const m = toon();
  patch(m, 'vehicle', look, VEHICLE_PATCH);
  return m;
}

/**
 * For a hero made from a generated model. Its texture arrives looking like a
 * photograph, so its brightness is first ironed into a few flat steps, which
 * removes the photographed shine but keeps the edges of decals. After that it
 * is lit like everything else that drives.
 */
export function makeModelMaterial(look: TileLook, map: THREE.Texture | null, color: THREE.Color, side: THREE.Side): THREE.MeshToonMaterial {
  const m = toon({ vertexColors: false, map, color, side });
  patch(m, 'model', look, {
    snow: 0.35,
    fragColor: /* glsl */ `
      {
        vec3 c = diffuseColor.rgb;
        float l = max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
        // the colour without its brightness; in the darkest corners there is none worth keeping
        vec3 hue = mix(vec3(1.0), c / l, smoothstep(0.0, 0.03, l));
        // brightness snapped to five soft steps, and never quite black, so that a black car keeps its shape
        float p = pow(l, 1.0 / 2.2) * 5.0;
        float q = max((floor(p) + smoothstep(0.3, 0.7, fract(p))) / 5.0, 0.17);
        c = hue * pow(q, 2.2);
        // a little richer, as the city is
        float g = dot(c, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = clamp(mix(vec3(g), c, 1.2), 0.0, 1.0);
      }
    `,
    fragEmissive: /* glsl */ `
      // lit by the street around it or by the lamps of a road deck
      vec3 around = streetLight(vWPos) * 1.15 + vec3(1.0, 0.8, 0.55) * smoothstep(10.0, 20.0, vWPos.y) * 0.4;
      totalEmissiveRadiance += diffuseColor.rgb * around * uNight;
      // and a soft sheen: neon at night, sky by day
      vec3 refl = reflect(uViewDir, normalize(vWNrm));
      float up = smoothstep(0.1, 0.9, refl.y);
      totalEmissiveRadiance += streetLightRaw(vWPos + vec3(refl.x, 0.0, refl.z) * 9.0) * up * uNight * 0.6;
      totalEmissiveRadiance += uSkyTint * up * (1.0 - uNight) * 0.08;
    `,
  });
  return m;
}

/** Trees, lamp posts and other small things: plain cel shading plus street light at night. */
export function makePropMaterial(look: TileLook, extra: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  const m = toon(extra);
  patch(m, 'prop' + (extra.map ? '-map' : ''), look, {
    snow: 0.9,
    fragEmissive: /* glsl */ `
      totalEmissiveRadiance += diffuseColor.rgb * streetLight(vWPos) * uNight * 0.95;
    `,
  });
  return m;
}

// ---------------------------------------------------------------------------
// Streets on the ground, laid as strips along any line
// ---------------------------------------------------------------------------

/**
 * For streets and pavements laid as strips (see roads.ts). A strip says what
 * it is in its `aWin`: x is how many lanes it has (0 for a plain patch such as
 * a junction), y is how wide it is, and w is what it is made of: 0 for asphalt,
 * 1 for paving. Its `uv` runs across it from 0 to 1, and along it in units.
 */
export function makeStreetMaterial(look: TileLook): THREE.MeshToonMaterial {
  const m = toon();
  patch(m, 'street', look, {
    uniforms: { uPaint: { value: new THREE.Color(0xf2efe6) } },
    vertPars: /* glsl */ `
      attribute vec4 aWin;
      varying vec4 vWin;
      varying vec2 vStreetUv;
    `,
    vertBegin: /* glsl */ `
      vWin = aWin;
      vStreetUv = uv;
    `,
    fragPars: /* glsl */ `
      varying vec4 vWin;
      varying vec2 vStreetUv;
      uniform vec3 uPaint;
      uniform float uWet;
      uniform float uReflOn;
      uniform sampler2D uRefl;
      uniform mat4 uMirrorVP;
    `,
    fragColor: /* glsl */ `
      float lanes = vWin.x;
      float wide = vWin.y;
      float paving = step(0.5, vWin.w);
      float road = 1.0 - paving;
      vec2 gp = vWPos.xz - uOrigin;
      float dd = (vStreetUv.x - 0.5) * wide;
      float daa = fwidth(dd) * 0.8 + 1e-4;
      // a line along each edge, and dashes between the lanes
      float edge = (1.0 - smoothstep(0.1 - daa, 0.1 + daa, abs(abs(dd) - (wide * 0.5 - 0.45)))) * 0.55 * step(0.5, lanes);
      float laneW = (wide - 0.9) / max(lanes, 1.0);
      float lu = dd / laneW + lanes * 0.5;
      float between = abs(fract(lu + 0.5) - 0.5) * laneW;
      float dashes = (1.0 - smoothstep(0.14 - daa, 0.14 + daa, between)) * step(0.5, fract(vStreetUv.y / 7.0))
                   * step(0.5, lu) * step(lu, lanes - 0.5) * step(1.5, lanes);
      vec3 albedo = diffuseColor.rgb * mix(0.9 + 0.2 * vnoise(gp * 0.9), 0.96 + 0.08 * vnoise(gp * 1.3), paving);
      albedo = mix(albedo, uPaint, clamp(edge + dashes, 0.0, 1.0) * road);
      // paving laid in flags, square to the tile: x is how big a flag is, z how far
      // each row is set along from the last. Each flag is a shade of its own, the
      // joints between them darker, and both fade out where a flag is too small
      // on the screen to be drawn cleanly.
      float flagSize = vWin.x * paving;
      if (flagSize > 0.0) {
        vec2 fq = gp / flagSize;
        fq.x += floor(fq.y) * vWin.z;
        vec2 ff = fract(fq), fw = fwidth(fq);
        float fade = 1.0 - smoothstep(0.1, 0.28, max(fw.x, fw.y));
        vec2 fj = smoothstep(vec2(0.04) - fw, vec2(0.04) + fw, min(ff, 1.0 - ff));
        float tone = fract(sin(dot(floor(fq), vec2(12.9898, 78.233))) * 43758.5453);
        albedo *= 1.0 + ((tone - 0.5) * 0.12 - 0.3 * (1.0 - fj.x * fj.y)) * fade;
      }
      // snow lies thick on paving, thinner where traffic keeps the road clear
      albedo = mix(albedo, vec3(0.9, 0.94, 1.0), uSnow * (0.95 - 0.5 * road) * (0.85 + 0.15 * vnoise(gp * 0.5)));
      float puddle = smoothstep(0.35, 0.7, vnoise(gp * 0.07 + 3.1));
      float wet = uWet * (0.55 + 0.45 * puddle) * (road + 0.45 * paving);
      albedo *= mix(1.0, 0.6, wet);
      diffuseColor.rgb = albedo;
    `,
    fragEmissive: /* glsl */ `
      totalEmissiveRadiance += albedo * streetLightRaw(vWPos) * uNight * 1.25;
      if (uReflOn > 0.5) {
        // the mirror image, smeared along the view as a wet road would smear it
        vec4 mc = uMirrorVP * vec4(vWPos, 1.0);
        vec2 ruv = mc.xy / mc.w * 0.5 + 0.5;
        float rn = vnoise(gp * 1.7) - 0.5;
        float rn2 = vnoise(gp * 0.6 + 7.0);
        float jit = ign(gl_FragCoord.xy) - 0.5;
        vec3 refl = vec3(0.0);
        float tot = 0.0;
        for (int i = 0; i < 9; i++) {
          float t = (float(i) + jit) / 4.0 - 1.0;
          vec2 o = vec2(rn * 0.01, t * (0.008 + 0.028 * rn2));
          float wgt = 1.0 - 0.7 * abs(t);
          refl += min(texture2D(uRefl, ruv + o).rgb, vec3(2.5)) * wgt;
          tot += wgt;
        }
        totalEmissiveRadiance += refl / tot * wet * 0.6;
      }
    `,
  });
  return m;
}

// ---------------------------------------------------------------------------
// One tile's materials
// ---------------------------------------------------------------------------

/** The city's materials, made for one tile so that they are lit by that tile's lamps and signs. */
export interface TileMaterials {
  /** Buildings and everything else solid: windows that light up, snow on what faces the sky. */
  city(): THREE.MeshToonMaterial;
  /** The surface of a road above the ground. */
  deck(): THREE.MeshToonMaterial;
  /** The surface of a street on the ground. */
  street(): THREE.MeshToonMaterial;
  /** Plain vehicles and figures: an instance's colour tints only its paint. */
  vehicle(): THREE.MeshToonMaterial;
  /** Trees, lamp posts and other small things. */
  prop(extra?: THREE.MeshToonMaterialParameters): THREE.MeshToonMaterial;
}

export function tileMaterials(look: TileLook): TileMaterials {
  return {
    city: () => makeCityMaterial(look),
    deck: () => makeDeckMaterial(look),
    street: () => makeStreetMaterial(look),
    vehicle: () => makeVehicleMaterial(look),
    prop: (extra) => makePropMaterial(look, extra),
  };
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

/** For a sheet of water: flat bands of colour that drift, with the city mirrored in it. */
export function makeWaterMaterial(look: TileLook, color: number): THREE.MeshToonMaterial {
  const m = toon({ vertexColors: false, color });
  patch(m, 'water', look, {
    fragPars: /* glsl */ `
      uniform float uReflOn;
      uniform sampler2D uRefl;
      uniform mat4 uMirrorVP;
    `,
    fragColor: /* glsl */ `
      vec2 gp = vWPos.xz - uOrigin;
      // two layers of slow ripples, cut into flat bands as a map would draw them
      float ripple = vnoise(gp * 0.16 + vec2(uTime * 0.09, uTime * 0.05)) * 0.6 + vnoise(gp * 0.5 - vec2(uTime * 0.12, 0.0)) * 0.4;
      float band = floor(ripple * 4.0) / 3.0;
      vec3 albedo = diffuseColor.rgb * mix(0.86, 1.1, clamp(band, 0.0, 1.0));
      albedo = mix(albedo, uSkyTint, 0.16);
      // in snow it freezes over
      albedo = mix(albedo, vec3(0.86, 0.91, 0.97), uSnow * 0.6);
      diffuseColor.rgb = albedo;
    `,
    fragEmissive: /* glsl */ `
      totalEmissiveRadiance += albedo * streetLightRaw(vWPos) * uNight * 0.5;
      if (uReflOn > 0.5) {
        // the city, mirrored in it and broken up by the ripples
        vec4 mc = uMirrorVP * vec4(vWPos.x, 0.0, vWPos.z, 1.0);
        vec2 ruv = mc.xy / mc.w * 0.5 + 0.5;
        vec2 wob = vec2(vnoise(gp * 1.1 + uTime * 0.3) - 0.5, vnoise(gp * 0.9 - uTime * 0.25) - 0.5) * 0.014;
        vec3 refl = min(texture2D(uRefl, ruv + wob).rgb, vec3(2.5));
        totalEmissiveRadiance += refl * (0.3 + 0.25 * (1.0 - uSnow));
      }
    `,
  });
  return m;
}
