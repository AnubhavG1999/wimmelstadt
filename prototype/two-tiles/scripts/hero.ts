// Cuts a generated model down to a size the city can hold many of, and puts it
// with its capture as that diecast's hero.
//
//   node scripts/hero.ts <capture> <run> [--triangles 12000] [--texture 1024] [--name "..."] [--keep-seams]
//
// It reads captures/<capture>/models/<run>.glb and writes
// captures/<capture>/hero/hero.glb with a small hero.json beside it. Captures
// are private and stay out of the repository.
//
// This is a first, hand-run piece of the finishing that the bench will do. It
// keeps the model's colour picture and drops the shine and bump pictures, which
// the city's flat shading does not use.

import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { compactPrimitive, dedup, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const [capture, run] = args;
if (!capture || !run || capture.startsWith('--') || run.startsWith('--')) {
  console.log('Usage: node scripts/hero.ts <capture> <run> [--triangles 12000] [--texture 1024] [--name "..."]');
  process.exit(1);
}
const want = Number(flag('triangles', '12000')), size = Number(flag('texture', '1024'));
const dir = resolve(here, '../../../captures', capture);
const input = resolve(dir, 'models', `${run}.glb`);
if (!existsSync(input)) {
  console.log(`No such model: ${input}`);
  process.exit(1);
}

const io = new NodeIO();
const doc = await io.read(input);
const count = (): number => doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3, 0);
const before = count();

// the city draws everything in flat bands of light: only the colour picture is used
for (const m of doc.getRoot().listMaterials()) {
  m.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setEmissiveTexture(null);
  m.setMetallicFactor(0).setRoughnessFactor(1);
}

await MeshoptSimplifier.ready;
// A generated model's colour picture is cut into thousands of small pieces, and
// the plain way of simplifying will not join triangles across the edge of a
// piece: on the first hero it stopped at 154,000 triangles of 500,000, however
// few were asked for. So those edges are crossed, weighing how far the picture
// would be pulled about. At a hero's size in the city this does not show.
// --keep-seams goes back to the plain way.
const acrossSeams = !args.includes('--keep-seams');
await doc.transform(weld());
if (acrossSeams) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION')!, uv = prim.getAttribute('TEXCOORD_0'), index = prim.getIndices();
      if (!uv || !index) continue;
      const indices = new Uint32Array(index.getArray()!), share = indices.length / 3 / before;
      const target = Math.max(3, Math.round(want * share) * 3);
      const [cut] = MeshoptSimplifier.simplifyWithAttributes(
        indices, new Float32Array(position.getArray()!), 3, new Float32Array(uv.getArray()!), 2, [2, 2], null, target, 0.05, ['Permissive', 'Prune'],
      );
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(cut)).setBuffer(index.getBuffer()));
      compactPrimitive(prim);
    }
  }
} else {
  await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, want / before), error: 0.02 }));
}
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'png', resize: [size, size] }),
  prune(),
  dedup(),
);

const outDir = resolve(dir, 'hero');
mkdirSync(outDir, { recursive: true });
const output = resolve(outDir, `${flag('out', 'hero')}.glb`);
await io.write(output, doc);

const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (const mesh of doc.getRoot().listMeshes()) {
  for (const p of mesh.listPrimitives()) {
    const pos = p.getAttribute('POSITION')!, v = [0, 0, 0];
    for (let i = 0; i < pos.getCount(); i++) {
      pos.getElement(i, v);
      for (let k = 0; k < 3; k++) {
        box.min[k] = Math.min(box.min[k], v[k]);
        box.max[k] = Math.max(box.max[k], v[k]);
      }
    }
  }
}
const manifest = {
  name: flag('name', capture),
  from: `models/${run}.glb`,
  model: `${flag('out', 'hero')}.glb`,
  triangles: Math.round(count()),
  texture: size,
  /** The toy's length in centimetres, which is its length in the city. */
  length: Number(flag('length', '6.6')),
  /** Quarter turns that bring the model's nose to the front. Set by eye. */
  turn: Number(flag('turn', '0')),
  made: new Date().toISOString(),
};
// the hero's own record goes with the model the city uses; a trial under another name leaves it alone
if (flag('out', 'hero') === 'hero') writeFileSync(resolve(outDir, 'hero.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const mb = (n: number): string => `${(n / 1048576).toFixed(1)} MB`;
console.log(`${capture}: ${Math.round(before).toLocaleString('en')} triangles cut to ${manifest.triangles.toLocaleString('en')}, texture ${size} px.`);
console.log(`${mb(statSync(input).size)} became ${mb(statSync(output).size)}: ${output}`);
console.log(`Size of the model: ${box.max.map((v, k) => (v - box.min[k]).toFixed(3)).join(' x ')} (x, y, z).`);
