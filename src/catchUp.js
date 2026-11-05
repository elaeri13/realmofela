// Missed-lesson catch-up (pilot) — pure logic, no Firebase. Unit-tested in tests/catchUp.test.js.
//
// Inside a missed tile: a ~5-minute in-Realm QUICK REVIEW ("See one → Try one"), then the required work.
//   1. Remember      — short explanation of the skill
//   2. See one       — original paragraph, topic + important idea highlighted, modeled gist
//   3. Try one       — second paragraph, three possible gists, explanatory feedback, unlimited retries
//   4. Finish your work — only the required Session tasks still open (the Exit Ticket), then Submit
// The Quick Review replaces the review route, not the assignment. The full Wayground lesson and an
// optional video stay under "Need more help?" and are never required.
// Stored per student at students/{id}/catchUp/{landId}_{tileId}.
//
// Rules:
//  • Opening Pear Deck/Wayground only records "Opened"; the student separately confirms finishing.
//  • Students who started the lesson in class choose "Quick Review" or "Continue my work".
//    Absent students do the Quick Review.
//  • Wrong answers in Try one cost nothing; Quick Review never awards XP, Gold or mastery.
//  • Submitting completes the tile ("Submitted — awaiting review"); teacher Accept confirms completion only.
//  • The catch-up XP/Gold is granted once, on the first submission; resubmitting never pays again.
//  • Quick Review text reaches students only after the teacher approves it in Lesson Schedule.
//  • Records saved by the first version of the pilot (recap/example steps) keep working.

export const CATCHUP_PILOT_TILES = new Set(['2_2']); // Land 2 · Session 2 (expand once the pilot is approved)
export const catchUpKey = (landId, tileId) => `${landId}_${tileId}`;
export const isCatchUpPilot = (landId, tileId) => CATCHUP_PILOT_TILES.has(catchUpKey(landId, tileId));

// Original sample content — DRAFT until the teacher approves it in Lesson Schedule.
export const CATCHUP_DRAFTS = {
  '2_2': {
    skill: 'Write a Gist Statement',
    standard: 'RI.5.2',
    explain:
`A gist is what a text is mostly about, told in one sentence in your own words.
To write one:
1. Find the topic — who or what the text is mostly about.
2. Find the important idea — the most important thing the text says about the topic.
3. Put them together in one sentence. Leave out small details.`,
    seePassage:
`Astronauts on the International Space Station grow lettuce in a small plant box. Colored lights help the plants grow without sunlight, and soft pillows of soil keep the roots from floating away. Scientists study the plants to learn how future crews could grow fresh food on long trips to Mars.`,
    seeTopic: 'grow lettuce',
    seeIdea: 'learn how future crews could grow fresh food on long trips to Mars',
    seeGist: 'Astronauts grow lettuce in space so scientists can learn how crews could grow their own food on trips to Mars.',
    tryPassage:
`Long ago, sailors used the stars to find their way across the ocean at night. They learned the shapes of star groups and where those stars rose and set. By finding the North Star, sailors could tell which way was north. Knowing the stars helped them cross the sea without getting lost.`,
    tryChoices:
`The North Star is in the night sky.
Long ago, sailors used the stars to find their way across the ocean.
Sailors liked looking at the stars at night.`,
    tryCorrect: '2',
    tryFeedback:
`That's a true detail, but it's only one small part. A gist covers what the whole paragraph is mostly about.
Yes! It names the topic (sailors and the stars) and the important idea (the stars helped them find their way).
This sounds close, but the paragraph isn't about liking the stars. What did the stars help sailors do?`,
  },
};
export const QR_FIELDS = ['recapText', 'cuSeePassage', 'cuSeeTopic', 'cuSeeIdea', 'cuSeeGist', 'cuTryPassage', 'cuTryChoices', 'cuTryCorrect', 'cuTryFeedback'];
const lines = t => String(t || '').split('\n').map(l => l.trim()).filter(Boolean);

