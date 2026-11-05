import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import {
  isValidStudentNumber, defaultPinFor, hashPin, verifyPin, validateNewPin,
  checkLock, recordFailure, LIMITS, applyLevelClaim, directoryEntry,
} from '../functions/lib/security.js';

const catalog = JSON.parse(readFileSync(new URL('../functions/lib/rewardCatalog.json', import.meta.url), 'utf8'));

test('student numbers', () => {
  for (const ok of [101, '130', 201, 430]) assert.ok(isValidStudentNumber(ok), ok);
  for (const bad of [100, 131, 0, 501, 'abc', '1e2', 99, 101.5, '']) assert.ok(!isValidStudentNumber(bad), bad);
  assert.equal(defaultPinFor('101'), '1001');
  assert.equal(defaultPinFor('215'), '2015');
});

test('PIN hashing never stores the PIN and verifies correctly', () => {
  const rec = hashPin('4821');
  assert.ok(!JSON.stringify(rec).includes('4821'));
  assert.ok(verifyPin('4821', rec));
  assert.ok(!verifyPin('4822', rec));
  assert.notEqual(hashPin('4821').hash, rec.hash, 'salted');
  assert.ok(!verifyPin('4821', null));
  assert.ok(!verifyPin('4821', { alg: 'plain', hash: '4821' }));
});

test('new PIN rules', () => {
  assert.equal(validateNewPin('4821', '101'), null);
  assert.ok(validateNewPin('1001', '101'));
  assert.ok(validateNewPin('0000', '101'));
  assert.ok(validateNewPin('12a4', '101'));
  assert.ok(validateNewPin('12345', '101'));
});

test('rate limit: 5 wrong PINs locks the student for 5 minutes, then unlocks', () => {
  let s = null, ip = null; const t0 = 1_000_000;
  for (let i = 0; i < LIMITS.studentFails; i++) {
    assert.equal(checkLock(s, ip, t0 + i).locked, false);
    ({ student: s, ip } = recordFailure(s, ip, t0 + i));
  }
  const lock = checkLock(s, ip, t0 + 10);
  assert.equal(lock.locked, true); assert.equal(lock.scope, 'student');
  assert.equal(checkLock(s, ip, t0 + LIMITS.studentLockMs + 10).locked, false);
});

test('rate limit: a network is blocked after many failures across students, then the window resets', () => {
  let ip = null; const t0 = 5_000_000;
  for (let i = 0; i < LIMITS.ipFails; i++) ip = recordFailure(null, ip, t0 + i).ip;
  assert.equal(checkLock(null, ip, t0 + 100).scope, 'network');
  assert.equal(checkLock(null, ip, t0 + LIMITS.ipWindowMs + 1).locked, false);
});

const fixedRand = () => 0;
const base = () => ({ level: 10, gold: 100, currentLand: 1, companions: [], equipInventory: [] });

test('claim grants Gold and writes the record in the same update', () => {
  const r = applyLevelClaim(base(), 2, catalog, fixedRand, 0);
  assert.ok(r.ok);
  assert.equal(r.next.gold, 125);
  assert.equal(r.next.levelRewards['2'].by, 'server');
  assert.deepEqual(r.next.levelRewards['2'].results, r.results);
});

test('claim refuses duplicates, locked levels, bad levels, no-claim levels, missing students', () => {
  const once = applyLevelClaim(base(), 2, catalog, fixedRand).next;
  assert.equal(applyLevelClaim(once, 2, catalog).reason, 'already');
  assert.equal(applyLevelClaim({ ...base(), level: 3 }, 6, catalog).reason, 'locked');
  assert.equal(applyLevelClaim(base(), 1, catalog).reason, 'bad-level');
  assert.equal(applyLevelClaim(base(), 'x', catalog).reason, 'bad-level');
  assert.equal(applyLevelClaim(null, 2, catalog).reason, 'no-student');
});

test('claim does not change the input record (safe to retry inside a transaction)', () => {
  const st = base(); const before = JSON.stringify(st);
  applyLevelClaim(st, 4, catalog, fixedRand);
  assert.equal(JSON.stringify(st), before);
});

test('loot gives an unowned companion, then falls back to items, then Gold', () => {
  const allCommon = catalog.lands['The Verdant Vale'].pets.common;
  const r1 = applyLevelClaim(base(), 4, catalog, fixedRand);
  assert.equal(r1.results[0].type, 'companion');
  assert.ok(r1.next.companions.includes(allCommon[0]));
  const owned = { ...base(), companions: [...allCommon], equipInventory: [...catalog.lands['The Verdant Vale'].accessory.common] };
  const r2 = applyLevelClaim(owned, 4, catalog, fixedRand);
  assert.equal(r2.results[0].type, 'gold');
  assert.equal(r2.next.gold, 115);
});

test('existing progress is preserved by a claim', () => {
  const st = { ...base(), xp: 470, house: 'altruismo', bosses: { a: 1 }, standardBossState: { x: { defeated: true } }, companions: ['a.png'] };
  const { next } = applyLevelClaim(st, 6, catalog, fixedRand);
  for (const k of ['xp', 'house', 'bosses', 'standardBossState']) assert.deepEqual(next[k], st[k]);
  assert.ok(next.companions.includes('a.png'));
});

test('directory only exposes display fields', () => {
  const d = directoryEntry({ characterName: 'Kai', house: 'amistad', customPin: '4821', gold: 9, absences: { x: 1 }, sideQuests: {} });
  assert.deepEqual(d, { characterName: 'Kai', house: 'amistad' });
});

test('a claim interrupted part-way writes nothing (all-or-nothing)', () => {
  // Simulate a crash in the middle of granting (after Gold, while picking the item).
  const st = { ...base(), level: 10 };
  const before = JSON.stringify(st);
  let calls = 0;
  const crashing = () => { if (++calls >= 1) throw new Error('crash mid-grant'); return 0; };
  assert.throws(() => applyLevelClaim(st, 3, catalog, crashing));
  // The transaction callback threw, so the database receives no write at all; the input is untouched,
  // and the reward is still claimable afterwards.
  assert.equal(JSON.stringify(st), before);
  assert.ok(applyLevelClaim(st, 3, catalog, fixedRand).ok);
});
