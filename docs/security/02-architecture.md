# Realm of ELA — Security Architecture

_Built and tested on the `claude/ela-standards-medals-audit-evm13l` branch. **Nothing here is live.** Every piece is switched off until you approve the steps in [03-rollout-and-console-steps.md](03-rollout-and-console-steps.md)._

## The idea in one paragraph

Today every browser is trusted: it checks PINs itself, holds the teacher password, and can write anything in the database. The new design moves trust to two places the browser can't tamper with:
- **Firebase Authentication** proves who someone is.
- **Cloud Functions** (small pieces of server code) do the sensitive work: checking PINs and granting rewards.

**Database rules** then allow each person only their own data.

## Who can do what

| | Visitor (not logged in) | Student (logged in) | Teacher (account in `admins`) | Server (Cloud Functions) |
|---|---|---|---|---|
| Class settings, today's lesson | read | read | read + write | ✓ |
| Classmates' names, avatars, House, map position (`directory`) | read | read | read | writes it |
| Own record: progress, inventory, Gold, XP | — | read + **bounded** write | read + write | ✓ |
| Another student's record | — | **no** | read + write | ✓ |
| Wins, Mastery Seals, medal counts, trophies | — | read own; **can't award** | read + write | ✓ |
| House | — | **choose once** | change | ✓ |
| Level reward claims | — | **ask the server** | read | **only writer** |
| PINs | — | **ask the server** | reset via server | **only reader** (hashed) |
| Help flags, craft requests, activity log | — | own only | all | ✓ |
| Grade log | — | — | read + write | ✓ |

## Pieces

**Teacher sign-in**
- Real Firebase email/password accounts replace `TEACHER2026`. The password is no longer in the page code at all.
- A signed-in account counts as a teacher only if its user ID is listed under `admins`. You add that entry by hand in the Firebase console; the app can't write it.

**Student sign-in (same screens, same 4-digit PIN)**
- The student taps their number and PIN exactly as today. The browser sends them to the `studentSignIn` function.
- The function checks the PIN against a **salted hash** stored in `secure/pins`, which no browser can read. If it matches, the student gets a sign-in token for `student_<number>`.
- **Brute-force protection:**
  - 5 wrong PINs locks that student for 5 minutes.
  - 30 wrong PINs from one network in 10 minutes pauses that network. This is generous, because a whole classroom shares one network.
- **Existing PINs keep working:**
  - Students with a custom PIN keep it. On first login it's converted to a hash.
  - Students on the default PIN are asked to choose one, as today.
- **Sessions end when the tab closes** (shared Chromebooks). Log Out reloads the page, which clears the student's data from memory.

**PIN changes and resets**
- `setStudentPin`: a student sets their own PIN. The same rules apply (4 digits, not 0000, not the default).
- `resetStudentPins`: teacher only. Back to the default PIN, and it also clears a lockout.
- The teacher dashboard shows "Default" or "Private" instead of revealing PINs.

**Reward claims (`claimLevelReward`)** run in **one database transaction** on the student's record:
- It checks the student has reached the level and hasn't already claimed it.
- It writes the claim record **and** every reward (Gold, companion, item) together.
- If anything fails part-way, nothing is written, so a reward can never be marked claimed without being delivered.
- Simultaneous claims (two tabs, double taps) can't both succeed. The loser gets "already claimed".
- The server reads the reward data from a copy of `src/levelRewards.js`, and a test fails if that copy drifts from the app.

**Public directory (`syncDirectory`)**
- The server copies only display fields (character name, title, avatar, House, level, map position, completed tiles, active companion) to `directory/`. Classmates' maps, partner pickers and the login grid use it.
- Gold, inventory, PINs, absences, help messages and reward records are **not** in it.

**Teacher Security Setup button (`adminSecurityMigration`)**
- **Prepare** hashes everyone's existing custom PIN and builds the directory. It's safe to repeat, and it keeps the old plain-text PIN so you can roll back.
- **Finish** deletes the old plain-text PINs once everything is confirmed.

