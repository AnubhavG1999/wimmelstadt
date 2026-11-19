// Adds a model that was generated some other way to a capture's ledger, so that
// the page shows it beside the others. It is for runs made through fal's
// connector, where the session calls fal directly and no key is on this machine.
//
//   node record.mjs <capture> <generator> <address of the .glb> [--seconds 120] [--request <id>] [--price 1.20]

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GENERATORS, generator } from './generators.mjs';
import { readCapture } from './prepare.mjs';

const args = process.argv.slice(2);
const value = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const plain = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'));
const [name, id, url] = plain;
const g = id && generator(id);
if (!name || !g || !/^https?:\/\//.test(url ?? '')) {
  console.log(`Usage: node record.mjs <capture> <${GENERATORS.map((x) => x.id).join('|')}> <address of the .glb> [--seconds n] [--request id] [--price n]`);
  process.exit(1);
}

const { dir, capture } = await readCapture(name);
const ledgerFile = join(dir, 'runs.json');
const ledger = existsSync(ledgerFile) ? JSON.parse(await readFile(ledgerFile, 'utf8')) : { uploads: {}, runs: [] };

// what this generator would have been sent for this capture's pictures
const plan = g.plan(Object.fromEntries(Object.keys(capture.views).map((v) => [v, `<${v}>`])));
if (!plan) {
  console.log(`${g.label} cannot run from this capture's pictures: ${g.note}`);
  process.exit(1);
}

const answer = await fetch(url);
if (!answer.ok) {
  console.log(`Could not fetch the model: ${answer.status} ${answer.statusText}`);
  process.exit(1);
}
const bytes = Buffer.from(await answer.arrayBuffer());
if (bytes.subarray(0, 4).toString('latin1') !== 'glTF') {
  console.log('That address did not return a .glb file. Nothing was recorded.');
  process.exit(1);
}

const run = {
  id: `${g.id}-${ledger.runs.filter((r) => r.generator === g.id).length + 1}`,
  generator: g.id, label: g.label, model: plan.model, used: plan.used,
  price: value('price') ? Number(value('price')) : plan.price,
  requestId: value('request'), via: 'connector', status: 'done', finished: new Date().toISOString(),
  seconds: value('seconds') ? Number(value('seconds')) : undefined, remote: url,
};
run.file = `models/${run.id}.glb`;
run.bytes = bytes.length;
await mkdir(join(dir, 'models'), { recursive: true });
await writeFile(join(dir, run.file), bytes);
ledger.runs.push(run);
await writeFile(ledgerFile, JSON.stringify(ledger, null, 2));
console.log(`${g.label}: saved ${run.file} (${(bytes.length / 1048576).toFixed(1)} MB) and added it to the ledger as ${run.id}.`);
