# Missed-Lesson Catch-Up (review → auto-graded practice → Pear exit ticket)

_Session 2 merged in PR #19. Session 3 added on branch `claude/ela-standards-medals-audit-evm13l` (not merged or deployed)._

## Scope
- **Sessions with the new catch-up:**
  - **The Stone Kingdoms (Unit 2) · Session 2:** "Race to the Moon . . . and Beyond" and "The Path to the Moon", Write a Gist Statement, **RI.5.2**
  - **The Stone Kingdoms (Unit 2) · Session 3:** Packing for Mars, Part 1, Explain Main Ideas (**RI.5.2**) and Use Context Clues (**L.5.4a**). See [Session 3](#session-3--packing-for-mars-part-1).
- **Not changed:**
  - every other missed session, which keeps the existing catch-up panel
  - boss battles
  - the regular lesson flow
  - the missed-lesson trigger

## How sessions plug in (reusable framework)
- **One content entry per session:** each session is one entry in `SESSION_CONTENT` (`src/catchUp.js`), keyed `land_tile` (e.g. `'2_3'`). Adding an entry turns the new catch-up on for that tile. Nothing else in the code needs to change.
- **What each session provides:**
  - **review content:** `reviews` holds one or more sections, each with a title, explanation, steps, and a worked example (`walk` steps and an `answer`)
  - **practice questions:** `questions`, each with its own reading and parts. Each part has four choices with exactly one `correct: true` (the answer key) and feedback on every choice. Mark `quote: true` on a part whose correct answer quotes its reading.
  - **pass mark:** `passMin` (default 3)
- **Shared by every session:**
  - **Pear link:** not in the content; it is the session's link saved in Content Links or Lesson Schedule.
  - **Completion state:** stored per session at `students/{id}/catchUp/{land_tile}`.
  - **Student page, grading, Pear stage, rewards, dashboard list and session filter:** the same code for every session.
- **Automatic tests for every session:** answers not copied from the review, four choices with one correct answer, feedback on every choice, and no links in the content.

## Session 3 — Packing for Mars, Part 1
All readings are **original** (not quoted from the book) and are about astronaut training, gravity, and living in space.
- **Review A, Explaining Main Ideas:** a worked example ("Your Body in Microgravity", which explains that gravity still pulls on the station and astronauts float because they are falling around Earth together) that models topic → key details → main idea.
- **Review B, Using Context Clues:** a worked example ("disoriented") that models the clues → meaning → checking that the meaning fits the sentence. It also names the lesson's vocabulary words, *fundamental* and *technique*.
- **Practice:** pass at 3 of 4. The answer key is checked by tests.

| Question | Skill | Correct answer |
|---|---|---|
| 1 | Main idea of "A Pool for Astronauts" | C |
| 2 | Supporting detail for a given main idea ("Bedtime on the Space Station") | B |
| 3 | Meaning of *technique* from context ("Getting Around in Microgravity") | D |
| 4 | Sentence that supports the meaning of *fundamental* ("Ready for Mars") | A |

- **Boss:** Session 3 is the first Chronicler session. Completing it only marks the Chronicler as "sighted"; there is no medal or seal.
- **Existing progress:** students who already finished Session 3 with the old panel stay complete. They don't see the new page and aren't paid again.

## Source
The content comes from the Unit 2, Module 1, Session 2 teacher guide (Curriculum Associates). The guide is marked "Copying is not permitted":
- The explanation and readings are retold in our own words.
- Only Question 2 Part B quotes## Student page: three stages on one page
1. **Review the Skill:** a short explanation, the guide's three steps, and a worked example on paragraphs 1–5 (a reading, then topic → most important ideas → gist). This is the guide's own model: *"The U.S. and the Soviet Union competed to reach the moon and explore space."*
2. **Prove Your Knowledge:** three questions with **four scored parts**, each question with its own short reading:
   - **Question 1:** "Get with the Programs" (paragraphs 6–8). Best gist?
   - **Question 2:** "Shooting for the Stars" (paragraphs 10–15). **Part A** asks for the gist; **Part B** asks which quoted sentence best supports it (LEAP-style).
   - **Question 3:** the July 15, 1975 timeline entry (Apollo–Soyuz). Best gist?
3. **Complete Your Pear Exit Ticket:** this stage stays locked until practice is passed. After that the student sees:
   - a note that the exit ticket is **required even though they missed the lesson**
   - a large **"📝 Open my Session 2 Pear exit ticket"** button, which opens in a new tab
   - **"✅ I've Submitted My Exit Ticket"**, which is disabled until the student has opened the exit ticket
   - **If no Pear link is saved for the session:** "Your Pear exit ticket link isn't ready yet. Tell Ms. Odom…" The student can't report, and the tile stays incomplete. No link is ever made up.

**Showing the skill, not copying:**
- Each practice reading gives the section's details but never states its gist.
- The wrong choices are true details from the reading.
- A test checks that no correct answer appears word-for-word in the review or in its reading. (Part B is exempt, because it asks for a quotation from the text.)

## Practice grading (unchanged)
- **3 of 4 or better (75%) passes.** The student sees their score and feedback, and Stage 3 unlocks. Passing **only records the score**. It doesn't complete the tile or pay a reward.
- **Below 3 of 4:** the student sees their score, "You need 3 to pass", and a hint for each missed part. Retries are unlimited and have no penalty.
- **Every try is kept** in the record's history (`autoFail` / `autoPass`, with the score).

## Pear link
- **Source:** the link already saved for the session, in Content Links (`tileLinks`) or the Lesson Schedule. It's the same link regular attendees use, read through the existing `getEffectivePear`.
- **Future sessions** use their own saved Pear links. Adding one to the pilot is a content entry in `src/catchUp.js` plus its tile key.

## Pear tracking and verification
- **Pear can't report back to the Realm,** so submission can't be confirmed automatically. The same is true in regular lessons.
- **Opened:** clicking the Pear button records `etOpenedAt`. An exit ticket opened on the lesson day (`exitTicketOpened`) also counts.
- **Reported:** clicking "I've Submitted My Exit Ticket" records `etConfirmedAt` and sets `status: submitted`.
- **Verified:** the teacher checks Pear, then clicks **Verify** on the dashboard, which sets `status: accepted`.
- **Send Back:** the teacher must add a note. The student sees the note and reports again. The tile and reward are **not** taken away.

## When completion and rewards happen
- **When the student reports the Pear exit ticket** (after passing practice and opening Pear):
  - the tile is completed through the existing catch-up completion
  - **+3 XP / +3 Gold** is paid **once**, guarded by a database transaction on `rewardGrantedAt`
- **No reward** for failing, passing practice, opening Pear, refreshing, double-clicking, re-reporting after Send Back, or teacher Verify.
- **Boss/medal safeguard (unchanged):** a catch-up completion never awards a medal level by itself. Verify applies the deferred medal step; there's still no Mastery Seal.

## Records from earlier pilot versions
- **Submitted or accepted (the student confirmed the Exit Ticket under v1):** the completion, tile and reward are kept. These show as "exit ticket reported" or "verified", with practice listed as "before update". Nothing is reset.
- **Returned under v1:** the student only reports the exit ticket again. There's no practice and no second reward.
- **In progress, never submitted:** the student must now pass practice, then complete Pear.

## Teacher visibility
- **"📊 Catch-Up Sessions — N completed · M verified" on the Teacher Dashboard.** One list covers every catch-up session, with filter buttons for **All sessions / Session 2 / Session 3**, each showing a count. Each row starts with a status badge:
  - **✅ Completed (Student Reported):** passed practice and reported the Pear exit ticket. The tile and reward are already given, and **no teacher action is needed**.
  - **🛡️ Verified:** the teacher checked Pear and clicked Verify. This is an optional spot-check that never adds rewards.
  - **↩ Sent back — re-reporting:** the tile, reward and practice score are kept.
  - **⏳ In progress**
- **The row also shows:**
  - name and student number, period, and session
  - practice result (✓ score / ✗ last score / before update) and number of tries
  - Pear status (not started / opened / reported, not verified / verified ✓ / sent back / link missing)
  - whether the tile is fully complete
  - **Verify** and **Send Back** buttons
- **The activity log** records practice passes and fails, Pear reports ("not verified yet") and verifications.
- **The shared "Catch-Up Work to Review" list** no longer shows the auto-graded sessions. Other sessions are unchanged.

## Data (existing structure only)
- **Fields used:** only fields that already exist on the catch-up record: `history`, `etOpenedAt`, `etConfirmedAt`, `status` (submitted / returned / accepted), `submittedAt`, `submitCount`, `acceptedAt`, `returnNote`, `returnedAt`, `rewardGrantedAt`, `startedAt`, `updatedAt`.
- **Not stored:** practice answers.
- **No new fields** and **no security-rule changes.**

no security-rule changes.

## Tests
- `npm test`: catch-up logic, 34 tests, including the content checks above for every session. They cover:
  - the threshold, and fail → retry → pass with no completion
  - Stage 3 locked before passing; opened ≠ reported
  - report → completion + reward once; duplicate reports refused
  - missing link
  - Verify / Send Back / re-report with no second reward
  - earlier-version records
  - only existing fields written; no mutation
- **Session 3 browser suite: 49/49:** reviews, wrong/right answers, retry, refresh at each stage, Session 3's own Pear link, double-click report paying once, Chronicler sighted only, dashboard filter, Send Back, Verify, old-panel progress kept, today's-lesson view unchanged, missing link, phone and tablet layout.
- **Session 2 browser suite: 48/48** (fictional students, in-memory database). It covers:
  - fail and retry
  - pass
  - the Pear link opening the stored URL
  - opened vs reported
  - a double-clicked report paying once
  - refresh at every stage
  - teacher Verify / Send Back (practice score and attempts kept, no second reward)
  - the Completed (Student Reported) vs Verified badges
  - an absent student getting the saved link weeks later
  - a lesson-day exit ticket
  - a missing link
  - earlier-version records
  - the boss safeguard
  - other sessions unchanged
  - simultaneous reward grants
  - phone and tablet layout
- **Regressions:**
  - Phase 3 46/46
  - Today's Lesson 37/37
  - Kingdoms' Gate 14/14
  - House selection 11/11
  - achievements 5/5
  - lesson links 22/22
