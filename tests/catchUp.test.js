import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCatchUp, catchUpView, isCatchUpPilot, statusLabel, sessionContent, practiceParts, gradePractice, attempts, PASS_MIN, passMinOf, reviewsOf, catchUpSessions, SESSION_CONTENT } from '../src/catchUp.js';

const c = sessionContent(2, 2);
const parts = practiceParts(c);
const PEAR = 'https://app.peardeck.com/student/s2-exit-ticket';
const right = Object.fromEntries(parts.map(p => [p.id, p.choices.findIndex(x => x.correct)]));
const wrongIdx = p => p.choices.findIndex(x => !x.correct);
const withWrong = n => Object.fromEntries(parts.map((p, i) => [p.id, i < n ? wrongIdx(p) : right[p.id]]));
const act = (rec, action, opts = {}) => applyCatchUp(rec, action, { content: c, pearUrl: PEAR, now: opts.now || 't', ...opts });
const ok = (rec, action, opts) => { const r = act(rec, action, opts); assert.ok(r.ok, `${action}: ${r.reason}`); return r; };
const passed = () => ok({}, 'grade', { answers: right }).rec;

test('catch-up sessions come from the content table: Unit 2 Sessions 2 and 3 only', () => {
  assert.ok(isCatchUpPilot(2, 2));
  assert.ok(isCatchUpPilot(2, 3));
  assert.ok(!isCatchUpPilot(2, 4));
  assert.ok(!isCatchUpPilot(1, 3));
  assert.deepEqual(catchUpSessions().map(x => x.key), ['2_2', '2_3']);
});

test('content: RI.5.2 gist statement; four scored parts incl. Part A/B; one correct answer each', () => {
  assert.equal(c.standard, 'RI.5.2');
  assert.equal(parts.length, 4);
  assert.ok(c.questions.some(q => q.partAB && q.parts.length === 2));
  for (const p of parts) assert.equal(p.choices.filter(x => x.correct).length, 1, p.id);
  assert.ok(!/https?:/i.test(JSON.stringify(c)), 'no links in the content — the Pear link comes from the session settings');
});

test('every session: no correct answer is copied from the review or its reading', () => {
  const norm = t => t.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [key, sc] of Object.entries(SESSION_CONTENT)) {
    const review = norm(reviewsOf(sc).flatMap(r => [...r.explain, ...r.steps, r.example.reading, r.example.answer.text,
      ...r.example.walk.flatMap(w => w.list || [w.text])]).join(' '));
    for (const q of sc.questions) for (const p of q.parts) {
      const ans = norm(p.choices.find(x => x.correct).text);
      assert.ok(!review.includes(ans), `${key} ${p.id}: answer appears in the review`);
      if (!p.quote) assert.ok(!norm(q.reading).includes(ans), `${key} ${p.id}: answer stated in the reading`);
    }
  }
});

test('every session: each part has 4 choices, exactly one correct, feedback on every choice, no links', () => {
  for (const [key, sc] of Object.entries(SESSION_CONTENT)) {
    assert.ok(!/https?:/i.test(JSON.stringify(sc)), key);
    for (const p of practiceParts(sc)) {
      assert.equal(p.choices.length, 4, `${key} ${p.id}`);
      assert.equal(p.choices.filter(x => x.correct).length, 1, `${key} ${p.id}`);
      assert.ok(p.choices.every(x => x.text && x.feedback), `${key} ${p.id}`);
    }
    assert.ok(reviewsOf(sc).every(r => r.explain.length && r.steps.length && r.example.reading && r.example.answer.text), key);
  }
});

test('Session 3: two reviews (main idea, context clues), four questions, answer key, pass at 3 of 4', () => {
  const c3 = sessionContent(2, 3);
  assert.equal(c3.standard, 'RI.5.2 · L.5.4a');
  assert.deepEqual(reviewsOf(c3).map(r => r.title), ['Review A: Explaining Main Ideas', 'Review B: Using Context Clues']);
  assert.match(JSON.stringify(reviewsOf(c3)[1].explain), /fundamental.*technique/);
  const p3 = practiceParts(c3);
  assert.deepEqual(p3.map(p => p.id), ['q1', 'q2', 'q3', 'q4']);
  assert.deepEqual(p3.map(p => 'ABCD'[p.choices.findIndex(x => x.correct)]), ['C', 'B', 'D', 'A']);
  assert.ok(p3[2].prompt.includes('technique') && p3[3].prompt.includes('fundamental'));
  assert.equal(passMinOf(c3), 3);
  const r3 = Object.fromEntries(p3.map(p => [p.id, p.choices.findIndex(x => x.correct)]));
  const w = p => p.choices.findIndex(x => !x.correct);
  assert.equal(gradePractice(c3, { ...r3, q1: w(p3[0]) }).passed, true, '3 of 4 passes');
  assert.equal(gradePractice(c3, { ...r3, q1: w(p3[0]), q4: w(p3[3]) }).passed, false, '2 of 4 fails');
});

