// Missed-lesson catch-up (pilot) — pure logic, no Firebase. Unit-tested in tests/catchUp.test.js.
//
// Session 2 pilot, one page, three stages:
//   1. Review the Skill        — what a gist is + a worked example
//   2. Prove Your Knowledge    — four auto-graded parts (incl. Part A/Part B); pass = 3 of 4; free retries
//   3. Complete Your Pear Exit Ticket — the SAME Pear Assessment exit ticket the class took (the session's
//      stored Pear link). Opening it is only "Opened"; the student then reports "I've Submitted My Exit Ticket".
// Completion: the catch-up tile is finalized — and the existing XP/Gold paid once — only when the student
// reports the Pear submission (after passing practice). Passing practice alone records the score only.
// The Realm cannot see Pear Assessment, so a report is "student-reported"; the teacher verifies it in Pear
// and confirms it in the Realm (status 'accepted'), or sends it back.
// Source: Unit 2, Module 1, Session 2 teacher guide (RI.5.2 gist statement); readings retold in our own words.
//
// Data — existing catch-up record fields only (no new fields):
//   history[]      { at, event: 'autoPass'|'autoFail', note: '3/4' } per graded try; 'accept'/'sendBack' events
//   etOpenedAt     Pear exit ticket opened            etConfirmedAt  student reported submitting it
//   status         unset (working) → 'submitted' (Pear reported, tile complete) → 'accepted' (teacher verified)
//                  'returned' (teacher sent back: report again)
//   submittedAt, submitCount, rewardGrantedAt, acceptedAt, returnedAt, returnNote, startedAt, updatedAt
// Practice answers are not stored.

export const CATCHUP_PILOT_TILES = new Set(['2_2']); // Land 2 (Unit 2) · Session 2
export const catchUpKey = (landId, tileId) => `${landId}_${tileId}`;
export const isCatchUpPilot = (landId, tileId) => CATCHUP_PILOT_TILES.has(catchUpKey(landId, tileId));
export const PASS_MIN = 3;   // of 4 scored parts (75%)

