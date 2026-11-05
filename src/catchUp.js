// Missed-lesson catch-up (pilot) — pure logic, no Firebase. Unit-tested in tests/catchUp.test.js.
//
// Flow inside a missed tile:  Recap → Example → Your Work → Submit
// Stored per student at students/{id}/catchUp/{landId}_{tileId}.
//
// Honesty rules:
//  • Opening Wayground / Pear Deck only records "Opened". The student separately confirms they finished.
//    The Realm never claims it checked work done on another site.
//  • Submitting completes the tile (so the student can keep moving) but is labelled
//    "Submitted — awaiting review", never mastery. Teacher Accept confirms COMPLETION only.
//  • Starting the lesson in class is not proof of learning: those students still see the recap and
//    example and choose "Review" or "Skip" for each (absent students always review them).
//  • Recap/example text reaches students only after the teacher approves it. Unapproved drafts are
//    never shown to students.
//  • The catch-up XP/Gold is granted once, on the first submission. Send-back + resubmit never grants again.

export const CATCHUP_PILOT_TILES = new Set(['2_2']); // Land 2 · Session 2 (expand once the pilot is approved)
export const catchUpKey = (landId, tileId) => `${landId}_${tileId}`;
export const isCatchUpPilot = (landId, tileId) => CATCHUP_PILOT_TILES.has(catchUpKey(landId, tileId));

// Original sample content — DRAFT until the teacher approves it in Lesson Schedule.
export const CATCHUP_DRAFTS = {
  '2_2': {
    skill: 'Write a Gist Statement',
    standard: 'RI.5.2',
    recap:
`A gist statement tells what a text is mostly about in one short sentence — like a movie trailer for the whole text.
To find the gist, ask two questions:
1. Who or what is this text mostly about?
2. What is the most important thing it tells us about them?
Put the answers together in your own words. Leave out small details, numbers, and examples.`,
    examplePassage:
`Rovers on Practice Ground
Before a rover ever travels to the Moon or Mars, engineers test it on Earth. They drive it across rocky deserts, steep sand dunes, and icy fields that look a lot like other worlds. When a wheel gets stuck or a camera fogs up, the team fixes the problem and tries again. Some tests last for weeks. By the time the rover launches, it has already practiced on ground that feels almost like its new home.`,
    exampleSteps:
`Who or what is it mostly about? | Rovers, and the engineers who test them before space missions.
What is the most important thing it tells us? | Engineers test rovers in places on Earth that are like the Moon or Mars, so problems get fixed before launch.
Gist statement — one sentence, in my own words | Engineers test rovers in Moon-like and Mars-like places on Earth so problems are fixed before the rover goes to space.
Why leave out "icy fields" and "some tests last for weeks"? | Those are small details. A gist keeps only the big idea.`,
  },
};

// Content shown to students: the teacher's saved text wins; otherwise the draft.
export function catchUpContent(landId, tileId, scheduleEntry = {}) {
  const d = CATCHUP_DRAFTS[catchUpKey(landId, tileId)] || {};
  const recap = scheduleEntry.recapText || d.recap || '';
  const examplePassage = scheduleEntry.cuExamplePassage || d.examplePassage || '';
  const stepsText = scheduleEntry.cuExampleSteps || d.exampleSteps || '';
  return {
    skill: d.skill || '', standard: d.standard || '',
    recap, examplePassage, stepsText,
    exampleSteps: parseExampleSteps(stepsText),
    isFinal: scheduleEntry.cuContentStatus === 'final',
    usesDraft: !scheduleEntry.recapText || !scheduleEntry.cuExamplePassage || !scheduleEntry.cuExampleSteps,
    // Students see recap/example ONLY when approved and complete. Drafts never reach students.
    ready: scheduleEntry.cuContentStatus === 'final' && !!recap.trim() && !!examplePassage.trim() && parseExampleSteps(stepsText).length > 0,
  };
}
// One step per line: "Question | Answer". A line without "|" is shown as a plain step.
export function parseExampleSteps(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const i = l.indexOf('|');
    return i < 0 ? { label: l, text: '' } : { label: l.slice(0, i).trim(), text: l.slice(i + 1).trim() };
  });
}

