// Missed-lesson catch-up — pure logic, no Firebase. Unit-tested in tests/catchUp.test.js.
//
// Each session listed in SESSION_CONTENT gets the same one-page catch-up, three stages:
//   1. Review the Skill(s)     — short explanation(s) + worked example(s)  (content.reviews, or the
//                                Session 2 shape: explain/steps/example — see reviewsOf)
//   2. Prove Your Knowledge    — auto-graded parts; pass = content.passMin (default 3) ; free retries
//   3. Complete Your Pear Exit Ticket — the SAME Pear Assessment exit ticket the class took (the session's
//      stored Pear link). Opening it is only "Opened"; the student then reports "I've Submitted My Exit Ticket".
// Completion: the catch-up tile is finalized — and the existing XP/Gold paid once — only when the student
// reports the Pear submission (after passing practice). Passing practice alone records the score only.
// The Realm cannot see Pear Assessment, so a report is "student-reported"; the teacher verifies it in Pear
// and confirms it in the Realm (status 'accepted'), or sends it back.
// Adding a session = one SESSION_CONTENT entry keyed 'land_tile'. Its Pear link comes from the session
// settings (Content Links / Lesson Schedule), never from this file.
//
// Data — existing catch-up record fields only (no new fields):
//   history[]      { at, event: 'autoPass'|'autoFail', note: '3/4' } per graded try; 'accept'/'sendBack' events
//   etOpenedAt     Pear exit ticket opened            etConfirmedAt  student reported submitting it
//   status         unset (working) → 'submitted' (Pear reported, tile complete) → 'accepted' (teacher verified)
//                  'returned' (teacher sent back: report again)
//   submittedAt, submitCount, rewardGrantedAt, acceptedAt, returnedAt, returnNote, startedAt, updatedAt
// Practice answers are not stored.

export const catchUpKey = (landId, tileId) => `${landId}_${tileId}`;
export const isCatchUpPilot = (landId, tileId) => Object.prototype.hasOwnProperty.call(SESSION_CONTENT, catchUpKey(landId, tileId));
export const PASS_MIN = 3;   // default: of 4 scored parts (75%); a session may set content.passMin

