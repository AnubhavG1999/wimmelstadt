// North America's ground: one flat plane whose streets, sidewalks, markings and
// lawns are drawn by its material. The streets are this tile's own grid, four
// one way and four the other, and the material knows them by heart. A tile
// with any other streets lays them as strips instead: see engine/roads.ts.

import * as THREE from 'three';
import { patch, toon, type TileLook } from '../../engine/look/materials';
import { CUTS, H_STREETS, MEDIAN_X, PARKS, STREET_CARR, V_STREETS } from './plan';

export function makeGroundMaterial(look: TileLook): THREE.MeshToonMaterial {
  const m = toon({ vertexColors: false });
  const vs = V_STREETS.map((s) => new THREE.Vector4(s.x, s.carr, s.corr, 0));
  const hs = H_STREETS.map((s) => new THREE.Vector4(s.z, s.carr, s.corr, s.median));
  patch(m, 'north-america-ground', look, {
    uniforms: {
      uVS: { value: vs },
      uHS: { value: hs },
      // streets that cut through a block: where they run, from where to where, and how wide
      uCut: { value: CUTS.map((c) => new THREE.Vector4(c.z, c.x0, c.x1, STREET_CARR)) },
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
      uniform vec4 uCut[${CUTS.length}];
      uniform vec4 uPark[${PARKS.length}];
      uniform float uMedianX;
      uniform vec3 uAsphalt, uWalk, uPaving, uGrass, uPaint, uMedianCol;
      uniform float uWet;
      uniform float uReflOn;
      uniform sampler2D uRefl;
      uniform mat4 uMirrorVP;
    `,
    fragColor: /* glsl */ `
      vec2 gp = vWPos.xz - uOrigin;
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
      // streets that cut through a block end at the kerbs of the streets on either side
      float inC = 0.0, corC = 0.0, lineC = 0.0;
      for (int i = 0; i < ${CUTS.length}; i++) {
        float d = abs(gp.y - uCut[i].x);
        float carr = uCut[i].w;
        float along = smoothstep(uCut[i].y - aa, uCut[i].y + aa, gp.x) * (1.0 - smoothstep(uCut[i].z - aa, uCut[i].z + aa, gp.x));
        inC = max(inC, (1.0 - smoothstep(carr - aa, carr + aa, d)) * along);
        corC = max(corC, (1.0 - smoothstep(carr + 2.0 - aa, carr + 2.0 + aa, d)) * along);
        float dash = step(0.5, fract(gp.x / 7.0));
        lineC = max(lineC, (1.0 - smoothstep(0.14 - aa, 0.14 + aa, d)) * dash);
        lineC = max(lineC, (1.0 - smoothstep(0.1 - aa, 0.1 + aa, abs(d - (carr - 0.45)))) * 0.55);
      }
      float road = max(max(inV, inH), inC);
      med *= (1.0 - inV);
      float walk = max(max(corV, corH), corC) * (1.0 - road);
      // zebra crossings, where a carriageway passes the crossing street's sidewalk
      float zebra = inV * max(corH - inH, 0.0) * step(0.5, fract(gp.x / 1.5))
                  + inH * max(corV - inV, 0.0) * step(0.5, fract(gp.y / 1.5));
      float lines = max(lineV * inV * (1.0 - corH), lineH * inH * (1.0 - corV));
      lines = max(lines, lineC * inC * (1.0 - corV));

      float park = 0.0;
      for (int i = 0; i < ${PARKS.length}; i++) {
        park = max(park, step(uPark[i].x, gp.x) * step(gp.x, uPark[i].z) * step(uPark[i].y, gp.y) * step(gp.y, uPark[i].w));
      }
      vec3 albedo = uPaving * (0.95 + 0.1 * vnoise(gp * 0.8));
      albedo = mix(albedo, uGrass * (0.86 + 0.28 * vnoise(gp * 0.35)), park);
      albedo = mix(albedo, uWalk * (0.96 + 0.08 * vnoise(gp * 1.3)), walk);
      albedo = mix(albedo, uAsphalt * (0.9 + 0.2 * vnoise(gp * 0.9)), road);
      albedo = mix(albedo, uMedianCol, med);
      albedo = mix(albedo, uPaint, clamp(lines + zebra, 0.0, 1.0) * road * (1.0 - med));
      // snow lies thick on lawns and paving, thinner where traffic keeps the road clear
      albedo = mix(albedo, vec3(0.9, 0.94, 1.0), uSnow * (0.95 - 0.5 * road) * (0.85 + 0.15 * vnoise(gp * 0.5)));

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
