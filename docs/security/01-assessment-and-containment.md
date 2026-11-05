# Realm of ELA — Security Assessment & Immediate Containment

_Prepared 2026-11-04. Read-only investigation. Nothing in production (Firebase, Vercel, GitHub settings) was changed._

## What I could and couldn't verify

| Verified directly | How |
|---|---|
| The **code that's live** on realmofela.com (`main`, deployed by Vercel on every merge) | read the repository |
| The **repository is public** on GitHub | GitHub API: `elaeri13/realmofela` → `visibility: public` |
| What the **9 committed backup files** contain | opened them |

| **Not** verified (no access from this environment) | How you can check (2 minutes) |
|---|---|
| The rules **actually deployed** in Firebase. The repo's `database.rules.json` says `".read": true, ".write": true`. | Firebase console → **Realtime Database → Rules**. If it shows `".read": true` / `".write": true`, the findings below apply. |
| Whether **anonymous sign-in** is enabled (the app calls it at startup) | Firebase console → **Authentication → Sign-in method** → is *Anonymous* "Enabled"? |
| Whether the database answers **without signing in** | Open `https://<your-database>.firebaseio.com/settings.json` in a private browser window (your database URL is under **Realtime Database → Data**, at the top). If you see data instead of "Permission denied", it's open to the whole internet. |

## Findings

### 1. 🔴 The GitHub repository is public and contains student data
- **The backup files:** 9 files (`backup_2026-08-*.json` in the repo root) hold exports of **all 120 student seats**:
  - student numbers (101–430) and character names
  - progress, inventory and boss results
  - activity logs and help-flag messages typed by students
  - a **grade log with raw scores** (for example `rawGrade: 99`)
- **What's not exposed:** no real names; the real-name roster was **never** committed. Custom PINs aren't in these backups either.
- **The teacher password** `TEACHER2026` has been in the public code since July 2026.
- **Anyone on the internet can read all of this today**, including the full history. Deleting the files now would still leave them in the history.

### 2. 🔴 The database is open to anyone (if the deployed rules match the repo)
- **No real sign-in check:** the rules allow every read and write and never check who is signed in. The app's anonymous sign-in doesn't protect anything.
- **The database address is public:** it's in the site's JavaScript, because Firebase config is public by design. Anyone can therefore:
  - **Read** every student's character, progress, inventory, Gold, XP, House, mastery medals and seals, activity log, help messages, absences, and any **custom PINs** (`students/{id}/customPin`)
  - **Change or delete anything:** any student's Gold, XP, level, items, House, medals and trophies, teacher judgments, Today's lesson and pacing settings, or erase the whole database. One request is enough, no login needed.
- **Default PINs can be guessed:** the student number with a 0 after the first digit (101 → 1001).

### 3. 🔴 Teacher screens aren't really protected
- **Password in the page:** the teacher login compares the typed password to `TEACHER2026` inside the page itself.
- **No server check:** the teacher dashboard's powers (Judgment Hall, Jump Tool, PIN resets, settings) are just database writes that anyone can make directly.

### 4. 🟠 Every visitor's browser runs a maintenance routine
On startup, every browser runs `seedAndMigrate()`, which can:
- create default records for all students
- clear everyone's guild if old guild names are found
- copy legacy `overrides/` data over student records

It's harmless when it runs as designed, but it means a student's browser is trusted to rewrite the whole class.

### 5. 🟡 Lower risk
- **Help messages and activity logs** are free text typed by students. Students could type real names there.
- **Grade log:** `gradeLog` may still hold raw scores in the live database. The current app no longer writes it.

## Immediate containment — in order of priority

All are low-risk and need no code deploy unless noted.

1. **Make the GitHub repository private** _(GitHub → repo → Settings → General → Danger Zone → Change visibility → Private)._
   - **Why:** this stops new exposure of the backups, grade log and teacher password.
   - **Effect on the site:** none. Vercel and Claude Code keep working with private repos.
   - **Check forks:** look at the repo page's "Forks" count. Forks of a public repo stay public; if any exist, contact GitHub Support.
2. **Back up the live database now** _(Firebase console → Realtime Database → Data → ⋮ menu → **Export JSON**)._
   - Save it to your **school Google Drive**, not GitHub. Repeat before each security step below.
3. **Lock the database to signed-in app users** _(only if step 0's check shows *Anonymous* sign-in is **Enabled**)._ Replace the rules with:
   ```json
   { "rules": { ".read": "auth != null", ".write": "auth != null",
       "students": { "$id": { ".validate": "!data.child('_resetVersion').exists() || (newData.child('_resetVersion').exists() && newData.child('_resetVersion').val() >= data.child('_resetVersion').val())" } } } }
   ```
   - **What it blocks:** anonymous internet requests and scrapers. The app already signs in anonymously before loading data, so students and teachers notice nothing.
   - **What it doesn't stop:** someone who loads the site and uses the browser console. This is a first step only, not the fix.
   - **Rollback:** paste the old rules back (`.read: true`, `.write: true`).
4. **Delete `gradeLog` from the live database** after the export in step 2 _(Data tab → hover `gradeLog` → 🗑)._ The app doesn't use it any more.
5. **Don't share the teacher password anywhere new.** Changing it doesn't help while it's in the page code; real teacher accounts (doc 02) replace it.
6. **Stop committing backups to the repo.** `.gitignore` now ignores `backup_*.json`. The existing files are left untouched for you to decide (they're also preserved in your exports).

## Coordinate with school administration / IT

- **Data privacy:** tell your administrator or data-privacy contact that a public code repository contained de-identified student records (seat numbers, progress, a raw-score grade log, student-typed messages) and that the game's database was writable without login. Ask whether a FERPA or district review or notification is needed. This is a judgment call for the school, not for us.
- **Accounts and billing:**
  - Who should **own the Firebase project** and billing: you or the school Google Workspace?
  - Should teacher sign-in use **school Google accounts**? That's possible later instead of email/password.
  - The fix needs the **Blaze (pay-as-you-go)** plan for Cloud Functions. At this scale it's expected to stay inside the free tier, but a billing account must be attached and may need approval.
- **Chromebook network filters:** the secure version also contacts `identitytoolkit.googleapis.com`, `securetoken.googleapis.com` and `cloudfunctions.net` (or `*.run.app`). IT may need to allow these if Chromebooks are filtered.