// Editor view (teacher): saved text, or the sample draft for anything not saved yet.
// Student view uses ONLY saved + approved text: `ready` is false until the teacher approves.
export function catchUpContent(landId, tileId, entry = {}) {
  const d = CATCHUP_DRAFTS[catchUpKey(landId, tileId)] || {};
  const pick = (field, draftKey) => (entry[field] != null && String(entry[field]).trim() !== '') ? String(entry[field]) : (d[draftKey] || '');
  const c = {
    skill: d.skill || '', standard: d.standard || '',
    explain: pick('recapText', 'explain'),
    seePassage: pick('cuSeePassage', 'seePassage'), seeTopic: pick('cuSeeTopic', 'seeTopic'), seeIdea: pick('cuSeeIdea', 'seeIdea'), seeGist: pick('cuSeeGist', 'seeGist'),
    tryPassage: pick('cuTryPassage', 'tryPassage'), tryChoicesText: pick('cuTryChoices', 'tryChoices'),
    tryCorrect: Number(pick('cuTryCorrect', 'tryCorrect')) || 0, tryFeedbackText: pick('cuTryFeedback', 'tryFeedback'),
  };
  c.tryChoices = lines(c.tryChoicesText);
  c.tryFeedback = lines(c.tryFeedbackText);
  c.usesDraft = QR_FIELDS.some(f => entry[f] == null || String(entry[f]).trim() === '');
  c.isFinal = entry.cuQuickReviewStatus === 'final';           // new key: an approval of the old recap/example does not carry over
  c.problems = contentProblems(c);
  c.ready = c.isFinal && !c.usesDraft && c.problems.length === 0;
  return c;
}
export function contentProblems(c) {
  const p = [];
  if (!c.explain.trim()) p.push('Add the explanation.');
  if (!c.seePassage.trim()) p.push('Add the See one paragraph.');
  if (c.seeTopic && !c.seePassage.includes(c.seeTopic)) p.push('The topic words must appear exactly in the See one paragraph.');
  if (c.seeIdea && !c.seePassage.includes(c.seeIdea)) p.push('The important idea must appear exactly in the See one paragraph.');
  if (!c.seeGist.trim()) p.push('Add the modeled gist.');
  if (!c.tryPassage.trim()) p.push('Add the Try one paragraph.');
  if (c.tryChoices.length !== 3) p.push('Write exactly three answer choices, one per line.');
  if (!(c.tryCorrect >= 1 && c.tryCorrect <= c.tryChoices.length)) p.push('Set the correct answer to 1, 2 or 3.');
  if (c.tryFeedback.length !== c.tryChoices.length) p.push('Write one feedback line for each answer choice.');
  return p;
}
// Split a paragraph into plain/highlighted pieces for the topic and important idea (renderer escapes text).
export function highlightParts(passage, topic, idea) {
  const marks = [['topic', topic], ['idea', idea]].filter(([, t]) => t && passage.includes(t))
    .map(([kind, t]) => ({ kind, start: passage.indexOf(t), end: passage.indexOf(t) + t.length }))
    .sort((a, b) => a.start - b.start).filter((m, i, arr) => i === 0 || m.start >= arr[i - 1].end);
  const out = []; let at = 0;
  for (const m of marks) { if (m.start > at) out.push({ text: passage.slice(at, m.start) }); out.push({ text: passage.slice(m.start, m.end), kind: m.kind }); at = m.end; }
  if (at < passage.length) out.push({ text: passage.slice(at) });
  return out;
}