export const SESSION_CONTENT = {
  // Unit 2, Module 1, Session 2 — source: the Session 2 teacher guide (RI.5.2 gist); readings retold.
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
          { id: 'q2b', label: 'Part B', quote: true, prompt: 'Which sentence from the text best supports the answer to Part A?',
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
  // Unit 2, Module 1, Session 3 — Packing for Mars, Part 1. Explain main ideas (RI.5.2) + context clues
  // (L.5.4a); lesson vocabulary: fundamental, technique. All readings below are original (not quoted).
  '2_3': {
    skill: 'Explain Main Ideas · Use Context Clues',
    standard: 'RI.5.2 · L.5.4a',
    textTitle: 'Packing for Mars, Part 1',
    passMin: 3,
    reviews: [
      { title: 'Review A: Explaining Main Ideas',
        explain: [
          'The main idea is the most important point the author wants you to understand about a section.',
          'Supporting details are the facts and examples that explain or prove the main idea. A main idea is not always written in one sentence. Sometimes you put it together from the details.',
        ],
        steps: [
          'Find the topic: What is this section mostly about?',
          'Look at the key details. What do they have in common?',
          'State the main idea: What point do all of those details help the author make?',
          'Check it: Does every key detail support your main idea? If a sentence covers only one small part, it is a detail, not the main idea.',
        ],
        example: {
          label: '“Your Body in Microgravity”',
          reading: 'On Earth, gravity pulls blood and other fluids in your body down toward your feet. Gravity still pulls on the space station, too. That pull keeps the station circling Earth. But the station and everyone inside it are falling around Earth together, so astronauts float. Scientists call this microgravity. Without the steady pull toward their feet, the fluids in astronauts’ bodies shift up toward their heads. Astronauts’ faces look puffy, and their legs get skinnier. Their noses often feel stuffed up, as if they have a cold. Some astronauts even say food tastes bland during their first days in space.',
          walk: [
            { h: 'Topic', text: 'what happens to body fluids in microgravity' },
            { h: 'Key details', list: ['Faces look puffy and legs get skinnier.', 'Noses feel stuffed up.', 'Food can taste bland.'] },
          ],
          answer: { label: 'Main idea', text: 'In microgravity, fluids shift up in an astronaut’s body, and that changes how the astronaut looks and feels.' },
          note: '“Their legs get skinnier” is true, but it tells only one part. The main idea ties all the details together.',
        } },
      { title: 'Review B: Using Context Clues',
        explain: [
          'When you meet a word you don’t know, look at the words and sentences around it. Authors often leave context clues: a definition, an example, a word that means the same thing, or an opposite.',
          'In Packing for Mars, Part 1, you met the words fundamental and technique. Context clues can help you figure out words like these.',
        ],
        steps: [
          'Reread the sentence with the word, plus the sentences before and after it.',
          'Look for clues: a definition, examples, a word that means the same, or an opposite (watch for but and unlike).',
          'Make your best guess about the meaning.',
          'Check it: Put your meaning in place of the word. Does the sentence still make sense?',
        ],
        example: {
          label: 'The word “disoriented”',
          reading: 'During her first hour in orbit, the astronaut felt disoriented. She could not tell which way was up, and she kept reaching for handholds on the wrong side of the cabin.',
          walk: [
            { h: 'Unfamiliar word', text: 'disoriented' },
            { h: 'Clues nearby', list: ['“could not tell which way was up”', '“reaching for handholds on the wrong side”'] },
          ],
          answer: { label: 'Meaning', text: 'confused about where you are or which way you are facing' },
          note: 'Check: “The astronaut felt confused about which way she was facing.” It makes sense! The clues were in the next sentence, so always read around the word.',
        } },
    ],
    questions: [
      { id: 'q1', title: 'Question 1',
        readingTitle: '“A Pool for Astronauts”',
        reading: 'One of the world’s biggest swimming pools is not used for swimming races. It sits in Houston, Texas, and holds about 6 million gallons of water. On the bottom is a full-size model of parts of the International Space Station. Astronauts put on real spacesuits, and divers add small weights until each astronaut hovers in place, neither sinking nor floating up. For every hour of a real spacewalk, astronauts may practice about seven hours in the pool. Safety divers swim close by the whole time.',
        parts: [{ id: 'q1', prompt: 'Which sentence best states the main idea of this section?',
          choices: [
            { text: 'NASA has a huge pool with a full-size model of the space station on the bottom.', feedback: 'That tells what the pool is, but not why astronauts use it. A main idea should cover the whole section.' },
            { text: 'Astronauts spend many hours practicing for each spacewalk.', feedback: 'That is part of it, but it leaves out the pool, which the whole section is about, and why the pool helps.' },
            { text: 'Astronauts train in a giant pool because hovering underwater is a lot like floating in space.', correct: true, feedback: 'The model station, the weights that make astronauts hover, and the long practice all show how the pool gets astronauts ready for space.' },
            { text: 'Safety divers swim close to the astronauts the whole time.', feedback: 'That is a supporting detail about safety. It is only one small part of the section.' },
          ] }] },
      { id: 'q2', title: 'Question 2',
        readingTitle: '“Bedtime on the Space Station”',
        reading: 'Everyone needs sleep to stay healthy and alert. On the space station, there is no up or down. A sleeping astronaut could drift across the cabin and bump into equipment. To stay put, astronauts zip themselves into sleeping bags that are tied to the wall. The station circles Earth so quickly that the Sun rises and sets about 16 times a day, so many astronauts wear eye masks. Some crew members enjoy looking out the window at Earth before bed.',
        parts: [{ id: 'q2', quote: true, prompt: 'The main idea of this section is that sleeping in space takes special planning. Which detail best supports this main idea?',
          choices: [
            { text: '“Everyone needs sleep to stay healthy and alert.”', feedback: 'That is true on Earth, too. It doesn’t show what is special about sleeping in space.' },
            { text: '“To stay put, astronauts zip themselves into sleeping bags that are tied to the wall.”', correct: true, feedback: 'This shows the planning itself: astronauts tie their sleeping bags down so they don’t drift while asleep.' },
            { text: '“A sleeping astronaut could drift across the cabin and bump into equipment.”', feedback: 'This explains a problem with sleeping in space, but not the plan. The best answer shows what astronauts do to solve it.' },
            { text: '“Some crew members enjoy looking out the window at Earth before bed.”', feedback: 'This is about bedtime, but it tells what some astronauts like to do. It is not part of planning for sleep.' },
          ] }] },
      { id: 'q3', title: 'Question 3',
        readingTitle: '“Getting Around in Microgravity”',
        reading: 'Moving around the space station looks easy, but it takes practice. New astronauts often push off a wall too hard and go tumbling. Crew members who have lived there for months teach them a better technique. Push off gently with your fingertips, keep your arms close to your body, and grab a handrail to stop. After some practice, new astronauts glide smoothly from one end of the station to the other.',
        parts: [{ id: 'q3', prompt: 'What does the word technique mean in this section?',
          choices: [
            { text: 'a piece of equipment that helps astronauts move', feedback: 'A handrail is equipment, but the technique is the set of steps for moving, not an object.' },
            { text: 'a mistake that new astronauts make', feedback: 'Pushing off too hard is the mistake. The technique is the better way the experienced crew teaches.' },
            { text: 'a strong, fast push', feedback: 'The steps say to push off gently, which is the opposite of a strong push.' },
            { text: 'a special way of doing something, step by step', correct: true, feedback: 'Right after the word, the crew explains how to move: push off gently, keep your arms close, grab a handrail. That is a way of doing something.' },
          ] }] },
      { id: 'q4', title: 'Question 4',
        readingTitle: '“Ready for Mars”',
        reading: 'A trip to Mars could take about seven months. Before astronauts go, they must master some fundamental skills. Everyday skills, like eating and sleeping in microgravity, are the foundation that every other part of the mission is built on. Practicing these skills on Earth is tricky, because Earth’s gravity never stops pulling.',
        parts: [{ id: 'q4', quote: true, prompt: 'The word fundamental means “basic and most important.” Which sentence best helps the reader understand this meaning?',
          choices: [
            { text: '“Everyday skills, like eating and sleeping in microgravity, are the foundation that every other part of the mission is built on.”', correct: true, feedback: 'A foundation is what everything else is built on, so fundamental skills are the basic, most important ones.' },
            { text: '“A trip to Mars could take about seven months.”', feedback: 'This tells how long the trip is. It does not explain the word fundamental.' },
            { text: '“Before astronauts go, they must master some fundamental skills.”', feedback: 'This sentence uses the word, but it doesn’t explain it. Look for the sentence that tells what these skills are like.' },
            { text: '“Practicing these skills on Earth is tricky, because Earth’s gravity never stops pulling.”', feedback: 'This tells why practice is hard, not what fundamental means.' },
          ] }] },
    ],
  },
};
export const sessionContent = (landId, tileId) => SESSION_CONTENT[catchUpKey(landId, tileId)] || null;
export const practiceParts = content => (content ? content.questions.flatMap(q => q.parts) : []);
export const passMinOf = content => (content && Number.isInteger(content.passMin) ? content.passMin : PASS_MIN);
// Every catch-up session, in map order: [{ key, landId, tileId }]
export const catchUpSessions = () => Object.keys(SESSION_CONTENT)
  .map(key => { const [landId, tileId] = key.split('_').map(Number); return { key, landId, tileId }; })
  .sort((a, b) => a.landId - b.landId || a.tileId - b.tileId);
// Review sections in one shape: [{ title, explain[], steps[], example: { label, source, reading, walk[], answer, note } }].
// Session 2 keeps its original single-review fields (explain/steps/example with topic/ideas/gist).
export function reviewsOf(c) {
  if (!c) return [];
  if (Array.isArray(c.reviews)) return c.reviews.map(r => ({ ...r, example: { source: '', ...r.example } }));
  const e = c.example || {};
  return [{ title: '', explain: c.explain || [], steps: c.steps || [], example: {
    label: e.label, source: c.author ? `from “${c.textTitle}” by ${c.author}` : '', reading: e.reading,
    walk: [{ h: 'Topic', text: e.topic }, { h: 'Most important ideas', list: e.ideas || [] }],
    answer: { label: 'Gist statement', text: e.gist }, note: e.note } }];
}

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
  const passMin = passMinOf(content);
  return { items, total: parts.length, correctCount, answeredAll, passMin, passed: answeredAll && correctCount >= passMin };
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
