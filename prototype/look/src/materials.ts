// Materials. Everything solid is cel-shaded: three.js's toon material with a
// stepped light ramp, extended in the shader with windows that light up, wet
// streets, and the light that street lamps and signs throw at night.

import * as THREE from 'three';
import { BOARD, H_STREETS, MEDIAN_X, PARKS, V_STREETS } from './scene-data';

/** Values shared by every material. Changing one here changes it everywhere. */
export const U = {
  uNight: { value: 0 },
  uTime: { value: 0 },
  uSkyTint: { value: new THREE.Color(0.5, 0.7, 1.0) },
  uWet: { value: 0 },
  uRefl: { value: null as THREE.Texture | null },
  uReflOn: { value: 0 },
  uMirrorVP: { value: new THREE.Matrix4() },
  uViewDir: { value: new THREE.Vector3(0, -1, 0) },
  uLightMap: { value: null as THREE.Texture | null },
  uBoard: { value: new THREE.Vector4(BOARD.x0, BOARD.z0, 1 / (BOARD.x1 - BOARD.x0), 1 / (BOARD.z1 - BOARD.z0)) },
};

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
uniform vec3 uSkyTint;
uniform sampler2D uLightMap;
uniform vec4 uBoard;
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
// a small map of the board and fades with height above the street.
vec3 streetLightRaw(vec3 wp) {
  vec2 uv = (wp.xz - uBoard.xy) * uBoard.zw;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  return texture2D(uLightMap, uv).rgb * inside;
}
vec3 streetLight(vec3 wp) {
  return streetLightRaw(wp) * exp(-max(wp.y, 0.0) / 9.0);
}
`;

interface Patch {
  vertPars?: string;
  vertColor?: string; // replaces the colour chunk
  vertBegin?: string;
  fragPars?: string;
  fragColor?: string; // runs after the base colour is known
  fragEmissive?: string; // runs where emitted light is collected
  uniforms?: Record<string, THREE.IUniform>;
}

function patch(mat: THREE.Material, key: string, p: Patch): void {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U, p.uniforms ?? {});
    let vs = shader.vertexShader, fs = shader.fragmentShader;
    vs = vs.replace('#include <common>', '#include <common>\n' + COMMON_VERT_PARS + (p.vertPars ?? ''));
    if (p.vertColor) vs = vs.replace('#include <color_vertex>', p.vertColor);
    vs = vs.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + COMMON_VERT_NORMAL);
    vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + COMMON_VERT_BEGIN + (p.vertBegin ?? ''));
    fs = fs.replace('#include <common>', '#include <common>\n' + COMMON_FRAG_PARS + (p.fragPars ?? ''));
    if (p.fragColor) fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' + p.fragColor);
    if (p.fragEmissive) fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + p.fragEmissive);
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => key;
}

function toon(extra: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ vertexColors: true, gradientMap, ...extra });
}

// ---------------------------------------------------------------------------
// Buildings and other static structure
// ---------------------------------------------------------------------------

export function makeCityMaterial(): THREE.MeshToonMaterial {
  const m = toon();
  patch(m, 'city', {
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
            float lit = step(1.0 - litProb, r1);
            float pickc = hash21(id * 0.71 + seed * 5.0);
            vec3 wcol = mix(vec3(1.0, 0.58, 0.24), vec3(1.0, 0.8, 0.5), r2);
            if (pickc > 0.76) wcol = vec3(0.42, 0.78, 1.0);
            if (pickc > 0.94) wcol = vec3(1.0, 0.32, 0.68);
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
// The ground: streets, sidewalks, markings, and the wet look at night
// ---------------------------------------------------------------------------

export function makeGroundMaterial(): THREE.MeshToonMaterial {
  const m = toon({ vertexColors: false });
  const vs = V_STREETS.map((s) => new THREE.Vector4(s.x, s.carr, s.corr, 0));
  const hs = H_STREETS.map((s) => new THREE.Vector4(s.z, s.carr, s.corr, s.median));
  patch(m, 'ground', {
    uniforms: {
      uVS: { value: vs },
      uHS: { value: hs },
      uPark: { value: PARKS.map((r) => new THREE.Vector4(r.x0, r.z0, r.x1, r.z1)) },
      uMedianX: { value: MEDIAN_X },
      uAsphalt: { value: new THREE.Color(0x4a4c52) },
      uWalk: { value: new THREE.Color(0xc9c2b4) },
      uPaving: { value: new THREE.Color(0xb3ab9c) },
      uGrass: { value: new THREE.Color(0x6fa85a) },
      uPaint: { value: new THREE.Color(0xf2efe6) },
      uMedianCol: { value: new THREE.Color(0x7fae68) },
    },
    fragPars: /* glsl */ `
      uniform vec4 uVS[4];
      uniform vec4 uHS[4];
      uniform vec4 uPark[2];
      uniform float uMedianX;
      uniform vec3 uAsphalt, uWalk, uPaving, uGrass, uPaint, uMedianCol;
      uniform float uWet;
      uniform float uReflOn;
      uniform sampler2D uRefl;
      uniform mat4 uMirrorVP;
    `,
    fragColor: /* glsl */ `
      vec2 gp = vWPos.xz;
      vec2 gfw = fwidth(gp);
      float aa = max(gfw.x, gfw.y) * 0.8 + 1e-4;
      float inV = 0.0, corV = 0.0, inH = 0.0, corH = 0.0;
      float lineV = 0.0, lineH = 0.0, med = 0.0;
      for (int i = 0; i < 4; i++) {
        float d = abs(gp.x - uVS[i].x);
        float carr = uVS[i].y;
        inV = max(inV, 1.0 - smoothstep(carr - aa, carr + aa, d));
        corV = max(corV, 1.0 - smoothstep(uVS[i].z - aa, uVS[i].z + aa, d));
        float dash = step(0.5, fract(gp.y / 7.0));
        lineV = max(lineV, (1.0 - smoothstep(0.14 - aa, 0.14 + aa, d)) * dash);
        lineV = max(lineV, (1.0 - smoothstep(0.1 - aa, 0.1 + aa, abs(d - (carr - 0.45)))) * 0.55);
      }
      for (int i = 0; i < 4; i++) {
        float d = abs(gp.y - uHS[i].x);
        float carr = uHS[i].y;
        float medw = uHS[i].w;
        inH = max(inH, 1.0 - smoothstep(carr - aa, carr + aa, d));
        corH = max(corH, 1.0 - smoothstep(uHS[i].z - aa, uHS[i].z + aa, d));
        float dash = step(0.5, fract(gp.x / 7.0));
        if (medw > 0.0) {
          float mm = (1.0 - smoothstep(medw - aa, medw + aa, d)) * (1.0 - smoothstep(uMedianX - aa, uMedianX + aa, abs(gp.x)));
          med = max(med, mm);
          float mid = medw + (carr - medw) * 0.5;
          lineH = max(lineH, (1.0 - smoothstep(0.14 - aa, 0.14 + aa, abs(d - mid))) * dash);
          lineH = max(lineH, (1.0 - smoothstep(0.1 - aa, 0.1 + aa, abs(d - (medw + 0.5)))) * 0.7);
        } else {
          lineH = max(lineH, (1.0 - smoothstep(0.14 - aa, 0.14 + aa, d)) * dash);
        }
        lineH = max(lineH, (1.0 - smoothstep(0.1 - aa, 0.1 + aa, abs(d - (carr - 0.45)))) * 0.55);
      }
      float road = max(inV, inH);
      med *= (1.0 - inV);
      float walk = max(corV, corH) * (1.0 - road);
      // zebra crossings, where a carriageway passes the crossing street's sidewalk
      float zebra = inV * max(corH - inH, 0.0) * step(0.5, fract(gp.x / 1.5))
                  + inH * max(corV - inV, 0.0) * step(0.5, fract(gp.y / 1.5));
      float lines = max(lineV * inV * (1.0 - corH), lineH * inH * (1.0 - corV));

      float park = 0.0;
      for (int i = 0; i < 2; i++) {
        park = max(park, step(uPark[i].x, gp.x) * step(gp.x, uPark[i].z) * step(uPark[i].y, gp.y) * step(gp.y, uPark[i].w));
      }
      vec3 albedo = uPaving * (0.95 + 0.1 * vnoise(gp * 0.8));
      albedo = mix(albedo, uGrass * (0.86 + 0.28 * vnoise(gp * 0.35)), park);
      albedo = mix(albedo, uWalk * (0.96 + 0.08 * vnoise(gp * 1.3)), walk);
      albedo = mix(albedo, uAsphalt * (0.9 + 0.2 * vnoise(gp * 0.9)), road);
      albedo = mix(albedo, uMedianCol, med);
      albedo = mix(albedo, uPaint, clamp(lines + zebra, 0.0, 1.0) * road * (1.0 - med));

      float puddle = smoothstep(0.35, 0.7, vnoise(gp * 0.07 + 3.1));
      float wetArea = road * (1.0 - med) + 0.45 * walk + 0.3 * (1.0 - max(road, walk)) * (1.0 - park);
      float wet = uWet * (0.55 + 0.45 * puddle) * wetArea;
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
// Road decks above the ground: the expressway and the ramps
// ---------------------------------------------------------------------------

export function makeDeckMaterial(): THREE.MeshToonMaterial {
  const m = toon();
  patch(m, 'deck', {
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
export function makeVehicleMaterial(): THREE.MeshToonMaterial {
  const m = toon();
  patch(m, 'vehicle', VEHICLE_PATCH);
  return m;
}

/** For a hero: its own decal sheet, on the same shading as traffic. */
export function makeHeroMaterial(map: THREE.Texture): THREE.MeshToonMaterial {
  const m = toon({ map });
  patch(m, 'hero', VEHICLE_PATCH);
  return m;
}

/** Trees, lamp posts and other small things: plain cel shading plus street light at night. */
export function makePropMaterial(extra: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  const m = toon(extra);
  patch(m, 'prop' + (extra.map ? '-map' : ''), {
    fragEmissive: /* glsl */ `
      totalEmissiveRadiance += diffuseColor.rgb * streetLight(vWPos) * uNight * 0.95;
    `,
  });
  return m;
}
