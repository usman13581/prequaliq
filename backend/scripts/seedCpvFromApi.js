/**
 * Fetch EU CPV codes (used by Sweden and all EU) from OpenDataSoft and seed the database.
 * Source: https://public.opendatasoft.com/explore/dataset/nomenclature-cpv/
 *
 * Usage (production):
 *   DATABASE_URL='postgresql://...' NODE_ENV=production node scripts/seedCpvFromApi.js
 *
 * Usage (local):
 *   NODE_ENV=production node scripts/seedCpvFromApi.js
 */
require('dotenv').config();
const db = require('../models');

const API_BASE = 'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/nomenclature-cpv/records';
const LIMIT = 100;

function padCode(s) {
  const digits = (s || '').replace(/\D/g, '').slice(0, 8);
  return digits.padEnd(8, '0');
}

async function fetchAllCpvFromApi() {
  const out = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${API_BASE}?limit=${LIMIT}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
    const data = await res.json();
    const results = data.results || [];
    for (const r of results) {
      const codeShort = r.code_short || r.code;
      const code = padCode(codeShort);
      const description = (r.en || r.description || r.code || code).trim();
      if (!description) continue;
      out.push({ code, description });
    }
    offset += LIMIT;
    hasMore = results.length === LIMIT;
    if (results.length > 0) process.stdout.write(`\rFetched ${offset} CPV codes...`);
  }
  return out;
}

async function run() {
  try {
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    console.log('CPV seed from EU Open Data (Sweden uses EU CPV)');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    console.log('Fetching CPV codes from API...');
    const rows = await fetchAllCpvFromApi();
    console.log(`\nFetched ${rows.length} codes. Deduplicating by code...`);

    const byCode = new Map();
    for (const r of rows) {
      if (!byCode.has(r.code)) byCode.set(r.code, r);
    }
    const toInsert = Array.from(byCode.values());

    const existing = await db.CPVCode.findAll({ attributes: ['code'] });
    const existingSet = new Set(existing.map((e) => e.code));
    const newRows = toInsert.filter((r) => !existingSet.has(r.code));

    if (newRows.length === 0) {
      console.log('No new CPV codes to insert (all already in DB).');
      await db.sequelize.close();
      return;
    }

    const BATCH = 200;
    let inserted = 0;
    for (let i = 0; i < newRows.length; i += BATCH) {
      const batch = newRows.slice(i, i + BATCH).map((r) => ({
        code: r.code,
        description: r.description,
        level: 1
      }));
      await db.CPVCode.bulkCreate(batch);
      inserted += batch.length;
      process.stdout.write(`\rInserted ${inserted}/${newRows.length} new CPV codes...`);
    }

    console.log(`\n✓ Done. Inserted ${inserted} new CPV codes. Total in DB: ${existing.length + inserted}.`);
    await db.sequelize.close();
  } catch (err) {
    console.error('Error:', err.message);
    await db.sequelize.close();
    process.exit(1);
  }
}

run();
