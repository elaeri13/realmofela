# Phase 3 — Hero's Journey, Level-Up Rewards & Character Abilities

> **Status (2026-11-04):** Steps 1–3 and 5 are built and tested. Step 4 (reward claims) is built and
> tested but **switched off on the live site** (`LEVEL_REWARD_CLAIMS_LIVE = false` in `src/main.js`)
> until the Firebase security changes in §7 are approved. Nothing has been deployed.
>
> The original plan was written in ChatGPT; its requirements are merged below.

---

## 1. Vision

Make leveling meaningful, exciting and rewarding, like a real fantasy RPG that fifth graders can understand and that runs mostly automatically for the teacher.

| Every… | Gives |
|---|---|
| level | a reward: Gold, loot or character customization |
| 5 levels | a new passive ability, or a future-ability slot |
| 10 levels | a major milestone: exclusive reward plus a special celebration |

- **XP per level stays 50.** This is the existing `xpNext`. The audit found no reason to change it.
- **No existing level or XP is changed.**

## 2. Hero's Journey screen — ✅ built

- **Opening it:** students reach it from the hub's **⚔️ Hero's Journey** button. Inside the app it's the screen named `heros-journey`.
- **Hero card:** avatar, character name, class, level, an XP bar ("20 / 50 XP · 30 XP to Level 8"), and a **Next milestone** preview.
- **Reward track:** cards for Lv 2–10, plus 5 levels past the student's current level. Each card is in one of four states:
  - **Locked:** 🔒 Reach Level N
  - **Ready:** Claim button
  - **Claimed:** ✓ plus what the student got
  - **Unlocked:** ✓, for rewards granted by an existing system
- Milestone and ability levels are highlighted, and the next level's card has a dashed outline.
- **Character Abilities:** a compact list showing each ability's unlock status and, separately, whether its effect is active.
- **Hub integration (compact):** in the Battle Stats panel, the old "⭐ Level N" line is replaced by:
  - Level N
  - the next reward
  - a **⚔️ Hero's Journey** button with a "N ready" badge ("N waiting" while claiming is off)

  No new large panels.

## 3. Level reward track — ✅ built (`src/levelRewards.js`)

| Level | Reward | Special unlock | How it's delivered |
|---|---|---|---|
| 2 | 25 Gold | | existing Gold balance (`awardGold`) |
| 3 | Common collectible | | existing Collectibles bag (accessory items, `awardEquipItem`). If the student already owns every common collectible in their land, the card says up front that it becomes 15 Gold. |
| 4 | Standard loot roll | | existing loot pools: unowned companion → unowned equipment → 15 Gold. **No XP**, unlike `awardFromPool`, which gives +5 XP when the pool is empty. |
| 5 | Exclusive frame | Adventurer's Guard | **Bronze Adventurer Frame**, which the existing level system *already* unlocks at Lv 5, so it is shown as "unlocks automatically" and **not duplicated**. Nothing to claim at Lv 5. |
| 6 | 40 Gold | | Gold |
| 7 | Title "Trailblazer" | | new: claimed level titles are added to the existing title picker (✨ Customize → 👑 Title) |
| 8 | Rare loot roll | | loot pools at rare tier, then 30 Gold |
| 9 | 50 Gold | | Gold |
| 10 | Legendary frame and title | Treasure Sense | new **Starfall Legend Frame** (`frame_level_10_starfall`, uses the existing legendary starfall art) and the title "Legend of the Realm". The existing Silver Knight rank frame also still unlocks automatically. |

**Beyond Level 10 there is no ceiling** (`rewardsForLevel`):

| Levels | Reward |
|---|---|
| Multiples of 10 | 100 Gold + rare loot roll + title "Realm Legend II / III / …" |
| Other multiples of 5 | 60 Gold + rare loot roll + "New ability (future phase)" slot |
| Even levels | 30 + 2×level Gold (capped at 80) |
| Odd levels | Standard loot roll |

Existing rank frames at 15 and 20 are shown as "unlocks automatically". Gold per level is capped, so the economy can't run away.

