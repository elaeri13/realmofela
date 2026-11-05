import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCatchUp, catchUpView, isCatchUpPilot, statusLabel, sessionContent, practiceParts, gradePractice, attempts, isAutoPassed, PASS_MIN } from '../src/catchUp.js';

const c = sessionContent(2, 2);
const parts = practiceParts(c);
const right = Object.fromEntries(parts.map(p => [p.id, p.choices.findIndex(x => x.correct)]));
const wrongIdx = p => p.choices.findIndex(x => !x.correct);
const withWrong = n => Object.fromEntries(parts.map((p, i) => [p.id, i < n ? wrongIdx(p) : right[p.id]]));
const grade = (rec, answers, now = 't') => applyCatchUp(rec, 'grade', { content: c, answers, now });

test('pilot is Unit 2 (Land 2) Session 2 only', () => {
  assert.ok(isCatchUpPilot(2, 2));
  assert.ok(!isCatchUpPilot(1, 2));
  assert.ok(!isCatchUpPilot(2, 3));
});

test('content: RI.5.2 gist statement from the Session 2 lesson; four scored parts incl. Part A/B', () => {
  assert.equal(c.standard, 'RI.5.2');
  assert.equal(c.textTitle, 'Race to the Moon . . . and Beyond');
  assert.equal(c.example.gist, 'The U.S. and the Soviet Union competed to reach the moon and explore space.');
  assert.equal(c.questions.length, 3);
  assert.equal(parts.length, 4);
  assert.ok(c.questions.some(q => q.partAB && q.parts.length === 2));
  for (const p of parts) {
    assert.equal(p.choices.filter(x => x.correct).length, 1, p.id);
    assert.ok(p.choices.every(x => x.feedback.length > 10), p.id);
  }
  assert.ok(!/https?:|wayground|pear ?deck|video|workbook/i.test(JSON.stringify(c)));
});

test('students must find the gist themselves: no correct answer is copied from the review or the readings', () => {
  const norm = t => t.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const review = norm([...c.explain, ...c.steps, c.example.reading, ...c.example.ideas, c.example.gist, c.example.note].join(' '));
  for (const q of c.questions) {
    const reading = norm(q.reading);
    for (const p of q.parts) {
      if (p.id === 'q2b') continue;                     // Part B asks for a quoted sentence from the text, by design
      const ans = norm(p.choices.find(x => x.correct).text);
      assert.ok(!review.includes(ans), `${p.id} answer appears in the review`);
      assert.ok(!reading.includes(ans), `${p.id} answer appears in its reading`);
    }
    // each practice reading is about a different section than the worked example
    assert.notEqual(q.reading, c.example.reading);
  }
  // the readings give details: every wrong "detail" choice in Q1 is supported by the reading
  assert.match(c.questions[0].reading, /Gemini/);
  assert.match(c.questions[0].reading, /Apollo 13/);
  assert.match(c.questions[0].reading, /Mercury Seven/);
});

test('grading: 4/4 and 3/4 pass; 2/4 and below do not', () => {
  assert.equal(PASS_MIN, 3);
  assert.equal(gradePractice(c, right).passed, true);
  assert.equal(gradePractice(c, withWrong(1)).passed, true);
  assert.equal(gradePractice(c, withWrong(1)).correctCount, 3);
  assert.equal(gradePractice(c, withWrong(2)).passed, false);
  assert.equal(gradePractice(c, withWrong(4)).correctCount, 0);
  assert.equal(gradePractice(c, { q1: 1 }).answeredAll, false);
});

test('all four parts must be answered before grading', () => {
  const r = grade({}, { q1: 1, q2a: 2 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'answer-all');
});

test('pass (3/4): complete automatically, reward once, no teacher approval needed', () => {
  const r = grade({}, withWrong(1));
  assert.ok(r.ok);
  assert.equal(r.rec.status, 'accepted');
  assert.deepEqual(r.effects, { completeTile: true, grantReward: true, acceptedReview: true });
  assert.ok(isAutoPassed(r.rec));
  assert.match(catchUpView(r.rec).label, /Complete — passed \(3 of 4\)/);
  assert.ok(!/mastery/i.test(catchUpView(r.rec).label));
  // once passed, it can't be graded or paid again
  assert.equal(grade(r.rec, right).reason, 'locked');
  // it never lands in the teacher's "to review" list (status is not 'submitted')
  assert.notEqual(r.rec.status, 'submitted');
});

test('below 75%: score recorded, no completion, no reward; retry until passing, then reward once', () => {
  const f1 = grade({}, withWrong(2), 'a');
  assert.ok(f1.ok);
  assert.equal(f1.grade.passed, false);
  assert.deepEqual(f1.effects, {});
  assert.equal(f1.rec.status, undefined, 'status stays unset after a failed try');
  assert.equal(catchUpView(f1.rec).status, 'in_progress');
  assert.equal(statusLabel('in_progress'), 'Not passed yet');
  const f2 = grade(f1.rec, withWrong(4), 'b');
  assert.deepEqual(f2.effects, {});
  const p = grade(f2.rec, right, 'c');
  assert.deepEqual(p.effects, { completeTile: true, grantReward: true, acceptedReview: true });
  assert.deepEqual(attempts(p.rec).map(a => [a.passed, a.correct]), [[false, 2], [false, 0], [true, 4]]);
});

test('reward already paid (earlier pilot version) is never paid again; tile not re-completed', () => {
  const earlier = { status: 'returned', submitCount: 1, rewardGrantedAt: 'paid', returnNote: 'Try again' };
  const r = grade(earlier, right);
  assert.equal(r.rec.status, 'accepted');
  assert.deepEqual(r.effects, { completeTile: false, grantReward: false, acceptedReview: true });
});

test('only existing record fields are written', () => {
  const allowed = new Set(['startedAt', 'updatedAt', 'status', 'acceptedAt', 'returnNote', 'history']);
  const r = grade(grade({}, withWrong(3)).rec, right).rec;
  for (const k of Object.keys(r)) assert.ok(allowed.has(k), `unexpected field ${k}`);
  for (const h of r.history) assert.deepEqual(Object.keys(h).sort(), ['at', 'event', 'note']);
  assert.ok(!JSON.stringify(r).includes('q1'), 'answers are not stored');
});

test('earlier-version submissions: teacher Accept / Send Back still work', () => {
  const submitted = { status: 'submitted', submitCount: 1, rewardGrantedAt: 'x' };
  assert.equal(applyCatchUp(submitted, 'accept').reason, 'teacher-only');
  assert.deepEqual(applyCatchUp(submitted, 'accept', { by: 'teacher' }).effects, { acceptedReview: true });
  const sb = applyCatchUp(submitted, 'sendBack', { by: 'teacher', note: 'Retry' });
  assert.equal(sb.rec.status, 'returned');
  assert.equal(catchUpView(sb.rec).locked, false, 'a sent-back student can retake the auto-graded check');
  // and submitted records are locked for students
  assert.equal(grade(submitted, right).reason, 'locked');
});

test('actions never mutate the stored record', () => {
  const rec = grade({}, withWrong(2)).rec;
  const before = JSON.stringify(rec);
  grade(rec, right);
  assert.equal(JSON.stringify(rec), before);
});
