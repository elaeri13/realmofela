# Missed-Lesson Catch-Up — Unit 2, Module 1, Session 2 Pilot (one page, auto-graded)

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
- Only Question 2 Part B quotes sentences from the text.

## Student page (one page)
1. **What is a gist statement?** A short explanation and the guide's three steps.
2. **Worked example** on paragraphs 1–5: a short reading, then topic → most important ideas → gist. This is the guide's own model: *"The U.S. and the Soviet Union competed to reach the moon and explore space."*
3. **Your turn:** three questions, **four scored parts**. Each question has its own short reading:
   - **Question 1:** "Get with the Programs" (paragraphs 6–8). Best gist?
   - **Question 2:** "Shooting for the Stars" (paragraphs 10–15). **Part A** asks for the gist; **Part B** asks which quoted sentence best supports it (LEAP-style).
   - **Question 3:** the July 15, 1975 timeline entry (Apollo–Soyuz). Best gist?
4. **Submit once:** enabled when all four parts are answered. There's no separate "Check my answers" button.

**Showing the skill, not copying:**
- Each practice reading gives the section's details but never states its gist.
- The worked example covers a different section.
- The wrong choices are true details from the reading.
- A test checks that no correct answer appears word-for-word in the review or in its reading. (Part B is exempt, because it asks for a quotation from the text.)

## Automatic grading
- **3 of 4 or better (75%):** the catch-up completes automatically.
  - The tile is marked complete through the existing catch-up completion.
  - The existing reward (+3 XP, +3 Gold) is paid **once**, guarded by a database transaction, so a double click can't pay twice.
  - The student sees their score and brief feedback for every part.
  - **No teacher approval** is needed.
- **Below 3 of 4:** the student sees their score, "You need 3 to pass", and a hint for each missed part. Missed parts are marked, and their answers stay so they can fix them and submit again.
  - No completion, no reward, and no penalty for retrying.
  - Hints explain why the chosen answer isn't the gist; the correct answer isn't revealed.

## Teacher visibility
- **New Teacher Dashboard list, Session 2 only:** "📊 Session 2 Catch-Up — Auto-Graded". Each student shows either **✅ Complete — 3/4 · 2 tries** or **⏳ Not passed yet — last 2/4 · 1 try**.
- **Activity log entries for every graded try**, e.g. "Session 2 catch-up passed automatically: 3 of 4 correct — complete" or "… 2 of 4 correct — not passed yet (needs 3)".
- **The shared "Catch-Up Work to Review" list is unchanged.** Auto-graded work never appears there. Submissions made under earlier pilot versions still do, and Accept / Send Back still work for them.
- **Sent-back students** take the auto-graded check, and a pass never pays the reward a second time.

## Data (existing structure only)
- **A pass** sets the record's existing `status` to `accepted` (an existing value), plus `acceptedAt`.
- **Every graded try** adds an entry to the existing `history` list: `{ at, event: 'autoPass' | 'autoFail', note: '3/4' }`.
- **Other fields used:** `startedAt`, `updatedAt` and `rewardGrantedAt`, which already exist.
- **Not stored:** practice answers. No new fields, and no security-rule changes.

## Tests
- `npm test`: catch-up logic, 29 tests total. They check:
  - the content matches the lesson (Part A/B, one correct answer, feedback for every choice)
  - no answer is copied from the review or readings
  - the 75% threshold (3/4 and 4/4 pass; 2/4 fails)
  - all parts must be answered
  - the reward is paid once
  - retries
  - earlier-version records
  - only existing fields are written
- **Browser pilot suite: 31/31** (fictional students, in-memory database), including a double-clicked Submit and the teacher list.
- **Regressions:**
  - Phase 3 46/46
  - Today's Lesson 37/37
  - Kingdoms' Gate 14/14
  - House selection 11/11
  - achievements 5/5
  - lesson links 22/22
