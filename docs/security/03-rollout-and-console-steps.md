# Realm of ELA — Rollout Plan, Console Steps & Rollback

Each stage below needs **your go-ahead**. They're ordered so that every stage can be undone on its own, and students notice nothing until Stage 5.

**Before every stage:** Firebase console → **Realtime Database → Data → ⋮ → Export JSON**. Save it to school Google Drive, not GitHub.

| Stage | Who | Changes for students? | Needs approval for |
|---|---|---|---|
| 0. Containment ([doc 01](01-assessment-and-containment.md)) | you | no | making the repo private, interim rules |
| 1. Teacher accounts | you | no | Firebase Auth settings |
| 2. Blaze plan | you (+ school?) | no | **billing** |
| 3. Deploy Cloud Functions | you, or me with a deploy key | no | **backend deploy** |
| 4. App in secure mode | Vercel | login looks the same | **production deploy** |
| 5. Secure database rules | you | no (if Stage 4 checks pass) | **production rules** |
| 6. Pilot, then Finish clean-up | you | no | deleting plain-text PINs |
| 7. Turn on reward claims | Vercel | **Claim buttons appear** | **activating claims** |

---

## Stage 1 — Teacher accounts (5 min, no effect on students)

1. **Authentication → Sign-in method:**
   - Turn on **Email/Password**.
   - Check that **Anonymous** is also enabled; the login screen needs it.
2. **Authentication → Users → Add user:** enter your school email and a strong password. Repeat for anyone else who needs the dashboard (co-teacher, admin).
3. **Copy each user's User UID** from the Users list. It's a long string of letters and numbers.
4. **Realtime Database → Data:** hover the top line → **+**.
   - Name `admins`, leave the value empty, then click **+** on `admins`.
   - Name = the UID, Value = `true`.
   - Repeat for each teacher.

**Rollback:** delete the user or the `admins` entry.
**Note:** under today's open rules anyone *could* add themselves to `admins`. Stage 5's checklist re-checks this list right before the rules switch.

## Stage 2 — Blaze plan (billing; needs your/school approval)

1. Console → ⚙️ **Usage and billing → Details & settings → Modify plan → Blaze**, then attach a billing account.
2. Set a **budget alert**: Google Cloud console → Billing → Budgets & alerts. Use $5, with alerts at 50% and 100%.

**Expected cost:** about $0. About 120 students × a few logins and claims a day is far inside the free tier (2 million function calls a month).

**Rollback:** downgrade to Spark. Functions stop working; secure-mode login would stop, so do Stage 4's rollback first.

## Stage 3 — Deploy the Cloud Functions (no effect on students)

From a computer with Node 20 and the Firebase CLI (`npm i -g firebase-tools`, then `firebase login`):

```bash
git checkout claude/ela-standards-medals-audit-evm13l   # or main after merging
npm install && npm --prefix functions install
npm test                                              # must pass
firebase deploy --only functions --config firebase.secure.json --project realm-of-ela
```

After deploying:
- Google Cloud console → **IAM**. Find `<project-number>-compute@developer.gserviceaccount.com` → ✏️ → add role **Service Account Token Creator**.
- This lets `studentSignIn` create login tokens.

**Check it works:** Functions list shows `studentSignIn`, `setStudentPin`, `resetStudentPins`, `claimLevelReward`, `syncDirectory` and `adminSecurityMigration`. Nothing calls them yet.

**Rollback:** Functions → ⋮ → Delete. Nothing else depends on them until Stage 4.

## Stage 4 — Switch the app to secure mode (still on the old open rules)

1. **Vercel → Project → Settings → Environment Variables:** add `VITE_SECURITY_MODE` = `secure` (Production), then **Redeploy** the latest deployment.
   - Leave `VITE_LEVEL_REWARD_CLAIMS` unset.
2. **Sign in as the teacher** with the email and password from Stage 1. The old password no longer works.
3. Click **🔒 Security Setup** → type `1` (**Prepare**).
   - It reports how many PINs were secured and how many directory entries were built.
   - Old PINs are kept, so this is safe.
4. **Check on a spare seat or a test student:**
   - log in with the default PIN → choose a PIN → reach the hub
   - log out → log in with the new PIN
   - a student with an existing custom PIN logs in normally
   - the teacher dashboard shows everyone
   - **Reset PIN** works

**Rollback (instant):**
- Remove `VITE_SECURITY_MODE` and redeploy, or use Vercel's **Instant Rollback** to the previous deployment.
- Old PINs still work, because plain-text copies are kept until Stage 6.
- Exception: a student who **chose a new PIN** during Stage 4 or 5 falls back to their default PIN until they set it again.

## Stage 5 — Secure database rules

**Checklist first:**
- [ ] Fresh JSON export saved
- [ ] Stage 4 checks passed
- [ ] `admins` lists only your teacher UIDs

1. **Realtime Database → Rules:** select all, then paste the contents of `firebase/database.rules.secure.json` → **Publish**.
   - Or: `firebase deploy --only database --config firebase.secure.json`
2. **Optional:** use the **Rules Playground** to simulate an unauthenticated read of `/students`. It should be denied.
3. **Repeat the Stage 4 checks**, plus one normal lesson tile and one boss on a test seat.
4. **Check the old address is closed:** `https://<your-db>.firebaseio.com/students.json` in a private window must say **Permission denied**.

**Rollback (instant):** Rules tab → paste the previous rules → Publish. These are today's rules:

```json
{ "rules": { ".read": true, ".write": true,
  "students": { "$id": { ".validate": "!data.child('_resetVersion').exists() || (newData.child('_resetVersion').exists() && newData.child('_resetVersion').val() >= data.child('_resetVersion').val())" } } } }
```

Or use the interim rules from doc 01 (`auth != null`), which still block the anonymous internet.

## Stage 6 — Pilot week, then Finish

- Run a normal week. If a student hits a problem, tell me the screen and what they tapped.
  - A rule may be stricter than a game feature I didn't exercise in tests. The fix is a small rules change, and rollback is always available.
- Then **🔒 Security Setup** → type `2` (**Finish**). This deletes the old plain-text PINs.
  - After this, rolling back to legacy mode means custom PINs reset to defaults.

## Stage 7 — Turn on reward claims (separate approval)

**Vercel:** add `VITE_LEVEL_REWARD_CLAIMS` = `on` → Redeploy. The Claim buttons appear in Hero's Journey, and rewards earned before launch can be claimed.

**Rollback:** remove the variable and redeploy. Claims already made stay claimed and delivered.

---

## Data safety

**Stays untouched:** characters, progress, inventory, Gold, XP, Houses, achievements, mastery medals and boss records. Nothing in this rollout resets or rewrites them.

**The only data writes:**
- new `secure/` (hashes, login counters)
- new `directory/`
- new `admins/` (you)
- removing plain-text `customPin` (Stage 6)
- `pinSet` and `levelRewards`, written as part of normal use

**Restore** is the last resort: Data → ⋮ → **Import JSON** overwrites the whole database with an export.

## About merging PR #17

Merging deploys to realmofela.com via Vercel. The new security code ships **switched off**, because `VITE_SECURITY_MODE` isn't set. With it off:
- the site behaves as today
- the Phase 3 Hero's Journey and celebrations go live, with earned rewards showing "Earned — claiming opens soon"

The `functions/` and `firebase/` files do nothing until Stages 3 and 5. Merging is still your call; I haven't merged.