test('Session 3 runs the same flow: fail → retry → pass → Pear → report (reward once) → send back → verify', () => {
  const c3 = sessionContent(2, 3); const p3 = practiceParts(c3);
  const right3 = Object.fromEntries(p3.map(p => [p.id, p.choices.findIndex(x => x.correct)]));
  const wrong3 = Object.fromEntries(p3.map(p => [p.id, p.choices.findIndex(x => !x.correct)]));
  const o = { content: c3, pearUrl: 'https://app.peardeck.com/student/s3', now: 't' };
  const go = (rec, a, x = {}) => { const r = applyCatchUp(rec, a, { ...o, ...x }); assert.ok(r.ok, `${a}: ${r.reason}`); return r; };
  let r = go({}, 'grade', { answers: wrong3 });
  assert.deepEqual(r.effects, {});
  r = go(r.rec, 'grade', { answers: right3 });
  assert.deepEqual(r.effects, {}, 'passing alone pays nothing');
  assert.equal(applyCatchUp(r.rec, 'reportPear', o).reason, 'open-pear-first');
  r = go(go(r.rec, 'openPear').rec, 'reportPear');
  assert.deepEqual(r.effects, { completeTile: true, grantReward: true });
  const sb = go({ ...r.rec, rewardGrantedAt: 'paid' }, 'sendBack', { by: 'teacher', note: 'Not in Pear yet.' });
  assert.deepEqual(attempts(sb.rec).map(a => a.passed), [false, true], 'attempts kept');
  assert.deepEqual(go(sb.rec, 'reportPear').effects, { completeTile: false, grantReward: false });
  assert.equal(catchUpView(go(go(sb.rec, 'reportPear').rec, 'accept', { by: 'teacher' }).rec, o).stage, 'verified');
  assert.equal(applyCatchUp({}, 'openPear', { ...o, pearUrl: '' }).reason, 'pass-practice-first');
  assert.equal(catchUpView(r.rec, { pearUrl: '' }).pear.available, false);
});

test('Stage 2: grading threshold is still 3 of 4', () => {
  assert.equal(PASS_MIN, 3);
  assert.equal(gradePractice(c, withWrong(1)).passed, true);
  assert.equal(gradePractice(c, withWrong(2)).passed, false);
  assert.equal(act({}, 'grade', { answers: { q1: 1 } }).reason, 'answer-all');
});

test('fail → retry → pass; attempts kept; passing does NOT complete the tile or pay', () => {
  const f = ok({}, 'grade', { answers: withWrong(2), now: 'a' });
  assert.deepEqual(f.effects, {});
  assert.equal(catchUpView(f.rec, { pearUrl: PEAR }).stage, 'practice');
  const p = ok(f.rec, 'grade', { answers: withWrong(1), now: 'b' });
  assert.deepEqual(p.effects, {}, 'passing practice alone: no completion, no reward');
  assert.equal(p.rec.status, undefined);
  const v = catchUpView(p.rec, { pearUrl: PEAR });
  assert.equal(v.stage, 'pear');
  assert.equal(v.tileComplete, false);
  assert.equal(v.label, 'Practice passed — Pear exit ticket next');
  assert.deepEqual(attempts(p.rec).map(a => [a.passed, a.correct]), [[false, 2], [true, 3]]);
  assert.equal(act(p.rec, 'grade', { answers: right }).reason, 'already-passed', 'no re-grading after passing');
});

test('Stage 3 is locked until practice is passed', () => {
  assert.equal(act({}, 'openPear').reason, 'pass-practice-first');
  assert.equal(act({}, 'reportPear').reason, 'pass-practice-first');
});

test('opening Pear is not completion; the student must report it', () => {
  const opened = ok(passed(), 'openPear').rec;
  const v = catchUpView(opened, { pearUrl: PEAR });
  assert.equal(v.pear.opened, true);
  assert.equal(v.pear.reported, false);
  assert.equal(v.tileComplete, false);
  assert.equal(act(passed(), 'reportPear').reason, 'open-pear-first');
  // an exit ticket opened on the lesson day also counts as opened
  assert.equal(catchUpView(passed(), { pearUrl: PEAR, legacy: { exitTicketOpened: [true] } }).canReport, true);
});

test('report Pear → tile complete + reward once; duplicate reports are refused', () => {
  const r = ok(ok(passed(), 'openPear').rec, 'reportPear');
  assert.deepEqual(r.effects, { completeTile: true, grantReward: true });
  assert.equal(r.rec.status, 'submitted');
  assert.ok(r.rec.etConfirmedAt);
  const v = catchUpView(r.rec, { pearUrl: PEAR });
  assert.equal(v.stage, 'reported');
  assert.equal(v.pear.reported, true);
  assert.equal(v.verified, false, 'student-reported, not verified');
  assert.equal(act(r.rec, 'reportPear').reason, 'locked');
  assert.equal(act(r.rec, 'grade', { answers: right }).reason, 'locked');
});

