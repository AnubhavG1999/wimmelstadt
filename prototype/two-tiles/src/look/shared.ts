// Values every material may read, set once a frame from the hour, the weather and the view.

import * as THREE from 'three';

/**
 * How much snow lies (0 to 1), how far into the night it is (0 by day, 1 at
 * night), the colour of the sky that glass reflects, and which way the view looks.
 */
export const LOOK = {
  uSnow: { value: 0 },
  uNight: { value: 0 },
  uSkyTint: { value: new THREE.Color(0.5, 0.7, 1.0) },
  uViewDir: { value: new THREE.Vector3(0, -1, 0) },
};

/** The light ramp: unlit, then three flat bands. This is what makes the shading "cel", as in the look prototype. */
export const gradientMap = ((): THREE.DataTexture => {
  const steps = [0, 0, 0, 0, 112, 184, 255, 255];
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();
