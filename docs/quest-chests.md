# Quest Chests & Potions

## Earning (one chest per session, never two)
- **Earned on a successful completion of an instructional session:**
  - "Training Complete", or "I Won!" on boss sessions
  - the Writer's Craft submit
  - catch-up's first completion (the Pear exit ticket **reported**; opening the link is not enough)
  - the old catch-up "Mark as Complete"
- **Never earned on:** "Needs More Practice", "I Was Defeated", Camp Day, Study Hall, loot tiles, or the Training Grounds.
- **One chest per session:** the record is `students/{id}/questChests/{land_tile}`. It's created by a transaction only if it doesn't exist yet, so a lesson and a catch-up, double clicks, refreshes and other devices can never make a second one.
- **Contents are rolled once, when earned, and saved in the record,** so refreshing never rerolls.
- **Base rewards are unchanged:** +5 XP / +5 Gold, catch-up +3/+3, and Writer's Craft +5/+5.

## What moved into chests
After a successful lesson (and Writer's Craft), these rolls are gone and live in the chest instead:
- the 15% material roll
- the common-companion roll
- the 2% Mystery Drop
- the 20% seasonal badge (now a chest bonus at the same 20% rate)

**Unchanged:** milestone badges, loot tiles, bosses, side quests, Gold Shop drops, and Hero's Journey level rewards.

## Rates (`src/questChests.js`)
**Rarity:**

| Rarity | Chance |
|---|---|
| 🪵 Wooden | 74% |
| 🥈 Silver | 20% |
| 🥇 Golden | 5% |
| 🌟 Legendary | 1% |

A 🍀 **Luck Potion** makes it Silver 70%, Golden 25%, Legendary 5%.

**Main prize (one per chest):**

| Chest | Main prize |
|---|---|
| 🪵 Wooden | 35% common pet · 30% potion · 20% +5 Gold · 15% 1 material |
| 🥈 Silver | 35% uncommon pet · 25% potion · 25% collectible · 15% 2 materials |
| 🥇 Golden | 40% rare pet · 30% rare collectible · 30% +25 Gold |
| 🌟 Legendary | 70% Mystery pet · 30% legendary collectible |

- **Pets:** about 1 chest in 3 has one.
- **Duplicates:** the chest stores every item of the rolled rarity in a shuffled order. On opening, it gives the first one the student doesn't own yet. If they own them all, it gives the pre-rolled fallback (a potion or a material), never a higher rarity.
- **Every chest contains something.**

## Opening
- **Three taps** (wiggle, wiggle, burst) with a glow by rarity, or **⚡ Quick Open**. Pets use the existing companion reveal; Mystery pets use the existing Mystery reveal.
- **Reduce motion:** respects the device setting, and there's a "Reduce motion" switch saved on the device.
- **Exactly once:** opening is **one transaction on the whole student record**. The opened state and every reward are saved together, or nothing is saved and the student sees "Couldn't open it — try again. Your chest is safe."
- **Where unopened chests live:** in the existing 🎒 Inventory panel.
- **Shared devices:** a chest screen closes when a different student signs in.

## Potions (existing `items` list, "Tap to Use")

| Potion | Effect |
|---|---|
| ✨ Insight | 2× base XP on the next completed lesson |
| 🪙 Fortune | 2× base Gold on the next completed lesson |
| 🍀 Luck | Next chest is Silver or better |

- **One active of each type at most.**
- **Used up together with earning the next chest,** in the same transaction, so a potion applies exactly once.
- **Only the base reward doubles.** Level-up and other bonuses don't.
- **Potions never affect:** the welcome chest, self-repair, grading, Pear status, mastery or boss results.
- **The old stat potions are retired,** so potions never change HP (pacing), mana (behavior points) or focus.
  - **Owned ones are upgraded once per student:** Health → Fortune, Mana → Insight, Focus → Luck. Quantities are kept, and the student sees a short message.
  - **Teachers can no longer add retired potions** from the edit screen.

## Launch, Welcome Chest and self-repair
- **Launch time:** `settings/questChests/launchAt` is written once, by the first visit after deploy.
- **Welcome Chest:** each student gets one guaranteed **Silver Welcome Chest**, once (`questChests/welcome`). There are no chests for lessons finished before launch.
- **Self-repair:** if a chest write fails after a lesson saved, the hub later adds the missing chest, but **only** when success is clearly recorded after launch:
  - **lessons:** `outcomeRecorded` true **and** `outcomeFail` false
  - **Writer's Craft:** a `submitted` marker saved by its submit

  A completed tile alone never counts, because failures and teacher moves advance tiles too. Self-repair checks only the student's current Land, because tile records repeat across Lands.

## New data
- `students/{id}/questChests/{key}`
- `students/{id}/activeBoosts`
- `students/{id}/potionsUpgradedAt` (+ `potionsUpgradedCount`)
- `settings/questChests/launchAt`
- `taskProgress[tile].submitted` (Writer's Craft only)

No database rules changes, and no teacher approval steps.

## Tests
- **`npm test`** (`tests/questChests.test.js`, 14 tests):
  - 100,000-chest rate simulation
  - duplicates and fallbacks
  - once-only earning and opening
  - potion math, with no double use
  - migration
  - self-repair rules
- **`npm run test:browser`** (`tests/browser/questChests.cjs`, 50 checks):
  - launch, welcome chest and migration happen once
  - three-tap and Quick Open
  - the existing pet and Mystery reveals
  - base rewards kept and old drops gone
  - potions
  - double clicks, two devices and a stale device
  - interrupted open and earn (then retry and self-repair)
  - failed attempts, Writer's Craft, Study Hall, and catch-up (Pear reported vs opened)
  - shared device, reduced motion and phone layout
