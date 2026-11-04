import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rewardsForLevel, levelStatus, claimableLevels, levelHasClaim, trackLevels, nextMilestoneLevel,
  abilityStatus, CHARACTER_ABILITIES, levelsToCelebrate, isClaimablePart, partLabel,
} from '../src/levelRewards.js';

test('levels 2–10 match the planned track', () => {
  assert.deepEqual(rewardsForLevel(2), [{ type: 'gold', amount: 25 }]);
  assert.equal(rewardsForLevel(3)[0].type, 'collectible');
  assert.deepEqual(rewardsForLevel(4), [{ type: 'loot', tier: 'common' }]);
  assert.deepEqual(rewardsForLevel(6), [{ type: 'gold', amount: 40 }]);
  assert.equal(rewardsForLevel(7)[0].type, 'title');
  assert.deepEqual(rewardsForLevel(8), [{ type: 'loot', tier: 'rare' }]);
  assert.deepEqual(rewardsForLevel(9), [{ type: 'gold', amount: 50 }]);
  const ten = rewardsForLevel(10).map(p => p.type);
  assert.ok(ten.includes('frame') && ten.includes('title') && ten.includes('ability'));
  assert.deepEqual(rewardsForLevel(1), []);   // level 1 is the start
  assert.deepEqual(rewardsForLevel(0), []);
});

test('level 5 frame is the existing auto-unlocked rank frame (not duplicated)', () => {
  const five = rewardsForLevel(5);
  assert.ok(five.some(p => p.type === 'autoFrame' && p.cosmeticId === 'frame_rank_5'));
  assert.ok(!five.some(isClaimablePart));
  assert.equal(levelHasClaim(5), false);
  assert.equal(levelStatus(5, 7, {}), 'auto');
});

test('no ceiling: every level above 10 has a reward', () => {
  for (let L = 11; L <= 60; L++) {
    const parts = rewardsForLevel(L);
    assert.ok(parts.length > 0, `level ${L}`);
    assert.ok(parts.some(isClaimablePart), `level ${L} has something to claim`);
  }
  assert.ok(rewardsForLevel(20).some(p => p.type === 'title' && /Realm Legend II/.test(p.title)));
  assert.ok(rewardsForLevel(15).some(p => p.type === 'future'));
  // Gold growth is capped (no runaway economy)
  for (let L = 11; L <= 200; L++) for (const p of rewardsForLevel(L)) if (p.type === 'gold') assert.ok(p.amount <= 100);
});

test('statuses: locked / ready / claimed / auto', () => {
  assert.equal(levelStatus(3, 1, {}), 'locked');
  assert.equal(levelStatus(3, 3, {}), 'ready');
  assert.equal(levelStatus(3, 3, { 3: { claimedAt: 'x' } }), 'claimed');
  assert.equal(levelStatus(5, 5, {}), 'auto');
});

test('retroactive: a Level 7 character can claim 2–7 (except auto levels)', () => {
  assert.deepEqual(claimableLevels(7, {}), [2, 3, 4, 6, 7]);
  assert.deepEqual(claimableLevels(7, { 2: {}, 4: {} }), [3, 6, 7]);
  assert.deepEqual(claimableLevels(1, {}), []);
  assert.deepEqual(claimableLevels(12, {}), [2, 3, 4, 6, 7, 8, 9, 10, 11, 12]);
});

test('track shows 2–10 and keeps going past the student', () => {
  assert.deepEqual(trackLevels(1), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(trackLevels(12).at(-1), 17);
  assert.equal(nextMilestoneLevel(1), 5);
  assert.equal(nextMilestoneLevel(5), 10);
  assert.equal(nextMilestoneLevel(12), 15);
});

test('abilities unlock by level but stay inactive in Phase 3', () => {
  const guard = CHARACTER_ABILITIES.find(a => a.id === 'adventurers_guard');
  const sense = CHARACTER_ABILITIES.find(a => a.id === 'treasure_sense');
  assert.equal(abilityStatus(guard, 4), 'locked');
  assert.equal(abilityStatus(guard, 5), 'unlocked_inactive');
  assert.equal(abilityStatus(sense, 9), 'locked');
  assert.equal(abilityStatus(sense, 10), 'unlocked_inactive');
  assert.ok(CHARACTER_ABILITIES.every(a => a.active === false));
});

test('celebrations: only new levels, never replayed, old characters not re-celebrated', () => {
  assert.deepEqual(levelsToCelebrate(7, undefined), []);   // existing character, no record yet
  assert.deepEqual(levelsToCelebrate(2, 1), [2]);
  assert.deepEqual(levelsToCelebrate(5, 2), [3, 4, 5]);    // multiple levels at once
  assert.deepEqual(levelsToCelebrate(5, 5), []);           // already shown
  assert.deepEqual(levelsToCelebrate(1, 1), []);
});

test('labels exist for every part type used', () => {
  for (let L = 2; L <= 30; L++) for (const p of rewardsForLevel(L)) assert.ok(partLabel(p).length > 0, `${L} ${p.type}`);
});
