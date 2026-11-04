# Phase 3 — Level-Up Implementation Plan

> **Status:** planning only. Nothing in this document is implemented yet.
> **Note:** the original Phase 3 plan was not found in this repository, any branch, or the
> connected Google Drive. This file starts with the **Character Abilities** requirements added on
> 2026-11-04. Paste the rest of the original Phase 3 plan (level reward track, claim system, etc.)
> into the "Level reward track & claim system" section below.

## Implementation order

1. **Level reward track and claim system** (build first).
2. **Passive-ability framework** (on top of the claim system's records).
3. **Activate only abilities whose underlying gameplay systems are ready and tested.**
   At the time of writing, neither initial ability is ready to activate — see the audit below.

---

## Level reward track & claim system

_(Original Phase 3 content goes here.)_

Requirements carried over from the Character Abilities section that this part must satisfy:

- **Preserve existing character levels.** Never reset `level`, `xp` or `xpNext`.
- **Grant previously earned level-based unlocks without resetting progress.** Today, level unlocks
  (the rank frames at levels 5 / 10 / 15 / 20) are granted only at the moment of leveling up
  (`awardXP` → `unlockCosmeticsForLevel`). Students already past a milestone when a new reward or
  ability is added would never receive it. The claim system needs an idempotent catch-up
  ("grant every unlock for levels ≤ current level that isn't already recorded") that runs on login
  and never removes anything.

---

## Character Abilities

A small, extensible passive-ability system tied to character level milestones.

### Initial planned abilities

| Level | Ability | Effect | Status |
|---|---|---|---|
| 5 | **Adventurer's Guard** | Automatically prevents the first 2 HP of damage from an eligible optional adventure each week. | **Unlocked but inactive** until the Phase 4 HP redesign. |
| 10 | **Treasure Sense** | Awards one additional common collectible from the first eligible loot path each week. | Activate **only** if the loot system can do it safely (see audit). |

### Rules

1. **Audit first.** Audit the existing HP, loot and inventory systems before connecting either ability (findings below).
2. **Do not change the pace-based HP mechanism yet.** Adventurer's Guard stays an unlocked but inactive future ability until the Phase 4 HP redesign is complete.
3. **Treasure Sense activates only if safe.** The existing loot system must be able to award an additional collectible without duplicating claims or bypassing eligibility.
4. **Once per week, enforced by persistent records.** Use persistent, server-validated records so weekly ability effects can't activate more than once.
5. **No effect on academics.** Passive abilities must never affect academic grades, mastery verification (Mastery Medals, Seals, Judgment Hall), assessment attempts, or access to required lessons.
6. **Compact display.** Show unlocked abilities in a compact **Character Abilities** section inside the **Hero's Journey** interface, not as another large panel on the main character hub.
7. **Automatic.** Abilities need no equipping or activating by students.
8. **Keep what students already earned.** Preserve existing character levels and grant previously earned level-based unlocks without resetting progress.
9. **No skill trees yet.** No class-specific skill trees or additional abilities in this phase.
10. **No deploy without approval.**

### Audit of the current code (2026-11-04, `main` @ 2997463)

**Levels / XP** — `awardXP()` (src/main.js)
- `level` and `xp` are stored on `students/{id}`; leveling up subtracts `xpNext` (default 50) and increments `level`.
- Level unlocks are only the four rank frames (`COSMETICS_MANIFEST`, `unlockType:'level'`, levels 5 / 10 / 15 / 20), granted inside `awardXP` when a level is crossed. **No catch-up for students already past a level.**
- There is **no Hero's Journey screen, level reward track, or claim system yet**. Phase 3 must create them; the Character Abilities section belongs inside that screen.

**HP** — `calcHP()` (src/main.js)
- HP is **not a damage pool**. It's computed on each render from pace: `10 − 2 × tiles behind` the teacher's Expected Tile (now land-aware via `expectedTileLand`). Potions add to the stored `hp` field, but `calcHP` overrides it whenever an Expected Tile is set.
- **There is no "damage from an optional adventure" event anywhere.** Adventurer's Guard has nothing to hook into, which matches Rule 2: keep it unlocked but inactive until Phase 4 introduces real damage events.

**Loot paths** — `#loot-claim-btn` handler and `LOOT_ENCOUNTERS` / `LOOT_CHALLENGES` (src/main.js)
- A loot claim awards **10 XP + 10 Gold + 1 material** (`awardMaterialDrop`), adds the tile to `completedTiles`, and returns early if the tile is already completed.
- **Eligibility and dedup are checked only in the browser.** The guard reads the local cache; there is no write-once check in the database.
- `LOOT_CHALLENGES` is keyed by tile id only, so Land 2 tiles 28 and 30 show Land 1's quizzes (existing bug). Treasure Sense must key "first eligible loot path" by **land + tile**.
- **The loot claim awards no "collectible".** "Common collectible" must be defined before Treasure Sense can work. Existing candidates:
  - `awardMaterialDrop(student, 1)`: one more material (simplest; stackable, no duplicate concerns).
  - `awardFromPool(student, land, 'common')`: a common companion. It falls back to +5 XP when the pool is exhausted, so it isn't always a collectible.
  - Seasonal badges (`awardSeasonalBadge`): random, date-windowed, and can run out. Not a good fit.

**Inventory / collectibles**
- Materials: `materials` + `materialSlots` (counts). Companions: `companions[]`. Seasonal / special badges: `seasonalBadges[]`, `specialBadges[]`. Equipment: `equipInventory[]`.
- `saveStudentOverride()` replaces whole fields from the browser's cached copy, so concurrent writes can overwrite each other. New ability records must be written to their **own path** (see below), not merged into existing maps.

**"Server-validated" records — constraint**
- There is no server code: the app is client-only, talking to Firebase Realtime Database, and `database.rules.json` allows **all reads and writes**.
- Truly server-enforced once-per-week records need **one of** the following. Both change Firebase permissions and **require explicit approval** (earlier guardrail):
  - a **write-once rule** on the ability-record path (`".validate": "!data.exists()"`), or
  - a Cloud Function that performs the award.
- Without that, the best available is a deterministic record path plus a re-check of the record before awarding. That prevents accidental double activation, but not tampering.

### Proposed design (for approval — not implemented)

**Ability registry** (code constant; extensible, no skill trees):

```js
const CHARACTER_ABILITIES = [
  { id:'adventurers_guard', level:5,  name:"Adventurer's Guard",
    desc:'Blocks the first 2 HP of damage from an optional adventure each week.',
    status:'inactive' /* until Phase 4 HP redesign */ },
  { id:'treasure_sense',    level:10, name:'Treasure Sense',
    desc:'One extra common collectible from your first loot path each week.',
    status:'inactive' /* activate after the loot audit items below are done and tested */ },
];
```

- **Unlocked** = `level >= ability.level`. It's derived from the existing `level` and is never stored as a separate flag that could drift, so existing levels unlock abilities automatically (Rules 7 and 8).
- **Active** = unlocked **and** `status === 'active'`.

**Weekly usage records** (separate path, write-once):
- `abilityUses/{studentId}/{abilityId}/{weekKey}` = `{ at, landId, tileId }`
- `weekKey` = the Monday ISO date in the school's timezone. Reuse `getMondayIso()`, but pin it to America/Chicago so devices in other time zones agree.
- Write with `set()` to this exact path. With approval, add `".validate": "!data.exists()"` for this path in `database.rules.json`.
- `resetStudentFull()` and the reset script clear `students/{id}` only. Decide whether ability uses are cleared on reset (recommended: yes, explicitly).

**Treasure Sense activation checklist** (all must pass before `status:'active'`):
1. Define "common collectible". **Recommendation: +1 material** via the existing material award (stackable, cannot "run out").
2. Hook only into the **existing** loot claim handler, **after** its already-completed guard succeeds. Never add a separate claim path.
3. Check that the weekly record doesn't exist, write it, then award. If the write fails, award nothing.
4. Use **land + tile** for "first eligible loot path"; exclude tiles completed in earlier weeks, teacher-jumped tiles (`jumpFlags` / `goldForfeited`) and story-replay of already-claimed tiles.
5. Tests:
   - double-click and refresh can't award twice
   - a second loot path in the same week gets no bonus
   - a new week gets the bonus again
   - a student below level 10 gets none
   - claim rewards are otherwise unchanged

**Adventurer's Guard:** register it and show it as "Unlocked — coming soon" in Character Abilities. **No HP code changes.** Activation waits for Phase 4, which must introduce explicit damage events that the guard can intercept.

**Character Abilities UI** (inside Hero's Journey):
- A compact list showing icon, name, one-line description and a status chip: 🔒 *Reach Level N*, ✅ *Active*, or ⏳ *Unlocked — coming soon*.
- Optional "Used this week" note for active weekly abilities.
- Nothing to equip or tap.

### Out of scope for this phase
- Changes to `calcHP()` / pace-based HP (Phase 4).
- Class-specific skill trees or more abilities.
- Any effect on grades, Mastery Medals / Seals, Judgment Hall, assessments, lesson locks, release dates or pacing.
- Deployment (needs approval).