// ── View model ──────────────────────────────────────────────────────────────
// legacy = the tile's existing taskProgress (from the original lesson day), so work already opened
// in class shows as "Opened (in class)". contentReady = teacher-approved recap/example exist.
export function catchUpView(rec, legacy = {}, { contentReady = true } = {}) {
  const r = rec || {};
  const legacyRL = !!(legacy.wayground || [])[0];
  const legacyET = !!(legacy.exitTicketOpened || [])[0];
  // "Started in class" = opened on the lesson day, i.e. before (without) any catch-up opening.
  const startedInClass = (legacyRL && !r.rlOpenedAt) || (legacyET && !r.etOpenedAt) || !!r.startedInClass;
  const rl = { opened: !!r.rlOpenedAt || legacyRL, openedInClass: legacyRL && !r.rlOpenedAt, confirmed: !!r.rlConfirmedAt };
  const et = { opened: !!r.etOpenedAt || legacyET, openedInClass: legacyET && !r.etOpenedAt, confirmed: !!r.etConfirmedAt, unlocked: !!r.rlConfirmedAt };
  // Each learning step is: done (reviewed), skipped (student chose to skip — only offered to students
  // who started in class), or unavailable (no approved content yet). It stays open to review either way.
  const learn = (at, skippedAt) => ({ done: !!at, skipped: !at && !!skippedAt, unavailable: !contentReady, canSkip: startedInClass && !at,
                                      settled: !!at || !!skippedAt || !contentReady });
  const recap = learn(r.recapAt, r.recapSkippedAt);
  const example = learn(r.exampleAt, r.exampleSkippedAt);
  const status = r.status || (hasAnyProgress(r) ? 'in_progress' : 'not_started');
  const locked = status === 'submitted' || status === 'accepted';
  const learnReady = recap.settled && example.settled;
  const canSubmit = !locked && status !== 'returned' && rl.confirmed && et.confirmed;
  const canResubmit = status === 'returned' && !!r.correctionConfirmedAt;
  let step;
  if (locked || status === 'returned') step = 'status';
  else if (!recap.settled) step = 'recap';
  else if (!example.settled) step = 'example';
  else if (!(rl.confirmed && et.confirmed)) step = 'work';
  else step = 'submit';
  return { status, label: statusLabel(status), step, recap, example, rl, et, learnReady, canSubmit, canResubmit,
           startedInClass, locked, returnNote: r.returnNote || '', submitCount: r.submitCount || 0,
           correctionConfirmed: !!r.correctionConfirmedAt, resumed: hasAnyProgress(r) && !locked && status !== 'returned' };
}
function hasAnyProgress(r) { return !!(r.recapAt || r.exampleAt || r.recapSkippedAt || r.exampleSkippedAt || r.rlOpenedAt || r.rlConfirmedAt || r.etOpenedAt || r.etConfirmedAt); }
export function statusLabel(status) {
  return {
    not_started: 'Not started',
    in_progress: 'In progress',
    submitted: 'Submitted — awaiting review',
    returned: 'Sent back — correction needed',
    accepted: 'Completion confirmed by your teacher',
  }[status] || 'Not started';
}

