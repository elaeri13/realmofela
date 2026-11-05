import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCatchUp, catchUpView, isCatchUpPilot, statusLabel, sessionContent, practiceParts, gradePractice, practiceDone } from '../src/catchUp.js';

const c = sessionContent(2, 2);
const correctAnswers = () => Object.fromEntries(practiceParts(c).map(p => [p.id, p.choices.findIndex(x => x.correct)]));
const wrongAnswers = () => Object.fromEntries(practiceParts(c).map(p => [p.id, p.choices.findIndex(x => !x.correct)]));
const run = (actions, start = {}, opts = {}) => {
  let rec = start; const effects = [];
  for (const a of actions) {
    const [action, extra] = Array.isArray(a) ? a : [a, {}];
    const r = applyCatchUp(rec, action, { now: `t${effects.length}`, practiceComplete: true, ...opts, ...extra });
    assert.ok(r.ok, `${action} failed: ${r.reason}`);
    rec = r.rec; effects.push(r.effects);
  }
  return { rec, effects };
};

test('pilot is Unit 2 (Land 2) Session 2 only', () => {
  assert.ok(isCatchUpPilot(2, 2));
  assert.ok(!isCatchUpPilot(1, 2));
  assert.ok(!isCatchUpPilot(2, 3));
  assert.equal(sessionContent(2, 3), null);
});

test('content matches the Session 2 lesson: gist statement, RI.5.2, the right text', () => {
  assert.equal(c.standard, 'RI.5.2');
  assert.equal(c.skill, 'Write a Gist Statement');
  assert.equal(c.textTitle, 'Race to the Moon . . . and Beyond');
  assert.equal(c.steps.length, 3);
  assert.equal(c.example.topic, 'the Space Race');
  assert.equal(c.example.gist, 'The U.S. and the Soviet Union competed to reach the moon and explore space.');
  assert.equal(c.questions.length, 3, 'three practice questions');
  assert.ok(c.questions.some(q => q.partAB && q.parts.length === 2), 'one LEAP-style Part A/Part B');
  // every part has exactly one correct answer and feedback for every choice
  for (const p of practiceParts(c)) {
    assert.equal(p.choices.filter(x => x.correct).length, 1, p.id);
    assert.ok(p.choices.every(x => x.feedback && x.feedback.length > 10), p.id);
  }
  // no links, videos or workbook references anywhere in the page content
  assert.ok(!/https?:|wayground|pear ?deck|video|workbook/i.test(JSON.stringify(c)));
});

test('grading: score, feedback, and unanswered parts', () => {
  const all = gradePractice(c, correctAnswers());
  assert.equal(all.total, 4);
  assert.equal(all.correctCount, 4);
  assert.equal(all.answeredAll, true);
  const wrong = gradePractice(c, wrongAnswers());
  assert.equal(wrong.correctCount, 0);
  assert.ok(wrong.items.every(i => i.feedback));
  const partial = gradePractice(c, { q1: 1 });
  assert.equal(partial.answeredAll, false);
  assert.equal(gradePractice(c, { q1: 9 }).items[0].answered, false);
});

test('practice is done only when every part is answered AND checked (right or wrong)', () => {
  assert.equal(practiceDone(c, correctAnswers(), false), false);
  assert.equal(practiceDone(c, { q1: 1 }, true), false);
  assert.equal(practiceDone(c, wrongAnswers(), true), true, 'wrong answers can still be submitted for teacher review');
  assert.equal(practiceDone(c, correctAnswers(), true), true);
});

test('submit needs finished practice; completes the tile and pays once', () => {
  assert.equal(applyCatchUp({}, 'submit', { practiceComplete: false }).reason, 'not-ready');
  const { rec, effects } = run(['submit']);
  assert.equal(rec.status, 'submitted');
  assert.deepEqual(effects[0], { completeTile: true, grantReward: true });
  assert.equal(statusLabel(rec.status), 'Submitted — awaiting review');
  assert.equal(applyCatchUp(rec, 'submit', { practiceComplete: true }).reason, 'locked');
});

test('only existing record fields are written (no new database fields)', () => {
  const allowed = new Set(['startedAt', 'updatedAt', 'status', 'submittedAt', 'submitCount', 'history', 'rewardGrantedAt',
    'returnedAt', 'returnNote', 'correctionConfirmedAt', 'acceptedAt']);
  let { rec } = run(['submit']);
  rec = { ...rec, rewardGrantedAt: 'x' };
  const sb = applyCatchUp(rec, 'sendBack', { by: 'teacher', note: 'Fix it' }).rec;
  const fixed = run(['confirmCorrection', 'resubmit'], sb).rec;
  const acc = applyCatchUp(fixed, 'accept', { by: 'teacher' }).rec;
  for (const k of Object.keys(acc)) assert.ok(allowed.has(k), `unexpected field ${k}`);
});

test('send back → fix → resubmit never pays again; resubmit needs the practice redone', () => {
  let { rec } = run(['submit']);
  rec = { ...rec, rewardGrantedAt: 'paid' };
  const sb = applyCatchUp(rec, 'sendBack', { by: 'teacher', note: 'Recheck Question 2.' });
  assert.ok(sb.ok);
  assert.equal(catchUpView(sb.rec).returnNote, 'Recheck Question 2.');
  assert.equal(applyCatchUp(sb.rec, 'resubmit', { practiceComplete: true }).reason, 'confirm-correction-first');
  const fixed = run(['confirmCorrection'], sb.rec).rec;
  assert.equal(applyCatchUp(fixed, 'resubmit', { practiceComplete: false }).reason, 'not-ready');
  const again = run(['resubmit'], fixed);
  assert.equal(again.rec.status, 'submitted');
  assert.equal(again.rec.submitCount, 2);
  assert.deepEqual(again.effects[0], { grantReward: false });
});

test('teacher-only review actions; Accept confirms completion, not mastery', () => {
  const { rec } = run(['submit']);
  assert.equal(applyCatchUp(rec, 'accept').reason, 'teacher-only');
  assert.equal(applyCatchUp(rec, 'sendBack', { by: 'teacher', note: ' ' }).reason, 'note-required');
  const acc = applyCatchUp(rec, 'accept', { by: 'teacher' });
  assert.deepEqual(acc.effects, { acceptedReview: true });
  assert.match(statusLabel('accepted'), /Completion confirmed/);
  assert.ok(!/mastery/i.test(statusLabel('accepted')));
});

test('records from earlier pilot versions keep their status', () => {
  for (const s of ['submitted', 'returned', 'accepted']) assert.equal(catchUpView({ status: s, recapAt: 'a', tryCorrectAt: 'b' }).status, s);
  // an old in-progress record just shows the page fresh
  const v = catchUpView({ recapAt: 'a', rlConfirmedAt: 'b' }, { practiceComplete: true });
  assert.equal(v.canSubmit, true);
});

test('actions never mutate the stored record', () => {
  const { rec } = run(['submit']);
  const before = JSON.stringify(rec);
  applyCatchUp(rec, 'accept', { by: 'teacher' });
  assert.equal(JSON.stringify(rec), before);
});
