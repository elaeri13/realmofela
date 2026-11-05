import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCatchUp, catchUpView, catchUpContent, parseExampleSteps, isCatchUpPilot, statusLabel } from '../src/catchUp.js';

const run = (actions, start = {}, legacy = {}) => {
  let rec = start, effects = [];
  for (const a of actions) {
    const [action, opts] = Array.isArray(a) ? a : [a, {}];
    const r = applyCatchUp(rec, action, { legacy, now: `t${effects.length}`, ...opts });
    assert.ok(r.ok, `${action} failed: ${r.reason}`);
    rec = r.rec; effects.push(r.effects);
  }
  return { rec, effects };
};
const FULL = ['recap', 'example', 'openRL', 'confirmRL', 'openET', 'confirmET'];

test('pilot is Land 2 Session 2 only', () => {
  assert.ok(isCatchUpPilot(2, 2));
  assert.ok(!isCatchUpPilot(1, 2));
  assert.ok(!isCatchUpPilot(2, 3));
});

test('steps run Recap → Example → Your Work → Submit', () => {
  assert.equal(catchUpView({}).step, 'recap');
  assert.equal(catchUpView(run(['recap']).rec).step, 'example');
  assert.equal(catchUpView(run(['recap', 'example']).rec).step, 'work');
  assert.equal(catchUpView(run(FULL).rec).step, 'submit');
  assert.equal(catchUpView({}).status, 'not_started');
  assert.equal(catchUpView(run(['recap']).rec).status, 'in_progress');
});

test('opening a link is only "Opened"; confirming is separate', () => {
  const { rec } = run(['recap', 'example', 'openRL']);
  const v = catchUpView(rec);
  assert.equal(v.rl.opened, true);
  assert.equal(v.rl.confirmed, false);
  assert.equal(v.canSubmit, false);
  assert.equal(applyCatchUp({}, 'confirmRL').reason, 'open-first');
});

test('exit ticket unlocks only after Read and Learn is confirmed', () => {
  assert.equal(applyCatchUp(run(['recap', 'example', 'openRL']).rec, 'openET').reason, 'finish-read-first');
  assert.ok(applyCatchUp(run(['recap', 'example', 'openRL', 'confirmRL']).rec, 'openET').ok);
});

test('saved progress resumes at the next unfinished step', () => {
  const { rec } = run(['recap', 'example', 'openRL', 'confirmRL']);
  const stored = JSON.parse(JSON.stringify(rec)); // as it comes back from the database
  const v = catchUpView(stored);
  assert.equal(v.step, 'work');
  assert.equal(v.resumed, true);
  assert.equal(v.rl.confirmed, true);
  assert.equal(v.et.opened, false);
});

test('work started on the lesson day is kept; recap/example become optional', () => {
  const legacy = { wayground: [true] };
  const v = catchUpView({}, legacy);
  assert.equal(v.startedInClass, true);
  assert.equal(v.rl.opened, true);
  assert.equal(v.rl.openedInClass, true);
  assert.equal(v.rl.confirmed, false);         // still needs the student's own confirmation
  assert.equal(v.step, 'work');                 // no repeating recap/example
  const { rec } = run(['confirmRL', 'openET', 'confirmET'], {}, legacy);
  assert.equal(catchUpView(rec, legacy).canSubmit, true);
});

test('submit completes the tile and grants the reward once', () => {
  const { rec, effects } = run([...FULL, 'submit']);
  assert.equal(rec.status, 'submitted');
  assert.equal(statusLabel(rec.status), 'Submitted — awaiting review');
  assert.deepEqual(effects.at(-1), { completeTile: true, grantReward: true });
  // submitting twice is refused
  assert.equal(applyCatchUp(rec, 'submit').reason, 'locked');
});