// ── Actions ─────────────────────────────────────────────────────────────────
// apply(rec, action, {now, note, legacy}) → { ok, rec, effects, reason }
// effects.completeTile   — mark the tile complete (first submission only)
// effects.grantReward    — give the catch-up XP/Gold (only if never granted before)
// effects.acceptedReview — teacher accepted: apply any boss progress that waited for review
const STUDENT_ACTIONS = new Set(['recap', 'example', 'skipRecap', 'skipExample', 'openRL', 'confirmRL', 'openET', 'confirmET', 'submit', 'confirmCorrection', 'resubmit']);
export function applyCatchUp(rec, action, { now = new Date().toISOString(), note = '', legacy = {}, by = 'student', contentReady = true } = {}) {
  const r = JSON.parse(JSON.stringify(rec || {}));
  const v = catchUpView(r, legacy, { contentReady });
  const fail = reason => ({ ok: false, rec: rec || {}, effects: {}, reason });
  const effects = {};
  if (STUDENT_ACTIONS.has(action) && v.locked && !['openRL', 'openET'].includes(action)) return fail('locked');
  if (!r.startedAt && STUDENT_ACTIONS.has(action)) { r.startedAt = now; if (v.startedInClass) r.startedInClass = true; }
  switch (action) {
    case 'recap': if (!contentReady) return fail('no-content'); if (!r.recapAt) r.recapAt = now; break;
    case 'example': if (!contentReady) return fail('no-content'); if (!r.exampleAt) r.exampleAt = now; break;
    case 'skipRecap': if (!v.recap.canSkip) return fail('skip-not-offered'); r.recapSkippedAt = r.recapSkippedAt || now; break;
    case 'skipExample': if (!v.example.canSkip) return fail('skip-not-offered'); r.exampleSkippedAt = r.exampleSkippedAt || now; break;
    case 'openRL': r.rlOpenedAt = r.rlOpenedAt || now; break;
    case 'confirmRL': if (!v.learnReady) return fail('learn-first'); if (!v.rl.opened) return fail('open-first'); r.rlConfirmedAt = r.rlConfirmedAt || now; break;
    case 'openET': if (!v.et.unlocked) return fail('finish-read-first'); r.etOpenedAt = r.etOpenedAt || now; break;
    case 'confirmET': if (!v.et.opened || !v.et.unlocked) return fail('open-first'); r.etConfirmedAt = r.etConfirmedAt || now; break;
    case 'submit':
      if (!v.canSubmit) return fail(v.status === 'returned' ? 'use-resubmit' : 'not-ready');
      r.status = 'submitted'; r.submittedAt = now; r.submitCount = (r.submitCount || 0) + 1;
      effects.completeTile = r.submitCount === 1;
      effects.grantReward = !r.rewardGrantedAt;
      break;
    case 'confirmCorrection': if (v.status !== 'returned') return fail('not-returned'); r.correctionConfirmedAt = now; break;
    case 'resubmit':
      if (!v.canResubmit) return fail(v.status === 'returned' ? 'confirm-correction-first' : 'not-returned');
      r.status = 'submitted'; r.submittedAt = now; r.submitCount = (r.submitCount || 0) + 1;
      effects.grantReward = !r.rewardGrantedAt; // false whenever the first submission already paid out
      break;
    case 'accept':
      if (by !== 'teacher') return fail('teacher-only');
      if (v.status !== 'submitted') return fail('not-submitted');
      r.status = 'accepted'; r.acceptedAt = now; r.returnNote = null;
      effects.acceptedReview = true;
      break;
    case 'sendBack':
      if (by !== 'teacher') return fail('teacher-only');
      if (v.status !== 'submitted') return fail('not-submitted');
      if (!String(note).trim()) return fail('note-required');
      r.status = 'returned'; r.returnedAt = now; r.returnNote = String(note).trim().slice(0, 500); r.correctionConfirmedAt = null;
      break;
    default: return fail('unknown-action');
  }
  r.updatedAt = now;
  if (['submit', 'resubmit', 'accept', 'sendBack', 'confirmCorrection'].includes(action)) {
    r.history = [...(Array.isArray(r.history) ? r.history : []), action === 'sendBack' ? { at: now, event: action, note: r.returnNote } : { at: now, event: action }].slice(-20);
  }
  return { ok: true, rec: r, effects };
}
