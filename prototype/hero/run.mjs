// Runs a capture through the generators on fal.ai, and keeps a ledger of every
// run that was paid for so that none is ever paid for twice.
//
//   npm run trial -- <capture>                 shows the plan and its price. Sends nothing.
//   npm run trial -- <capture> --go            uploads the pictures and runs the plan.
//   npm run trial -- <capture> --only meshy    limits the plan to some generators.
//   npm run trial -- <capture> --collect       fetches what is already paid for. Starts nothing new.
//   npm run trial -- <capture> --again         runs a generator even if the ledger already has that run.
//
// The key is read from FAL_KEY, which `npm run trial` loads from .env.local.

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GENERATORS, generator } from './generators.mjs';
import { readCapture } from './prepare.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const name = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--only');
const only = value('only')?.split(',').map((s) => s.trim()).filter(Boolean);
const money = (n) => `$${n.toFixed(n * 100 % 1 ? 3 : 2)}`;

if (!name) {
  console.log('Which capture? Usage: npm run trial -- <capture> [--only meshy,rodin] [--go]');
  process.exit(1);
}

const { dir, capture } = await readCapture(name);
const ledgerFile = join(dir, 'runs.json');
const ledger = existsSync(ledgerFile) ? JSON.parse(await readFile(ledgerFile, 'utf8')) : { uploads: {}, runs: [] };
const save = () => writeFile(ledgerFile, JSON.stringify(ledger, null, 2));

// --- which pictures there are -------------------------------------------------

const pictures = {};
for (const view of Object.keys(capture.views)) {
  const file = join(dir, 'prepared', `${view}.jpg`);
  if (!existsSync(file)) {
    console.log(`No prepared picture for the ${view} view. Run "npm run pictures -- ${name}" first.`);
    process.exit(1);
  }
  const bytes = await readFile(file);
  pictures[view] = { file, bytes, sha: createHash('sha1').update(bytes).digest('hex') };
}

// --- the plan -----------------------------------------------------------------

/** What each generator would be sent, given an address for every picture. */
function plansFor(urls) {
  const out = [];
  for (const g of GENERATORS) {
    if (only && !only.includes(g.id)) continue;
    const plan = g.plan(urls);
    out.push({ g, plan });
  }
  return out;
}

const placeholders = Object.fromEntries(Object.keys(pictures).map((v) => [v, `<${v}>`]));
const drafted = plansFor(placeholders);
console.log(`\n${capture.name}${capture.item ? ` (${capture.item})` : ''}`);
console.log(`Pictures: ${Object.keys(pictures).join(', ')}\n`);
let total = 0;
for (const { g, plan } of drafted) {
  if (!plan) {
    console.log(`  ${g.label.padEnd(18)} cannot run: ${g.note}`);
    continue;
  }
  total += plan.price;
  console.log(`  ${g.label.padEnd(18)} ${money(plan.price).padStart(7)}   from ${plan.used.join(' + ')}`);
}
console.log(`  ${'Together'.padEnd(18)} ${money(total).padStart(7)}\n`);

const pending = () => ledger.runs.filter((r) => r.status === 'queued');

if (!flag('go') && !flag('collect')) {
  console.log('Nothing was sent. Add --go to run this plan.');
  if (pending().length) console.log(`${pending().length} earlier run(s) are paid for and not yet fetched. Add --collect to fetch them.`);
  process.exit(0);
}

if (!process.env.FAL_KEY) {
  console.log('There is no FAL_KEY. Paste the key into wimmelstadt/.env.local after "FAL_KEY=" and run this again.');
  process.exit(1);
}
const { fal } = await import('@fal-ai/client');

// --- sending ------------------------------------------------------------------

async function upload() {
  const urls = {};
  for (const [view, p] of Object.entries(pictures)) {
    const known = ledger.uploads[view];
    if (known && known.sha === p.sha) {
      urls[view] = known.url;
      continue;
    }
    const url = await fal.storage.upload(new File([p.bytes], `${view}.jpg`, { type: 'image/jpeg' }));
    ledger.uploads[view] = { url, sha: p.sha, bytes: p.bytes.length, at: new Date().toISOString() };
    urls[view] = url;
    await save();
    console.log(`  uploaded the ${view} view (${Math.round(p.bytes.length / 1024)} kB)`);
  }
  return urls;
}

