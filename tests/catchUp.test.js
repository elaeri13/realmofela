import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCatchUp, catchUpView, catchUpContent, isCatchUpPilot, statusLabel, highlightParts, reviewSummary, QR_FIELDS, CATCHUP_DRAFTS } from '../src/catchUp.js';

const run = (actions, start = {}, opts = {}) => {
  let rec = start; const effects = []; const feedback = [];
  for (const a of actions) {
    const [action, extra] = Array.isArray(a) ? a : [a, {}];
    const r = applyCatchUp(rec, action, { now: `t${effects.length}`, correct: 2, ...opts, ...extra });
    assert.ok(r.ok, `${action} failed: ${r.reason}`);
    rec = r.rec; effects.push(r.effects); feedback.push(r.feedback);
  }
  return { rec, effects, feedback };
};
const REVIEW = ['remember', 'see', ['try', { choice: 2 }]];
const FULL = [...REVIEW, 'openET', 'confirmET'];
const approved = () => {
  const d = CATCHUP_DRAFTS['2_2'];
  return { recapText: d.explain, cuSeePassage: d.seePassage, cuSeeTopic: d.seeTopic, cuSeeIdea: d.seeIdea, cuSeeGist: d.seeGist,
           cuTryPassage: d.tryPassage, cuTryChoices: d.tryChoices, cuTryCorrect: d.tryCorrect, cuTryFeedback: d.tryFeedback, cuQuickReviewStatus: 'final' };
};

test('pilot is Land 2 Session 2 only', () => {
  assert.ok(isCatchUpPilot(2, 2));
  assert.ok(!isCatchUpPilot(1, 2));
});

test('Quick Review runs Remember → See one → Try one → Finish your work', () => {
  assert.equal(catchUpView({}).step, 'remember');
  assert.equal(catchUpView(run(['remember']).rec).step, 'see');
  assert.equal(catchUpView(run(['remember', 'see']).rec).step, 'try');
  assert.equal(catchUpView(run(REVIEW).rec).step, 'work');
  assert.equal(catchUpView(run(FULL).rec).step, 'submit');
});

test('Try one: wrong answers give feedback, allow retries and cost nothing', () => {
  const { rec, feedback, effects } = run(['remember', 'see', ['try', { choice: 1 }], ['try', { choice: 3 }], ['try', { choice: 2 }]]);
  assert.deepEqual(feedback.slice(2).map(f => f.correct), [false, false, true]);
  assert.equal(rec.tryAttempts, 3);
  assert.equal(rec.tryCorrectOnAttempt, 3);
  assert.ok(effects.every(e => !e.grantReward && !e.completeTile), 'review never pays or completes');
  assert.equal(catchUpView(rec).review.done, true);
  assert.equal(reviewSummary(rec), 'Quick Review — correct on try 3');
  // after a wrong answer the student is still on Try one
  assert.equal(catchUpView(run(['remember', 'see', ['try', { choice: 1 }]]).rec).step, 'try');
  assert.equal(applyCatchUp(run(['remember', 'see']).rec, 'try', { choice: 0, correct: 2 }).reason, 'pick-an-answer');
});

test('the full Wayground lesson is never required; only the Exit Ticket is', () => {
  const { rec } = run(FULL);
  assert.equal(catchUpView(rec).canSubmit, true);
  assert.ok(!rec.rlOpenedAt && !rec.rlConfirmedAt);
  // opening the help links is allowed any time and changes nothing required
  const helped = run(['openRL', 'openVideo'], rec).rec;
  assert.equal(catchUpView(helped).canSubmit, true);
});

test('Exit Ticket: opening is only "Opened"; it waits for the review route to be settled', () => {
  assert.equal(applyCatchUp({}, 'openET').reason, 'review-first');
  const { rec } = run([...REVIEW, 'openET']);
  const v = catchUpView(rec);
  assert.equal(v.et.opened, true);
  assert.equal(v.et.confirmed, false);
  assert.equal(v.canSubmit, false);
  assert.equal(applyCatchUp(run(REVIEW).rec, 'confirmET').reason, 'open-first');
});

test('started in class: choose Quick Review or Continue my work', () => {
  const legacy = { wayground: [true] };
  const v = catchUpView({}, legacy);
  assert.equal(v.startedInClass, true);
  assert.equal(v.step, 'choose');
  const cont = run(['chooseContinue', 'openET', 'confirmET'], {}, { legacy });
  assert.equal(catchUpView(cont.rec, legacy).canSubmit, true);
  assert.equal(reviewSummary(cont.rec), 'chose Continue my work');
  // Quick Review stays available after choosing Continue
  assert.ok(applyCatchUp(cont.rec, 'remember', { legacy }).ok);
  const rev = run(['chooseReview'], {}, { legacy });
  assert.equal(catchUpView(rev.rec, legacy).step, 'remember');
});

test('absent students are not offered Continue my work', () => {
  assert.equal(catchUpView({}).needsChoice, false);
  assert.equal(applyCatchUp({}, 'chooseContinue').reason, 'choice-not-offered');
});

