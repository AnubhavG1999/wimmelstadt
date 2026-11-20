// Makes app/src/engine/room/land.ts: the coastlines of the world, for the old
// map that lies on the collector's desk.
//
// The coastlines are Natural Earth's (naturalearthdata.com), which are in the
// public domain. They are read from the package `world-atlas`, which holds
// them as TopoJSON. The package is not one of the app's own: fetch it into a
// folder of its own and point this script at it.
//
//   npm install world-atlas@2 --prefix <some folder>
//   node scripts/make-land.mjs <some folder>/node_modules/world-atlas/land-50m.json
//
// The 1:50m coastlines are thinned out (a point is dropped where the coast
// strays less than `KEEP` degrees without it), and islands smaller than
// `LEAST` degrees across are left out: the map is seen from across a desk.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEEP = 0.085, LEAST = 0.55;

const source = process.argv[2];
if (!source) throw new Error('Give the path of land-50m.json from the package world-atlas.');
const topo = JSON.parse(readFileSync(source, 'utf8'));

// TopoJSON keeps each stretch of coast once, as steps from one point to the next
const { scale, translate } = topo.transform;
const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
const ringOf = (parts) => {
  const pts = [];
  for (const i of parts) {
    const arc = i >= 0 ? arcs[i] : [...arcs[~i]].reverse();
    pts.push(...(pts.length ? arc.slice(1) : arc));
  }
  return pts;
};
const rings = [];
const take = (g) => {
  if (g.type === 'GeometryCollection') g.geometries.forEach(take);
  else if (g.type === 'Polygon') g.arcs.forEach((r) => rings.push(ringOf(r)));
  else if (g.type === 'MultiPolygon') g.arcs.forEach((poly) => poly.forEach((r) => rings.push(ringOf(r))));
};
take(topo.objects.land);

/** Drops the points a line can do without: those nearer than `keep` to the line through their neighbours that stay. */
function thin(pts, keep) {
  const stay = new Uint8Array(pts.length);
  stay[0] = stay[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let worst = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = len < 1e-9 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > keep) {
      stay[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, i) => stay[i]);
}

const out = [];
let before = 0, after = 0;
for (const ring of rings) {
  before += ring.length;
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  if (Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < LEAST) continue;
  // a ring is thinned in two halves, so that neither of its ends is a point it could lose
  const half = Math.floor(ring.length / 2);
  const kept = [...thin(ring.slice(0, half + 1), KEEP), ...thin(ring.slice(half), KEEP).slice(1)];
  if (kept.length < 4) continue;
  after += kept.length;
  out.push(kept.flatMap(([x, y]) => [Math.round(x * 100), Math.round(y * 100)]));
}
out.sort((a, b) => b.length - a.length);

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, '..', 'src', 'engine', 'room', 'land.ts');
const text = `// The coastlines of the world, for the old map on the collector's desk.
//
// Made by scripts/make-land.mjs from Natural Earth's 1:50m land, which is in
// the public domain. Do not edit it by hand: run the script again.
//
// Each ring is one coast, as longitude and latitude in turn, in hundredths of
// a degree. A ring that lies inside another is a sea or a lake within it.

export const LAND: readonly (readonly number[])[] = [
${out.map((r) => `  [${r.join(',')}],`).join('\n')}
];
`;
writeFileSync(file, text);
console.log(`${rings.length} rings and ${before} points read; ${out.length} rings and ${after} points kept; ${Math.round(text.length / 1024)} kB written to ${file}`);
