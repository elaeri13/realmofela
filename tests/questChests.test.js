import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollChest, rollTier, resolveChest, applyResults, earnInto, openInto, armInto, migratePotionsInto, successfulAfterLaunch,
  isChestSession, mulberry32, TIER_ODDS, POTIONS, RETIRED_POTIONS, addXp } from '../src/questChests.js';

const pools = {
  companions: { common: Array.from({ length: 15 }, (_, i) => `c${i}.png`), rare: Array.from({ length: 16 }, (_, i) => `u${i}.png`), epic: Array.from({ length: 13 }, (_, i) => `r${i}.png`) },
  collectibles: { common: ['acc_common'], rare: ['acc_rare'], epic: ['acc_epic'], legendary: ['acc_legendary'] },
  mystery: Array.from({ length: 20 }, (_, i) => `m${i}.png`),
  seasonal: null,
};
const base = { xp: 10, level: 2, xpNext: 50, gold: 20 };
const earn = (rec, key, o = {}) => earnInto(rec, key, { pools, rng: mulberry32(o.seed || 1), now: 'T', source: 'lesson', landName: 'L', defaults: { xp: 0, level: 1, xpNext: 50 }, ...o });

test('drop rates over 100,000 chests match the approved design', () => {
  const rng = mulberry32(42); const N = 100000;
  const tiers = { wooden: 0, silver: 0, golden: 0, legendary: 0 }; const kinds = {}; let pets = 0, mats = 0, gold = 0;
  for (let i = 0; i < N; i++) {
    const c = rollChest({ pools, rng, source: 'lesson', now: 'T' });
    tiers[c.tier]++; kinds[c.prize.kind] = (kinds[c.prize.kind] || 0) + 1;
    if (['companion', 'mystery'].includes(c.prize.kind)) pets++;
    if (c.prize.kind === 'material') mats += c.prize.n;
    if (c.prize.kind === 'gold') gold += c.prize.amount;
  }
  for (const [t, pct] of Object.entries(TIER_ODDS)) assert.ok(Math.abs(tiers[t] / N * 100 - pct) < 0.6, `${t}: ${tiers[t] / N * 100}`);
  assert.ok(Math.abs(pets / N - 0.355) < 0.01, `pets ${pets / N}`);            // ≈ 1 in 3 (today: every lesson)
  assert.ok(Math.abs(mats / N - 0.171) < 0.01, `materials/chest ${mats / N}`);  // today 0.15 per lesson
  assert.ok(gold / N > 0.9 && gold / N < 1.6, `extra gold/chest ${gold / N}`);
});

test('every chest contains something — even when every pet and collectible is owned', () => {
  const rng = mulberry32(7);
  const ownsAll = { companions: [...pools.companions.common, ...pools.companions.rare, ...pools.companions.epic, ...pools.mystery], collectibles: Object.values(pools.collectibles).flat() };
  for (let i = 0; i < 2000; i++) {
    const res = resolveChest(rollChest({ pools, rng, now: 'T' }), ownsAll);
    assert.ok(res.length >= 1 && res[0].kind, JSON.stringify(res));
    assert.ok(!['companion', 'collectible'].includes(res[0].kind), 'owned items are never given again');
  }
});

test('duplicates: the next unowned item of the SAME pool is given; never a higher rarity', () => {
  const c = rollChest({ tier: 'wooden', pools, rng: mulberry32(3), now: 'T' });
  const chest = { ...c, prize: { kind: 'companion', pool: 'common', candidates: ['c1.png', 'c2.png', 'c3.png'] }, fallback: { kind: 'potion', id: 'potion_luck' } };
  assert.deepEqual(resolveChest(chest, { companions: ['c1.png'] })[0], { kind: 'companion', file: 'c2.png', rarity: 'common' });
  assert.deepEqual(resolveChest(chest, { companions: ['c1.png', 'c2.png', 'c3.png'] })[0], { kind: 'potion', id: 'potion_luck', fallback: true });
  // owning every common pet does not change the tier odds (rarity is rolled before ownership is looked at)
  for (let s = 1; s <= 500; s++) assert.equal(rollChest({ pools, rng: mulberry32(s), now: 'T' }).tier,
    rollChest({ pools: { ...pools, companions: { common: [], rare: [], epic: [] } }, rng: mulberry32(s), now: 'T' }).tier);
});

