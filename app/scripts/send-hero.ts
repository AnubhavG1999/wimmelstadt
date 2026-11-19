// Sends a hero from the desk to the collection: its model goes into the
// backend's file store and its record into the list of heroes. A device that
// has been unlocked with the PIN finds it there the next time it asks.
//
//   node --env-file=../.env.local scripts/send-hero.ts <capture> [--dry]
//
// It reads captures/<capture>/hero/hero.json and the model beside it, which
// scripts/hero.ts makes. Sending a hero again replaces its model and its
// record. --dry says what would be sent, and sends nothing.
//
// It needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF, which the collector
// keeps in .env.local. With them it asks Supabase for the project's secret key
// each time it runs, uses the key, and forgets it: the key is never printed and
// never saved.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const capture = args.find((a) => !a.startsWith('--'));
const dry = args.includes('--dry');
const stop = (why: string): never => {
  console.log(why);
  process.exit(1);
};

if (!capture || !/^[a-z0-9-]+$/.test(capture)) stop('Usage: node --env-file=../.env.local scripts/send-hero.ts <capture> [--dry]');
const dir = resolve(here, '../../captures', capture!, 'hero');
const madeFile = resolve(dir, 'hero.json');
if (!existsSync(madeFile)) stop(`No hero has been made of ${capture} yet: there is no ${madeFile}. See scripts/hero.ts.`);
const made = JSON.parse(readFileSync(madeFile, 'utf8')) as { name?: unknown; model?: unknown; triangles?: unknown; length?: unknown; turn?: unknown };
if (typeof made.name !== 'string' || typeof made.model !== 'string' || !/^[a-z0-9-]+\.glb$/.test(made.model) || typeof made.length !== 'number' || !(made.length > 0)) {
  stop(`${madeFile} does not say what a hero's record needs: a name, a model and a length.`);
}
const modelFile = resolve(dir, made.model as string);
if (!existsSync(modelFile)) stop(`The model is missing: ${modelFile}`);
const model = readFileSync(modelFile);

/** The hero as the backend records it. The time is what tells a device that its own copy is out of date. */
const record = {
  capture: capture!,
  name: made.name as string,
  length: made.length as number,
  turn: typeof made.turn === 'number' ? made.turn : 0,
  triangles: typeof made.triangles === 'number' ? made.triangles : 0,
  model_path: `${capture}/${made.model as string}`,
  updated_at: new Date().toISOString(),
};

const token = process.env.SUPABASE_ACCESS_TOKEN, ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) stop('SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are not set. Run this with --env-file=../.env.local, and see .env.example.');

/** The project's secret key, asked for now and held only for as long as this runs. */
async function secretKey(): Promise<string> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return stop(`Supabase would not list the project's keys (${res.status}). The access token may not be allowed to read them.`);
  const keys = (await res.json()) as { name?: string; type?: string; api_key?: string | null }[];
  const key = (keys.find((k) => k.type === 'secret' && k.api_key) ?? keys.find((k) => k.name === 'service_role' && k.api_key))?.api_key;
  // a key that Supabase will not show in full comes back with its end blanked out
  if (!key || /[·•*]/.test(key)) return stop('Supabase did not hand over the project\'s secret key. The access token may not be allowed to read it.');
  return key;
}

const mb = `${(model.length / 1048576).toFixed(1)} MB`;
const trick = readFileSync(resolve(here, '../src/heroes/index.ts'), 'utf8').includes(`'${capture}'`);

if (dry) {
  await secretKey();
  console.log(`Would send ${record.name} (${capture}) to the Supabase project ${ref}:`);
  console.log(`  its model, ${mb}, as heroes/${record.model_path}`);
  console.log(`  its record: length ${record.length}, turn ${record.turn}, ${record.triangles.toLocaleString('en')} triangles`);
  console.log('The project\'s secret key can be read, and is not shown. Nothing was sent.');
} else {
  const key = await secretKey();
  const api = `https://${ref}.supabase.co`;
  const as = { apikey: key, Authorization: `Bearer ${key}` };

  // the model first, so that no record ever names a model that is not there
  const put = await fetch(`${api}/storage/v1/object/heroes/${record.model_path}`, {
    method: 'POST',
    headers: { ...as, 'Content-Type': 'model/gltf-binary', 'x-upsert': 'true' },
    body: new Blob([new Uint8Array(model)]),
  });
  if (!put.ok) stop(`The file store would not take the model (${put.status}): ${(await put.text()).slice(0, 300)}`);

  const write = await fetch(`${api}/rest/v1/heroes?on_conflict=capture`, {
    method: 'POST',
    headers: { ...as, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(record),
  });
  if (!write.ok) stop(`The model is in, but its record was refused (${write.status}): ${(await write.text()).slice(0, 300)}`);
  const [row] = (await write.json()) as { id?: string; rested?: boolean }[];

  console.log(`Sent ${record.name} (${capture}): its model, ${mb}, and its record.`);
  if (row?.rested) console.log('It is rested, so it stays out of the city until it is brought back.');
}
if (!trick) console.log(`${record.name} has no party trick yet. Every hero gets one: see src/heroes.`);
