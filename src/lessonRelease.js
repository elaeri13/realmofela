/* ─── LESSON RELEASE (teacher-controlled unlocking) ───
   Pure helpers, no Firebase or DOM access — unit-tested in tests/lessonRelease.test.js.

   Stored at settings/lessonRelease/{landId}:
     { enabled: true,                              // off (missing) = the old rule: release dates only
       all:     { [tileId]: true },                // released for every period
       classes: { [classId]: { [tileId]: true | false } } }   // one period differs from "all"
   A period entry wins over "all": true = released early for that period, false = held back.

   Rules
   - Release mode is per Land and OFF until the teacher turns it on, so nothing changes for students
     until then. When on, a session opens only after the teacher releases it (release dates no longer
     open it on their own; they still mark the day for attendance/missed-lesson notes).
   - A session the student already completed is never locked (finished work is never lost).
   - Only real class sessions are managed (the Today's Lesson session types plus writing events);
     boss/dungeon tiles keep their own teacher unlock, branch/loot tiles follow their parent.
   - Nothing here is tied to Today's Lesson: choosing today's lesson never locks or unlocks. */

import { SESSION_TILE_TYPES } from './currentSession.js';

export const RELEASE_TILE_TYPES = [...SESSION_TILE_TYPES, 'event'];
export const CLASS_IDS = [1, 2, 3, 4];

export function isReleaseTile(land, tile) {
  if (!land || !tile) return false;
  if (!RELEASE_TILE_TYPES.includes(tile.type)) return false;
  if (tile.pathType === 'loot' || tile.parentTileId) return false;
  return (land.pathOrder || []).includes(tile.id);
}
// The managed sessions of a Land, in path order.
export function releaseTiles(land) {
  return ((land && land.pathOrder) || []).map(id => (land.tiles || []).find(t => t.id === id)).filter(t => isReleaseTile(land, t));
}

export const releaseConfig = (settings, landId) => (((settings || {}).lessonRelease || {})[String(landId)]) || null;
export const isManaged = cfg => !!(cfg && cfg.enabled);

// Is this session released for this period?  → { released, source: 'off' | 'class' | 'all' | 'none' }
export function releaseFor(cfg, classId, tileId) {
  if (!isManaged(cfg)) return { released: true, source: 'off' };
  const o = (((cfg.classes || {})[String(classId)]) || {})[String(tileId)];
  if (o === true || o === false) return { released: o, source: 'class' };
  const all = !!((cfg.all || {})[String(tileId)]);
  return { released: all, source: all ? 'all' : 'none' };
}

// Can this student work on (start, check off, submit, earn rewards for) this tile right now?
// dateOpen = the old release-date rule for this tile (used when release mode is off).
export function canWorkOn({ cfg, classId, land, tile, completed = [], dateOpen = true }) {
  if (!tile) return false;
  if ((completed || []).includes(tile.id)) return true;              // finished work stays reachable
  if (isManaged(cfg) && isReleaseTile(land, tile)) return releaseFor(cfg, classId, tile.id).released;
  return !!dateOpen;
}

// ── Teacher actions → multi-path update relative to settings/lessonRelease/{landId} ──
// Only the listed children are written, so other settings are never overwritten.

// Turn release mode on. Sessions whose release date has already passed are released for all periods,
// so nothing students can open today closes when the mode is switched on.
export function planEnable(land, isDatePassed, getDate = null) {
  const w = { enabled: true };
  releaseTiles(land).forEach(t => {
    if (getDate && !getDate(t.id)) return;            // no release date → stays locked, explicitly
    if (isDatePassed(t.id)) w[`all/${t.id}`] = true;
  });
  return w;
}
export const planDisable = () => ({ enabled: null });   // keeps the release list for next time

// What turning release mode on would do, for the teacher's confirmation screen. Every managed
// session lands in exactly one list. Sessions with NO release date are listed separately and stay
// locked (they never open by accident). getDate(tileId) → 'YYYY-MM-DD' | '' ; isDatePassed(tileId) → bool.
// prev = a release list kept from an earlier time the mode was on: those sessions open again
// (marked kept), and per-period settings are counted so the teacher sees them too.
export function previewEnable(land, isDatePassed, getDate, prev = null) {
  const out = { open: [], lockedFuture: [], lockedNoDate: [], keptPeriodSettings: 0 };
  const prevAll = (prev && prev.all) || {};
  Object.values((prev && prev.classes) || {}).forEach(c => { out.keptPeriodSettings += Object.keys(c || {}).length; });
  releaseTiles(land).forEach(t => {
    const date = getDate(t.id) || '';
    if (prevAll[String(t.id)]) out.open.push({ tile: t, date, kept: true });
    else if (!date) out.lockedNoDate.push({ tile: t, date: '' });
    else if (isDatePassed(t.id)) out.open.push({ tile: t, date });
    else out.lockedFuture.push({ tile: t, date });
  });
  return out;
}

// Release (or undo) one session for ALL periods in one action. Clears that session's period overrides
// so every period ends up the same.
export function planSetAll(tileId, released, classIds = CLASS_IDS) {
  const w = { [`all/${tileId}`]: released ? true : null };
  classIds.forEach(c => { w[`classes/${c}/${tileId}`] = null; });
  return w;
}

// Flip one period. If the result matches the all-periods setting, the override is removed.
export function planTogglePeriod(cfg, classId, tileId) {
  const now = releaseFor(cfg, classId, tileId).released;
  const allState = !!(((cfg || {}).all || {})[String(tileId)]);
  const next = !now;
  return { [`classes/${classId}/${tileId}`]: next === allState ? null : next };
}

// First session (path order) not yet released for all periods — for "Release next session".
// Period holds on earlier sessions are left alone (releasing next never undoes a hold).
export function nextToRelease(cfg, land) {
  return releaseTiles(land).find(t => !(((cfg || {}).all || {})[String(t.id)])) || null;
}

// Apply a plan to a local copy (what the database will hold after the update).
export function applyPlan(cfg, plan) {
  const out = JSON.parse(JSON.stringify(cfg || {}));
  Object.entries(plan).forEach(([path, val]) => {
    const ks = path.split('/'); let o = out;
    ks.slice(0, -1).forEach(k => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
    if (val === null || val === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = val;
  });
  return out;
}

// Teacher summary for one session: 'all' | 'none' | 'some', plus which periods are open.
export function summarize(cfg, tileId, classIds = CLASS_IDS) {
  const open = classIds.filter(c => releaseFor(cfg, c, tileId).released);
  return { state: open.length === classIds.length ? 'all' : open.length ? 'some' : 'none', open };
}