**Small extensions added** (fit the existing architecture):
- **Frame unlock type:** a new cosmetic `unlockType: 'level_reward'` in `isCosmeticUnlocked`. The frame unlocks when that level's claim record exists.
- **Titles:** `getClaimedLevelTitles()` feeds the existing title picker.
- **No-XP loot roll:** `grantLoot()`, so claiming never changes XP.
- **No potions.** The potion system is Phase 4.

## 4. Level-up celebration — ✅ built

- Shown on the hub or the overworld map after a level-up:
  - avatar and name
  - **LEVEL UP!** and the new level
  - every newly unlocked reward
  - Hero's Journey and Continue buttons
- **Milestone emphasis:**
  - Levels that are multiples of 5 get a gold card and a **✨ NEW ABILITY ✨** ribbon.
  - Multiples of 10 get **★ MAJOR MILESTONE ★**.
- **Multiple levels at once:** one celebration lists every level gained ("Level 2 → Level 5"), so nothing is skipped.
- **Never replays:** `students/{id}/levelCelebratedThrough` stores the last celebrated level.
  - Existing characters get it set to their current level on their next visit, so old level-ups aren't celebrated.
  - Refreshing doesn't replay the celebration.
- **Lightweight animation:** a CSS pop-in and slow rays, with no images or libraries. Turned off under `prefers-reduced-motion`.
- The existing quick "+XP / Level Up" toast is unchanged.

## 5. Reward claiming — ✅ built, 🔒 off on the live site

- **Automatic eligibility:** rewards become available when the student reaches the level and are claimed manually in Hero's Journey.
- **One record per level:** `students/{id}/levelRewards/{level} = { claimedAt, level, results:[…] }`.
- **Atomic, once-only claim:** the claim uses a Firebase **transaction** that creates the record only if it doesn't exist. Only after it commits are the rewards handed out. This prevents duplicates from:
  - repeat clicks
  - refreshes
  - two simultaneous requests
  - a claim already made on another device
- **Where rewards go:**
  - Gold → existing Gold balance
  - items → existing inventory or companions
  - frames and titles → customization
- **Nothing else changes:** XP, level, mastery, Houses and boss progress are never touched.
- **Retroactive:** every reached level from 2 to the current level with an unclaimed reward is claimable. A Level 7 character can claim 2, 3, 4, 6 and 7; Level 5's frame is already theirs through the existing system. Unclaimed rewards stay available indefinitely.
- **Off switch:** while `LEVEL_REWARD_CLAIMS_LIVE` is `false`:
  - students see "✨ Earned — claiming opens soon" and a notice that their rewards are saved
  - the claim function refuses and writes nothing
  - tests can turn claiming on only in the local dev server (`window.__REALM_TEST_CLAIMS`), and that switch is stripped from production builds

**Limitation:** if a claim's record commits but the browser closes before the reward writes finish, that reward can be lost. The record stores `results` so a teacher can see what was granted. The planned Cloud Function (§7) does both in one server-side step.

## 6. Character abilities — ✅ framework built; both abilities unlocked-but-inactive

`CHARACTER_ABILITIES` in `src/levelRewards.js`:
- **Unlocked** is derived from the existing `level`, so it's never stored and can't drift.
- **Active** is a per-ability flag, `false` for both in Phase 3.
- Hero's Journey shows the two separately: "✓ Unlocked · ⏳ Coming soon".

| Level | Ability | Phase 3 status | What must exist first |
|---|---|---|---|
| 5 | 🛡️ Adventurer's Guard: blocks the first 2 HP of damage from an eligible optional adventure each week | Unlocked, inactive | **Phase 4 HP redesign.** HP today is computed from distance behind the Expected Tile (`calcHP`); there are no damage events. Not connected to pace-based HP. |
| 10 | 🗝️ Treasure Sense: one extra common collectible from the first eligible loot path each week | Unlocked, inactive | **Collectible loot paths.** Loot paths currently give XP, Gold and 1 material, not collectibles. It will **not** become "+1 material", invent items, or double-award a tile. |

