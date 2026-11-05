#!/usr/bin/env node
// Copies the reward data the Cloud Functions need from the client source, so the server and the
// app always agree on rewards. Run: `node scripts/build-server-catalog.mjs` (or `npm run build:catalog`).
// tests/serverCatalog.test.js fails if functions/lib is out of date.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import vm from 'vm';

const root = new URL('..', import.meta.url).pathname;
const main = readFileSync(root + 'src/main.js', 'utf8');

// Pull a `const NAME = <literal>;` block out of main.js and evaluate just that literal.
function literal(name, open, close) {
  const start = main.indexOf(`const ${name}`);
  if (start < 0) throw new Error(`${name} not found in src/main.js`);
  const from = main.indexOf(open, start);
  let depth = 0, i = from;
  for (; i < main.length; i++) {
    if (main[i] === open) depth++;
    else if (main[i] === close && --depth === 0) break;
  }
  return vm.runInNewContext('(' + main.slice(from, i + 1) + ')');
}

export function buildCatalog() {
  const companions = literal('COMPANIONS', '[', ']');
  const equipPools = literal('EQUIP_POOLS', '{', '}');
  const lineNames = literal('EQUIP_LINE_NAMES', '{', '}');
  const legendaryNames = literal('EQUIP_LEGENDARY_NAMES', '{', '}');
  const byRarity = r => companions.filter(c => c.rarity === r).map(c => c.file);
  // Same mapping as PET_POOLS in main.js: reward tier common → common companions, rare → uncommon.
  const pets = { common: byRarity('common'), rare: byRarity('uncommon') };
  const lands = {};
  for (const [land, pools] of Object.entries(equipPools)) {
    lands[land] = { pets, accessory: { common: pools.accessory?.common || [], rare: pools.accessory?.rare || [] } };
  }
  const itemNames = {};
  for (const pools of Object.values(equipPools)) for (const tier of ['common', 'rare']) for (const id of (pools.accessory?.[tier] || [])) {
    const parts = id.split('_'); const t = parts.at(-1); const line = parts.slice(1, -1).join('_');
    itemNames[id] = legendaryNames[id] || `${lineNames[line] || line} (${t[0].toUpperCase()}${t.slice(1)})`;
  }
  const companionNames = Object.fromEntries(companions.map(c => [c.file, c.name]));
  return { lands, defaultLand: 'The Verdant Vale', itemNames, companionNames,
           landNames: { 1: 'The Verdant Vale', 2: 'The Stone Kingdoms' } };
}

if (process.argv[1] && process.argv[1].endsWith('build-server-catalog.mjs')) {
  mkdirSync(root + 'functions/lib', { recursive: true });
  writeFileSync(root + 'functions/lib/rewardCatalog.json', JSON.stringify(buildCatalog(), null, 2) + '\n');
  writeFileSync(root + 'functions/lib/levelRewards.js', readFileSync(root + 'src/levelRewards.js', 'utf8'));
  console.log('Wrote functions/lib/rewardCatalog.json and functions/lib/levelRewards.js');
}
