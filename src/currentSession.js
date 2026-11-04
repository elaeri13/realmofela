/* ─── TODAY'S LESSON (teacher-designated current session per class) ───
   Pure helpers, no Firebase or DOM access, so they can be unit-tested with
   `npm test`. The setting lives at settings/currentSession/{classId} as
   { landId, tileId } and is written only from the teacher dashboard.

   A "class" is the student's cohort: the hundreds digit of the student
   number (101-130 → class 1). A student only ever reads their own class's
   entry, so one class's setting can never send a student elsewhere. */

// Tile types that are real class sessions (have a lesson page and live on the main path).
export const SESSION_TILE_TYPES = ['lesson', 'forge', 'studyHall', 'camp'];

export function classIdForStudent(studentId) {
  const n = Number(studentId);
  if (!Number.isInteger(n) || n < 100) return null;
  return Math.floor(n / 100);
}

// Is this tile a selectable "today's lesson" session within its land?
export function isSessionTile(land, tile) {
  if (!land || !tile) return false;
  if (!SESSION_TILE_TYPES.includes(tile.type)) return false;
  if (tile.pathType === 'loot' || tile.parentTileId) return false;
  return (land.pathOrder || []).includes(tile.id);
}

// All sessions a teacher may choose, in path order, for the given lands.
export function listSessionOptions(lands) {
  const out = [];
  (lands || []).forEach(land => {
    if (!land || !land.id) return; // skip the Starting Grounds (id 0)
    (land.pathOrder || []).forEach(tid => {
      const tile = (land.tiles || []).find(t => t.id === tid);
      if (isSessionTile(land, tile)) out.push({ land, tile, value: `${land.id}:${tile.id}` });
    });
  });
  return out;
}

// Student-facing name, matching the map labels ("Session 3", "Study Hall", "Camp Day").
export function sessionLabel(tile) {
  if (!tile) return '';
  const name = String(tile.name || '');
  const m = /^S(\d+)$/.exec(name);
  const base = tile.type === 'camp' && m ? 'Camp Day'
    : /^S\d+b$/i.test(name) ? 'Study Hall'
    : m ? `Session ${m[1]}`
    : name;
  const title = tile.sessionTitle || (tile.type === 'forge' ? "Writer's Craft" : '');
  return title ? `${base} · ${title}` : base;
}

/* Resolve the class's current session for one student.
   Returns { status, land?, tile?, relation? } where status is:
     'unset'      – teacher has not chosen a session for this class
     'invalid'    – the saved session no longer exists / is not a session
     'other_land' – the session is in a different Land than the student is in
     'ok'         – usable; relation says where it sits for this student:
                    'here'   student's marker is on it
                    'done'   student already completed it
                    'ahead'  it is further along the path than the student
                    'behind' student's marker is past it but it is not completed */
export function resolveTodaysLesson({ studentId, settingsCurrentSession, lands, pos }) {
  const classId = classIdForStudent(studentId);
  if (classId === null) return { status: 'unset' };
  const entry = (settingsCurrentSession || {})[String(classId)];
  if (!entry || entry.landId == null || entry.tileId == null) return { status: 'unset' };
  const land = (lands || []).find(l => l && l.id === Number(entry.landId));
  const tile = land && (land.tiles || []).find(t => t.id === Number(entry.tileId));
  if (!land || !tile || !isSessionTile(land, tile)) return { status: 'invalid' };
  if (!pos || pos.land !== land.id) return { status: 'other_land', land, tile };
  const completed = (pos.completed || []).map(Number);
  if (completed.includes(tile.id)) return { status: 'ok', land, tile, relation: 'done' };
  if (pos.tile === tile.id) return { status: 'ok', land, tile, relation: 'here' };
  const order = land.pathOrder || [];
  const relation = order.indexOf(tile.id) > order.indexOf(pos.tile) ? 'ahead' : 'behind';
  return { status: 'ok', land, tile, relation };
}

/* When today's session is ahead of the student's marker, list the tiles the
   student would skip by moving their marker to it (marker tile included,
   target excluded), and whether that move is safe. It is safe only if every
   skipped, unfinished tile would remain reachable through the existing
   catch-up system (its release date has passed) and none of them is a gate
   boss or final boss. Nothing here writes; the caller decides. */
export function planMoveToToday({ land, pos, targetTileId, isReleasedPast, isGateTile }) {
  const order = land.pathOrder || [];
  const from = order.indexOf(pos.tile);
  const to = order.indexOf(targetTileId);
  if (from < 0 || to < 0 || to <= from) return { safe: false, skipped: [], reason: 'not_ahead' };
  const completed = (pos.completed || []).map(Number);
  const skipped = order.slice(from, to).filter(tid => !completed.includes(tid));
  for (const tid of skipped) {
    const tile = (land.tiles || []).find(t => t.id === tid);
    if (!tile) continue;
    if (tile.type === 'dungeon' || tile.type === 'event' || isGateTile(tid)) {
      return { safe: false, skipped, reason: 'gate', blockingTileId: tid };
    }
    if (!isReleasedPast(tid)) return { safe: false, skipped, reason: 'unreleased', blockingTileId: tid };
  }
  return { safe: true, skipped };
}

// "Return to today's lesson" only when stored progress shows real activity on it.
export function hasStartedSession({ completed, taskProgress, tileId }) {
  if ((completed || []).map(Number).includes(Number(tileId))) return true;
  const tp = (taskProgress || {})[String(tileId)];
  if (!tp || typeof tp !== 'object') return false;
  return Object.values(tp).some(v => Array.isArray(v) ? v.some(Boolean) : v === true);
}
