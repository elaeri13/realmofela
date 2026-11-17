import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schoolDate, localDateFromYmd, effectiveReleaseDates, isDateReleased, datedTodaysLesson, resolveCurrentSessions } from '../src/lessonAutomation.js';
import { canWorkOn, releaseFor, planSetAll, planTogglePeriod, nextToRelease, applyPlan, summarize } from '../src/lessonRelease.js';

// Land 2: sessions 1-5, a writing event (6), a loot branch (7, ignored), session 8.
const land = {
  id: 2, pathOrder: [1, 2, 3, 4, 5, 6, 8],
  tiles: [
    ...[1, 2, 3, 4, 5, 8].map(id => ({ id, type: 'lesson' })),
    { id: 6, type: 'event' }, { id: 7, type: 'lesson', parentTileId: 2 },
  ],
};
const tileOf = id => land.tiles.find(t => t.id === id);
const sched = { 1: { releaseDate: '2026-11-16' }, 2: { releaseDate: '2026-11-17' }, 4: { releaseDate: '2026-11-19' } };
const settings = { lessonSchedule: { 2: sched } };
const managed = { enabled: true };

test('school date changes at Chicago midnight, including daylight saving time', () => {
  assert.equal(schoolDate(new Date('2026-11-15T05:59:59Z')), '2026-11-14');
  assert.equal(schoolDate(new Date('2026-11-15T06:00:00Z')), '2026-11-15');
  assert.equal(schoolDate(new Date('2026-07-15T05:00:00Z')), '2026-07-15');
});

test('a YYYY-MM-DD date is shown on its own day (not a day early)', () => {
  const d = localDateFromYmd('2026-11-17');
  assert.equal(d.getFullYear(), 2026); assert.equal(d.getMonth(), 10); assert.equal(d.getDate(), 17);
  assert.equal(localDateFromYmd('bad'), null);
});

test('undated sessions borrow the next date; events borrow the date before; nothing after → no date', () => {
  const eff = effectiveReleaseDates(land, sched);
  assert.equal(eff[1], '2026-11-16');
  assert.equal(eff[2], '2026-11-17');
  assert.equal(eff[3], '2026-11-19');   // gap → opens with Session 4
  assert.equal(eff[4], '2026-11-19');
  assert.equal(eff[5], undefined);      // nothing dated after it
  assert.equal(eff[6], undefined);      // event after an undated session with no date
  assert.equal(eff[7], undefined);      // loot branch is never managed
  const withLater = effectiveReleaseDates(land, { ...sched, 8: { releaseDate: '2026-11-24' } });
  assert.equal(withLater[5], '2026-11-24');
  assert.equal(withLater[6], '2026-11-24');   // the event opens with the session before it
  const eventOwnDate = effectiveReleaseDates(land, { ...sched, 5: { releaseDate: '2026-11-20' } });
  assert.equal(eventOwnDate[6], '2026-11-20');
});

test('release mode: sessions open on their date, the day changes at midnight, future stays locked', () => {
  const open = (id, today, completed = [], cfg = managed, classId = 1) =>
    canWorkOn({ cfg, classId, land, tile: tileOf(id), completed, dateReleased: isDateReleased(land, sched, id, today) });
  assert.equal(open(1, '2026-11-15'), false);
  assert.equal(open(1, '2026-11-16'), true);
  assert.equal(open(2, '2026-11-16'), false);
  assert.equal(open(2, '2026-11-17'), true);
  assert.equal(open(3, '2026-11-18'), false);
  assert.equal(open(3, '2026-11-19'), true);   // gap filled on Session 4's date
  assert.equal(open(5, '2026-12-31'), false);  // no date anywhere after → waits for the teacher
  assert.equal(open(5, '2026-12-31', [5]), true);   // finished work always stays open
});

