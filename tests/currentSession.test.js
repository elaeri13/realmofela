import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classIdForStudent, isSessionTile, listSessionOptions, sessionLabel,
  resolveTodaysLesson, planMoveToToday, hasStartedSession,
} from '../src/currentSession.js';

// Small Land shaped like the real ones: arrival, lessons, forge, study hall, gate lesson, camp, loot, dungeon.
const LAND = {
  id: 2, name: 'The Stone Kingdoms',
  tiles: [
    { id: 1, type: 'arrival', name: "The Kingdoms' Gate" },
    { id: 2, type: 'lesson', name: 'S2' },
    { id: 3, type: 'lesson', name: 'S3', sessionTitle: 'Packing for Mars' },
    { id: 4, type: 'lesson', name: 'S4' },
    { id: 5, type: 'forge', name: 'S5' },
    { id: 50, type: 'studyHall', name: 'S5b' },
    { id: 6, type: 'lesson', name: 'S6' },              // gate boss session
    { id: 7, type: 'camp', name: 'S7' },
    { id: 8, type: 'lesson', name: 'S8' },
    { id: 31, type: 'loot', pathType: 'loot', name: 'L2-Loot-4', parentTileId: 4 },
    { id: 27, type: 'dungeon', name: 'The Eternal Architect' },
  ],
  pathOrder: [1, 2, 3, 4, 5, 50, 6, 7, 8, 27],
};
const LAND1 = { id: 1, name: 'The Verdant Vale', tiles: [{ id: 2, type: 'lesson', name: 'S2' }], pathOrder: [2] };
const LANDS = [{ id: 0, tiles: [], pathOrder: [] }, LAND1, LAND];
const pos = (tile, completed = [], land = 2) => ({ land, tile, completed });

test('class id comes from the student number', () => {
  assert.equal(classIdForStudent(101), 1);
  assert.equal(classIdForStudent('430'), 4);
  assert.equal(classIdForStudent(42), null);
  assert.equal(classIdForStudent('abc'), null);
});

test('only main-path session tiles are selectable', () => {
  const t = id => LAND.tiles.find(x => x.id === id);
  assert.ok(isSessionTile(LAND, t(3)));
  assert.ok(isSessionTile(LAND, t(5)));   // forge
  assert.ok(isSessionTile(LAND, t(50)));  // study hall
  assert.ok(isSessionTile(LAND, t(7)));   // camp
  assert.ok(!isSessionTile(LAND, t(1)));  // arrival
  assert.ok(!isSessionTile(LAND, t(31))); // loot
  assert.ok(!isSessionTile(LAND, t(27))); // dungeon
  const values = listSessionOptions(LANDS).map(o => o.value);
  assert.deepEqual(values, ['1:2', '2:2', '2:3', '2:4', '2:5', '2:50', '2:6', '2:7', '2:8']);
});

test('labels match the map wording', () => {
  const t = id => LAND.tiles.find(x => x.id === id);
  assert.equal(sessionLabel(t(3)), 'Session 3 · Packing for Mars');
  assert.equal(sessionLabel(t(4)), 'Session 4');
  assert.equal(sessionLabel(t(5)), "Session 5 · Writer's Craft");
  assert.equal(sessionLabel(t(50)), 'Study Hall');
  assert.equal(sessionLabel(t(7)), 'Camp Day');
});

test('routing: resolves the class setting, not the earliest unfinished session', () => {
  const settings = { 1: { landId: 2, tileId: 4 } };
  // Student 101 is on S2 with nothing done, but today's lesson is S4.
  const r = resolveTodaysLesson({ studentId: 101, settingsCurrentSession: settings, lands: LANDS, pos: pos(2, [1]) });
  assert.equal(r.status, 'ok');
  assert.equal(r.tile.id, 4);
  assert.equal(r.relation, 'ahead');
});

test('routing: here / done / behind relations', () => {
  const settings = { 1: { landId: 2, tileId: 3 } };
  const go = p => resolveTodaysLesson({ studentId: 105, settingsCurrentSession: settings, lands: LANDS, pos: p });
  assert.equal(go(pos(3, [1, 2])).relation, 'here');
  assert.equal(go(pos(4, [1, 2, 3])).relation, 'done');
  assert.equal(go(pos(4, [1, 2])).relation, 'behind'); // marker moved past S3 without finishing it (missed)
});

test('class isolation: two classes with different sessions', () => {
  const settings = { 1: { landId: 2, tileId: 3 }, 2: { landId: 2, tileId: 8 } };
  const a = resolveTodaysLesson({ studentId: 110, settingsCurrentSession: settings, lands: LANDS, pos: pos(3) });
  const b = resolveTodaysLesson({ studentId: 210, settingsCurrentSession: settings, lands: LANDS, pos: pos(3) });
  assert.equal(a.tile.id, 3);
  assert.equal(b.tile.id, 8);
  // A class with no entry never borrows another class's session.
  const c = resolveTodaysLesson({ studentId: 310, settingsCurrentSession: settings, lands: LANDS, pos: pos(3) });
  assert.equal(c.status, 'unset');
});

test('missing or invalid settings fail safely', () => {
  const go = s => resolveTodaysLesson({ studentId: 101, settingsCurrentSession: s, lands: LANDS, pos: pos(2) }).status;
  assert.equal(go(undefined), 'unset');
  assert.equal(go({}), 'unset');
  assert.equal(go({ 1: { landId: 2 } }), 'unset');
  assert.equal(go({ 1: { landId: 9, tileId: 3 } }), 'invalid');   // unknown land
  assert.equal(go({ 1: { landId: 2, tileId: 999 } }), 'invalid'); // unknown tile
  assert.equal(go({ 1: { landId: 2, tileId: 31 } }), 'invalid');  // loot tile is not a session
  assert.equal(go({ 1: { landId: 2, tileId: 27 } }), 'invalid');  // final boss is not a session
  assert.equal(go({ 1: { landId: 1, tileId: 2 } }), 'other_land'); // student is in Land 2
});

test('moving the marker forward is only allowed when skipped sessions stay catch-up-able', () => {
  const gates = new Set([6]);
  const plan = (from, to, released, completed = []) => planMoveToToday({
    land: LAND, pos: pos(from, completed), targetTileId: to,
    isReleasedPast: tid => released.includes(tid), isGateTile: tid => gates.has(tid),
  });
  assert.deepEqual(plan(2, 4, [2, 3]), { safe: true, skipped: [2, 3] });
  assert.equal(plan(2, 4, [2]).safe, false);            // S3 has no past release date → would be stranded
  assert.equal(plan(2, 4, [2]).reason, 'unreleased');
  assert.equal(plan(4, 7, [4, 5, 50, 6]).reason, 'gate'); // cannot skip past an unbeaten gate boss
  assert.equal(plan(4, 7, [4, 5, 50], [6]).safe, true);   // gate already done → fine
  assert.equal(plan(4, 3, [3]).safe, false);              // not ahead → nothing to move
});

test('"Return to today\'s lesson" needs stored activity, not just a visit', () => {
  assert.equal(hasStartedSession({ completed: [], taskProgress: {}, tileId: 3 }), false);
  assert.equal(hasStartedSession({ completed: [], taskProgress: { 3: { wayground: [false] } }, tileId: 3 }), false);
  assert.equal(hasStartedSession({ completed: [], taskProgress: { 3: { wayground: [true] } }, tileId: 3 }), true);
  assert.equal(hasStartedSession({ completed: [], taskProgress: { 4: { wayground: [true] } }, tileId: 3 }), false);
  assert.equal(hasStartedSession({ completed: [3], taskProgress: {}, tileId: 3 }), true);
});
