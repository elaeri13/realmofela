// Missed-lesson catch-up (pilot) — pure logic, no Firebase. Unit-tested in tests/catchUp.test.js.
//
// Session 2 pilot: ONE page inside the Realm — review, worked example, three practice questions, Submit.
// No videos, workbook pages, external links or extra steps.
// Source of truth: Unit 2, Module 1, Session 2 teacher guide ("Race to the Moon . . . and Beyond" and
// "The Path to the Moon", RI.5.2 gist statement). The review is written in our own words; only single
// sentences are quoted from the text where an answer choice needs them.
//
// Data: practice answers stay in the browser. Submitting uses the existing catch-up record fields
// (status, submittedAt, submitCount, history, rewardGrantedAt …) — no new database fields.
// Rules kept from the earlier pilot: submit completes the tile ("Submitted — awaiting review", not mastery);
// the catch-up XP/Gold is paid once; teacher Accept confirms completion only; Send Back → Resubmit never pays again.

export const CATCHUP_PILOT_TILES = new Set(['2_2']); // Land 2 (Unit 2) · Session 2
export const catchUpKey = (landId, tileId) => `${landId}_${tileId}`;
export const isCatchUpPilot = (landId, tileId) => CATCHUP_PILOT_TILES.has(catchUpKey(landId, tileId));

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
    reading: [
      { heading: 'The Path to the Moon (paragraphs 1–5)',
        text: 'In the 1950s, the United States and the Soviet Union competed to explore space. This was called the Space Race. In 1958, the U.S. created NASA to handle air and space science. In 1961, President Kennedy challenged NASA to land a person on the moon and bring them home safely before the decade ended. NASA reached that goal in 1969 with the help of more than 400,000 workers.' },
      { heading: 'Get with the Programs (paragraphs 6–8)',
        text: 'Project Mercury (1958–1963) sent one astronaut at a time into orbit and showed that people could survive in space. Project Gemini (1962–1966) sent two-person crews and tested skills NASA would need for longer trips to the moon. Project Apollo (1961–1972) sent three-person crews and landed astronauts on the moon. Six Apollo missions landed there.' },
      { heading: 'Shooting for the Stars (paragraphs 9–15)',
        text: 'NASA is still studying moon samples from the Apollo missions. Now it has new goals: building housing on the moon by 2040, and sending humans to Mars. A Mars trip would take about seven months, so scientists are first studying how a long trip far from Earth affects astronauts.' },
      { heading: 'The Path to the Moon (timeline)',
        text: 'The timeline shows key events in order, from the Soviet satellite Sputnik in 1957, to Apollo 11 landing on the moon in 1969, to 1975, when the U.S. and the Soviet Union flew a joint mission together, and later the International Space Station.' },
    ],
    example: {
      label: 'Gist of “Race to the Moon . . . and Beyond”',
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
        parts: [{ id: 'q1', prompt: 'Which sentence is the best gist statement for the section “Get with the Programs” (paragraphs 6–8)?',
          choices: [
            { text: 'Project Gemini used a new craft to launch a two-person crew into space.', feedback: 'That is one detail about Gemini. A gist covers the whole section — Mercury, Gemini and Apollo.' },
            { text: 'It took years and many steps for NASA to finally land people on the moon.', correct: true, feedback: 'Yes! The section shows three programs, one after another, that led to the moon landing.' },
            { text: 'Apollo 13 had to cancel its planned moon landing.', feedback: 'That is a small detail from one mission. It is not what the whole section is mostly about.' },
            { text: 'The first astronauts were experienced test pilots called the Mercury Seven.', feedback: 'That is a detail about Project Mercury only. Think about what all three programs add up to.' },
          ] }] },
      { id: 'q2', title: 'Question 2', partAB: true,
        parts: [
          { id: 'q2a', label: 'Part A', prompt: 'What is the gist of paragraphs 10–15 in “Shooting for the Stars”?',
            choices: [
              { text: 'A trip to Mars would take about seven months.', feedback: 'That is a supporting detail. The gist should cover all of NASA’s new plans.' },
              { text: 'NASA is still studying rock samples from the Apollo missions.', feedback: 'That comes from paragraph 9, and it is about the past. Paragraphs 10–15 are about NASA’s new goals.' },
              { text: 'NASA’s new goals are to send people farther into space for longer periods of time.', correct: true, feedback: 'Yes! Houses on the moon and trips to Mars both mean going farther and staying longer.' },
              { text: 'Scientists will use a 3-D printer to build houses on the moon.', feedback: 'That explains how one goal might work. It is a detail, not the gist.' },
            ] },
          { id: 'q2b', label: 'Part B', prompt: 'Which sentence from the text best supports the answer to Part A?',
            choices: [
              { text: '“NASA is also planning for what was once unthinkable: humans traveling to Mars.”', correct: true, feedback: 'Yes! Sending humans to Mars is a goal of going farther into space for a longer time.' },
              { text: '“NASA is still learning from samples gathered from the Apollo missions over 50 years ago.”', feedback: 'This is about what NASA learned from past missions, not its new goals.' },
              { text: '“The first is to mimic spaceflight conditions at labs on Earth.”', feedback: 'This describes a first research step on Earth. It does not show the goal of going farther into space.' },
              { text: '“Scientists also need to consider how to provide medical care in space.”', feedback: 'This is a problem scientists must solve — a detail — not the new goal itself.' },
            ] },
        ] },
      { id: 'q3', title: 'Question 3',
        context: 'In the timeline “The Path to the Moon,” the entry for July 15, 1975 tells about the Apollo–Soyuz Test Project, a joint space flight by the United States and the Soviet Union. (Joint means shared.)',
        parts: [{ id: 'q3', prompt: 'Which sentence is the best gist of the July 15, 1975 entry?',
          choices: [
            { text: 'The Apollo–Soyuz spacecraft orbited Earth.', feedback: 'That is true, but it is a detail. Why was this flight important?' },
            { text: 'The Soviet Union won the Space Race.', feedback: 'The entry does not say anyone won. It says the two countries worked together.' },
            { text: 'The Space Shuttle could carry up to eight astronauts.', feedback: 'That comes from a different timeline entry (1981).' },
            { text: 'The United States and the Soviet Union stopped competing and began exploring space together.', correct: true, feedback: 'Yes! A joint (shared) flight marked the end of the Space Race and the start of working together.' },
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
  return { items, total: parts.length, correctCount, answeredAll: items.length > 0 && items.every(i => i.answered) };
}
// Practice is "done" when every part is answered and the student has checked their answers.
export const practiceDone = (content, answers, checked) => !!checked && gradePractice(content, answers).answeredAll;

// ── View model ──────────────────────────────────────────────────────────────
export function catchUpView(rec, { practiceComplete = false } = {}) {
  const r = rec || {};
  const status = r.status || 'not_started';
  const locked = status === 'submitted' || status === 'accepted';
  return {
    status, label: statusLabel(status), locked,
    canSubmit: !locked && status !== 'returned' && practiceComplete,
    canResubmit: status === 'returned' && !!r.correctionConfirmedAt && practiceComplete,
    returnNote: r.returnNote || '', submitCount: r.submitCount || 0, correctionConfirmed: !!r.correctionConfirmedAt,
  };
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
// applyCatchUp(rec, action, opts) → { ok, rec, effects, reason }
// Only fields that already exist in catch-up records are written.
export function applyCatchUp(rec, action, { now = new Date().toISOString(), note = '', by = 'student', practiceComplete = false } = {}) {
  const r = JSON.parse(JSON.stringify(rec || {}));
  const v = catchUpView(r, { practiceComplete });
  const fail = reason => ({ ok: false, rec: rec || {}, effects: {}, reason });
  const effects = {};
  const student = ['submit', 'confirmCorrection', 'resubmit'].includes(action);
  if (student && v.locked) return fail('locked');
  if (student && !r.startedAt) r.startedAt = now;
  switch (action) {
    case 'submit':
      if (!v.canSubmit) return fail(v.status === 'returned' ? 'use-resubmit' : 'not-ready');
      r.status = 'submitted'; r.submittedAt = now; r.submitCount = (r.submitCount || 0) + 1;
      effects.completeTile = r.submitCount === 1;
      effects.grantReward = !r.rewardGrantedAt;
      break;
    case 'confirmCorrection': if (v.status !== 'returned') return fail('not-returned'); r.correctionConfirmedAt = now; break;
    case 'resubmit':
      if (!v.canResubmit) return fail(v.status !== 'returned' ? 'not-returned' : !r.correctionConfirmedAt ? 'confirm-correction-first' : 'not-ready');
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
  r.history = [...(Array.isArray(r.history) ? r.history : []), action === 'sendBack' ? { at: now, event: action, note: r.returnNote } : { at: now, event: action }].slice(-20);
  return { ok: true, rec: r, effects };
}
