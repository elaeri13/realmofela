# Missed-Lesson Catch-Up — Unit 2, Module 1, Session 2 Pilot (review → auto-graded practice → Pear exit ticket)

_Branch `claude/session2-catchup-pilot`. Not merged or deployed._

## Scope
- **Pilot tile:** only **The Stone Kingdoms (Unit 2) · Session 2** — "Race to the Moon . . . and Beyond" and "The Path to the Moon", Write a Gist Statement, **RI.5.2**.
- **Not changed:**
  - every other missed session, which keeps the existing catch-up panel
  - boss battles
  - the regular lesson flow
  - the missed-lesson trigger

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
- **"📊 Session 2 Catch-Up (N to verify)" on the Teacher Dashboard.** For each student, the list shows:
  - name and student number, period, and session
  - practice result (✓ score / ✗ last score / before update) and number of tries
  - Pear status (not started / opened / reported, not verified / verified ✓ / sent back / link missing)
  - whether the tile is fully complete
  - **Verify** and **Send Back** buttons
- **The activity log** records practice passes and fails, Pear reports ("not verified yet") and verifications.
- **The shared "Catch-Up Work to Review" list** no longer shows Session 2. Other sessions are unchanged.

## Data (existing structure only)
- **Fields used:** only fields that already exist on the catch-up record: `history`, `etOpenedAt`, `etConfirmedAt`, `status` (submitted / returned / accepted), `submittedAt`, `submitCount`, `acceptedAt`, `returnNote`, `returnedAt`, `rewardGrantedAt`, `startedAt`, `updatedAt`.
- **Not stored:** practice answers.
- **No new fields** and **no security-rule changes.**

no security-rule changes.

## Tests
- `npm test`: catch-up logic, 31 tests. They cover:
  - the threshold, and fail → retry → pass with no completion
  - Stage 3 locked before passing; opened ≠ reported
  - report → completion + reward once; duplicate reports refused
  - missing link
  - Verify / Send Back / re-report with no second reward
  - earlier-version records
  - only existing fields written; no mutation
- **Browser pilot suite: 40/40** (fictional students, in-memory database). It covers:
  - fail and retry
  - pass
  - the Pear link opening the stored URL
  - opened vs reported
  - a double-clicked report paying once
  - refresh at every stage
  - teacher Verify / Send Back
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
