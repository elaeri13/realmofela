# Missed-Lesson Catch-Up — Session 2 Pilot

_Branch `claude/session2-catchup-pilot` (from `main`, separate from PR #17). Not merged or deployed._

## Scope
- **Pilot tile:** only **The Stone Kingdoms · Session 2** (Write a Gist Statement, RI.5.2). Every other missed tile keeps the existing catch-up panel.
- **To add more lessons later:** add each one to `CATCHUP_PILOT_TILES` in `src/catchUp.js`.
- **The missed-lesson trigger is unchanged.** A lesson counts as missed when it's released, not complete, and the class has moved past it.

## Student flow: Recap → Example → Your Work → Submit
1. **Skill Recap:** short text with a **Got it** button. No video is needed.
2. **Worked Example:** a short original passage, followed by the steps to a gist statement, revealed one at a time.
3. **Your Work:** directions for what's left.
   - **① Read and Learn (Wayground).** Exit Ticket unlocks after the student confirms Read and Learn.
   - **② Exit Ticket (Pear Deck).** The student's answer stays in Pear Deck; there's no typing box in the Realm.
   - **Opening a link only records "Opened".** The student taps **I finished …** separately.
   - The screen says the Realm can't see work in Wayground or Pear Deck.
4. **Submit for review:**
   - The tile counts as complete, so the student can keep going.
   - It's labelled **"Submitted — awaiting review"** and states it's "not a mastery result".
   - The existing catch-up reward (+3 XP, +3 Gold) is given once.

**Saved progress:**
- Every step is saved to `students/{id}/catchUp/{land}_{tile}`.
- Reopening the tile resumes at the next unfinished step, with a "Welcome back" note.
- **Work opened on the lesson day** (the existing `taskProgress` flags) shows as **"Opened (in class)"**. The student still confirms it themselves.
  - For those students the recap and example are optional, so they don't repeat them.

## Teacher review (Teacher Dashboard → "Catch-Up Work to Review")
- **Accept:** status becomes "Reviewed — accepted by Ms. Odom".
- **Send Back:** needs a correction note, which the student sees on the tile and in a map banner.
  - Nothing is erased: the tile stays complete, and XP, Gold, achievements and confirmations are kept.
  - The student taps **I made the correction**, then **Resubmit**.
  - **Resubmitting never awards XP or Gold again.** The reward marker is claimed by a database transaction, so even two tabs at once pay out once.
- **"Waiting on student"** lists work that's been sent back.

## Boss progress: submission never awards verified mastery
**Verified mastery** in the Realm is teacher-awarded:
- the **Mastery Seal** (Judgment Hall)
- **Bronze / Silver / Gold** medal levels (demonstration count)

Completing a tile never sets those, and catch-up doesn't change that.

**Encounter progress:**
- **When a catch-up is submitted:** standard-boss encounter tracking counts, as it does for any completed session.
- **On the boss's final encounter session:**
  - the 🏅 encounter Medal is held back
  - so is the "request a Mastery Seal" option it unlocks
  - the boss record is marked `medalAwaitingReview`
- **On Accept:** the held-back Medal is applied. It never downgrades a higher status, and the Seal itself is still awarded only in Judgment Hall.
- **On Send Back:** nothing is applied or removed.
- **Teacher-set demonstration counts** are always kept.

**Gate bosses (trials):** completing the session still unlocks the trial *attempt*, as today. Trophies are still judged by the teacher.

**Session 2 itself** isn't a boss encounter: the Chronicler's sessions are S3, S8 and S12, and the first gate is S6. So the pilot tile has no boss effect at all. The safeguard matters once the flow expands to other sessions.

## Editable content (Lesson Schedule → choose The Stone Kingdoms)
- **The "Catch-up pilot — Session 2" box** holds the skill recap, the example passage, and the example steps (one per line: `Question | Answer`).
- **Saving the recap** also updates the existing Recap Text column for Session 2.
- **Draft badge:** the box shows **Draft — not yet approved** until you press **Approve as final**. Approving saves the text on screen first.
- **Students see the draft** on this branch; nothing is deployed.

## Security note
Like everything today, these records are writable by anyone while the database rules are open. When the secure rules are adopted, `catchUp/*/status` values `accepted` and `returned`, and `returnNote`, should be teacher-only, and `rewardGrantedAt` should be server-only.

## Tests
- `npm test`: catch-up logic, 13 tests (21 total).
- **Browser pilot suite (in-memory database): 52/52.** It covers:
  - the full flow and resume
  - Opened vs. confirmed
  - submit, send back, resubmit and accept
  - the once-only reward, including a two-tab race
  - work started in class
  - other missed tiles unchanged
  - the boss safeguard
  - the editor and approval
  - phone and tablet layout
- **Regressions:**
  - Kingdoms' Gate story 14/14
  - House selection 11/11
  - achievements 5/5
  - lesson links 22/22
  - today's lesson 35/37 (the 2 misses are outdated expectations)