test('required workbook items (when a tile has them) appear in Finish your work', () => {
  const { rec } = run([...FULL], {}, { mustDo: 1 });
  assert.equal(catchUpView(rec, {}, { mustDo: 1 }).canSubmit, false);
  const done = run([['confirmMust', { index: 0 }]], rec, { mustDo: 1 }).rec;
  assert.equal(catchUpView(done, {}, { mustDo: 1 }).canSubmit, true);
  // an item already checked in class doesn't have to be redone
  assert.equal(catchUpView(rec, { mustDo: [true] }, { mustDo: 1 }).canSubmit, true);
});

test('saved progress from the first pilot version keeps working', () => {
  // in progress: recap + example reviewed, Read and Learn confirmed, Exit Ticket not yet done
  const old = { recapAt: 'a', exampleAt: 'b', rlOpenedAt: 'c', rlConfirmedAt: 'd', startedAt: 'a' };
  const v = catchUpView(old);
  assert.equal(v.review.done, true);
  assert.equal(v.step, 'work');
  assert.equal(v.resumed, true);
  // skipped recap/example counts as a settled review
  assert.equal(catchUpView({ recapSkippedAt: 'a', exampleSkippedAt: 'b', startedInClass: true }).reviewSettled, true);
  // submitted / returned / accepted records keep their status
  for (const s of ['submitted', 'returned', 'accepted']) assert.equal(catchUpView({ status: s, recapAt: 'a', exampleAt: 'b' }).status, s);
});

test('submit completes the tile and grants the reward once; resubmit never pays again', () => {
  let { rec, effects } = run([...FULL, 'submit']);
  assert.deepEqual(effects.at(-1), { completeTile: true, grantReward: true });
  assert.equal(statusLabel(rec.status), 'Submitted — awaiting review');
  assert.equal(applyCatchUp(rec, 'submit').reason, 'locked');
  rec = { ...rec, rewardGrantedAt: 'paid' };
  const sb = applyCatchUp(rec, 'sendBack', { by: 'teacher', note: 'Make it one sentence.' });
  assert.ok(sb.ok);
  assert.ok(sb.rec.tryCorrectAt && sb.rec.etConfirmedAt, 'send back erases nothing');
  assert.equal(applyCatchUp(sb.rec, 'resubmit').reason, 'confirm-correction-first');
  const again = run(['confirmCorrection', 'resubmit'], sb.rec);
  assert.equal(again.rec.status, 'submitted');
  assert.deepEqual(again.effects.at(-1), { grantReward: false });
});

test('teacher-only review actions', () => {
  const { rec } = run([...FULL, 'submit']);
  assert.equal(applyCatchUp(rec, 'accept').reason, 'teacher-only');
  assert.equal(applyCatchUp(rec, 'sendBack', { by: 'teacher', note: ' ' }).reason, 'note-required');
  const acc = applyCatchUp(rec, 'accept', { by: 'teacher' });
  assert.equal(acc.rec.status, 'accepted');
  assert.match(statusLabel('accepted'), /Completion confirmed/);
  assert.ok(!/mastery/i.test(statusLabel('accepted')));
});

test('without approved content: no review steps, straight to the Exit Ticket', () => {
  const v = catchUpView({}, {}, { contentReady: false });
  assert.equal(v.step, 'work');
  assert.equal(v.needsChoice, false);
  assert.equal(applyCatchUp({}, 'remember', { contentReady: false }).reason, 'no-content');
});

test('content: drafts are never "ready"; only saved + approved text is', () => {
  assert.equal(catchUpContent(2, 2, {}).ready, false);                                   // sample draft
  const saved = approved(); delete saved.cuQuickReviewStatus;
  assert.equal(catchUpContent(2, 2, saved).ready, false);                                // saved, not approved
  assert.equal(catchUpContent(2, 2, { cuContentStatus: 'final' }).ready, false);         // old approval doesn't carry over
  assert.equal(catchUpContent(2, 2, approved()).ready, true);
  const partial = approved(); partial.cuSeeGist = '';
  assert.equal(catchUpContent(2, 2, partial).ready, false);                               // a missing field falls back to draft → not ready
  const bad = approved(); bad.cuSeeTopic = 'words not in the paragraph';
  assert.equal(catchUpContent(2, 2, bad).ready, false);
  assert.match(catchUpContent(2, 2, bad).problems.join(' '), /topic words must appear/);
  assert.equal(QR_FIELDS.length, 9);
});

test('highlighting marks the topic and important idea in order', () => {
  const parts = highlightParts('Cats nap a lot because they hunt at night.', 'Cats', 'they hunt at night');
  assert.deepEqual(parts.map(p => p.kind || '-'), ['topic', '-', 'idea', '-']);
  assert.equal(parts.map(p => p.text).join(''), 'Cats nap a lot because they hunt at night.');
  assert.deepEqual(highlightParts('abc', 'zzz', ''), [{ text: 'abc' }]);
});

test('actions never mutate the stored record', () => {
  const { rec } = run(['remember']);
  const before = JSON.stringify(rec);
  applyCatchUp(rec, 'see');
  assert.equal(JSON.stringify(rec), before);
});
