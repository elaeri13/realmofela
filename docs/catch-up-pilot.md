# Missed-Lesson Catch-Up — Session 2 Pilot (Quick Review)

_Version 2 on branch `claude/session2-catchup-pilot`. Version 1 shipped in PR #18. Not merged or deployed._

## Scope
- **Pilot tile:** only **The Stone Kingdoms · Session 2** (Write a Gist Statement, RI.5.2). Every other missed tile keeps the existing catch-up panel.
- **Unchanged trigger:** a lesson is "missed" when it's released, not complete, and the class has moved past it.

## Student flow: a ~5-minute Quick Review inside the Realm, then the required work
1. **Remember:** a short explanation of a gist statement.
2. **See one:** an original paragraph with the **topic** (yellow) and **important idea** (green) highlighted, then a modeled gist.
3. **Try one:** a second original paragraph with three possible gists.
   - Every choice gets explanatory feedback.
   - Wrong answers can be retried as often as needed; they cost nothing.
4. **Finish your work:** shows only the required Session 2 work the student hasn't finished — the **Exit Ticket** (Pear Deck), where the student writes their gist. Then **Submit for review**.

**What's required and what isn't**
- The Quick Review replaces the old review route (recap, example, full Wayground lesson). It doesn't replace the assignment.
- The full Wayground lesson is **not** required.
- **"Need more help?"** offers optional links:
  - the Wayground lesson
  - a Schoology video
  - Links that aren't set are hidden.

**Students who started in class** (opened Read and Learn or the Exit Ticket on the lesson day)
- They choose **⚡ Quick Review** or **➡ Continue my work**. Absent students do the Quick Review.
- After *Continue my work*, the Quick Review stays available through "Want a Quick Review first?".

**Honesty and rewards**
- **Opened, not finished:** opening the Exit Ticket only shows "Opened". The student taps **I finished the Exit Ticket**. The screen says the Realm can't see Pear Deck work.
- **Quick Review earns nothing:** no XP, no Gold, no mastery.
- **Submitting** completes the tile so the student can keep going. It's labelled "Submitted — awaiting review" and states it's not a mastery result.
- **The catch-up reward** (+3 XP, +3 Gold) is paid **once**, on the first submission. A database transaction guards it, even across two tabs. Resubmitting never pays again.

## Teacher review (Teacher Dashboard → Catch-Up Work to Review)
- **What each row shows:** how the student caught up, e.g. "Quick Review — correct on try 3" or "chose Continue my work".
- **Accept** confirms completion only. It never awards or upgrades Bronze/Silver/Gold or a Mastery Seal.
- **Send Back** requires a note and erases nothing. The student confirms the correction, then resubmits.
- **Boss safeguard (unchanged):** a catch-up submission on a boss's final encounter holds back the plain 🏅 encounter medal until Accept. Session 2 isn't a boss encounter.

## Editing the Quick Review (Lesson Schedule → The Stone Kingdoms → "Quick Review — Session 2")
**Fields:**
- explanation
- See one paragraph
- topic to highlight and important idea to highlight (copied exactly from the paragraph)
- modeled gist
- Try one paragraph
- three answer choices
- correct answer (1–3)
- one feedback line per choice
- optional Schoology video link

**Approval:**
- **Students only see approved text.** Until **Approve as final**, the tile skips the Quick Review and goes straight to the Exit Ticket. The draft text isn't sent to the student's page at all.
- **Approval checks the content:** every field must be filled in, the highlights must appear in the paragraph, there must be exactly three choices with matching feedback, and the correct answer must be 1–3.
- **Save as draft** returns edited content to Draft until it's approved again. Changing only the video link doesn't reset approval.
- **Fresh approval key** (`cuQuickReviewStatus`): approving version 1's recap/example doesn't carry over to the Quick Review.

**The sample content is original and is a draft for Ms. Odom to review:**
- See one: astronauts growing lettuce on the space station
- Try one: sailors navigating by the stars

## Existing students (no reset)
- **In progress under version 1:** those who reviewed or skipped the recap and example count as having finished the review. They open at Finish your work, and Read and Learn is no longer required.
- **Submitted, sent back or accepted:** these keep their status, and the reward stays paid.
- **Completed tiles and rewards** are untouched.

## Data
- **`students/{id}/catchUp/2_2` new fields:**
  - `route` (review / continue)
  - `rememberAt`, `seeAt`
  - `tryAttempts`, `tryLastChoice`, `tryCorrectAt`, `tryCorrectOnAttempt`
  - `videoOpenedAt`
  - `mustDone` (for future tiles that have workbook items)
- **`settings/lessonSchedule/2/2` new fields:**
  - `cuSeePassage`, `cuSeeTopic`, `cuSeeIdea`, `cuSeeGist`
  - `cuTryPassage`, `cuTryChoices`, `cuTryCorrect`, `cuTryFeedback`
  - `cuQuickReviewStatus`
  - `recapText` (the explanation) and `skillVideo` (the video) are the existing fields.

## Security note
While the database rules are open, these records can be changed by anyone, like everything else. When the secure rules are adopted, review statuses and `rewardGrantedAt` should become teacher-only or server-only.

## Tests
- `npm test`: catch-up logic tests, 33 total.
- **Browser pilot suite: 52/52** (in-memory database, fictional students), covering:
  - draft gating and approval validation
  - the absent-student flow with highlights, wrong/right feedback, retries and resume
  - Need-more-help links (hidden when missing, never required)
  - Opened vs. finished
  - submit, send back, resubmit and accept
  - the reward paid once, including a two-tab race
  - the in-class choice (Quick Review vs. Continue)
  - version-1 records
  - non-pilot tiles unchanged
  - the boss safeguard
  - phone and tablet layout
- **Regressions:**
  - Phase 3 46/46
  - Today's Lesson 37/37
  - Kingdoms' Gate 14/14
  - House selection 11/11
  - achievements 5/5
  - lesson links 22/22
