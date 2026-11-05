# Missed-Lesson Catch-Up — Unit 2, Module 1, Session 2 Pilot (one page)

_Branch `claude/session2-catchup-pilot`. Not merged or deployed._

## Scope
- **Pilot tile:** only **The Stone Kingdoms (Unit 2) · Session 2** — "Race to the Moon . . . and Beyond" and "The Path to the Moon", Write a Gist Statement, **RI.5.2**.
- **Not changed:**
  - every other missed session, which keeps the existing catch-up panel
  - boss battles
  - the regular lesson flow
  - the missed-lesson trigger

## Source
The content comes from the Unit 2, Module 1, Session 2 teacher guide (Curriculum Associates) provided by Ms. Odom.

The guide is marked "Copying is not permitted":
- The review and the reading summary are written in our own words.
- Only single sentences are quoted, where an answer choice needs them (Question 2 Part B).

Where each piece comes from:
- **Skill steps:** the guide's "Write a Gist Statement" page.
- **Worked example:** the guide's modeled gist for the whole text. Topic: *the Space Race*. Gist: *"The U.S. and the Soviet Union competed to reach the moon and explore space."*
- **Practice questions:** the guide's three Check for Understanding gist routines:
  1. paragraphs 6–8, "Get with the Programs" (multiple choice)
  2. paragraphs 10–15, "Shooting for the Stars" (**LEAP-style Part A / Part B**)
  3. the July 15, 1975 timeline entry, Apollo–Soyuz (multiple choice)

## Student page (one page, no steps)
1. **What is a gist statement?** A short explanation and the three steps.
2. **The reading:** a short summary of each section and the timeline.
3. **Worked example:** topic, then the most important ideas, then the gist statement.
4. **Practice:** three questions, with four parts to answer in total.
   - **Check my answers** shows feedback for every choice and a score.
   - Students can change answers and check again.
5. **Submit:** enabled once every question is answered and checked. Wrong answers can still be submitted for review.

There are **no videos, workbook pages, external links or extra steps.**

## Unchanged systems
- **Submitting:** completes the tile through the existing catch-up completion. It's labelled "Submitted — awaiting review", not mastery.
- **Reward:** the existing reward (+3 XP, +3 Gold) is paid **once**, guarded by a database transaction.
- **Teacher review:** Accept or Send Back, as before. Accept confirms completion only.
- **After Send Back:** the student sees the note and redoes and checks the practice, then confirms and resubmits. There's no second reward.
- **Boss safeguard:** unchanged.

## Data (no new database fields)
- **Practice answers stay in the browser** and aren't saved.
- **The score** goes in the existing activity log, e.g. "Session 2 catch-up practice: 3 of 4 correct", which the teacher can see.
- **The catch-up record** uses only fields that already exist:
  - `status`, `submittedAt`, `submitCount`, `history`
  - `rewardGrantedAt`, `correctionConfirmedAt`, `returnNote`, `returnedAt`, `acceptedAt`
  - `startedAt`, `updatedAt`
- **Removed:** the earlier Quick Review editor and its settings fields. The content is fixed to the lesson guide.
- **No security-rule changes.**
- **Possible later change (needs approval):** saving each student's chosen answers would let the teacher see them during review and keep a half-finished page if a student leaves. That would add one field to the catch-up record.

## Earlier pilot records
Submitted, returned and accepted records keep their status. Older in-progress records simply open the new page.

## Tests
- `npm test`: catch-up logic, 28 tests total. They check:
  - the content matches the lesson (standard, text, model gist, Part A/B)
  - every choice has feedback
  - there are no links or videos in the content
  - grading
  - only existing record fields are written
  - the reward is paid once
- **Browser pilot suite: 37/37** (fictional students, in-memory database).
- **Regressions:**
  - Phase 3 46/46
  - Today's Lesson 37/37
  - Kingdoms' Gate 14/14
  - House selection 11/11
  - achievements 5/5
  - lesson links 22/22
