# Today's Lesson for All Periods + Lesson Release

## Today's Lesson (Teacher Dashboard)
- **Save for all 4 periods** sets the same lesson for every period in one step.
  - It writes only `settings/currentSession/1–4`, as a single multi-path update.
  - No other setting changes.
- **Save for Period N only** changes one period, just like before.
- **Summary line:** shows "✓ Same for all periods: Session 4", or "Periods differ: P1 … P4" with the current period highlighted.
- **👁 Preview** opens the chosen lesson as students see it.
- **Release warning:** if the chosen lesson isn't released for this period, a warning appears. It never unlocks anything; that stays your decision in Lesson Release.
- **Nothing else moves:** saving Today's Lesson never moves a student, and never locks or unlocks a lesson.

## Lesson Release (Lesson Schedule screen)
Release mode is set **per Land** and is **off** until you turn it on. While it's off, the old rule applies: sessions open on their release dates.

- **Turning it on:** every session whose release date has already passed stays open for all periods. From then on, a session opens only when you release it.
  - **🔓 Release next: Session N for all periods** is a one-tap daily action.
  - Each session row has **Release for all periods** / **Lock for all periods**, **P1–P4** buttons for one period, and **👁 Preview**.
  - A **dashed** period button means that period is set differently from the others. Click it again to make it follow all periods.
- **Turning it off** goes back to release dates. Your release list is kept for next time.

### Rules
- **Students see a locked session but can't start it.** Their map shows it, and opening it shows "Session N isn't open yet." They can't check off tasks, open links, submit, or earn XP or Gold on it.
- **Finished work is never locked.** A session a student already completed stays open to them.
- **Released sessions stay open for catch-up.** Missed-lesson detection uses "released" when release mode is on.
- **Period holds win.** "Release next" never undoes one, and the schedule's auto-advance stops at a held-back session.
- **What's managed:** lessons, Writer's Craft, Study Hall, Camp Day and writing events. Boss and dungeon tiles keep their own teacher unlock; loot tiles follow their parent session.
- **Data:**
  - Stored at `settings/lessonRelease/{landId}` = `{ enabled, all: { tileId: true }, classes: { classId: { tileId: true|false } } }`.
  - Each click writes only those children.

### Where the lock is enforced
- **The page:** a locked session shows the locked card, so there are no buttons to press.
- **Every action handler checks first:**
  - task checkboxes; Read and Learn / Exit Ticket / Pear buttons
  - Camp and Study Hall complete; writing submit
  - Training Complete / Needs More Practice; the old catch-up button
  - new catch-up grade / open Pear / report; writing-event confirm

  A browser test forces the normal page onto a locked session and clicks "Training Complete". Nothing is saved: no completion, no XP, no Gold.
- **Limit:** the live database rules still allow any browser to write directly. A student with developer tools could still change data by hand. Closing that gap needs the server-side security work: secure rules plus Cloud Functions for rewards.

### Teacher preview
**👁 Preview** shows any session, locked or not, as students see it, under a "Teacher preview — nothing is saved" banner.
- For catch-up sessions you can switch to the missed-day catch-up page and try the questions. The answers are graded on the page only.

## Tests
- `npm test`: `tests/lessonRelease.test.js`. Covers the release rules, period overrides, turning release mode on and off, "release next", and the all-periods Today's Lesson update.
- `npm run test:browser`: `tests/browser/lessonRelease.cjs`, 43 checks. Covers:
  - all-periods and period-only Today's Lesson
  - locked card
  - the handler bypass
  - release for all / one period
  - auto-advance stopping at a hold
  - completed work kept
  - catch-up
  - preview saving nothing
  - turning off
  - phone layout