test('teacher controls still win: early release, period hold, lock for all periods', () => {
  const dr = id => isDateReleased(land, sched, id, '2026-11-17');
  // Early release of a future session.
  let cfg = applyPlan(managed, planSetAll(4, true, [1, 2, 3, 4], dr(4)));
  assert.equal(releaseFor(cfg, 1, 4, dr(4)).released, true);
  // Hold Period 2 back on a session opened by date.
  cfg = applyPlan(cfg, planTogglePeriod(cfg, 2, 2, dr(2)));
  assert.equal(releaseFor(cfg, 2, 2, dr(2)).released, false);
  assert.equal(releaseFor(cfg, 1, 2, dr(2)).released, true);
  // Lock a date-opened session for all periods → stays locked (stored as false).
  const lockPlan = planSetAll(1, false, [1, 2, 3, 4], dr(1));
  assert.equal(lockPlan['all/1'], false);
  cfg = applyPlan(cfg, lockPlan);
  assert.equal(summarize(cfg, 1, [1, 2, 3, 4], dr(1)).state, 'none');
  // Locking a session whose date hasn't come just clears the release → it opens on its date.
  assert.equal(planSetAll(4, false, [1, 2, 3, 4], dr(4))['all/4'], null);
  // Release next skips sessions already opened by date.
  assert.equal(nextToRelease(managed, land, dr).id, 3);
});

test('release mode off is unchanged (dateOpen rule)', () => {
  assert.equal(canWorkOn({ cfg: null, land, tile: tileOf(3), dateOpen: true }), true);
  assert.equal(canWorkOn({ cfg: null, land, tile: tileOf(4), dateOpen: false }), false);
});

test("Today's Lesson follows the latest arrived date for every period", () => {
  const lands = [land];
  assert.equal(datedTodaysLesson(settings, lands, '2026-11-15'), null);
  assert.equal(datedTodaysLesson(settings, lands, '2026-11-16').tileId, 1);
  assert.equal(datedTodaysLesson(settings, lands, '2026-11-18').tileId, 2);   // stays current until the next date
  const cur = resolveCurrentSessions(settings, lands, [1, 2, 3, 4], '2026-11-17');
  [1, 2, 3, 4].forEach(c => { assert.equal(cur[c].tileId, 2); assert.equal(cur[c].source, 'date'); });
  // Same-day tie → later in path order; loot and bad dates never count.
  const tie = { lessonSchedule: { 2: { 1: { releaseDate: '2026-11-17' }, 2: { releaseDate: '2026-11-17' }, 7: { releaseDate: '2026-11-17' }, 3: { releaseDate: 'bad' } } } };
  assert.equal(datedTodaysLesson(tie, lands, '2026-11-17').tileId, 2);
});

test("a teacher's pick wins until the next dated lesson arrives", () => {
  const lands = [land];
  // Picked Session 3 on Nov 17 (Chicago) — the dated lesson that day is Session 2.
  const s = { ...settings, currentSession: { 1: { landId: 2, tileId: 3, setAt: '2026-11-17T15:00:00Z' } } };
  let cur = resolveCurrentSessions(s, lands, [1, 2], '2026-11-17');
  assert.equal(cur[1].tileId, 3); assert.equal(cur[1].source, 'manual');
  assert.equal(cur[2].tileId, 2); assert.equal(cur[2].source, 'date');   // other periods follow the date
  cur = resolveCurrentSessions(s, lands, [1], '2026-11-18');
  assert.equal(cur[1].tileId, 3);   // no new date yet → still the pick
  cur = resolveCurrentSessions(s, lands, [1], '2026-11-19');
  assert.equal(cur[1].tileId, 4); assert.equal(cur[1].source, 'date');   // Session 4's date takes over
  // No dates at all → manual picks work exactly as before.
  const noDates = { currentSession: { 1: { landId: 2, tileId: 5, setAt: '2026-01-01T15:00:00Z' } } };
  assert.equal(resolveCurrentSessions(noDates, lands, [1, 2], '2026-11-17')[1].tileId, 5);
  assert.equal(resolveCurrentSessions(noDates, lands, [1, 2], '2026-11-17')[2], undefined);
});

test('nothing here writes to settings', () => {
  const before = JSON.stringify(settings);
  resolveCurrentSessions(settings, [land], [1, 2, 3, 4], '2026-11-20');
  effectiveReleaseDates(land, sched);
  assert.equal(JSON.stringify(settings), before);
});
