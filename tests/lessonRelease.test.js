import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReleaseTile, releaseTiles, releaseFor, canWorkOn, planEnable, planDisable, previewEnable, planSetAll, planTogglePeriod, nextToRelease, applyPlan, summarize, releaseConfig } from '../src/lessonRelease.js';
import { planAllPeriods, summarizeTodaysLessons } from '../src/currentSession.js';

const land = { id: 2, pathOrder: [1, 2, 3, 4, 5, 31, 6, 27], tiles: [
  { id: 1, type: 'arrival' }, { id: 2, type: 'lesson' }, { id: 3, type: 'lesson' }, { id: 4, type: 'lesson' },
  { id: 5, type: 'forge' }, { id: 31, type: 'loot', pathType: 'loot', parentTileId: 4 }, { id: 6, type: 'event' }, { id: 27, type: 'dungeon' } ] };
const T = id => land.tiles.find(t => t.id === id);
const on = (all = {}, classes = {}) => ({ enabled: true, all, classes });

test('only real sessions are managed (lessons, forge, study hall, camp, writing events)', () => {
  assert.deepEqual(releaseTiles(land).map(t => t.id), [2, 3, 4, 5, 6]);
  assert.ok(!isReleaseTile(land, T(1)) && !isReleaseTile(land, T(31)) && !isReleaseTile(land, T(27)));
});

test('release mode off = old behaviour (release dates decide)', () => {
  assert.deepEqual(releaseFor(null, 1, 3), { released: true, source: 'off' });
  assert.equal(canWorkOn({ cfg: null, classId: 1, land, tile: T(3), dateOpen: true }), true);
  assert.equal(canWorkOn({ cfg: null, classId: 1, land, tile: T(3), dateOpen: false }), false);
  assert.equal(canWorkOn({ cfg: { all: { 3: true } }, classId: 1, land, tile: T(4), dateOpen: true }), true, 'a saved list without enabled does nothing');
});

test('release mode on: unreleased sessions are locked, released ones open, dates no longer open them', () => {
  const cfg = on({ 2: true, 3: true });
  assert.equal(canWorkOn({ cfg, classId: 1, land, tile: T(3), dateOpen: false }), true, 'released even if the date is later');
  assert.equal(canWorkOn({ cfg, classId: 1, land, tile: T(4), dateOpen: true }), false, 'not released even if the date passed');
});

test('completed work is never locked', () => {
  assert.equal(canWorkOn({ cfg: on(), classId: 1, land, tile: T(4), completed: [4] }), true);
});

test('period overrides win over "all" in both directions', () => {
  const cfg = on({ 3: true }, { 2: { 3: false }, 3: { 4: true } });
  assert.deepEqual(releaseFor(cfg, 1, 3), { released: true, source: 'all' });
  assert.deepEqual(releaseFor(cfg, 2, 3), { released: false, source: 'class' });
  assert.deepEqual(releaseFor(cfg, 3, 4), { released: true, source: 'class' });
  assert.deepEqual(releaseFor(cfg, 1, 4), { released: false, source: 'none' });
  assert.deepEqual(summarize(cfg, 3), { state: 'some', open: [1, 3, 4] });
});

test('non-session tiles are untouched by release mode (boss/dungeon keep their own unlock; loot follows its parent)', () => {
  assert.equal(canWorkOn({ cfg: on(), classId: 1, land, tile: T(27), dateOpen: true }), true);
  assert.equal(canWorkOn({ cfg: on(), classId: 1, land, tile: T(31), dateOpen: true }), true);
});

test('turning on keeps every session whose date has passed open for all periods', () => {
  const plan = planEnable(land, id => [2, 3].includes(id));
  assert.deepEqual(plan, { enabled: true, 'all/2': true, 'all/3': true });
  assert.deepEqual(planDisable(), { enabled: null });
});