**Database rules** (`firebase/database.rules.secure.json`, generated from `scripts/build-secure-rules.mjs`):
- Default deny; each area grants exactly what the table above says.
- **Economy caps on the student's own saves:**
  - Gold up to +250 per save; never negative, never a string.
  - XP up to +400 per save.
  - Level never down, at most +3 per save.
  - Teachers aren't capped.
- **Boss results:**
  - Students can mark a standard boss done, as designed today.
  - Dungeon bosses (tile 27) and writing events need the teacher's **defeated** mark first.
  - Students can never write *defeated*, *retake*, a Mastery Seal, a demonstration (medal) count or a trophy, and can't undo one.
- **Never client-writable:** `levelRewards`, `pinSet`, `absences` and the reset markers.
- **Plain-text PINs** can only be deleted, never written again.

**App switch**
- `VITE_SECURITY_MODE=secure` (a Vercel environment variable) turns all of this on in the app.
- Without it the site behaves exactly as today. That's what merging PR #17 would deploy.
- Claims additionally need `VITE_LEVEL_REWARD_CLAIMS=on`.

## What's protected, and what's still limited

**Fully protected:**
- Impersonation: logging in as another student, or as a teacher.
- Reading classmates' records.
- Editing anyone else's data.
- Teacher-only settings.
- Mastery medals, seals and trophies.
- Reward claims.
- House changes.
- PIN secrecy.
- Anonymous internet access.

**Limited, not eliminated:** a student who opens the browser's developer console can still edit **their own** gameplay record within the caps:
- some Gold or XP per save
- marking their own lessons complete
- adding a companion or item to their own inventory

Today the game itself awards these from the browser, so fully preventing it means moving each reward into server code. That's planned with the HP / equipment / potions / Gold Shop work. Until then the caps keep any cheating small, and only the student's own account is affected.

**Other notes:**
- **Gold race:** if a student earns Gold in the same instant a reward claim lands, the browser's next save could overwrite the claim's Gold. The claim happens on the Hero's Journey screen, where nothing else earns Gold, so this is unlikely. The server-side Gold Shop work will remove it entirely.
- **Directory visibility:** anyone who loads the site sees character names and avatars (pseudonyms), as the login grid does today. No real names are stored.
- **Not yet run with live data:** the browser tests cover login, PIN setup, hub, Hero's Journey, claims and the teacher dashboard. A full day of lessons hasn't been played under the new rules. Step 6 of the rollout plan does that on a test seat before students use it.

## Tests (all local; nothing touches production)

| Command | What it covers | Result |
|---|---|---|
| `npm test` | Reward track, PIN hashing, lockouts, all-or-nothing claim logic, interrupted claims, directory fields, server/app reward data match | 32/32 pass |
| `npm run test:rules` | Database rules in the emulator: no sign-in, anonymous, impersonation, other students' data, PIN hashes, economy caps, House once, teacher judgments, claims, side quests, shop | 12/12 pass |
| `npm run test:functions` | Cloud Functions in the emulator: lockout after 5 tries, default → new PIN, legacy PIN migration, wrong-role callers refused, **10 simultaneous claims → exactly 1**, claims racing with saves, teacher reset + migration | 10/10 pass |
| `npm run test:e2e` | The real app in secure mode in Chromium against the emulators: student + teacher login, PIN setup, console tampering blocked, claims, Security Setup | 22/22 pass |
| Phase 3 browser suite, legacy mode | Hero's Journey, celebrations, layout at Chromebook/tablet/phone sizes, with security mode **off** | 46/46 pass |

The emulator commands need the Firebase CLI (`npm i -g firebase-tools`) and Java.

**A real bug the tests caught:** the server's first claim attempt sees an empty copy of the record. Without the fix it would have refused every claim. It's fixed and covered by a test.