export const SESSION_CONTENT = {
  '2_2': {
    skill: 'Write a Gist Statement',
    standard: 'RI.5.2',
    textTitle: 'Race to the Moon . . . and Beyond',
    author: 'Andrew Matthews',
    explain: [
      'A gist statement is a one- or two-sentence summary of a text. It answers the question: What is this text mostly about? (Gist is another word for main idea.)',
    ],
    steps: [
      'State the topic — who or what the text is mostly about — in a word or phrase.',
      'Identify the most important ideas about the topic. Leave out small details.',
      'Combine the topic and the most important ideas into a gist statement of a sentence or two, in your own words.',
    ],
    example: {
      label: '“The Path to the Moon” (paragraphs 1–5)',
      reading: 'In the 1950s, the United States and the Soviet Union competed over space exploration. This contest was called the Space Race. In 1958, the U.S. created a new agency, NASA, for air and space science. In 1961, President John F. Kennedy challenged NASA to land a man on the moon and return him safely to Earth before the decade was out. That spring, both countries had already sent people on short trips into space. In 1969, NASA reached Kennedy’s goal. More than 400,000 workers helped.',
      topic: 'the Space Race',
      ideas: [
        'President Kennedy was determined to send astronauts to the moon.',
        'The U.S. government created NASA to plan space missions.',
        'Both the U.S. and the Soviet Union sent out space missions.',
      ],
      gist: 'The U.S. and the Soviet Union competed to reach the moon and explore space.',
      note: 'Details like “more than 400,000 workers” are interesting, but they are small details, so they stay out of the gist.',
    },
    questions: [
      { id: 'q1', title: 'Question 1',
        readingTitle: '“Get with the Programs” (paragraphs 6–8)',
        reading: 'Project Mercury (1958–1963) launched one astronaut at a time into orbit around Earth. Its first astronauts, test pilots called the Mercury Seven, showed that people could survive in space. Project Gemini (1962–1966) used a new spacecraft for two-person crews. It tested skills like landing and docking spacecraft, and how longer trips affect astronauts. Project Apollo (1961–1972) launched three-person crews. Of eleven crewed Apollo flights, six landed on the moon. Apollo 13 had to cancel its landing after its spacecraft developed problems.',
        parts: [{ id: 'q1', prompt: 'Which sentence is the best gist statement for this section?',
          choices: [
            { text: 'Project Gemini used a new craft to launch a two-person crew into space.', feedback: 'That is one detail about Gemini. A gist covers the whole section — Mercury, Gemini and Apollo.' },
            { text: 'It took years and many steps for NASA to finally land people on the moon.', correct: true, feedback: 'The section shows three programs, one after another, that led to the moon landing.' },
            { text: 'Apollo 13 had to cancel its planned moon landing.', feedback: 'That is a small detail from one mission. It is not what the whole section is mostly about.' },
            { text: 'The first astronauts were experienced test pilots called the Mercury Seven.', feedback: 'That is a detail about Project Mercury only. Think about what all three programs add up to.' },
          ] }] },
      { id: 'q2', title: 'Question 2', partAB: true,
        readingTitle: '“Shooting for the Stars” (paragraphs 10–15)',
        reading: 'NASA wants to build houses on the moon by the year 2040. The plan is to send a 3-D printer to the moon and print buildings from concrete made of moon dust and rock. NASA is also planning to send humans to Mars, a trip of about seven months. First, scientists will copy spaceflight conditions in labs on Earth. Next, they will study astronauts on the International Space Station to learn how being far from Earth affects them. Later missions will test how people might handle another world’s temperatures and how to give medical care in space.',
        parts: [
          { id: 'q2a', label: 'Part A', prompt: 'What is the gist of this section?',
            choices: [
              { text: 'A trip to Mars would take about seven months.', feedback: 'That is a supporting detail. The gist should cover all of NASA’s new plans.' },
              { text: 'NASA is still studying rock samples from the Apollo missions.', feedback: 'That is about NASA’s past missions. This section is about what NASA plans to do next.' },
              { text: 'NASA’s new goals are to send people farther into space for longer periods of time.', correct: true, feedback: 'Houses on the moon and trips to Mars both mean going farther and staying longer.' },
              { text: 'Scientists will use a 3-D printer to build houses on the moon.', feedback: 'That explains how one goal might work. It is a detail, not the gist.' },
            ] },
          { id: 'q2b', label: 'Part B', prompt: 'Which sentence from the text best supports the answer to Part A?',
            choices: [
              { text: '“NASA is also planning for what was once unthinkable: humans traveling to Mars.”', correct: true, feedback: 'Sending humans to Mars is a goal of going farther into space for a longer time.' },
              { text: '“NASA is still learning from samples gathered from the Apollo missions over 50 years ago.”', feedback: 'This is about what NASA learned from past missions, not its new goals.' },
              { text: '“The first is to mimic spaceflight conditions at labs on Earth.”', feedback: 'This describes a first research step on Earth. It does not show the goal of going farther into space.' },
              { text: '“Scientists also need to consider how to provide medical care in space.”', feedback: 'This is a problem scientists must solve — a detail — not the new goal itself.' },
            ] },
        ] },
      { id: 'q3', title: 'Question 3',
        readingTitle: 'Timeline: July 15, 1975',
        reading: 'An American spacecraft and a Soviet spacecraft launched for the Apollo–Soyuz Test Project. In orbit around Earth, the two crafts joined, and the crews worked on the flight together. The flight was a joint (shared) mission between the two countries that had spent years racing to reach space “firsts.”',
        parts: [{ id: 'q3', prompt: 'Which sentence is the best gist of this timeline entry?',
          choices: [
            { text: 'The Apollo–Soyuz spacecraft orbited Earth.', feedback: 'That is true, but it is a detail. Why was this flight important?' },
            { text: 'The Soviet Union won the Space Race.', feedback: 'The entry does not say anyone won. Look at what the two countries did together.' },
            { text: 'The Space Shuttle could carry up to eight astronauts.', feedback: 'That is not in this entry — it comes from a different part of the timeline (1981).' },
            { text: 'The United States and the Soviet Union stopped competing and began exploring space together.', correct: true, feedback: 'A joint (shared) flight marked the end of the Space Race and the start of working together.' },
          ] }] },
    ],
  },
};
export const sessionContent = (landId, tileId) => SESSION_CONTENT[catchUpKey(landId, tileId)] || null;
export const practiceParts = content => (content ? content.questions.flatMap(q => q.parts) : []);

