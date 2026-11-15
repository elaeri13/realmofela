import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schoolDate, scheduledReleaseConfig, scheduledCurrentSessions } from '../src/lessonAutomation.js';
import { canWorkOn } from '../src/lessonRelease.js';
const land = { id: 2, pathOrder: [1,2,3,4], tiles: [1,2,3,4].map(id => ({ id, type: 'lesson' })) };
const settings = { lessonSchedule: { 2: { 1: { releaseDate: '2026-11-14' }, 2: { releaseDate: '2026-11-15' }, 3: { releaseDate: '2026-11-16' } } } };
test('school date changes at Chicago midnight including daylight saving time', () => {
  assert.equal(schoolDate(new Date('2026-11-15T05:59:59Z')), '2026-11-14');
  assert.equal(schoolDate(new Date('2026-11-15T06:00:00Z')), '2026-11-15');
  assert.equal(schoolDate(new Date('2026-07-15T05:00:00Z')), '2026-07-15');
});
test('current lesson advances by date for all periods, stays current on off days, and has no future fallback', () => {
  const current = date => scheduledCurrentSessions(settings, [land], [1,2,3,4], date);
  assert.deepEqual(current('2026-11-13'), {});
  assert.equal(current('2026-11-15')[1].tileId, 2);
  assert.equal(current('2026-11-16')[4].tileId, 3);
  assert.equal(current('2026-11-20')[2].tileId, 3);
  assert.deepEqual(current('2026-11-15')[1], current('2026-11-15')[4]);
});
test('future and undated lessons stay locked; past work remains open without changing stored settings', () => {
  const original = JSON.stringify(settings);
  const cfg = scheduledReleaseConfig(settings, 2, '2026-11-15');
  const open = (id, completed=[]) => canWorkOn({ cfg, land, classId:1, tile:land.tiles[id-1], completed });
  assert.equal(open(1), true);
  assert.equal(open(2), true);
  assert.equal(open(3), false);
  assert.equal(open(4), false);
  assert.equal(open(3,[3]), true);
  assert.equal(JSON.stringify(settings), original);
});
test('manual releases and period holds survive automatic scheduling', () => {
  const cfg = scheduledReleaseConfig({ ...settings, lessonRelease:{2:{enabled:true,all:{3:true},classes:{2:{2:false}}}} }, 2, '2026-11-15');
  assert.equal(canWorkOn({cfg,land,classId:2,tile:land.tiles[1]}), false);
  assert.equal(canWorkOn({cfg,land,classId:1,tile:land.tiles[2]}), true);
});
test('same-day ties follow path order; loot and invalid dates never become current', () => {
  const s = { lessonSchedule:{2:{1:{releaseDate:'2026-11-15'},2:{releaseDate:'2026-11-15'},3:{releaseDate:'bad'},4:{releaseDate:'2026-11-15'}}} };
  const l = {...land,tiles:land.tiles.map(t=>t.id===4?{...t,parentTileId:2}:t)};
  assert.equal(scheduledCurrentSessions(s,[l],[1],'2026-11-15')[1].tileId,2);
});