test('send back → correct → resubmit never grants the reward again', () => {
  let { rec } = run([...FULL, 'submit']);
  rec = { ...rec, rewardGrantedAt: 'paid' }; // what the app records after paying out
  const sb = applyCatchUp(rec, 'sendBack', { by: 'teacher', note: 'Your gist has two ideas — make it one sentence.' });
  assert.ok(sb.ok);
  const v = catchUpView(sb.rec);
  assert.equal(v.status, 'returned');
  assert.equal(v.returnNote, 'Your gist has two ideas — make it one sentence.');
  // progress is not erased
  assert.ok(sb.rec.rlConfirmedAt && sb.rec.etConfirmedAt && sb.rec.recapAt && sb.rec.exampleAt);
  assert.equal(applyCatchUp(sb.rec, 'resubmit').reason, 'confirm-correction-first');
  const { rec: done, effects } = run(['confirmCorrection', 'resubmit'], sb.rec);
  assert.equal(done.status, 'submitted');
  assert.equal(done.submitCount, 2);
  assert.deepEqual(effects.at(-1), { grantReward: false });
  assert.equal(effects.at(-1).completeTile, undefined);
});

test('teacher-only review actions and their rules', () => {
  const { rec } = run([...FULL, 'submit']);
  assert.equal(applyCatchUp(rec, 'accept').reason, 'teacher-only');
  assert.equal(applyCatchUp(rec, 'sendBack', { note: 'x' }).reason, 'teacher-only');
  assert.equal(applyCatchUp(rec, 'sendBack', { by: 'teacher', note: '  ' }).reason, 'note-required');
  assert.equal(applyCatchUp(run(FULL).rec, 'accept', { by: 'teacher' }).reason, 'not-submitted');
  const acc = applyCatchUp(rec, 'accept', { by: 'teacher' });
  assert.ok(acc.ok);
  assert.equal(acc.rec.status, 'accepted');
  assert.deepEqual(acc.effects, { acceptedReview: true });
  assert.ok(!/mastery/i.test(statusLabel('accepted')));
  assert.equal(applyCatchUp(acc.rec, 'sendBack', { by: 'teacher', note: 'x' }).reason, 'not-submitted');
});

test('actions never mutate the stored record', () => {
  const { rec } = run(['recap']);
  const before = JSON.stringify(rec);
  applyCatchUp(rec, 'example');
  assert.equal(JSON.stringify(rec), before);
});

test('content: teacher text wins over the draft; draft status shown until approved', () => {
  const draft = catchUpContent(2, 2, {});
  assert.ok(draft.recap.startsWith('A gist statement'));
  assert.equal(draft.isFinal, false);
  assert.equal(draft.usesDraft, true);
  assert.equal(draft.exampleSteps.length, 4);
  const custom = catchUpContent(2, 2, { recapText: 'Mine', cuExamplePassage: 'P', cuExampleSteps: 'Q | A', cuContentStatus: 'final' });
  assert.equal(custom.recap, 'Mine');
  assert.deepEqual(custom.exampleSteps, [{ label: 'Q', text: 'A' }]);
  assert.equal(custom.isFinal, true);
  assert.equal(custom.usesDraft, false);
  assert.deepEqual(parseExampleSteps('Just a line\n\n A | B '), [{ label: 'Just a line', text: '' }, { label: 'A', text: 'B' }]);
});

test('opening links during catch-up is not mistaken for starting in class', () => {
  // the app also sets the lesson's own "opened" flag when the student opens Wayground from catch-up
  const { rec } = run(['recap', 'example', 'openRL']);
  const v = catchUpView(rec, { wayground: [true] });
  assert.equal(v.startedInClass, false);
  assert.equal(v.rl.openedInClass, false);
  // but a real in-class start is remembered after catch-up begins
  const legacy = { wayground: [true] };
  const r2 = run(['confirmRL', 'openET'], {}, legacy).rec;
  assert.equal(catchUpView(r2, { wayground: [true], exitTicketOpened: [true] }).startedInClass, true);
});
