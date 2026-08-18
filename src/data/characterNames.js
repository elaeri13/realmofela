// characterNames.js
// Word lists for Realm of ELA character name generation.
// 60 names x 26 epithets = 1,560 possible combinations.
//
// BEFORE LAUNCH: scan NAMES against your actual class rosters and remove
// anything close to a real student's first or last name. Nothing here is a
// common American given name, but check anyway — one collision creates the
// exact problem this system exists to prevent.

export const NAMES = [
  "Blaze",    "Onyx",     "Storm",    "Kai",      "Nova",
  "Raven",    "Phoenix",  "Sage",     "Wren",     "Ash",
  "Rowan",    "Zephyr",   "Ember",    "Kestrel",  "Flint",
  "Juniper",  "Cove",     "Vesper",   "Talon",    "Skye",
  "Briar",    "Orion",    "Wilder",   "Hazel",    "Fable",
  "Lark",     "Cypress",  "Rio",      "Indigo",   "Sparrow",
  "Dash",     "Meadow",   "Atlas",    "Ivy",      "Ranger",
  "Cricket",  "Ridley",   "Sable",    "Marlow",   "Sunny",
  "Fox",      "Jett",     "Willow",   "Cedar",    "Reef",
  "Sterling", "Piper",    "Blair",    "Aspen",    "Rune",
  "Echo",     "Finch",    "Bay",      "Story",    "Vale",
  "Quill",    "Frost",    "Lynx",     "Robin",    "Dune",
];

export const EPITHETS = [
  "the Fearless",     "the Swift",        "the Bold",         "the Unstoppable",
  "the Daring",       "the Relentless",   "the Brave",        "the Clever",
  "the Wise",         "the Mysterious",   "the Sharp-Eyed",   "Who Sees All",
  "the Quiet One",    "the Riddler",      "the Legend",       "the Unbreakable",
  "the Wanderer",     "the Fearless One", "of Legend",        "the Great",
  "the Unshaken",     "the Kind",         "the Loyal",        "the Steady",
  "the True",         "the Gentle Storm",
];

// Optional: seeded shuffle helper so rerolls feel varied rather than random-
// clustered. Not required — Math.random() is fine.
export function rollName() {
  const name    = NAMES[Math.floor(Math.random() * NAMES.length)];
  const epithet = EPITHETS[Math.floor(Math.random() * EPITHETS.length)];
  return `${name} ${epithet}`;
}