// ── View model ──────────────────────────────────────────────────────────────
// legacy = the tile's existing taskProgress from the lesson day.
// mustDo = number of required workbook items on the tile (0 for Session 2).
export function catchUpView(rec, legacy = {}, { contentReady = true, mustDo = 0 } = {}) {
  const r = rec || {};
  const legacyRL = !!(legacy.wayground || [])[0];
  const legacyET = !!(legacy.exitTicketOpened || [])[0];
  const legacyMust = legacy.mustDo || [];
  const startedInClass = (legacyRL && !r.rlOpenedAt) || (legacyET && !r.etOpenedAt) || !!r.startedInClass;
  // Earlier pilot version: recap + example (reviewed or skipped) counts as a finished review.
  const oldReviewDone = (!!r.recapAt || !!r.recapSkippedAt) && (!!r.exampleAt || !!r.exampleSkippedAt);
  const review = {
    available: contentReady,
    remember: !!r.rememberAt, see: !!r.seeAt, tryCorrect: !!r.tryCorrectAt,
    attempts: r.tryAttempts || 0, lastChoice: r.tryLastChoice || 0,
    done: !!r.tryCorrectAt || oldReviewDone,
  };
  const route = r.route || (review.done ? 'review' : null);
  const needsChoice = contentReady && startedInClass && !route;
  const reviewSettled = !contentReady || review.done || route === 'continue';
  const et = { opened: !!r.etOpenedAt || legacyET, openedInClass: legacyET && !r.etOpenedAt, confirmed: !!r.etConfirmedAt };
  const must = Array.from({ length: mustDo }, (_, i) => ({ done: !!(r.mustDone || {})[i] || !!legacyMust[i] }));
  const workDone = et.confirmed && must.every(m => m.done);
  const status = r.status || (hasAnyProgress(r) ? 'in_progress' : 'not_started');
  const locked = status === 'submitted' || status === 'accepted';
  const canSubmit = !locked && status !== 'returned' && reviewSettled && workDone;
  const canResubmit = status === 'returned' && !!r.correctionConfirmedAt;
  let step;
  if (locked || status === 'returned') step = 'status';
  else if (needsChoice) step = 'choose';
  else if (!reviewSettled && !review.remember) step = 'remember';
  else if (!reviewSettled && !review.see) step = 'see';
  else if (!reviewSettled) step = 'try';
  else step = workDone ? 'submit' : 'work';
  return { status, label: statusLabel(status), step, route, needsChoice, review, reviewSettled, et, must, workDone,
           canSubmit, canResubmit, startedInClass, locked, contentReady,
           returnNote: r.returnNote || '', submitCount: r.submitCount || 0, correctionConfirmed: !!r.correctionConfirmedAt,
           resumed: hasAnyProgress(r) && !locked && status !== 'returned' };
}
function hasAnyProgress(r) {
  return !!(r.rememberAt || r.seeAt || r.tryAttempts || r.route || r.etOpenedAt || r.etConfirmedAt || (r.mustDone && Object.keys(r.mustDone).length)
    || r.recapAt || r.exampleAt || r.recapSkippedAt || r.exampleSkippedAt || r.rlOpenedAt || r.rlConfirmedAt);
}
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
// applyCatchUp(rec, action, opts) → { ok, rec, effects, reason, feedback? }
// effects.completeTile / grantReward / acceptedReview — see main.js runCatchUpAction.
const STUDENT_ACTIONS = new Set(['chooseReview', 'chooseContinue', 'remember', 'see', 'try', 'openRL', 'openVideo', 'openET', 'confirmET', 'confirmMust', 'submit', 'confirmCorrection', 'resubmit']);
export function applyCatchUp(rec, action, { now = new Date().toISOString(), note = '', legacy = {}, by = 'student', contentReady = true, mustDo = 0, choice = 0, correct = 0, index = -1 } = {}) {
  const r = JSON.parse(JSON.stringify(rec || {}));
  const v = catchUpView(r, legacy, { contentReady, mustDo });
  const fail = reason => ({ ok: false, rec: rec || {}, effects: {}, reason });
  const effects = {}; let feedback = null;
  const openOnly = ['openRL', 'openVideo', 'openET'];
  if (STUDENT_ACTIONS.has(action) && v.locked && !openOnly.includes(action)) return fail('locked');
  if (!r.startedAt && STUDENT_ACTIONS.has(action)) { r.startedAt = now; if (v.startedInClass) r.startedInClass = true; }
  const reviewing = () => { if (!contentReady) return 'no-content'; if (v.reviewSettled && v.route === 'continue') return null; return null; };
  switch (action) {
    case 'chooseReview': if (!contentReady) return fail('no-content'); r.route = 'review'; r.routeAt = now; break;
    case 'chooseContinue': if (!v.startedInClass) return fail('choice-not-offered'); r.route = 'continue'; r.routeAt = now; break;
    case 'remember': if (reviewing()) return fail('no-content'); r.rememberAt = r.rememberAt || now; if (!r.route) r.route = 'review'; break;
    case 'see': if (reviewing()) return fail('no-content'); if (!r.rememberAt) return fail('remember-first'); r.seeAt = r.seeAt || now; break;
    case 'try': {
      if (reviewing()) return fail('no-content');
      if (!r.seeAt) return fail('see-first');
      if (!(choice >= 1)) return fail('pick-an-answer');
      r.tryAttempts = (r.tryAttempts || 0) + 1; r.tryLastChoice = choice;          // retries are free: no HP, XP or Gold change
      const right = choice === correct;
      if (right && !r.tryCorrectAt) { r.tryCorrectAt = now; r.tryCorrectOnAttempt = r.tryAttempts; }
      feedback = { correct: right, choice };
      break;
    }
    case 'openRL': r.rlOpenedAt = r.rlOpenedAt || now; break;                       // "Need more help?" — never required
    case 'openVideo': r.videoOpenedAt = r.videoOpenedAt || now; break;
    case 'openET': if (!v.reviewSettled) return fail('review-first'); r.etOpenedAt = r.etOpenedAt || now; break;
    case 'confirmET': if (!v.reviewSettled) return fail('review-first'); if (!v.et.opened) return fail('open-first'); r.etConfirmedAt = r.etConfirmedAt || now; break;
    case 'confirmMust': if (!v.reviewSettled) return fail('review-first'); if (!(index >= 0 && index < mustDo)) return fail('bad-item'); r.mustDone = Object.assign({}, r.mustDone || {}, { [index]: now }); break;
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
      effects.grantReward = !r.rewardGrantedAt;
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
  return { ok: true, rec: r, effects, feedback };
}
// What the teacher review list says about how the student caught up.
export function reviewSummary(rec) {
  const r = rec || {};
  if (r.route === 'continue') return 'chose Continue my work';
  if (r.tryCorrectAt) return `Quick Review — correct on try ${r.tryCorrectOnAttempt || r.tryAttempts || 1}`;
  if (r.recapSkippedAt || r.exampleSkippedAt) return 'skipped the review';
  return '';
}