test('contents are fixed when earned: opening the same chest twice resolves to the same thing', () => {
  const c = rollChest({ pools, rng: mulberry32(11), now: 'T' });
  assert.deepEqual(resolveChest(c, {}), resolveChest(c, {}));
});

test('earn: once per session; a second earn (catch-up after lesson, refresh, retry, other device) creates nothing', () => {
  const e1 = earn(base, '2_3');
  assert.ok(e1 && e1.rec.questChests['2_3'].tier);
  assert.equal(earn(e1.rec, '2_3', { seed: 99, source: 'catchUp' }), null);
});

test('open: exactly once; contents are added to the existing inventory fields only', () => {
  const rec = { ...base, companions: ['old.png'], equipInventory: ['old_acc'], items: ['gold_pouch'], materials: 2, materialSlots: { gem: 2 },
    questChests: { k: { tier: 'wooden', prize: { kind: 'material', variant: 'leaf', n: 1 }, fallback: { kind: 'potion', id: 'potion_luck' } } } };
  const o = openInto(rec, 'k', 'T2');
  assert.deepEqual(o.results, [{ kind: 'material', variant: 'leaf', n: 1 }]);
  assert.equal(o.rec.materials, 3); assert.deepEqual(o.rec.materialSlots, { gem: 2, leaf: 1 });
  assert.deepEqual(o.rec.companions, ['old.png']); assert.deepEqual(o.rec.equipInventory, ['old_acc']); assert.deepEqual(o.rec.items, ['gold_pouch']);
  assert.equal(o.rec.questChests.k.openedAt, 'T2');
  assert.equal(openInto(o.rec, 'k', 'T3'), null, 'second open gives nothing');
  assert.equal(openInto(rec, 'missing', 'T'), null);
});

test('welcome chest: guaranteed Silver, never uses potions', () => {
  const rec = { ...base, activeBoosts: { luck: { potion: 'potion_luck' } } };
  const e = earn(rec, 'welcome', { tier: 'silver', useBoosts: false, source: 'welcome' });
  assert.equal(e.chest.tier, 'silver');
  assert.ok(e.rec.activeBoosts.luck, 'Luck stays armed for a real lesson');
});

test('Insight / Fortune: 2× BASE once, only with a newly earned chest; Luck: next chest is Silver+', () => {
  const rec = { ...base, activeBoosts: { xp: { potion: 'potion_insight' }, gold: { potion: 'potion_fortune' }, luck: { potion: 'potion_luck' } } };
  const e = earn(rec, '2_3', { base: { xp: 5, gold: 5 } });
  assert.equal(e.rec.xp, 15); assert.equal(e.rec.gold, 25);
  assert.deepEqual(e.chest.boosts, { luck: true, xp: 5, gold: 5 });
  assert.equal(e.rec.activeBoosts, null, 'all three used up');
  assert.notEqual(e.chest.tier, 'wooden');
  const again = earn(e.rec, '2_4', { base: { xp: 5, gold: 5 } });
  assert.equal(again.rec.xp, 15, 'no second doubling'); assert.equal(again.chest.boosts, undefined);
  // never on self-repair, and never when the chest already existed
  const sr = earn(rec, '2_5', { base: null, useBoosts: false });
  assert.ok(sr.rec.activeBoosts.xp && sr.rec.activeBoosts.gold && sr.rec.activeBoosts.luck);
  for (let s = 1; s < 300; s++) assert.notEqual(earn({ ...base, activeBoosts: { luck: {} } }, 'k', { seed: s }).chest.tier, 'wooden');
});

test('XP potion levels up exactly like awardXP', () => {
  assert.deepEqual(addXp({ xp: 48, level: 3, xpNext: 50 }, 5), { xp: 3, level: 4, levelsGained: 1, startLevel: 3 });
  const e = earnInto({ xp: 48, level: 3, xpNext: 50, activeBoosts: { xp: {} } }, 'k', { pools, rng: mulberry32(1), now: 'T', base: { xp: 5, gold: 5 } });
  assert.equal(e.levelsGained, 1); assert.equal(e.rec.level, 4);
});