// Grade the practice. answers = { partId: choiceIndex }.
export function gradePractice(content, answers = {}) {
  const parts = practiceParts(content);
  const items = parts.map(p => {
    const pick = answers[p.id];
    const answered = Number.isInteger(pick) && pick >= 0 && pick < p.choices.length;
    const choice = answered ? p.choices[pick] : null;
    return { id: p.id, answered, correct: !!(choice && choice.correct), feedback: choice ? choice.feedback : '' };
  });
  const correctCount = items.filter(i => i.correct).length;
  const answeredAll = items.length > 0 && items.every(i => i.answered);
  return { items, total: parts.length, correctCount, answeredAll, passed: answeredAll && correctCount >= PASS_MIN };
}

// ── Attempts (from the existing `history` list) ─────────────────────────────
const SCORE_RE = /^(\d+)\/(\d+)$/;
export function attempts(rec) {
  return (Array.isArray((rec || {}).history) ? rec.history : [])
    .filter(h => h && (h.event === 'autoPass' || h.event === 'autoFail'))
    .map(h => { const m = SCORE_RE.exec(String(h.note || '')); return { at: h.at, passed: h.event === 'autoPass', correct: m ? +m[1] : 0, total: m ? +m[2] : 0 }; });
}
export const isAutoPassed = rec => (rec || {}).status === 'accepted' && attempts(rec).some(a => a.passed);

// ── View model ──────────────────────────────────────────────────────────────
// legacy = the tile's taskProgress (exitTicketOpened from the lesson day counts as "Pear opened").
// pearUrl = the session's stored Pear link ('' when missing).
export function catchUpView(rec, { legacy = {}, pearUrl = '' } = {}) {
  const r = rec || {};
  const tries = attempts(r);
  const passAttempt = tries.find(a => a.passed) || null;
  const last = tries[tries.length - 1] || null;
  const reported = ['submitted', 'accepted', 'returned'].includes(r.status) || false;
  // Completed under an earlier pilot version (before practice was required): keep it, never revoke.
  const legacyComplete = ['submitted', 'accepted', 'returned'].includes(r.status) && !passAttempt;
  const practicePassed = !!passAttempt || legacyComplete;
  const pearOpened = !!r.etOpenedAt || !!(legacy.exitTicketOpened || [])[0];
  const pearReported = !!r.etConfirmedAt && r.status !== 'returned';
  const status = r.status || (tries.length || r.etOpenedAt ? 'in_progress' : 'not_started');
  const verified = r.status === 'accepted';
  const tileComplete = ['submitted', 'accepted', 'returned'].includes(r.status) || (r.submitCount || 0) > 0;
  let stage;
  if (verified) stage = 'verified';
  else if (r.status === 'submitted') stage = 'reported';
  else if (!practicePassed) stage = 'practice';
  else stage = 'pear';                       // includes 'returned': report the exit ticket again
  return {
    status, stage, tries: tries.length, last, passAttempt, practicePassed, legacyComplete,
    pear: { url: pearUrl || '', available: !!pearUrl, opened: pearOpened, reported: pearReported, reportedAt: r.etConfirmedAt || null },
    verified, tileComplete, returnNote: r.returnNote || '',
    canReport: stage === 'pear' && !!pearUrl && pearOpened,
    label: statusLabel(verified ? 'accepted' : r.status === 'submitted' ? 'submitted' : r.status === 'returned' ? 'returned' : practicePassed ? 'practice_passed' : status),
  };
}
export function statusLabel(status) {
  return {
    not_started: 'Not started',
    in_progress: 'Practice not passed yet',
    practice_passed: 'Practice passed — Pear exit ticket next',
    submitted: 'Complete — exit ticket reported',
    returned: 'Sent back — check your exit ticket',
    accepted: 'Complete — exit ticket verified',
  }[status] || 'Not started';
}

