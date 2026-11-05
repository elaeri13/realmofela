// Fails if functions/lib is out of date with the client's reward data. Fix: npm run build:catalog
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { buildCatalog } from '../scripts/build-server-catalog.mjs';

const root = new URL('..', import.meta.url).pathname;
test('server reward catalog matches src/main.js', () => {
  const onDisk = JSON.parse(readFileSync(root + 'functions/lib/rewardCatalog.json', 'utf8'));
  assert.deepEqual(onDisk, JSON.parse(JSON.stringify(buildCatalog())));
});
test('server copy of levelRewards.js matches src/levelRewards.js', () => {
  assert.equal(readFileSync(root + 'functions/lib/levelRewards.js', 'utf8'), readFileSync(root + 'src/levelRewards.js', 'utf8'));
});