test('arming: one of each type at most; potion is used from the bag', () => {
  const rec = { items: ['potion_insight', 'potion_insight', 'gold_pouch'] };
  const a = armInto(rec, 'potion_insight');
  assert.deepEqual(a.rec.items, ['potion_insight', 'gold_pouch']); assert.ok(a.rec.activeBoosts.xp);
  assert.equal(armInto(a.rec, 'potion_insight'), null, 'second Insight refused while one is active');
  assert.equal(armInto(rec, 'potion_luck'), null, 'not owned');
  assert.equal(armInto(rec, 'health_potion'), null, 'retired potions do nothing');
});

test('retired stat potions upgrade once, keeping quantities and order', () => {
  const rec = { items: ['health_potion', 'scroll', 'health_potion', 'behavior_potion', 'stamina_potion', 'gold_pouch'] };
  const m = migratePotionsInto(rec, 'T');
  assert.deepEqual(m.rec.items, ['potion_fortune', 'scroll', 'potion_fortune', 'potion_insight', 'potion_luck', 'gold_pouch']);
  assert.equal(m.converted, 4);
  assert.equal(migratePotionsInto(m.rec, 'T2'), null, 'only once');
  assert.deepEqual(RETIRED_POTIONS, { health_potion: 'potion_fortune', behavior_potion: 'potion_insight', stamina_potion: 'potion_luck' });
  assert.ok(Object.values(POTIONS).every(p => ['xp', 'gold', 'luck'].includes(p.boost)), 'no potion touches HP, mana (behavior) or focus');
});

test('self-repair only when a successful completion after launch is clearly established', () => {
  const lesson = { id: 3, type: 'lesson' }, forge = { id: 5, type: 'forge' };
  const ok = { tile: lesson, completed: [3], completedAt: '2026-11-10T10:00:00', launchAt: '2026-11-10T09:00:00', taskProgress: { outcomeRecorded: [true], outcomeFail: [false] } };
  assert.equal(successfulAfterLaunch(ok), true);
  assert.equal(successfulAfterLaunch({ ...ok, taskProgress: { outcomeRecorded: [true], outcomeFail: [true] } }), false, '"Needs More Practice"');
  assert.equal(successfulAfterLaunch({ ...ok, taskProgress: {} }), false, 'completed tile alone (e.g. teacher move)');
  assert.equal(successfulAfterLaunch({ ...ok, taskProgress: { exitTicketOpened: [true] } }), false, 'opening Pear is not completion');
  assert.equal(successfulAfterLaunch({ ...ok, completedAt: '2026-11-01T10:00:00' }), false, 'before launch: no retroactive chests');
  assert.equal(successfulAfterLaunch({ ...ok, completed: [] }), false);
  assert.equal(successfulAfterLaunch({ ...ok, tile: forge, completed: [5], taskProgress: { submitted: [true] } }), true);
  assert.equal(successfulAfterLaunch({ ...ok, tile: forge, completed: [5], taskProgress: {} }), false);
  assert.equal(successfulAfterLaunch({ ...ok, tile: { id: 7, type: 'camp' }, completed: [7] }), false);
});

test('chest sessions: lessons and Writer\'s Craft on the main path only', () => {
  const land = { id: 2, pathOrder: [2, 5, 50, 7] };
  assert.ok(isChestSession(land, { id: 2, type: 'lesson' }));
  assert.ok(isChestSession(land, { id: 5, type: 'forge' }));
  assert.ok(!isChestSession(land, { id: 50, type: 'studyHall' }));
  assert.ok(!isChestSession(land, { id: 7, type: 'camp' }));
  assert.ok(!isChestSession(land, { id: 31, type: 'loot', pathType: 'loot', parentTileId: 2 }));
  assert.ok(!isChestSession({ id: 0, pathOrder: [2] }, { id: 2, type: 'lesson' }), 'Training Grounds tutorial');
});

test('a rolled tier never depends on luck when a tier is forced', () => {
  for (let s = 1; s < 50; s++) assert.equal(rollTier(mulberry32(s), { luck: true }) === 'wooden', false);
});
