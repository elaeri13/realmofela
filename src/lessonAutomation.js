/* ─── LESSON DATES: automatic release + Today's Lesson ───
   Pure helpers, no Firebase or DOM access — unit-tested in tests/lessonAutomation.test.js.
   Everything is worked out when a page reads it, so no teacher browser or daily database job is needed.

   Rules (always on; there is no separate switch)
   - The school day is the date in America/Chicago (it changes at Chicago midnight).
   - Release mode ON for a Land: a session opens for all periods on its Release Date. The teacher can
     still release early, hold one period back, or lock it for all periods (see lessonRelease.js).
   - A session with no date:
       · a writing event opens with the session before it;
       · any other session opens when the next dated session after it opens (so a missing date never
         freezes the map). If nothing after it is dated, it waits for the teacher.
   - Release mode OFF: unchanged — dated sessions open on their date, undated ones are open.
   - Today's Lesson: the latest dated session whose date has arrived, for every period, unless the
     teacher picked a lesson on or after that date (the most recent decision wins). */

import { releaseTiles } from './lessonRelease.js';
import { isSessionTile } from './currentSession.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = d => (typeof d === 'string' && DATE_RE.test(d)) ? d : '';

let _fmt = null;   // built once: Intl formatters are slow to create and this runs on every render
export function schoolDate(now = new Date()) {
  if (!_fmt) _fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });
  return _fmt.format(now);
}

// 'YYYY-MM-DD' → a local Date at midnight (new Date('YYYY-MM-DD') is UTC and shows a day early here).
export function localDateFromYmd(ymd) {
  if (!validDate(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// { [tileId]: 'YYYY-MM-DD' } for every managed session of the Land that has a date of its own or
// borrows one under the rules above. Sessions with no usable date are left out.
export function effectiveReleaseDates(land, landSchedule) {
  const tiles = releaseTiles(land);
  const own = tiles.map(t => validDate(((landSchedule || {})[String(t.id)] || {}).releaseDate));
  const eff = own.slice();
  // Undated sessions (not events) borrow the next date after them.
  let next = '';
  for (let i = tiles.length - 1; i >= 0; i--) {
    if (own[i]) { next = own[i]; continue; }
    if (tiles[i].type !== 'event') eff[i] = next;
  }
  // Undated events borrow the date of the session before them.
  for (let i = 0; i < tiles.length; i++) {
    if (!own[i] && tiles[i].type === 'event') eff[i] = i > 0 ? eff[i - 1] : '';
  }
  const out = {};
  tiles.forEach((t, i) => { if (eff[i]) out[String(t.id)] = eff[i]; });
  return out;
}

// Has this session's (own or borrowed) date arrived?
export function isDateReleased(land, landSchedule, tileId, today = schoolDate()) {
  const d = effectiveReleaseDates(land, landSchedule)[String(tileId)];
  return !!d && d <= today;
}

// The dated lesson for today: the latest Release Date that has arrived, across all Lands.
// Ties go to the later session in path order (then the later Land). → { landId, tileId, date } | null
export function datedTodaysLesson(settings, lands, today = schoolDate()) {
  let latest = null;
  for (const land of lands || []) {
    if (!land || !land.id) continue;
    for (const tileId of land.pathOrder || []) {
      const tile = (land.tiles || []).find(t => t.id === tileId);
      if (!isSessionTile(land, tile)) continue;
      const date = validDate(((((settings || {}).lessonSchedule || {})[String(land.id)] || {})[String(tileId)] || {}).releaseDate);
      if (!date || date > today) continue;
      if (!latest || date >= latest.date) latest = { landId: land.id, tileId, date };
    }
  }
  return latest;
}

// Today's Lesson for every period: { [classId]: { landId, tileId, source: 'manual' | 'date', date?, setAt? } }.
// The teacher's pick (settings/currentSession) wins when it was made on or after the dated lesson's date.
export function resolveCurrentSessions(settings, lands, classIds, today = schoolDate()) {
  const auto = datedTodaysLesson(settings, lands, today);
  const manualAll = (settings || {}).currentSession || {};
  const out = {};
  (classIds || []).forEach(c => {
    const m = manualAll[String(c)];
    const manual = m && m.landId != null && m.tileId != null ? m : null;
    let manualDay = '';
    if (manual && manual.setAt) { const t = new Date(manual.setAt); if (!isNaN(t)) manualDay = schoolDate(t); }
    if (manual && (!auto || manualDay >= auto.date)) out[String(c)] = { ...manual, source: 'manual' };
    else if (auto) out[String(c)] = { landId: auto.landId, tileId: auto.tileId, date: auto.date, source: 'date' };
  });
  return out;
}