test('activation preview: every session is listed once — open (date passed), locked (future date), locked (no date)', () => {
  const dates = { 2: '2026-01-01', 3: '2026-01-02', 4: '2099-01-01' };          // 5 and 6 have no date
  const passed = id => ['2026-01-01', '2026-01-02'].includes(dates[id]);
  const p = previewEnable(land, passed, id => dates[id]);
  assert.deepEqual(p.open.map(x => x.tile.id), [2, 3]);
  assert.deepEqual(p.lockedFuture.map(x => [x.tile.id, x.date]), [[4, '2099-01-01']]);
  assert.deepEqual(p.lockedNoDate.map(x => x.tile.id), [5, 6]);
  assert.equal(p.open.length + p.lockedFuture.length + p.lockedNoDate.length, releaseTiles(land).length);
  // the plan written on confirm opens exactly the "open" list — never a no-date session
  assert.deepEqual(planEnable(land, passed, id => dates[id]), { enabled: true, 'all/2': true, 'all/3': true });
  assert.deepEqual(planEnable(land, () => true, id => dates[id]), { enabled: true, 'all/2': true, 'all/3': true, 'all/4': true }, 'no-date sessions stay locked even if a caller says "passed"');
});

test('re-enabling: sessions released earlier are listed as open (kept), and kept period settings are counted', () => {
  const dates = { 2: '2026-01-01' };
  const prev = { all: { 5: true }, classes: { 2: { 6: true } } };
  const p = previewEnable(land, id => id === 2, id => dates[id], prev);
  assert.deepEqual(p.open.map(x => [x.tile.id, !!x.kept]), [[2, false], [5, true]]);
  assert.deepEqual(p.lockedNoDate.map(x => x.tile.id), [3, 4, 6]);
  assert.equal(p.keptPeriodSettings, 1);
});

test('release for ALL periods in one action clears period holds; undo locks everywhere', () => {
  let cfg = on({}, { 2: { 4: false }, 3: { 4: true } });
  cfg = applyPlan(cfg, planSetAll(4, true));
  assert.deepEqual(summarize(cfg, 4), { state: 'all', open: [1, 2, 3, 4] });
  cfg = applyPlan(cfg, planSetAll(4, false));
  assert.deepEqual(summarize(cfg, 4), { state: 'none', open: [] });
  assert.equal(cfg.enabled, true, 'other fields untouched');
});

test('one period can be held back or released early; matching "all" removes the override', () => {
  let cfg = on({ 4: true });
  cfg = applyPlan(cfg, planTogglePeriod(cfg, 2, 4));
  assert.equal(cfg.classes[2][4], false);
  cfg = applyPlan(cfg, planTogglePeriod(cfg, 2, 4));
  assert.equal((cfg.classes[2] || {})[4], undefined, 'back to following "all"');
  cfg = applyPlan(cfg, planTogglePeriod(cfg, 3, 5));
  assert.equal(cfg.classes[3][5], true);
});

test('"release next session" finds the first session not released for all periods', () => {
  assert.equal(nextToRelease(on({ 2: true, 3: true }), land).id, 4);
  assert.equal(nextToRelease(on({ 2: true, 3: true, 4: true }, { 1: { 4: false } }), land).id, 5, 'a period hold on S4 is not undone by "release next"');
});

test('plans only touch release paths (never other settings)', () => {
  for (const p of [planEnable(land, () => true), planSetAll(3, true), planTogglePeriod(on(), 1, 3)])
    for (const k of Object.keys(p)) assert.match(k, /^(enabled|all\/\d+|classes\/\d+\/\d+)$/);
  assert.equal(releaseConfig({ lessonRelease: { 2: on() } }, 2).enabled, true);
});

test('Today\'s Lesson for all periods: one choice → every class; per-period differences visible', () => {
  assert.deepEqual(planAllPeriods([1, 2, 3, 4], 2, 5, 't'), {
    1: { landId: 2, tileId: 5, setAt: 't' }, 2: { landId: 2, tileId: 5, setAt: 't' }, 3: { landId: 2, tileId: 5, setAt: 't' }, 4: { landId: 2, tileId: 5, setAt: 't' } });
  assert.deepEqual(planAllPeriods([1, 2], null, null), { 1: null, 2: null });
  const s = { 1: { landId: 2, tileId: 5 }, 2: { landId: 2, tileId: 5 }, 3: { landId: 2, tileId: 5 }, 4: { landId: 2, tileId: 4 } };
  assert.deepEqual(summarizeTodaysLessons(s, [1, 2, 3, 4]), { same: false, value: null, byClass: { 1: '2:5', 2: '2:5', 3: '2:5', 4: '2:4' } });
  assert.equal(summarizeTodaysLessons({ ...s, 4: { landId: 2, tileId: 5 } }, [1, 2, 3, 4]).value, '2:5');
});