**Rules for abilities:**
- No effect on grades, verified mastery, assessment scores or attempts, or access to required lessons.
- No unlimited XP or Gold.
- Weekly abilities will need persistent usage records at `abilityUses/{studentId}/{abilityId}/{weekKey}`. These are write-once: server- or rules-enforced (see §7), keyed by the school-timezone week.
- No skill points, ability trees or class powers yet.

## 7. Firebase security — investigation (no changes made)

### What exists today

| Item | Finding |
|---|---|
| Database rules (`database.rules.json`, deployed via `firebase.json`) | `".read": true, ".write": true` for the whole database. The only check is that `students/$id/_resetVersion` can't go backwards. **Not verified against the live console** (no access from this environment); please confirm in Firebase console → Realtime Database → Rules. |
| Authentication | The app calls `signInAnonymously()` at startup, but **the rules never check `auth`**, so the database is open even without signing in, including from plain REST requests. |
| Student login | Student number + 4-digit PIN, **checked in the browser**. Custom PINs are stored in `students/{id}/customPin`, which **anyone can read**. |
| Teacher login | Password `TEACHER2026` is **hard-coded in the site's JavaScript** (`TEACHER_PW`), so any student who opens developer tools can find it. Teacher screens are protected only by hidden buttons. |
| Paths written by the app | `students/*`, `settings/*` (Today's lesson, release dates, links, caps, expected tile), `helpflags`, `craftRequests`, `shopPending`, `sideQuestInvites`, `activityLog`, `gradeLog`, legacy `overrides` |

### What a student could change right now

Anyone with the database URL (it's in the site's code) can edit **any student's** data with a single REST request or from the browser console. Examples:
- **Character:** `xp`, `level`, `gold`, `items`, `equipInventory`, `companions`, `unlockedCosmetics`
- **Progress and mastery:** `completedTiles`, `standardBossState` / `gateBossState` / `bossStatus` (mastery medals, seals, trophies)
- **House:** `house` / `houseConfirmed`
- **Level rewards:** `levelRewards`, `levelCelebratedThrough`
- **Teacher settings:** everything in `settings`
- **Other students:** read any student's PIN, then sign in as them

**This is not caused by Phase 3; it predates it.** But it means a claim button can't be trustworthy: a student who can write `gold` directly doesn't need to claim anything, and one who can write `level` or `levelRewards` can unlock or reset claims.

### Are Security Rules alone enough?

**No, not for rewards.**
- Rules can only enforce "this student may change this field" once the database knows **who** is signed in, and today nobody is (anonymous sign-in isn't tied to a student).
- Even with identity, rules can't safely **compute** a reward. A loot roll is random, and Gold must be credited atomically with the claim record. A gold reward can't be validated if the student can also edit their own `level`/`xp`.
- Those need **trusted backend code** (Firebase Cloud Functions) that checks the level and writes the record and the reward together.

### Recommended architecture (simplest secure path for this project)

1. **Teacher accounts (no backend needed):**
   - Firebase Authentication with email and password for teachers.
   - An `admins/{uid}: true` list, set once in the Firebase console.
   - The teacher login uses Firebase sign-in instead of `TEACHER2026`.
   - Rules allow `settings` and other teacher-only writes only for `admins`.
2. **Student identity (needs one Cloud Function):** a `studentSignIn(number, pin)` function that:
   - checks the PIN against a **non-readable** `pins/` store (PINs move out of `students/`)
   - returns a Firebase custom token with `uid: "student_101"` and claim `sid: 101`

   The current number + PIN screen stays the same for students.
3. **Database rules:**
   - Deny by default.
   - A student may read and write only gameplay fields under their own `students/{sid}`.
   - Teachers (`admins`) may do everything.
   - `levelRewards` and `abilityUses` are **not writable by any client**.
   - The exact field list for shared screens (Board View, partner picker) is worked out and tested in the **Firebase emulator** before anything is deployed.
4. **`claimLevelReward(level)` Cloud Function:**
   - reads the student's level on the server
   - in **one transaction**, checks no record exists, writes `levelRewards/{level}`, adds Gold, rolls loot and adds items
   - The Hero's Journey claim button then calls this function instead of writing directly. The UI is already built for it.
5. **Later (Phase 4+):** move other Gold/XP awards (lessons, bosses, loot paths, shop) into functions too, so students can't edit `gold`/`xp` at all. Until then, those existing awards remain client-side as they are today.

### Approvals needed before claims go live

1. **Firebase Authentication:** enable the Email/Password provider, create teacher account(s), and add them to `admins`.
2. **Blaze (pay-as-you-go) plan.** Cloud Functions require it. At this class size usage should fall within the free tier, but a billing account must be attached.
3. **Deploy Cloud Functions:** `studentSignIn` and `claimLevelReward`.
4. **Deploy new Realtime Database rules**, after emulator testing.
5. **Flip `LEVEL_REWARD_CLAIMS_LIVE`** to `true` and switch the claim button to the function. One-line change plus a small call change.

**Nothing in this list has been done.** No production rules, functions or settings were changed.

## 8. House crests

The new House crests (`public/houses/house_<key>_v2.webp`) are kept on the branch and ship in the same pull request. House assignment and mastery medals are unchanged.

## 9. Files

| File | Change |
|---|---|
| `src/levelRewards.js` (new) | reward track, ability registry, status/eligibility/celebration logic (pure) |
| `tests/levelRewards.test.js` (new) | 9 unit tests |
| `src/main.js` | claim system (gated), Hero's Journey screen, hub panel, level-up celebration, Starfall level-10 frame, level-reward titles |
| `src/firebaseClient.js` | exports Firebase `runTransaction` |
| `index.html` | styles for Hero's Journey, the hub panel and the celebration |
| `docs/phase-3-level-up-plan.md` | this plan |

### Firebase data added (per student, under `students/{id}`)

- `levelRewards/{level}`: `{ claimedAt, level, results:[{type, label, …}] }`. Written only when claiming is on.
- `levelCelebratedThrough`: number. The last level whose celebration was shown.

## 10. Testing (local dev server with an in-memory Firebase stand-in; no live data)

- `npm test`: 18 unit tests (9 for today's lesson, 9 for level rewards).
- **Browser checks: 46/46 pass.** They cover:
  - **New character (Lv 1):** rewards locked and no surprise celebration.
  - **Leveling and celebrations:** 1→2 celebration, which doesn't replay after Continue or a refresh. 2→5 in one jump lists Lv 3, 4 and 5, with ability emphasis. 9→10 shows the major-milestone celebration.
  - **Existing Lv 7 character:** no old celebrations. Retroactively eligible for 2, 3, 4, 6 and 7; Lv 5 is shown as already unlocked. Adventurer's Guard unlocked and Coming soon; Treasure Sense locked.
  - **Claiming off (the default):** no buttons, and the direct function call is refused with zero writes.
  - **Claiming on (test switch):**
    - **Rewards:** exact Gold; the record is saved; XP, level and mastery are unchanged; the reveal shows the prize; other rewards stay available.
    - **Duplicates:** a repeat claim is refused. Two simultaneous claims → only one succeeds. A claim already made "on another device" is refused with nothing granted.
    - **Item rewards:** the loot roll adds a companion and no XP. The title appears in the title picker. The Lv 10 frame becomes available. A student with missing inventory data gets the collectible. An already-owned collectible pays 15 Gold, as stated up front.
    - **Persistence:** after a refresh, claims persist and nothing is re-granted.
  - **Unreached level:** claiming a level the student hasn't reached is refused.
  - **Houses and medals:** the House crest and the Achievements (mastery medals) screen still work.
  - **Layout:** no sideways scrolling at Chromebook (1366×768), tablet (820×1180) and phone (390px) sizes.
- **Not testable here:**
  - real cross-device concurrency against live Firebase (covered by Firebase transaction semantics; simulated in tests)
  - "unauthorized writes are blocked", which needs the §7 rules; today they **are not** blocked
