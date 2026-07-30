// characterNames.js
// Word lists for Realm of ELA character name generation.
// 60 names x 25 epithets = 1,500 possible combinations.
//
// BEFORE LAUNCH: scan NAMES against your actual class rosters and remove
// anything close to a real student's first or last name. Nothing here is a
// common American given name, but check anyway — one collision creates the
// exact problem this system exists to prevent.

export const NAMES = [
  // Nature & wood
  "Thornwick",  "Bramble",    "Yarrow",     "Briar",      "Juniper",
  "Larkspur",   "Foxglove",   "Thistle",    "Hawthorn",   "Mossgrave",

  // Sky, storm & light
  "Kestrel",    "Zephyr",     "Lumen",      "Gale",       "Nimbus",
  "Solden",     "Vireo",      "Skarn",      "Aurelis",    "Dawnmere",

  // Stone & forge
  "Ironvale",   "Slate",      "Brackenhold","Cinderfell", "Emberly",
  "Pyrelle",    "Forgewyn",   "Basalt",     "Kindle",     "Hearthwyn",

  // Depth & shadow
  "Umbra",      "Nyric",      "Duskwood",   "Sable",      "Vandrel",
  "Gloamwood",  "Nocturne",   "Fathom",     "Onyxal",     "Shalebrook",

  // Old tongue
  "Fennrick",   "Corwin",     "Dregan",     "Elowen",     "Ferrin",
  "Jorvik",     "Kaldra",     "Alderic",    "Eldrin",     "Rowena",

  // Sharp & swift
  "Talon",      "Quill",      "Rune",       "Vexil",      "Wren",
  "Rookwood",   "Stonewren",  "Ospra",      "Galebrook",  "Hollis",
];

export const EPITHETS = [
  // Character
  "the Bold",        "the Unbroken",   "the Steadfast",   "the Clever",
  "the Swift",       "the Curious",    "the Relentless",  "the Undaunted",
  "the Wandering",

  // Elemental
  "Stormtouched",    "Frostbitten",    "Emberkin",        "Sunlit",
  "Thornclad",       "Ironhearted",    "Stonesung",       "Dawnbringer",
  "Shadowsworn",

  // Of the six lands
  "of the Verdant Vale",   "of the Stone Kingdoms",  "of the Drowned Depths",
  "of the Thornwood",      "of the Ashen Hollows",   "of the Stormspire",
  "of the Silver Reach",
];

// Optional: seeded shuffle helper so rerolls feel varied rather than random-
// clustered. Not required — Math.random() is fine.
export function rollName() {
  const name    = NAMES[Math.floor(Math.random() * NAMES.length)];
  const epithet = EPITHETS[Math.floor(Math.random() * EPITHETS.length)];
  return `${name} ${epithet}`;
}