/** Any address in the answer that ends in .glb, for a generator whose answer is shaped differently than expected. */
function anyGlb(data) {
  let found;
  const walk = (v) => {
    if (found || v == null) return;
    if (typeof v === 'string') { if (/^https?:\/\/\S+\.glb(\?|$)/i.test(v)) found = v; return; }
    if (typeof v === 'object') for (const x of Object.values(v)) walk(x);
  };
  walk(data);
  return found;
}

async function collect(run) {
  const g = generator(run.generator);
  const started = Date.parse(run.submitted);
  let last = '';
  for (;;) {
    const status = await fal.queue.status(run.model, { requestId: run.requestId, logs: false });
    if (status.status !== last) {
      last = status.status;
      console.log(`  ${g.label}: ${last === 'IN_QUEUE' ? 'waiting in the queue' : last === 'IN_PROGRESS' ? 'being generated' : 'finished'}`);
    }
    if (status.status === 'COMPLETED') break;
    if (Date.now() - started > 40 * 60000) throw new Error('still not finished after 40 minutes. It stays in the ledger: fetch it later with --collect.');
    await new Promise((r) => setTimeout(r, 5000));
  }
  const result = await fal.queue.result(run.model, { requestId: run.requestId });
  const url = g.glb(result.data) ?? anyGlb(result.data);
  if (!url) {
    run.answer = result.data;
    throw new Error('finished, but the answer holds no .glb file. The whole answer is kept in the ledger.');
  }
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  await mkdir(join(dir, 'models'), { recursive: true });
  run.file = `models/${run.id}.glb`;
  await writeFile(join(dir, run.file), bytes);
  run.bytes = bytes.length;
  run.remote = url;
  run.status = 'done';
  run.finished = new Date().toISOString();
  run.seconds = Math.round((Date.parse(run.finished) - started) / 1000);
  await save();
  console.log(`  ${g.label}: saved ${run.file} (${(bytes.length / 1048576).toFixed(1)} MB) after ${run.seconds} s`);
}

async function settle(run) {
  try {
    await collect(run);
  } catch (err) {
    // a run that merely timed out here is still paid for and can still be fetched
    const gone = !/fetch it later/.test(String(err.message));
    if (gone) run.status = 'failed';
    run.error = String(err.body?.detail ?? err.message ?? err).slice(0, 600);
    await save();
    console.log(`  ${generator(run.generator).label}: ${gone ? 'failed' : 'not finished'}: ${run.error}`);
  }
}

// whatever is already paid for comes first
const earlier = pending();
if (earlier.length) {
  console.log(`Fetching ${earlier.length} earlier run(s).`);
  await Promise.all(earlier.map(settle));
}

if (flag('go')) {
  console.log('Uploading the pictures.');
  const urls = await upload();
  const fresh = [];
  for (const { g, plan } of plansFor(urls)) {
    if (!plan) continue;
    const same = ledger.runs.find((r) => r.generator === g.id && r.status !== 'failed' && JSON.stringify(r.input) === JSON.stringify(plan.input));
    if (same && !flag('again')) console.log(`  ${g.label}: already in the ledger as ${same.id}, not run again.`);
    else fresh.push({ g, plan });
  }
  if (fresh.length) console.log(`Running ${fresh.length} generator(s), two at a time. Each can take several minutes.`);
  // two at a time: a new fal.ai account may run no more than two requests at once
  for (let i = 0; i < fresh.length; i += 2) {
    const pair = [];
    for (const { g, plan } of fresh.slice(i, i + 2)) {
      const id = `${g.id}-${ledger.runs.filter((r) => r.generator === g.id).length + 1}`;
      try {
        const queued = await fal.queue.submit(plan.model, { input: plan.input });
        const run = {
          id, generator: g.id, label: g.label, model: plan.model, used: plan.used, price: plan.price, input: plan.input,
          requestId: queued.request_id, submitted: new Date().toISOString(), status: 'queued',
        };
        ledger.runs.push(run);
        await save(); // written at once: from here on the run is paid for
        pair.push(run);
        console.log(`  ${g.label}: sent (${money(plan.price)})`);
      } catch (err) {
        // refused before it started, so nothing was charged for it
        console.log(`  ${g.label}: not accepted: ${String(err.body?.detail ?? err.message ?? err).slice(0, 400)}`);
      }
    }
    await Promise.all(pair.map(settle));
  }
}

const done = ledger.runs.filter((r) => r.status === 'done');
const spent = ledger.runs.filter((r) => r.status !== 'failed').reduce((s, r) => s + r.price, 0);
console.log(`\n${done.length} model(s) in ${join(dir, 'models')}. Listed prices of everything sent so far: ${money(spent)}.`);
