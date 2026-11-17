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
- **It also follows your dates** (see *Lesson dates* below). The line under the picker says which: "📅 Set by date" or "✋ Picked by you".

## Lesson Release (Lesson Schedule screen)
Release mode is set **per Land** and is **off** until you turn it on. While it's off, the old rule applies: sessions open on their release dates.

- **Turning it on takes two steps.** The first click saves nothing. It only shows a confirmation that lists every session in the Land in exactly one of three columns:
  1. **🔓 Open right away:** the release date has passed, or you released it the last time release mode was on.
  2. **🔒 Stay locked:** the release date is in the future. It opens on that date (or earlier if you release it).
  3. **🔒 Stay locked — no release date:** no date on it or on any later session, so it waits for you.

  The confirmation also counts any kept period settings and how many students are sitting on a session that will lock. It confirms that finished work, XP, Gold and items are kept.
  - **Only "Yes, turn on release mode" saves,** and it saves exactly the "Open right away" list. **Cancel** saves nothing.
  - **From then on,** a session opens on its release date, or earlier when you release it.
  - **🔓 Release next: Session N for all periods** is a one-tap daily action.
  - Each session row has **Release for all periods** / **Lock for all periods**, **P1–P4** buttons for one period, and **👁 Preview**.
  - A **dashed** period button means that period is set differently from the others. Click it again to make it follow all periods.
- **Turning it off** goes back to release dates. Your release list is kept for next time.

### Rules
- **Students see a locked session but can't start it.** Their map shows it, and opening it shows "Session N isn't open yet." They can't check off tasks, open links, submit, or earn XP or Gold on it.
- **Finished work is never locked.** A session a student already completed stays open to them.
- **Released sessions stay open for catch-up.** Missed-lesson detection uses "released" when release mode is on.
- **Period holds win, even over dates.** "Release next" never undoes one, and the schedule's auto-advance stops at a held-back session.
- **Lock for all periods** on a session that opened by date keeps it locked until you release it.
- **What's managed:** lessons, Writer's Craft, Study Hall, Camp Day and writing events. Boss and dungeon tiles keep their own teacher unlock; loot tiles follow their parent session.
- **Data:**
  - Stored at `settings/lessonRelease/{landId}` = `{ enabled, all: { tileId: true|false }, classes: { classId: { tileId: true|false } } }`.
    `all: false` means "locked for all periods by the teacher" (wins over the date).
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

## Lesson dates (automatic release and Today's Lesson)
Always on; there is no separate switch. (`settings/lessonAutomation/enabled`, added earlier, is no longer read.)

- **Set a Release Date and click Save** on each row of Lesson Schedule. The date counts from **midnight, Central time** (America/Chicago), even when no teacher is logged in.
- **Release mode on:** the session opens for all periods on its date. You can still release early, hold a period back, or lock it for all periods.
- **Sessions with no date:**
  - a writing event (e.g. The Scribe's Calling) opens with the session before it;
  - any other session opens when the next dated session after it opens, so one missing date never freezes the map;
  - if nothing after it is dated, it waits for you to release it.
- **Release mode off:** unchanged — dated sessions open on their date and undated ones are open.
- **Students are moved for you.** When a student opens the map, their marker moves forward to the latest open session (skipped sessions are not marked complete; they show as missed for catch-up). It never moves past a held-back or locked session, and never past that period's Today's Lesson (so sessions you dated or released ahead don't pull students forward).
- **Today's Lesson** = the latest session whose date has arrived, for every period. It stays current over weekends until the next date. Same date on two sessions → the later one in path order.
- **Your pick wins until the next date.** If you pick a lesson on the dashboard, it stays Today's Lesson until a newer dated lesson arrives. Periods you didn't change keep following the dates. With no dates at all, Today's Lesson works exactly as before.
- **Open screens refresh** within 30 seconds of midnight (hub, maps, dashboard).
- **Shown dates** use the date you typed (an old display bug showed them a day early).
- Logic: `src/lessonAutomation.js` (dates) and `src/lessonRelease.js` (release rules). Nothing here writes to the database.

## Tests
- `npm test`: `tests/lessonAutomation.test.js` (dates: midnight rollover, borrowed dates, Today's Lesson, teacher pick vs. date) and `tests/lessonRelease.test.js`. Covers the release rules, period overrides, turning release mode on and off, "release next", and the all-periods Today's Lesson update.
- `npm run test:browser`: `tests/browser/lessonAutomation.cjs` (dates in the real app, midnight rollover, map auto-advance, period hold, Catch-Up Needed collapse) and `tests/browser/lessonRelease.cjs`. The release suite covers:
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
