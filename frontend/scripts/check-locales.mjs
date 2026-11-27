// Fails when a screen text exists in one language file but not the other.
import { readFileSync } from 'node:fs';

const load = (name) => JSON.parse(readFileSync(new URL(`../src/locales/${name}.json`, import.meta.url), 'utf8'));
const keys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

const en = new Set(keys(load('en')));
const sv = new Set(keys(load('sv')));
const missingInSv = [...en].filter((k) => !sv.has(k));
const missingInEn = [...sv].filter((k) => !en.has(k));

if (missingInSv.length || missingInEn.length) {
  if (missingInSv.length) console.error(`Missing in sv.json (${missingInSv.length}):\n  ${missingInSv.join('\n  ')}`);
  if (missingInEn.length) console.error(`Missing in en.json (${missingInEn.length}):\n  ${missingInEn.join('\n  ')}`);
  process.exit(1);
}
console.log(`Locales in step: ${en.size} keys in each language.`);