// ── Actions ─────────────────────────────────────────────────────────────────
// applyCatchUp(rec, action, opts) → { ok, rec, effects, reason, grade? }
//   'grade'      student: grade the four parts. Records the try in history. Never completes or pays.
//   'openPear'   student: record that the Pear exit ticket was opened (after passing practice).
//   'reportPear' student: "I've Submitted My Exit Ticket". Needs a passed practice, a Pear link, and the
//                link opened. First report: tile complete + reward once. After a send-back: report again,
//                never paid again.
//   'accept'     teacher: verified in Pear (status 'accepted').
//   'sendBack'   teacher: exit ticket not found/finished; the student reports again.
export function applyCatchUp(rec, action, { now = new Date().toISOString(), note = '', by = 'student', content = null, answers = {}, legacy = {}, pearUrl = '' } = {}) {
  const r = JSON.parse(JSON.stringify(rec || {}));
  const v = catchUpView(r, { legacy, pearUrl });
  const fail = (reason, extra = {}) => ({ ok: false, rec: rec || {}, effects: {}, reason, ...extra });
  const effects = {};
  const push = (event, n) => { r.history = [...(Array.isArray(r.history) ? r.history : []), n == null ? { at: now, event } : { at: now, event, note: n }].slice(-20); };
  const student = ['grade', 'openPear', 'reportPear'].includes(action);
  if (student && (v.stage === 'reported' || v.stage === 'verified')) return fail('locked');
  if (student && !r.startedAt) r.startedAt = now;
  switch (action) {
    case 'grade': {
      if (v.practicePassed) return fail('already-passed');
      if (!content) return fail('no-content');
      const grade = gradePractice(content, answers);
      if (!grade.answeredAll) return fail('answer-all', { grade });
      push(grade.passed ? 'autoPass' : 'autoFail', `${grade.correctCount}/${grade.total}`);
      r.updatedAt = now;
      return { ok: true, rec: r, effects, grade };
    }
    case 'openPear':
      if (!v.practicePassed) return fail('pass-practice-first');
      if (!v.pear.available) return fail('no-pear-link');
      r.etOpenedAt = r.etOpenedAt || now;
      break;
    case 'reportPear':
      if (!v.practicePassed) return fail('pass-practice-first');
      if (!v.pear.available) return fail('no-pear-link');
      if (!v.pear.opened) return fail('open-pear-first');
      effects.completeTile = !v.tileComplete;
      effects.grantReward = !r.rewardGrantedAt;
      r.etConfirmedAt = now; r.status = 'submitted'; r.submittedAt = now; r.submitCount = (r.submitCount || 0) + 1;
      r.correctionConfirmedAt = r.returnNote ? now : (r.correctionConfirmedAt || null);
      push('reportPear');
      break;
    case 'accept':
      if (by !== 'teacher') return fail('teacher-only');
      if (r.status !== 'submitted') return fail('not-submitted');
      r.status = 'accepted'; r.acceptedAt = now; r.returnNote = null;
      effects.acceptedReview = true;
      push('accept');
      break;
    case 'sendBack':
      if (by !== 'teacher') return fail('teacher-only');
      if (r.status !== 'submitted') return fail('not-submitted');
      if (!String(note).trim()) return fail('note-required');
      r.status = 'returned'; r.returnedAt = now; r.returnNote = String(note).trim().slice(0, 500);
      push('sendBack', r.returnNote);
      break;
    default: return fail('unknown-action');
  }
  r.updatedAt = now;
  return { ok: true, rec: r, effects };
}