test('missing Pear link: no link invented, cannot report, practice score kept', () => {
  const rec = passed();
  const v = catchUpView(rec, { pearUrl: '' });
  assert.equal(v.pear.available, false);
  assert.equal(v.canReport, false);
  assert.equal(applyCatchUp(rec, 'openPear', { pearUrl: '' }).reason, 'no-pear-link');
  assert.equal(applyCatchUp({ ...rec, etOpenedAt: 'x' }, 'reportPear', { pearUrl: '' }).reason, 'no-pear-link');
  assert.equal(attempts(rec).length, 1);
});

test('teacher Verify → verified; Send Back → student reports again with no second reward', () => {
  const reported = { ...ok(ok(passed(), 'openPear').rec, 'reportPear').rec, rewardGrantedAt: 'paid' };
  assert.equal(act(reported, 'accept').reason, 'teacher-only');
  const ver = ok(reported, 'accept', { by: 'teacher' });
  assert.deepEqual(ver.effects, { acceptedReview: true });
  assert.equal(catchUpView(ver.rec, { pearUrl: PEAR }).stage, 'verified');
  assert.match(statusLabel('accepted'), /verified/);
  assert.equal(act(reported, 'sendBack', { by: 'teacher', note: ' ' }).reason, 'note-required');
  const sb = ok(reported, 'sendBack', { by: 'teacher', note: 'Your Pear exit ticket was not submitted.' });
  const vb = catchUpView(sb.rec, { pearUrl: PEAR });
  assert.equal(vb.stage, 'pear');
  assert.equal(vb.tileComplete, true, 'send back does not take the tile away');
  assert.equal(vb.practicePassed, true, 'send back keeps the passed practice');
  assert.deepEqual(attempts(sb.rec), attempts(reported), 'send back keeps every practice attempt');
  assert.equal(sb.rec.rewardGrantedAt, 'paid', 'send back keeps the reward marker, so no second payment');
  assert.equal(act(sb.rec, 'grade', { answers: right }).reason, 'already-passed', 'no practice redo after send back');
  const again = ok(sb.rec, 'reportPear');
  assert.deepEqual(again.effects, { completeTile: false, grantReward: false });
  assert.equal(again.rec.submitCount, 2);
});

test('records completed before this update keep their completion and rewards', () => {
  // first pilot version (PR #18): submitted / accepted after confirming the Exit Ticket
  const sub = { status: 'submitted', submitCount: 1, rewardGrantedAt: 'x', etConfirmedAt: 'y', recapAt: 'a' };
  const v1 = catchUpView(sub, { pearUrl: PEAR });
  assert.equal(v1.stage, 'reported');
  assert.equal(v1.legacyComplete, true);
  assert.equal(v1.tileComplete, true);
  assert.equal(catchUpView({ ...sub, status: 'accepted' }, { pearUrl: PEAR }).stage, 'verified');
  // returned under the old version: no practice needed, just report the exit ticket again; no second reward
  const ret = { ...sub, status: 'returned', returnNote: 'Redo' };
  assert.equal(catchUpView(ret, { pearUrl: PEAR }).stage, 'pear');
  const r = ok({ ...ret, etOpenedAt: 'o' }, 'reportPear');
  assert.deepEqual(r.effects, { completeTile: false, grantReward: false });
  // in progress under the old version (never submitted): must now pass practice
  assert.equal(catchUpView({ recapAt: 'a', rlConfirmedAt: 'b' }, { pearUrl: PEAR }).stage, 'practice');
});

test('only existing record fields are written; answers not stored', () => {
  const allowed = new Set(['startedAt', 'updatedAt', 'history', 'etOpenedAt', 'etConfirmedAt', 'status', 'submittedAt', 'submitCount',
    'correctionConfirmedAt', 'acceptedAt', 'returnNote', 'returnedAt', 'rewardGrantedAt']);
  let r = ok({}, 'grade', { answers: withWrong(3) }).rec;
  r = ok(r, 'grade', { answers: right }).rec;
  r = ok(r, 'openPear').rec;
  r = ok(r, 'reportPear').rec;
  r = ok(r, 'sendBack', { by: 'teacher', note: 'n' }).rec;
  r = ok(r, 'reportPear').rec;
  r = ok(r, 'accept', { by: 'teacher' }).rec;
  for (const k of Object.keys(r)) assert.ok(allowed.has(k), `unexpected field ${k}`);
  assert.ok(!JSON.stringify(r).includes('q2a'));
});

test('actions never mutate the stored record', () => {
  const rec = passed(); const before = JSON.stringify(rec);
  act(rec, 'openPear');
  assert.equal(JSON.stringify(rec), before);
});
