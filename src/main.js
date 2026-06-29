import { db, ref, set, get, update, onValue } from './firebaseClient.js'

/* ═══════════════════════════════════════════════
   REALM OF ELA  —  Pure Vanilla JS
   No dependencies · Works offline · Chromebook safe
═══════════════════════════════════════════════ */

/* ─── EDIT STUDENTS HERE ───────────────────────
   Data is loaded from classData.json — edit that file to update students.
──────────────────────────────────────────────── */
let CLASS_DATA = null;

/* ─── CONSTANTS ─── */
const CLS_COLOR = {
  warrior:"#7C3AED", archer:"#059669", fairy:"#EC4899", wizard:"#0891B2",
  mage:"#0891B2", ranger:"#059669", healer:"#EC4899", rogue:"#7C3AED"
};
const CLS_LABEL = {
  warrior:"Warrior", archer:"Archer", fairy:"Fairy", wizard:"Wizard",
  mage:"Wizard", ranger:"Archer", healer:"Fairy", rogue:"Warrior"
};
function clsKey(student, merged) {
  return merged.character || student.avatarClass || "warrior";
}
const ITEMS = {
  health_potion:    { i:"🧪", img:"icon_potion_red.png",  n:"Health Potion",   desc:"Restore 2 HP" },
  behavior_potion:  { i:"🔵", img:"icon_potion_blue.png",  n:"Mana Potion",     desc:"Restore 2 MP" },
  stamina_potion:   { i:"💚", img:"icon_potion_green.png", n:"Focus Potion",    desc:"Restore 2 SP" },
  scroll:           { i:"📜", img:"icon_scroll.png",       n:"Scroll",          desc:"Hint during boss fight" },
  shield:           { i:"🛡️", img:"icon_shield.png",       n:"Shield",          desc:"Protect 1 missed assignment" },
  amulet:           { i:"🟣", img:"icon_star.png",         n:"Starlight Sigil", desc:"Preview boss questions" },
  phoenix:          { i:"🔥", img:"icon_feather.png",      n:"Phoenix Feather", desc:"Restore all stats" },
};
const BOSS_ICON = {
  "Aldric the Unyielding":  "⚔️",
  "Seraphine of the Veil":  "🌙",
  "Duskmantle":             "🌑",
  "Gravox the Immovable":   "🪨",
  "Thornspire":             "🌿",
  "Abysmara the Endless":   "🌊",
  "Voranthis the Unseen":   "👁️",
};
const BOSS_STANDARD = {
  "Aldric the Unyielding":  "RL.5.1",
  "Seraphine of the Veil":  "RL.5.2",
  "Duskmantle":             "RL.5.3",
  "Gravox the Immovable":   "RI.5.1",
  "Thornspire":             "RI.5.2",
  "Abysmara the Endless":   "RL.5.4",
  "Voranthis the Unseen":   "RI.5.8",
};
const STANDARD_NAMES = {
  "RL.5.1": "Quote and Infer from Text",
  "RL.5.2": "Theme and Summary",
  "RL.5.3": "Compare and Contrast Characters",
  "RL.5.4": "Figurative Language in Context",
  "RL.5.5": "Story Structure",
  "RL.5.6": "Point of View",
  "RI.5.1": "Quote and Infer from Informational Text",
  "RI.5.2": "Main Idea and Summary",
  "RI.5.3": "Explain Relationships",
  "RI.5.4": "Vocabulary in Context",
  "RI.5.5": "Text Structure",
  "RI.5.8": "Reasoning and Evidence",
};
/* ─── COMPANIONS ─── */
const COMPANIONS = [
  // Common (grey border)
  {file:"051-cow.png",       name:"Cow",           rarity:"common"},
  {file:"051-frog.png",      name:"Frog",          rarity:"common"},
  {file:"051-pig.png",       name:"Pig",           rarity:"common"},
  {file:"051-chicken.png",   name:"Chicken",       rarity:"common"},
  {file:"051-duck.png",      name:"Duck",          rarity:"common"},
  {file:"051-sheep.png",     name:"Sheep",         rarity:"common"},
  {file:"051-rabbit.png",    name:"Rabbit",        rarity:"common"},
  {file:"051-mouse.png",     name:"Mouse",         rarity:"common"},
  {file:"051-bee.png",       name:"Bee",           rarity:"common"},
  {file:"051-bulldog.png",   name:"Bulldog",       rarity:"common"},
  {file:"051-beetle.png",    name:"Beetle",        rarity:"common"},
  {file:"051-ostrich.png",   name:"Ostrich",       rarity:"common"},
  {file:"051-pelican.png",   name:"Pelican",       rarity:"common"},
  {file:"051-squirrel.png",  name:"Squirrel",      rarity:"common"},
  // Uncommon (blue border)
  {file:"051-penguin.png",   name:"Penguin",       rarity:"uncommon"},
  {file:"051-panda.png",     name:"Panda",         rarity:"uncommon"},
  {file:"051-fox.png",       name:"Fox",           rarity:"uncommon"},
  {file:"051-racoon.png",    name:"Raccoon",       rarity:"uncommon"},
  {file:"051-turtle.png",    name:"Turtle",        rarity:"uncommon"},
  {file:"051-giraffe.png",   name:"Giraffe",       rarity:"uncommon"},
  {file:"051-elephant.png",  name:"Elephant",      rarity:"uncommon"},
  {file:"051-cat.png",       name:"Cat",           rarity:"uncommon"},
  {file:"051-canary.png",    name:"Canary",        rarity:"uncommon"},
  {file:"051-beaver.png",    name:"Beaver",        rarity:"uncommon"},
  {file:"051-camel.png",     name:"Camel",         rarity:"uncommon"},
  {file:"051-llama.png",     name:"Llama",         rarity:"uncommon"},
  {file:"051-monkey.png",    name:"Monkey",        rarity:"uncommon"},
  {file:"051-moose.png",     name:"Moose",         rarity:"uncommon"},
  {file:"051-owl.png",       name:"Owl",           rarity:"uncommon"},
  {file:"051-swan.png",      name:"Swan",          rarity:"uncommon"},
  // Rare (purple border)
  {file:"051-bat.png",       name:"Bat",           rarity:"rare"},
  {file:"051-chameleon.png", name:"Chameleon",     rarity:"rare"},
  {file:"051-octopus.png",   name:"Octopus",       rarity:"rare"},
  {file:"051-whale.png",     name:"Whale",         rarity:"rare"},
  {file:"051-shark.png",     name:"Shark",         rarity:"rare"},
  {file:"051-sloth.png",     name:"Sloth",         rarity:"rare"},
  {file:"051-cobra.png",     name:"Cobra",         rarity:"rare"},
  {file:"051-crab.png",      name:"Crab",          rarity:"rare"},
  {file:"051-macaw.png",     name:"Macaw",         rarity:"rare"},
  {file:"051-crocodile.png", name:"Crocodile",     rarity:"rare"},
  {file:"051-hippopotamus.png",name:"Hippo",       rarity:"rare"},
  {file:"051-rhinoceros.png",name:"Rhino",         rarity:"rare"},
  {file:"051-snake.png",     name:"Snake",         rarity:"rare"},
  // Legendary (gold border)
  {file:"051-siberian-husky.png", name:"Husky",   rarity:"legendary"},
  {file:"051-tiger.png",     name:"Tiger",         rarity:"legendary"},
  {file:"051-toucan.png",    name:"Toucan",        rarity:"legendary"},
  {file:"051-humming-bird.png", name:"Hummingbird",rarity:"legendary"},
  {file:"051-clown-fish.png",name:"Clownfish",     rarity:"legendary"},
  {file:"051-kangaroo.png",  name:"Kangaroo",      rarity:"legendary"},
  {file:"051-lion.png",      name:"Lion",          rarity:"legendary"},
];
const COMPANION_RARITY_BORDER = {common:"#9CA3AF", uncommon:"#3B82F6", rare:"#9333EA", legendary:"#F5C842"};
const COMPANION_RARITY_LABEL  = {common:"Common",  uncommon:"Uncommon", rare:"Rare",    legendary:"Legendary"};
function companionByFile(file) { return COMPANIONS.find(c=>c.file===file) || {file, name:file, rarity:"common"}; }
function companionsByRarity(r) { return COMPANIONS.filter(c=>c.rarity===r); }
function randFrom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function landToRarity(landId) { return landId<=2?"common": landId<=4?"uncommon": landId<=6?"rare":"legendary"; }
function awardCompanion(student, file) {
  const ov = getOverrides().students[String(student.id)] || {};
  const companions = [...new Set([...(ov.companions||[]), file])];
  saveStudentOverride(student.id, {companions});
  return file;
}
function hasCompletedAnyBoss(student) {
  const ov = getOverrides().students[String(student.id)] || {};
  const completed = ov.completedTiles || student.completedTiles || [];
  return LANDS.some(land => land.tiles.some(t => t.type==="boss" && completed.includes(t.id)));
}

/* ─── QUEST BOARD DATA ─── */
const QB = { W:1050, H:430, TILE:80, DTILE:96, LTILE:66 };
const LW = { W:1050, H:560, TILE:88, BTILE:96, DTILE:132, ETILE:120, LTILE:72 };

const LANDS = [
  {
    id:1, name:"The Verdant Vale", subtitle:"Unit 1: Overcoming Obstacles", biome:1,
    W:1195, H:980,
    mainPaths:[
      "M 65 70 L 195 70 L 325 70 L 455 70 L 585 70 L 715 70 L 845 70 L 975 70 L 1105 70",
      "M 1105 70 C 1155 70 1155 350 1105 350",
      "M 1105 350 L 975 350 L 845 350 L 715 350 L 585 350 L 455 350 L 325 350 L 195 350 L 65 350",
      "M 65 350 C 15 350 15 630 65 630",
      "M 65 630 L 195 630 L 325 630 L 455 630 L 585 630 L 715 630 L 845 630 L 975 630 L 975 840",
    ],
    branchPaths:[
      "M 455 70 L 455 210 L 585 210 L 585 70",
      "M 975 70 L 975 210 L 1105 210 L 1105 70",
      "M 845 350 L 845 490 L 715 490 L 715 350",
      "M 195 350 L 195 490 L 65 490 L 65 350",
    ],
    decorations:[],
    tiles:[
      // ── Row 0: main path L→R ──
      {id: 1, type:"arrival",  name:"The Vale's Welcome",    x:65,   y:70},
      {id: 2, type:"lesson",   name:"L1-S1",                 x:195,  y:70,
        sessionTitle:"This Is So Hard!",
        sessionDesc:"Talk About the Topic",
        video:"https://edpuzzle.com/media/placeholder-l1s1",
        mustDo:["Complete workbook pages 10-12"],
        shouldDo:["Partner discussion activity"],
        aspireTo:["Extension reading response"],
        workbookRef:"Workbook pages 10-12",
      },
      {id: 3, type:"lesson",   name:"L1-S2",                 x:325,  y:70},
      {id: 4, type:"lesson",   name:"L1-S3",                 x:455,  y:70},
      {id: 5, type:"lesson",   name:"L1-S6",                 x:585,  y:70},
      {id: 6, type:"boss", name:"Seraphine of the Veil", x:715, y:70, skill:"RL.5.2",
        portrait:"boss_seraphine.png",
        lore:"Seraphine of the Veil weaves illusions from the hidden meanings buried in every text, cloaking the true theme beneath layers of misdirection. Only a reader who can cut through the surface story and name what it truly teaches will pierce her veil.",
        pearUrl:"https://app.peardeck.com/placeholder-seraphine",
      },
      {id: 7, type:"lesson",   name:"L2-S1",                 x:845,  y:70},
      {id: 8, type:"lesson",   name:"L2-S2",                 x:975,  y:70},
      {id: 9, type:"lesson",   name:"L2-S3",                 x:1105, y:70},
      // ── Row 2: main path R→L ──
      {id:10, type:"lesson",   name:"L2-S6",                 x:1105, y:350},
      {id:11, type:"boss", name:"Seraphine Ascendant", x:975, y:350, skill:"RL.5.2",
        portrait:"boss_seraphine_ascendant.png",
        lore:"Seraphine has transcended the veil, evolving into a force of pure narrative deception that bends theme and summary into endless reflections of itself. She cannot be defeated by a single reading — you must summarize with precision and name the theme with conviction.",
        pearUrl:"https://app.peardeck.com/placeholder-seraphine-ascendant",
      },
      {id:12, type:"lesson",   name:"L3-S1",                 x:845,  y:350},
      {id:13, type:"lesson",   name:"L3-S2",                 x:715,  y:350},
      {id:14, type:"lesson",   name:"L3-S3",                 x:585,  y:350},
      {id:15, type:"lesson",   name:"L3-S6",                 x:455,  y:350},
      {id:16, type:"boss", name:"Aldric the Unyielding", x:325, y:350, skill:"RL.5.1",
        portrait:"boss_aldric.png",
        lore:"Aldric the Unyielding is an iron-bound warlord who demands proof — he will not yield to vague answers or weak inferences. Defeat him by returning to the text, quoting with precision, and supporting every claim with unbreakable evidence.",
        pearUrl:"https://app.peardeck.com/placeholder-aldric",
      },
      {id:17, type:"lesson",   name:"L4-S1",                 x:195,  y:350},
      {id:18, type:"lesson",   name:"L4-S2",                 x:65,   y:350},
      // ── Row 4: main path L→R ──
      {id:19, type:"lesson",   name:"L4-S3",                 x:65,   y:630},
      {id:20, type:"lesson",   name:"L4-S6",                 x:195,  y:630},
      {id:21, type:"boss", name:"Duskmantle", x:325, y:630, skill:"RL.5.3",
        portrait:"boss_duskmantle.png",
        lore:"Duskmantle dwells in the space between stories, feeding on the confusion between heroes and their shadows. Only a student who can compare characters with precision — tracing their motives, changes, and contrasts — can shatter its hold on the realm.",
        pearUrl:"https://app.peardeck.com/placeholder-duskmantle",
      },
      {id:22, type:"lesson",   name:"CI-S1",                 x:455,  y:630},
      {id:23, type:"lesson",   name:"CI-S2",                 x:585,  y:630},
      {id:24, type:"lesson",   name:"CI-S3",                 x:715,  y:630},
      {id:25, type:"lesson",   name:"CI-S4",                 x:845,  y:630},
      {id:26, type:"event",    name:"The Scribe's Calling",  x:975,  y:630},
      // ── Row 6: dungeon ──
      {id:27, type:"dungeon",  name:"The Warden of the Vale",x:975,  y:840, portrait:"boss_warden.png"},
      // ── Branch tiles (odd rows) ──
      {id:28, type:"loot", name:"L1-S4", x:455,  y:210, skill:"Should Do", nextTile:5,  parentTileId:4},
      {id:29, type:"loot", name:"L1-S5", x:585,  y:210, skill:"Aspire To", nextTile:28, parentTileId:28},
      {id:30, type:"loot", name:"L2-S4", x:975,  y:210, skill:"Should Do", nextTile:9,  parentTileId:8},
      {id:31, type:"loot", name:"L2-S5", x:1105, y:210, skill:"Aspire To", nextTile:30, parentTileId:30},
      {id:32, type:"loot", name:"L3-S4", x:845,  y:490, skill:"Should Do", nextTile:13, parentTileId:12},
      {id:33, type:"loot", name:"L3-S5", x:715,  y:490, skill:"Aspire To", nextTile:32, parentTileId:32},
      {id:34, type:"loot", name:"L4-S4", x:195,  y:490, skill:"Should Do", nextTile:18, parentTileId:17},
      {id:35, type:"loot", name:"L4-S5", x:65,   y:490, skill:"Aspire To", nextTile:34, parentTileId:34},
      // ── NPC tiles ──
      {id:36, type:"npc", npcKey:"thornkin_hint",          x:65,   y:210, landId:1},
      {id:37, type:"npc", npcKey:"thornkin_lore",          x:715,  y:210, landId:1},
      {id:38, type:"npc", npcKey:"thornkin_encouragement", x:1105, y:490, landId:1},
      {id:39, type:"npc", npcKey:"thornkin_easter",        x:325,  y:490, landId:1},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27],
  },
  // ── SHARED PATH CONSTANTS (all new lands use same serpentine grid as Land 1) ──
  // Row 0 (y=70)  L→R: x = 65,195,325,455,585,715,845,975,1105
  // Row 2 (y=350) R→L: x = 1105,975,845,715,585,455,325,195,65
  // Row 4 (y=630) L→R: x = 65,195,325,455,585,715,845,975  →  dungeon at 975,840
  // Branch row 1 (y=210): loot pairs at (455,210)↔(585,210) and (975,210)↔(1105,210)
  // Branch row 3 (y=490): loot pairs at (845,490)↔(715,490) and (195,490)↔(65,490)
  // 4-lesson lands use all 4 branch pairs.
  // 3-lesson lands omit the 4th branch pair (it falls inside the CI section).

  {
    id:2, name:"The Stone Kingdoms", subtitle:"Unit 2: Art in America", biome:2,
    bgImage:"/tiles/map_background_stone_kingdoms.png",
    W:1195, H:980,
    mainPaths:[
      "M 65 70 L 195 70 L 325 70 L 455 70 L 585 70 L 715 70 L 845 70 L 975 70 L 1105 70",
      "M 1105 70 C 1155 70 1155 350 1105 350",
      "M 1105 350 L 975 350 L 845 350 L 715 350 L 585 350 L 455 350 L 325 350 L 195 350 L 65 350",
      "M 65 350 C 15 350 15 630 65 630",
      "M 65 630 L 195 630 L 325 630 L 455 630 L 585 630 L 715 630 L 845 630 L 975 630 L 975 840",
    ],
    branchPaths:[
      "M 455 70 L 455 210 L 585 210 L 585 70",
      "M 975 70 L 975 210 L 1105 210 L 1105 70",
      "M 845 350 L 845 490 L 715 490 L 715 350",
      "M 195 350 L 195 490 L 65 490 L 65 350",
    ],
    decorations:[],
    tiles:[
      // ── Row 0: main path L→R ──
      {id: 1, type:"arrival", name:"Stone Kingdom Gates",          x:65,   y:70},
      {id: 2, type:"lesson",  name:"L5-S1", sessionTitle:"The Harlem Renaissance",  x:195,  y:70},
      {id: 3, type:"lesson",  name:"L5-S2",                        x:325,  y:70},
      {id: 4, type:"lesson",  name:"L5-S3",                        x:455,  y:70},
      {id: 5, type:"lesson",  name:"L5-S6",                        x:585,  y:70},
      {id: 6, type:"boss",    name:"Thornspire",                   x:715,  y:70,  skill:"RI.5.2",
        portrait:"boss_thornspire.png",
        lore:"Thornspire rises from every paragraph whose main idea goes unnamed. Identify what the text is mostly about and support it with key details to bring this ancient tower down.",
        pearUrl:""},
      {id: 7, type:"lesson",  name:"L6-S1", sessionTitle:"The Arts of the People", x:845,  y:70},
      {id: 8, type:"lesson",  name:"L6-S2",                        x:975,  y:70},
      {id: 9, type:"lesson",  name:"L6-S3",                        x:1105, y:70},
      // ── Row 2: main path R→L ──
      {id:10, type:"lesson",  name:"L6-S6",                        x:1105, y:350},
      {id:11, type:"boss",    name:"Thornspire Reborn",            x:975,  y:350, skill:"RI.5.2",
        portrait:"boss_thornspire_reborn.png",
        lore:"Thornspire has rebuilt itself from every forgotten central idea. Name the main claim and back it with evidence from the text to collapse it once more.",
        pearUrl:""},
      {id:12, type:"lesson",  name:"L7-S1", sessionTitle:"Dust Bowl",               x:845,  y:350},
      {id:13, type:"lesson",  name:"L7-S2",                        x:715,  y:350},
      {id:14, type:"lesson",  name:"L7-S3",                        x:585,  y:350},
      {id:15, type:"lesson",  name:"L7-S6",                        x:455,  y:350},
      {id:16, type:"boss",    name:"Cinderhull",                   x:325,  y:350, skill:"RI.5.3",
        portrait:"boss_cinderhull.png",
        lore:"Cinderhull scorches the connections between events, blurring every cause and effect. Explain how individuals, events, and ideas interact to extinguish its flames.",
        pearUrl:""},
      {id:17, type:"lesson",  name:"L8-S1", sessionTitle:"Public Works of Art",     x:195,  y:350},
      {id:18, type:"lesson",  name:"L8-S2",                        x:65,   y:350},
      // ── Row 4: main path L→R ──
      {id:19, type:"lesson",  name:"L8-S3",                        x:65,   y:630},
      {id:20, type:"lesson",  name:"L8-S6",                        x:195,  y:630},
      {id:21, type:"boss",    name:"Runevast",                     x:325,  y:630, skill:"RI.5.4",
        portrait:"boss_runevast.png",
        lore:"Runevast guards its ancient inscriptions from any who cannot decode the domain-specific words carved into its walls. Determine word meanings in context to break through.",
        pearUrl:""},
      {id:22, type:"lesson",  name:"CI-S1", sessionTitle:"Forgotten Art",           x:455,  y:630},
      {id:23, type:"lesson",  name:"CI-S2",                        x:585,  y:630},
      {id:24, type:"lesson",  name:"CI-S3",                        x:715,  y:630},
      {id:25, type:"lesson",  name:"CI-S4",                        x:845,  y:630},
      {id:26, type:"event",   name:"The Scribe's Calling",         x:975,  y:630},
      // ── Dungeon ──
      {id:27, type:"dungeon", name:"The Eternal Architect",        x:975,  y:840, portrait:"boss_eternal_architect.png"},
      // ── Branch tiles ──
      {id:28, type:"loot", name:"L5-S4", x:455,  y:210, skill:"Should Do", nextTile:5,  parentTileId:4},
      {id:29, type:"loot", name:"L5-S5", x:585,  y:210, skill:"Aspire To", nextTile:28, parentTileId:28},
      {id:30, type:"loot", name:"L6-S4", x:975,  y:210, skill:"Should Do", nextTile:9,  parentTileId:8},
      {id:31, type:"loot", name:"L6-S5", x:1105, y:210, skill:"Aspire To", nextTile:30, parentTileId:30},
      {id:32, type:"loot", name:"L7-S4", x:845,  y:490, skill:"Should Do", nextTile:13, parentTileId:12},
      {id:33, type:"loot", name:"L7-S5", x:715,  y:490, skill:"Aspire To", nextTile:32, parentTileId:32},
      {id:34, type:"loot", name:"L8-S4", x:195,  y:490, skill:"Should Do", nextTile:18, parentTileId:17},
      {id:35, type:"loot", name:"L8-S5", x:65,   y:490, skill:"Aspire To", nextTile:34, parentTileId:34},
      // ── NPC tiles ──
      {id:36, type:"npc", npcKey:"gravenborn_lore",          x:65,   y:210, landId:2},
      {id:37, type:"npc", npcKey:"gravenborn_encouragement", x:715,  y:210, landId:2},
      {id:38, type:"npc", npcKey:"gravenborn_easter",        x:1105, y:490, landId:2},
      {id:39, type:"npc", npcKey:"gravenborn_hint",          x:325,  y:490, landId:2},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27],
  },
  {
    id:3, name:"The Drowned Depths", subtitle:"Unit 3: Earth's Water", biome:3,
    bgImage:"/tiles/map_background_drowned_depths.png",
    W:1195, H:980,
    mainPaths:[
      "M 65 70 L 195 70 L 325 70 L 455 70 L 585 70 L 715 70 L 845 70 L 975 70 L 1105 70",
      "M 1105 70 C 1155 70 1155 350 1105 350",
      "M 1105 350 L 975 350 L 845 350 L 715 350 L 585 350 L 455 350 L 325 350 L 195 350 L 65 350",
      "M 65 350 C 15 350 15 630 65 630",
      "M 65 630 L 195 630 L 325 630 L 455 630 L 585 630 L 715 630 L 845 630 L 975 630 L 975 840",
    ],
    branchPaths:[
      "M 455 70 L 455 210 L 585 210 L 585 70",
      "M 975 70 L 975 210 L 1105 210 L 1105 70",
      "M 845 350 L 845 490 L 715 490 L 715 350",
    ],
    decorations:[],
    tiles:[
      // ── Row 0: main path L→R ──
      {id: 1, type:"arrival", name:"The Drowned Gates",            x:65,   y:70},
      {id: 2, type:"lesson",  name:"L9-S1",  sessionTitle:"Water and Humans",        x:195,  y:70},
      {id: 3, type:"lesson",  name:"L9-S2",                        x:325,  y:70},
      {id: 4, type:"lesson",  name:"L9-S3",                        x:455,  y:70},
      {id: 5, type:"lesson",  name:"L9-S6",                        x:585,  y:70},
      {id: 6, type:"boss",    name:"Abysmara the Endless",         x:715,  y:70,  skill:"RL.5.4",
        portrait:"boss_abysmara.png",
        lore:"Abysmara pulls readers into murky language where every word has two meanings. Determine what words and phrases mean as they are used in the text to surface the truth.",
        pearUrl:""},
      {id: 7, type:"lesson",  name:"L10-S1", sessionTitle:"Fresh Water",             x:845,  y:70},
      {id: 8, type:"lesson",  name:"L10-S2",                       x:975,  y:70},
      {id: 9, type:"lesson",  name:"L10-S3",                       x:1105, y:70},
      // ── Row 2: main path R→L ──
      {id:10, type:"lesson",  name:"L10-S6",                       x:1105, y:350},
      {id:11, type:"boss",    name:"Tidelurk",                     x:975,  y:350, skill:"RI.5.1",
        portrait:"boss_tidelurk.png",
        lore:"Tidelurk lurks beneath every unsupported claim. Only a quote pulled precisely from the text will drive this creature back into the depths.",
        pearUrl:""},
      {id:12, type:"lesson",  name:"L11-S1", sessionTitle:"Water Problems and Solutions", x:845, y:350},
      {id:13, type:"lesson",  name:"L11-S2",                       x:715,  y:350},
      {id:14, type:"lesson",  name:"L11-S3",                       x:585,  y:350},
      {id:15, type:"lesson",  name:"L11-S6",                       x:455,  y:350},
      {id:16, type:"boss",    name:"Coralspine",                   x:325,  y:350, skill:"RI.5.5",
        portrait:"boss_coralspine.png",
        lore:"Coralspine has fused two texts into a labyrinth of tangled structures. Compare and contrast how each text organizes its ideas to chart a way through.",
        pearUrl:""},
      {id:17, type:"lesson",  name:"CI-S1",  sessionTitle:"The Future of Water",    x:195,  y:350},
      {id:18, type:"lesson",  name:"CI-S2",                        x:65,   y:350},
      // ── Row 4: main path L→R (CI continues to fill grid) ──
      {id:19, type:"lesson",  name:"CI-S3",                        x:65,   y:630},
      {id:20, type:"lesson",  name:"CI-S4",                        x:195,  y:630},
      {id:26, type:"event",   name:"The Scribe's Calling",         x:975,  y:630},
      // ── Dungeon ──
      {id:27, type:"dungeon", name:"The Abyssal Sovereign",        x:975,  y:840, portrait:"boss_abyssal_sovereign.png"},
      // ── Branch tiles ──
      // pathOrder note: skips ids 21-25 (CI-S5–S9 removed)
      {id:28, type:"loot", name:"L9-S4",  x:455,  y:210, skill:"Should Do", nextTile:5,  parentTileId:4},
      {id:29, type:"loot", name:"L9-S5",  x:585,  y:210, skill:"Aspire To", nextTile:28, parentTileId:28},
      {id:30, type:"loot", name:"L10-S4", x:975,  y:210, skill:"Should Do", nextTile:9,  parentTileId:8},
      {id:31, type:"loot", name:"L10-S5", x:1105, y:210, skill:"Aspire To", nextTile:30, parentTileId:30},
      {id:32, type:"loot", name:"L11-S4", x:845,  y:490, skill:"Should Do", nextTile:13, parentTileId:12},
      {id:33, type:"loot", name:"L11-S5", x:715,  y:490, skill:"Aspire To", nextTile:32, parentTileId:32},
      // ── NPC tiles ──
      {id:36, type:"npc", npcKey:"tideweaver_encouragement", x:65,   y:210, landId:3},
      {id:37, type:"npc", npcKey:"tideweaver_easter",        x:715,  y:210, landId:3},
      {id:38, type:"npc", npcKey:"tideweaver_hint",          x:1105, y:490, landId:3},
      {id:39, type:"npc", npcKey:"tideweaver_lore",          x:325,  y:490, landId:3},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,26,27],
  },
  {
    id:4, name:"The Thornwood", subtitle:"Unit 4: Survival", biome:4,
    bgImage:"/tiles/map_background_thornwood.png",
    W:1195, H:980,
    mainPaths:[
      "M 65 70 L 195 70 L 325 70 L 455 70 L 585 70 L 715 70 L 845 70 L 975 70 L 1105 70",
      "M 1105 70 C 1155 70 1155 350 1105 350",
      "M 1105 350 L 975 350 L 845 350 L 715 350 L 585 350 L 455 350 L 325 350 L 195 350 L 65 350",
      "M 65 350 C 15 350 15 630 65 630",
      "M 65 630 L 195 630 L 325 630 L 455 630 L 585 630 L 715 630 L 845 630 L 975 630 L 975 840",
    ],
    branchPaths:[
      "M 455 70 L 455 210 L 585 210 L 585 70",
      "M 975 70 L 975 210 L 1105 210 L 1105 70",
      "M 845 350 L 845 490 L 715 490 L 715 350",
    ],
    decorations:[],
    tiles:[
      // ── Row 0: main path L→R ──
      {id: 1, type:"arrival", name:"The Thornwood Gate",           x:65,   y:70},
      {id: 2, type:"lesson",  name:"L12-S1", sessionTitle:"I Will Survive",          x:195,  y:70},
      {id: 3, type:"lesson",  name:"L12-S2",                       x:325,  y:70},
      {id: 4, type:"lesson",  name:"L12-S3",                       x:455,  y:70},
      {id: 5, type:"lesson",  name:"L12-S6",                       x:585,  y:70},
      {id: 6, type:"boss",    name:"Bramblethorn",                 x:715,  y:70,  skill:"RI.5.5",
        portrait:"boss_bramblethorn.png",
        lore:"Bramblethorn tangles the structure of information until no connection survives. Explain how the author structures ideas and how each part relates to the whole.",
        pearUrl:""},
      {id: 7, type:"lesson",  name:"L13-S1", sessionTitle:"Danger on the Mountain",  x:845,  y:70},
      {id: 8, type:"lesson",  name:"L13-S2",                       x:975,  y:70},
      {id: 9, type:"lesson",  name:"L13-S3",                       x:1105, y:70},
      // ── Row 2: main path R→L ──
      {id:10, type:"lesson",  name:"L13-S6",                       x:1105, y:350},
      {id:11, type:"boss",    name:"Feraxis the Rootborn",         x:975,  y:350, skill:"RL.5.5",
        portrait:"boss_feraxis.png",
        lore:"Feraxis the Rootborn has twisted two characters into one shape. Compare and contrast how each character thinks, acts, and changes to unravel them.",
        pearUrl:""},
      {id:12, type:"lesson",  name:"L14-S1", sessionTitle:"Lost at Sea",             x:845,  y:350},
      {id:13, type:"lesson",  name:"L14-S2",                       x:715,  y:350},
      {id:14, type:"lesson",  name:"L14-S3",                       x:585,  y:350},
      {id:15, type:"lesson",  name:"L14-S6",                       x:455,  y:350},
      {id:16, type:"boss",    name:"Hollowgaze",                   x:325,  y:350, skill:"RL.5.6",
        portrait:"boss_hollowgaze.png",
        lore:"Hollowgaze sees every story through the narrator's single eye. Describe how the speaker's point of view influences how events are described to break its hold.",
        pearUrl:""},
      {id:17, type:"lesson",  name:"CI-S1",  sessionTitle:"Put to the Test",         x:195,  y:350},
      {id:18, type:"lesson",  name:"CI-S2",                        x:65,   y:350},
      // ── Row 4: main path L→R ──
      {id:19, type:"lesson",  name:"CI-S3",                        x:65,   y:630},
      {id:20, type:"lesson",  name:"CI-S4",                        x:195,  y:630},
      {id:26, type:"event",   name:"The Scribe's Calling",         x:975,  y:630},
      // ── Dungeon ──
      {id:27, type:"dungeon", name:"The Rootfather",               x:975,  y:840, portrait:"boss_rootfather.png"},
      // ── Branch tiles ──
      {id:28, type:"loot", name:"L12-S4", x:455,  y:210, skill:"Should Do", nextTile:5,  parentTileId:4},
      {id:29, type:"loot", name:"L12-S5", x:585,  y:210, skill:"Aspire To", nextTile:28, parentTileId:28},
      {id:30, type:"loot", name:"L13-S4", x:975,  y:210, skill:"Should Do", nextTile:9,  parentTileId:8},
      {id:31, type:"loot", name:"L13-S5", x:1105, y:210, skill:"Aspire To", nextTile:30, parentTileId:30},
      {id:32, type:"loot", name:"L14-S4", x:845,  y:490, skill:"Should Do", nextTile:13, parentTileId:12},
      {id:33, type:"loot", name:"L14-S5", x:715,  y:490, skill:"Aspire To", nextTile:32, parentTileId:32},
      // ── NPC tiles ──
      {id:36, type:"npc", npcKey:"briarfolk_easter",        x:65,   y:210, landId:4},
      {id:37, type:"npc", npcKey:"briarfolk_hint",          x:715,  y:210, landId:4},
      {id:38, type:"npc", npcKey:"briarfolk_lore",          x:1105, y:490, landId:4},
      {id:39, type:"npc", npcKey:"briarfolk_encouragement", x:325,  y:490, landId:4},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,26,27],
  },
  {
    id:5, name:"The Ashen Hollows", subtitle:"Unit 5: Underground Railroad", biome:5,
    bgImage:"/tiles/map_background_ashen_hollows.png",
    W:1195, H:980,
    mainPaths:[
      "M 65 70 L 195 70 L 325 70 L 455 70 L 585 70 L 715 70 L 845 70 L 975 70 L 1105 70",
      "M 1105 70 C 1155 70 1155 350 1105 350",
      "M 1105 350 L 975 350 L 845 350 L 715 350 L 585 350 L 455 350 L 325 350 L 195 350 L 65 350",
      "M 65 350 C 15 350 15 630 65 630",
      "M 65 630 L 195 630 L 325 630 L 455 630 L 585 630 L 715 630 L 845 630 L 975 630 L 975 840",
    ],
    branchPaths:[
      "M 455 70 L 455 210 L 585 210 L 585 70",
      "M 975 70 L 975 210 L 1105 210 L 1105 70",
      "M 845 350 L 845 490 L 715 490 L 715 350",
    ],
    decorations:[],
    tiles:[
      // ── Row 0: main path L→R ──
      {id: 1, type:"arrival", name:"The Ashen Gate",               x:65,   y:70},
      {id: 2, type:"lesson",  name:"L15-S1", sessionTitle:"Slavery in the United States", x:195, y:70},
      {id: 3, type:"lesson",  name:"L15-S2",                       x:325,  y:70},
      {id: 4, type:"lesson",  name:"L15-S3",                       x:455,  y:70},
      {id: 5, type:"lesson",  name:"L15-S6",                       x:585,  y:70},
      {id: 6, type:"boss",    name:"Voranthis the Unseen",         x:715,  y:70,  skill:"RI.5.8",
        portrait:"boss_voranthis.png",
        lore:"Voranthis erases the evidence before your eyes, leaving only empty claims. Explain how the author uses reasons and evidence to support each key point.",
        pearUrl:""},
      {id: 7, type:"lesson",  name:"L16-S1", sessionTitle:"The Hard Path to Freedom", x:845, y:70},
      {id: 8, type:"lesson",  name:"L16-S2",                       x:975,  y:70},
      {id: 9, type:"lesson",  name:"L16-S3",                       x:1105, y:70},
      // ── Row 2: main path R→L ──
      {id:10, type:"lesson",  name:"L16-S6",                       x:1105, y:350},
      {id:11, type:"boss",    name:"Mirrowick",                    x:975,  y:350, skill:"RI.5.6",
        portrait:"boss_mirrowick.png",
        lore:"Mirrowick reflects the same event in twelve distorted mirrors. Analyze multiple accounts of the same event and determine how each point of view shapes what we see.",
        pearUrl:""},
      {id:12, type:"lesson",  name:"L17-S1", sessionTitle:"Stories of the Underground Railroad", x:845, y:350},
      {id:13, type:"lesson",  name:"L17-S2",                       x:715,  y:350},
      {id:14, type:"lesson",  name:"L17-S3",                       x:585,  y:350},
      {id:15, type:"lesson",  name:"L17-S6",                       x:455,  y:350},
      {id:16, type:"boss",    name:"Ashenveil",                    x:325,  y:350, skill:"RL.5.9",
        portrait:"boss_ashenveil.png",
        lore:"Ashenveil merges two stories until their differences vanish in the smoke. Compare and contrast stories in the same genre — theme, pattern, character — to lift the veil.",
        pearUrl:""},
      {id:17, type:"lesson",  name:"CI-S1",  sessionTitle:"The Fight for Freedom",   x:195,  y:350},
      {id:18, type:"lesson",  name:"CI-S2",                        x:65,   y:350},
      // ── Row 4: main path L→R ──
      {id:19, type:"lesson",  name:"CI-S3",                        x:65,   y:630},
      {id:20, type:"lesson",  name:"CI-S4",                        x:195,  y:630},
      {id:26, type:"event",   name:"The Scribe's Calling",         x:975,  y:630},
      // ── Dungeon ──
      {id:27, type:"dungeon", name:"The Hollow King",              x:975,  y:840, portrait:"boss_hollow_king.png"},
      // ── Branch tiles ──
      {id:28, type:"loot", name:"L15-S4", x:455,  y:210, skill:"Should Do", nextTile:5,  parentTileId:4},
      {id:29, type:"loot", name:"L15-S5", x:585,  y:210, skill:"Aspire To", nextTile:28, parentTileId:28},
      {id:30, type:"loot", name:"L16-S4", x:975,  y:210, skill:"Should Do", nextTile:9,  parentTileId:8},
      {id:31, type:"loot", name:"L16-S5", x:1105, y:210, skill:"Aspire To", nextTile:30, parentTileId:30},
      {id:32, type:"loot", name:"L17-S4", x:845,  y:490, skill:"Should Do", nextTile:13, parentTileId:12},
      {id:33, type:"loot", name:"L17-S5", x:715,  y:490, skill:"Aspire To", nextTile:32, parentTileId:32},
      // ── NPC tiles ──
      {id:36, type:"npc", npcKey:"embersoul_hint",          x:65,   y:210, landId:5},
      {id:37, type:"npc", npcKey:"embersoul_lore",          x:715,  y:210, landId:5},
      {id:38, type:"npc", npcKey:"embersoul_encouragement", x:1105, y:490, landId:5},
      {id:39, type:"npc", npcKey:"embersoul_easter",        x:325,  y:490, landId:5},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,26,27],
  },
  {
    id:6, name:"The Stormspire", subtitle:"Unit 6: Communication", biome:6,
    bgImage:"/tiles/map_background_stormspire.png",
    W:1195, H:980,
    mainPaths:[
      "M 65 70 L 195 70 L 325 70 L 455 70 L 585 70 L 715 70 L 845 70 L 975 70 L 1105 70",
      "M 1105 70 C 1155 70 1155 350 1105 350",
      "M 1105 350 L 975 350 L 845 350 L 715 350 L 585 350 L 455 350 L 325 350 L 195 350 L 65 350",
      "M 65 350 C 15 350 15 630 65 630",
      "M 65 630 L 195 630 L 325 630 L 455 630 L 585 630 L 715 630 L 845 630 L 975 630 L 975 840",
    ],
    branchPaths:[
      "M 455 70 L 455 210 L 585 210 L 585 70",
      "M 975 70 L 975 210 L 1105 210 L 1105 70",
      "M 845 350 L 845 490 L 715 490 L 715 350",
    ],
    decorations:[],
    tiles:[
      // ── Row 0: main path L→R ──
      {id: 1, type:"arrival", name:"The Stormspire Gates",         x:65,   y:70},
      {id: 2, type:"lesson",  name:"L18-S1", sessionTitle:"Beyond Spoken Words",     x:195,  y:70},
      {id: 3, type:"lesson",  name:"L18-S2",                       x:325,  y:70},
      {id: 4, type:"lesson",  name:"L18-S3",                       x:455,  y:70},
      {id: 5, type:"lesson",  name:"L18-S6",                       x:585,  y:70},
      {id: 6, type:"boss",    name:"Omnivex the Eternal",          x:715,  y:70,  skill:"RL.5.7",
        portrait:"boss_omnivex.png",
        lore:"Omnivex the Eternal speaks in images, charts, diagrams, and words all at once. Analyze how visual and multimedia elements contribute to the meaning of the whole.",
        pearUrl:""},
      {id: 7, type:"lesson",  name:"L19-S1", sessionTitle:"From Here to There",      x:845,  y:70},
      {id: 8, type:"lesson",  name:"L19-S2",                       x:975,  y:70},
      {id: 9, type:"lesson",  name:"L19-S3",                       x:1105, y:70},
      // ── Row 2: main path R→L ──
      {id:10, type:"lesson",  name:"L19-S6",                       x:1105, y:350},
      {id:11, type:"boss",    name:"Echovast",                     x:975,  y:350, skill:"RI.5.7",
        portrait:"boss_echovast.png",
        lore:"Echovast is assembled from fragments of countless sources. Draw on information from multiple print and digital sources to reveal its true form.",
        pearUrl:""},
      {id:12, type:"lesson",  name:"L20-S1", sessionTitle:"How Do YOU Say It?",      x:845,  y:350},
      {id:13, type:"lesson",  name:"L20-S2",                       x:715,  y:350},
      {id:14, type:"lesson",  name:"L20-S3",                       x:585,  y:350},
      {id:15, type:"lesson",  name:"L20-S6",                       x:455,  y:350},
      {id:16, type:"boss",    name:"Solvanor the Last",            x:325,  y:350, skill:"RI.5.9",
        portrait:"boss_solvanor.png",
        lore:"Solvanor is the final guardian, born from all texts that came before. Integrate information from several texts on the same topic to claim final victory.",
        pearUrl:""},
      {id:17, type:"lesson",  name:"CI-S1",  sessionTitle:"Messages in Code",        x:195,  y:350},
      {id:18, type:"lesson",  name:"CI-S2",                        x:65,   y:350},
      // ── Row 4: main path L→R ──
      {id:19, type:"lesson",  name:"CI-S3",                        x:65,   y:630},
      {id:20, type:"lesson",  name:"CI-S4",                        x:195,  y:630},
      {id:26, type:"event",   name:"The Scribe's Calling",         x:975,  y:630},
      // ── Dungeon ──
      {id:27, type:"dungeon", name:"The Voice of the Realm",       x:975,  y:840, portrait:"boss_voice_realm.png"},
      // ── Branch tiles ──
      {id:28, type:"loot", name:"L18-S4", x:455,  y:210, skill:"Should Do", nextTile:5,  parentTileId:4},
      {id:29, type:"loot", name:"L18-S5", x:585,  y:210, skill:"Aspire To", nextTile:28, parentTileId:28},
      {id:30, type:"loot", name:"L19-S4", x:975,  y:210, skill:"Should Do", nextTile:9,  parentTileId:8},
      {id:31, type:"loot", name:"L19-S5", x:1105, y:210, skill:"Aspire To", nextTile:30, parentTileId:30},
      {id:32, type:"loot", name:"L20-S4", x:845,  y:490, skill:"Should Do", nextTile:13, parentTileId:12},
      {id:33, type:"loot", name:"L20-S5", x:715,  y:490, skill:"Aspire To", nextTile:32, parentTileId:32},
      // ── NPC tiles ──
      {id:36, type:"npc", npcKey:"voltari_lore",          x:65,   y:210, landId:6},
      {id:37, type:"npc", npcKey:"voltari_easter",        x:715,  y:210, landId:6},
      {id:38, type:"npc", npcKey:"voltari_hint",          x:1105, y:490, landId:6},
      {id:39, type:"npc", npcKey:"voltari_encouragement", x:325,  y:490, landId:6},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,26,27],
  },
];
/* ─── LAND 0: THE STARTING GROUNDS (Prologue) ─── */
const LAND0 = {
  id:0, name:"The Starting Grounds", subtitle:"Prologue", biome:0,
  bgImage:"/tiles/map_starting_grounds.png",
  W:1195, H:980,
  mainPaths:[
    "M 195 350 L 455 350 L 715 350",
    "M 715 350 C 820 350 820 630 715 630",
    "M 715 630 L 455 630 L 195 630",
  ],
  branchPaths:[],
  decorations:[],
  tiles:[
    { id:1, type:"sg", name:"The Notice Board",      x:195, y:350,
      flavor:"Adventurer! A fresh notice has appeared on the board. Your journey begins here — read what awaits you in the Realm of ELA and take the first step toward legend." },
    { id:2, type:"sg", name:"The Hall of Heroes",    x:455, y:350, sgModal:"avatar",
      flavor:"Every legend begins with a face and a name. Step into the Hall of Heroes to choose your class and forge the hero you will become. Your look, your story." },
    { id:3, type:"sg", name:"The Guild Hall",         x:715, y:350,
      flavor:"All heroes belong to a guild. Enter and see where your talents place you — your guild will be your companion through every challenge that lies ahead." },
    { id:4, type:"sg", name:"The Armory",             x:715, y:630,
      flavor:"Know your power before the battle. The Armory holds the secrets of XP, levels, and the strength that grows within you with every tile you complete." },
    { id:5, type:"sg", name:"The Training Grounds",   x:455, y:630, sgModal:"lesson",
      flavor:"No hero charges into battle untrained. Walk through a practice session and prove you are ready for the real lessons that wait on the road ahead." },
    { id:6, type:"sg", name:"The Village Gate",       x:195, y:630, sgModal:"gate",
      flavor:"The Starting Grounds are behind you now. The Verdant Vale stretches ahead, and with it your first true quest. Take a breath. Your adventure begins now." },
    { id:10, type:"npc", npcKey:"lumin_hint",          x:65,   y:210, landId:0 },
    { id:11, type:"npc", npcKey:"lumin_lore",          x:715,  y:210, landId:0 },
    { id:12, type:"npc", npcKey:"lumin_encouragement", x:1105, y:490, landId:0 },
    { id:13, type:"npc", npcKey:"lumin_easter",        x:325,  y:490, landId:0 },
  ],
  pathOrder:[1,2,3,4,5,6],
};

function getLandData(id) {
  if (id === 0) return LAND0;
  return LANDS[id-1] || LANDS[0];
}

const LAND_EMOJIS = ["🌿","⛏️","🌊","🌿","🕯️","⚡"];
/* Grid: CW=140 RH=200 X0=70 Y0=70
   Fork1 TOP:   loops below boss1(490,70)  → rejoins tile5(630,70)
   Fork2 RIGHT: loops right of boss2(770,270) → rejoins tile15(630,470)
   Fork3 LEFT:  loops left of tile11(210,270) → rejoins boss3(210,470) */
const LAND_MAIN_PATHS = [
  "M 70 70 L 210 70 L 350 70 L 490 70 L 630 70 L 770 70",
  "M 770 70 C 870 70, 870 270, 770 270",
  "M 770 270 L 630 270 L 490 270 L 350 270 L 210 270",
  "M 210 270 C 110 270, 110 470, 210 470",
  "M 210 470 L 350 470 L 490 470 L 630 470 L 770 470",
];
const LAND_LOOT_PATHS = [
  "M 490 70 L 490 170 L 630 170 L 630 70",
  "M 770 270 L 910 270 L 910 470 L 630 470",
  "M 210 270 L 70 270 L 70 470 L 210 470",
];

const AVATAR = {
  warrior:{ body:"#7C3AED",armor:"#5B21B6",hair:"#92400E",skin:"#FBBF24",accent:"#F5C842",icon:"⚔️" },
  mage:   { body:"#0891B2",armor:"#0E7490",hair:"#1E40AF",skin:"#FDE68A",accent:"#7C3AED",icon:"🔮" },
  ranger: { body:"#059669",armor:"#047857",hair:"#78350F",skin:"#FCD34D",accent:"#34D399",icon:"🏹" },
  healer: { body:"#EC4899",armor:"#DB2777",hair:"#9D174D",skin:"#FDE68A",accent:"#F9A8D4",icon:"✨" },
  rogue:  { body:"#4C1D95",armor:"#3B0764",hair:"#1C1917",skin:"#FBBF24",accent:"#A78BFA",icon:"🗡️" },
};

/* ─── FIREBASE REALTIME DATABASE STORAGE ─── */
let _overrides = {};   // { studentId: { hp, xp, ... } } — in-memory cache
let _helpflags = {};   // { studentId: isoDateString }

function getOverrides() {
  return { students: _overrides };
}
function saveStudentOverride(id, changes) {
  const sid = String(id);
  _overrides[sid] = Object.assign({}, _overrides[sid] || {}, changes);
  update(ref(db, `overrides/${sid}`), changes).catch(console.error);
}
function getHelpFlags() {
  return Object.assign({}, _helpflags);
}
function setHelpFlag(id) {
  const sid = String(id);
  _helpflags[sid] = new Date().toISOString();
  update(ref(db, 'helpflags'), { [sid]: _helpflags[sid] }).catch(console.error);
}
function clearHelpFlag(id) {
  const sid = String(id);
  delete _helpflags[sid];
  set(ref(db, `helpflags/${sid}`), null).catch(console.error);
}
function getGuildCounts() {
  const guilds = CLASS_DATA && CLASS_DATA.guilds ? CLASS_DATA.guilds : {};
  const counts = {};
  Object.keys(guilds).forEach(k => { counts[k] = 0; });
  if (!CLASS_DATA) return counts;
  const ov = getOverrides();
  for (const period of CLASS_DATA.periods) {
    for (const student of period.students) {
      const sOv = ov.students[String(student.id)] || {};
      const g = sOv.guild || student.guild;
      if (g && counts[g] !== undefined) counts[g]++;
    }
  }
  return counts;
}
function assignGuild(studentId) {
  const counts = getGuildCounts();
  const keys = Object.keys(counts);
  if (!keys.length) return null;
  const min = Math.min(...keys.map(k => counts[k]));
  const tied = keys.filter(k => counts[k] === min);
  const chosen = tied[Math.floor(Math.random() * tied.length)];
  saveStudentOverride(studentId, { guild: chosen });
  return chosen;
}
function renderGuildReveal() {
  const ov = getOverrides().students[String(STATE.student.id)] || {};
  const guildKey = ov.guild;
  const guilds = CLASS_DATA && CLASS_DATA.guilds;
  if (!guilds || !guildKey || !guilds[guildKey]) return "";
  const guild = guilds[guildKey];
  const allKeys = Object.keys(guilds);
  const step = STATE.sg0GuildReveal;

  if (step === "spinning") {
    const crests = allKeys.map(k =>
      `<img class="guild-crest-dim" src="${guilds[k].crest}" alt="${guilds[k].name}" width="80" height="80"
        onerror="this.style.opacity='.15';this.style.fontSize='40px';this.style.lineHeight='80px'"/>`
    ).join("");
    return `<div class="guild-reveal-overlay">
      <div class="guild-reveal-inner">
        <div class="guild-spin-title">✦ THE GUILDS ARE DELIBERATING ✦</div>
        <div class="guild-crest-grid">${crests}</div>
        <div class="guild-spin-hint">Ancient forces weigh your fate...</div>
      </div>
    </div>`;
  }

  if (step === "chosen") {
    return `<div class="guild-reveal-overlay">
      <div class="guild-color-flash" style="background:${guild.color}"></div>
      <div class="guild-reveal-inner">
        <div class="guild-chosen-eyebrow">YOU HAVE BEEN CHOSEN BY THE</div>
        <img class="guild-chosen-crest" src="${guild.crest}" alt="${guild.name}" width="170" height="170"
          style="--gc:${guild.color}"
          onerror="this.style.fontSize='80px';this.style.lineHeight='1'"/>
        <div class="guild-chosen-name" style="color:${guild.color}">${guild.name.toUpperCase()}</div>
        <div class="guild-chosen-motto">"${guild.motto}"</div>
        <button class="guild-continue-btn" id="guild-continue-btn"
          style="background:${guild.color};color:#fff">Continue Your Quest →</button>
      </div>
    </div>`;
  }
  return "";
}

function resetStudentFull(studentId) {
  const sid = String(studentId);
  const resetData = {
    currentLand: null, currentTile: 1, completedTiles: [], completedLand0: false,
    hp: 10, mp: 10, sp: 10, xp: 0, xpNext: 50,
    taskProgress: {}, taskTimestamps: {},
    bosses: [], items: [], companions: [],
    title: null, activeCompanion: null,
    guild: null,
  };
  _overrides[sid] = resetData;
  set(ref(db, `overrides/${sid}`), resetData).catch(console.error);
  clearHelpFlag(studentId);
}
function getMergedStudent(base) {
  return Object.assign({}, base, getOverrides().students[String(base.id)] || {});
}
function getTaskProgress(studentId, tileId) {
  const ov = getOverrides().students[String(studentId)] || {};
  return (ov.taskProgress || {})[String(tileId)] || {};
}
function saveTaskCheck(studentId, tileId, tier, idx, checked) {
  const ov = getOverrides();
  const st = ov.students[String(studentId)] || {};
  const tp = Object.assign({}, st.taskProgress || {});
  const td = Object.assign({}, tp[String(tileId)] || {});
  const arr = (td[tier] || []).slice();
  arr[idx] = checked;
  td[tier] = arr;
  tp[String(tileId)] = td;
  saveStudentOverride(studentId, { taskProgress: tp });
}
function getTaskTimestamps(studentId, tileId) {
  const ov = getOverrides().students[String(studentId)] || {};
  return (ov.taskTimestamps || {})[String(tileId)] || {};
}
function saveTaskTimestamp(studentId, tileId, tier, idx) {
  const ov = getOverrides();
  const st = ov.students[String(studentId)] || {};
  const tt = Object.assign({}, st.taskTimestamps || {});
  const td = Object.assign({}, tt[String(tileId)] || {});
  const arr = (td[tier] || []).slice();
  arr[idx] = new Date().toISOString().slice(0, 19);
  td[tier] = arr;
  tt[String(tileId)] = td;
  saveStudentOverride(studentId, { taskTimestamps: tt });
}
function saveTileCompletion(studentId, tileId, timeOnPage) {
  const ov = getOverrides();
  const st = ov.students[String(studentId)] || {};
  const tt = Object.assign({}, st.taskTimestamps || {});
  const td = Object.assign({}, tt[String(tileId)] || {});
  td.completedAt = new Date().toISOString().slice(0, 19);
  td.timeOnPage = timeOnPage;
  tt[String(tileId)] = td;
  saveStudentOverride(studentId, { taskTimestamps: tt });
}
function advanceStudentTile(student, land) {
  const pos = getLandPos(student);
  const curTile = land.tiles.find(t => t.id === pos.tile);
  if (!curTile) return;
  let nextId;
  if (curTile.nextTile) {
    nextId = curTile.nextTile;
  } else {
    const order = land.pathOrder || [];
    const idx = order.indexOf(pos.tile);
    if (idx < 0 || idx >= order.length - 1) return;
    nextId = order[idx + 1];
  }
  const completed = (pos.completed || []).slice();
  if (!completed.includes(pos.tile)) completed.push(pos.tile);
  saveStudentOverride(student.id, { currentTile: nextId, completedTiles: completed });
}
function completeBranchTile(student, tileId) {
  const pos = getLandPos(student);
  const completed = (pos.completed || []).slice();
  if (!completed.includes(tileId)) completed.push(tileId);
  saveStudentOverride(student.id, { completedTiles: completed });
}
function tileXP(tile) {
  if (!tile) return 0;
  if (tile.type === "loot") return tile.skill === "Aspire To" ? 20 : 15;
  return 10;
}
function awardXP(student, amount) {
  const m   = getMergedStudent(student);
  const threshold = m.xpNext || 1000;
  let xp    = (m.xp    || 0) + amount;
  let level = (m.level || 1);
  let levelsGained = 0;
  while (xp >= threshold) { xp -= threshold; level++; levelsGained++; }
  saveStudentOverride(student.id, { xp, level });
  return { levelsGained, newLevel: level };
}
function showXPCelebration(amount, levelsGained, newLevel, onComplete) {
  const el = document.createElement("div");
  el.className = "xp-celebrate";
  el.innerHTML = `<div class="xp-pop">
    <div class="xp-pop-amount">+${amount} XP!</div>
    ${levelsGained > 0
      ? `<div class="xp-pop-levelup">⬆️ Level Up!</div><div class="xp-pop-newlvl">Level ${newLevel}</div>`
      : ""}
  </div>`;
  document.body.appendChild(el);
  const dismiss = () => {
    el.classList.add("xp-celebrate-out");
    setTimeout(() => { el.remove(); onComplete(); }, 380);
  };
  setTimeout(dismiss, levelsGained > 0 ? 1800 : 1200);
}
function showCompanionReveal(file, onComplete) {
  const c = companionByFile(file);
  const border = COMPANION_RARITY_BORDER[c.rarity];
  const label  = COMPANION_RARITY_LABEL[c.rarity];
  const el = document.createElement("div");
  el.className = "companion-reveal-overlay";
  el.innerHTML = `
    <div class="companion-reveal-card">
      <div class="companion-reveal-label">✨ New Companion!</div>
      <div class="companion-reveal-img-wrap" style="border-color:${border}">
        <img src="/companions/${file}" alt="${c.name}" width="88" height="88"/>
      </div>
      <div class="companion-reveal-name">${c.name}</div>
      <div class="companion-reveal-rarity" style="color:${border}">${label}</div>
      <button class="companion-reveal-btn">Awesome!</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector(".companion-reveal-btn").addEventListener("click", () => {
    el.remove(); onComplete();
  });
}
function formatFlagTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return diff + " min ago";
  return new Date(iso).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}

/* ─── TITLE OPTIONS ─── */
const TITLE_OPTIONS = [
  "Apprentice Scholar","Keeper of Scrolls","Word Mender","Champion of Clarity",
  "Swift Reader","Lore Seeker","Story Weaver","Quest Scribe",
  "Seeker of Tales","Ink and Iron","Verse Walker","Archive Knight",
];

/* ─── STATE ─── */
let STATE = { screen:"loading", student:null, currentPeriod:null, pin:"", pinError:"", helpFlagged:false,
              teacherPeriodIdx:0, teacherStudent:null, teacherEdit:null, boardLand:1,
              lessonTile:null, lessonLand:null, teacherTile:null, teacherTileLand:null,
              bossTile:null, bossLand:null, arrivalTile:null, arrivalLand:null,
              avStep:0, avClass:null, avVariant:null, avTone:null,
              customizeOpen:false, pendingTitle:null, pendingCompanion:undefined, custTab:"avatar",
              companionPickerOpen:false, companionPickerStudentId:null,
              lessonOpenedAt:null,
              npcOpen:false, currentNpcKey:null,
              sg0Open:false, sg0Tile:null,
              sg0GuildReveal:null,
              teacherResetConfirm:false };

/* ─── CHIBI SVG ─── */
function chibiSVG(cls, size) {
  const c = AVATAR[cls] || AVATAR.warrior;
  const s = size || 160;
  let hairExt = "";
  if (cls === "mage") hairExt = `
    <polygon points="80,2 55,42 105,42" fill="${c.body}" stroke="#1a0533" stroke-width="2.5"/>
    <rect x="52" y="39" width="56" height="10" rx="5" fill="${c.armor}" stroke="#1a0533" stroke-width="2"/>
    <circle cx="80" cy="8" r="5" fill="${c.accent}" stroke="#1a0533" stroke-width="1.5"/>`;
  else if (cls === "warrior") hairExt = `
    <path d="M50 28 Q52 12 80 10 Q108 12 110 28 Q108 20 80 18 Q52 20 50 28Z" fill="${c.hair}" stroke="#1a0533" stroke-width="1.5"/>
    <path d="M50 28 Q46 42 50 56 Q54 38 56 30Z" fill="${c.hair}"/>
    <path d="M110 28 Q114 42 110 56 Q106 38 104 30Z" fill="${c.hair}"/>`;
  else if (cls === "ranger") hairExt = `
    <path d="M50 28 Q44 40 46 54 Q52 36 56 30Z" fill="${c.hair}"/>
    <path d="M110 28 Q116 40 114 54 Q108 36 104 30Z" fill="${c.hair}"/>
    <path d="M50 28 Q52 10 80 10 Q108 10 110 28" fill="${c.hair}"/>
    <ellipse cx="62" cy="22" rx="8" ry="5" fill="#34D399" stroke="#1a0533" stroke-width="1.5" transform="rotate(-30 62 22)"/>
    <ellipse cx="80" cy="16" rx="8" ry="5" fill="#34D399" stroke="#1a0533" stroke-width="1.5"/>
    <ellipse cx="98" cy="22" rx="8" ry="5" fill="#34D399" stroke="#1a0533" stroke-width="1.5" transform="rotate(30 98 22)"/>`;
  else if (cls === "healer") hairExt = `
    <path d="M50 30 Q46 52 50 76 Q54 56 56 32Z" fill="${c.hair}"/>
    <path d="M110 30 Q114 52 110 76 Q106 56 104 32Z" fill="${c.hair}"/>
    <path d="M50 28 Q52 10 80 10 Q108 10 110 28" fill="${c.hair}"/>
    <path d="M72 14 Q80 10 88 14 Q80 18 72 14Z" fill="#F9A8D4" stroke="#DB2777" stroke-width="1"/>
    <circle cx="80" cy="14" r="4" fill="#DB2777"/>`;
  else if (cls === "rogue") hairExt = `
    <path d="M46 40 Q44 20 80 12 Q116 20 114 40 Q110 28 80 24 Q50 28 46 40Z" fill="${c.hair}" stroke="#1a0533" stroke-width="2"/>
    <path d="M46 40 Q42 62 46 76 Q52 58 56 42Z" fill="${c.hair}"/>
    <path d="M114 40 Q118 62 114 76 Q108 58 104 42Z" fill="${c.hair}"/>`;

  return `<svg width="${s}" height="${s}" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" style="display:block;flex-shrink:0">
  <ellipse cx="80" cy="152" rx="36" ry="7" fill="rgba(0,0,0,0.15)"/>
  <rect x="55" y="108" width="20" height="32" rx="10" fill="${c.armor}" stroke="#1a0533" stroke-width="2.5"/>
  <rect x="85" y="108" width="20" height="32" rx="10" fill="${c.armor}" stroke="#1a0533" stroke-width="2.5"/>
  <rect x="57" y="130" width="16" height="8" rx="5" fill="#1a0533"/>
  <rect x="87" y="130" width="16" height="8" rx="5" fill="#1a0533"/>
  <rect x="46" y="70" width="68" height="44" rx="16" fill="${c.body}" stroke="#1a0533" stroke-width="2.5"/>
  <rect x="58" y="74" width="44" height="30" rx="8" fill="${c.armor}"/>
  <circle cx="80" cy="89" r="6" fill="${c.accent}" stroke="#1a0533" stroke-width="1.5"/>
  <circle cx="80" cy="89" r="3" fill="white" opacity="0.6"/>
  <rect x="22" y="72" width="26" height="34" rx="13" fill="${c.body}" stroke="#1a0533" stroke-width="2.5"/>
  <rect x="112" y="72" width="26" height="34" rx="13" fill="${c.body}" stroke="#1a0533" stroke-width="2.5"/>
  <circle cx="35" cy="106" r="11" fill="${c.armor}" stroke="#1a0533" stroke-width="2"/>
  <circle cx="125" cy="106" r="11" fill="${c.armor}" stroke="#1a0533" stroke-width="2"/>
  <rect x="68" y="58" width="24" height="16" rx="6" fill="${c.skin}" stroke="#1a0533" stroke-width="2"/>
  <ellipse cx="80" cy="34" rx="34" ry="30" fill="${c.hair}"/>
  <ellipse cx="80" cy="38" rx="30" ry="28" fill="${c.skin}" stroke="#1a0533" stroke-width="2.5"/>
  ${hairExt}
  <ellipse cx="66" cy="38" rx="7" ry="8" fill="white"/>
  <ellipse cx="94" cy="38" rx="7" ry="8" fill="white"/>
  <ellipse cx="67" cy="39" rx="5" ry="6" fill="#1a0533"/>
  <ellipse cx="95" cy="39" rx="5" ry="6" fill="#1a0533"/>
  <circle cx="69" cy="36" r="2" fill="white"/>
  <circle cx="97" cy="36" r="2" fill="white"/>
  <ellipse cx="58" cy="48" rx="7" ry="4" fill="#FCA5A5" opacity="0.5"/>
  <ellipse cx="102" cy="48" rx="7" ry="4" fill="#FCA5A5" opacity="0.5"/>
  <path d="M70 52 Q80 59 90 52" stroke="#1a0533" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="130" cy="20" r="16" fill="${c.accent}" stroke="#1a0533" stroke-width="2.5"/>
  <text x="130" y="26" text-anchor="middle" font-size="16">${c.icon}</text>
</svg>`;
}

/* ─── STARS ─── */
function starsHTML() {
  let h = '<div class="stars-bg" aria-hidden="true">';
  for (let i = 0; i < 28; i++) {
    const left = ((Math.sin(i * 137.5 * Math.PI / 180) * 0.5 + 0.5) * 100).toFixed(1);
    const top  = ((Math.cos(i * 137.5 * Math.PI / 180) * 0.5 + 0.5) * 100).toFixed(1);
    const delay = ((i * 0.28) % 4).toFixed(2);
    const size  = 6 + (i % 5) * 2;
    h += `<span class="star" style="left:${left}%;top:${top}%;animation-delay:${delay}s;font-size:${size}px">✦</span>`;
  }
  return h + '</div>';
}

/* ─── RENDER FUNCTIONS ─── */
function renderLoading() {
  return `<div class="screen screen-center">
    ${starsHTML()}
    <div class="login-card enter" style="text-align:center;padding:48px 36px">
      <span style="font-size:52px;display:block;margin-bottom:16px;animation:sword 2s ease-in-out infinite">⚔️</span>
      <h2 style="font-family:var(--font-display);font-size:22px;font-weight:900;background:linear-gradient(135deg,var(--purple),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:10px">The Realm of ELA</h2>
      <p style="font-size:14px;font-weight:700;color:var(--text-light)">Loading your quest data…</p>
      <div class="loading-dots"><span></span><span></span><span></span></div>
    </div>
  </div>`;
}

function renderError(msg) {
  return `<div class="screen screen-center">
    ${starsHTML()}
    <div class="login-card enter" style="text-align:center;padding:40px 32px">
      <span style="font-size:48px;display:block;margin-bottom:12px">⚠️</span>
      <h2 style="font-family:var(--font-display);font-size:20px;font-weight:900;color:var(--red);margin-bottom:10px">Could Not Load Data</h2>
      <p style="font-size:14px;font-weight:700;color:var(--text-mid);margin-bottom:20px">${msg}</p>
      <button class="btn btn-purple" onclick="location.reload()" style="width:100%">🔄 Try Again</button>
    </div>
  </div>`;
}

function renderCode() {
  return `
  <div class="screen screen-center">
    ${starsHTML()}
    <div class="gems-bg" aria-hidden="true">
      <span class="gem-float" style="left:5%;top:15%;animation-delay:0s">💎</span>
      <span class="gem-float" style="left:88%;top:10%;animation-delay:1s">⭐</span>
      <span class="gem-float" style="left:12%;top:75%;animation-delay:2s">✨</span>
      <span class="gem-float" style="left:80%;top:70%;animation-delay:.5s">🌟</span>
      <span class="gem-float" style="left:50%;top:5%;animation-delay:1.5s">💜</span>
      <span class="gem-float" style="left:3%;top:45%;animation-delay:2.5s">🔮</span>
    </div>
    <div class="login-card enter">
      <span class="logo-icon">⚔️</span>
      <h1 class="logo-title">The Realm of ELA</h1>
      <p class="logo-sub">Where Stories Come to Life</p>
      <div class="divider">✦ ✦ ✦</div>
      <p class="form-hint">Enter your class code to begin your adventure!</p>
      <div class="input-wrap" id="code-wrap">
        <span class="input-icon">🗝️</span>
        <input id="code-inp" class="code-input" type="text" placeholder="CLASS CODE" maxlength="20" autocomplete="off" spellcheck="false"/>
      </div>
      ${STATE.pinError ? `<p class="error-box">⚠️ ${STATE.pinError}</p>` : ""}
      <button class="btn btn-purple btn-lg" id="code-btn">
        <span>Enter the Realm</span><span class="btn-arrow">→</span>
      </button>
      <p class="footer-tip">💡 Ask your teacher for the class code</p>
      <button class="teacher-link" id="teacher-link-btn">🔐 Teacher Access</button>
    </div>
  </div>`;
}

function renderGrid() {
  const p = STATE.currentPeriod;
  const tiles = p.students.map((s, i) => {
    const m   = getMergedStudent(s);
    const cls = clsKey(s, m);
    const av  = m.avatar || "avatar_blankchibi.png";
    return `
    <button class="student-tile enter" style="animation-delay:${i*0.05}s" data-id="${s.id}">
      <div class="avatar-ring" style="border-color:${CLS_COLOR[cls]};padding:0">
        <img src="/avatars/${av}" alt="${s.name}" width="130" height="130" loading="lazy"/>
      </div>
      <div>
        <div class="tile-name">${s.name}</div>
        <div class="tile-cls" style="color:${CLS_COLOR[cls]}">Lv.${s.level} ${CLS_LABEL[cls]}</div>
      </div>
      <span class="tile-lvl" style="background:${CLS_COLOR[cls]}">⭐ ${s.level}</span>
    </button>`;
  }).join("");

  return `
  <div class="screen screen-wide">
    ${starsHTML()}
    <div class="screen-hdr enter">
      <button class="btn-back" id="grid-back">← Back</button>
      <div>
        <div class="screen-title">⚔️ Choose Your Hero</div>
        <div class="screen-sub">${p.periodName} · ${p.teacher}</div>
      </div>
    </div>
    <div class="name-grid enter">${tiles}</div>
  </div>`;
}

function renderPin() {
  const s = STATE.student;
  const dots = [0,1,2,3].map(i =>
    `<div class="pin-dot ${STATE.pin.length > i ? "on" : ""}"></div>`).join("");
  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const pad  = keys.map((k,i) => {
    if (!k) return `<div class="num-empty"></div>`;
    if (k === "⌫") return `<button class="num-btn num-del" id="num-del" ${STATE.pin.length===0?"disabled":""}>⌫</button>`;
    return `<button class="num-btn" data-digit="${k}">${k}</button>`;
  }).join("");

  return `
  <div class="screen screen-center">
    ${starsHTML()}
    <div class="pin-card enter">
      <button class="btn-back" id="pin-back">← Back</button>
      <div class="pin-avatar">
        <div class="avatar-ring-lg" style="overflow:hidden;padding:0"><img src="/avatars/${getMergedStudent(s).avatar||'avatar_blankchibi.png'}" style="width:122px;height:122px;object-fit:cover;border-radius:50%;display:block" alt="${s.displayName}" width="122" height="122" loading="lazy"/></div>
        <div class="pin-name">${s.displayName}</div>
        <div class="pin-title">"${s.title}"</div>
      </div>
      <p class="pin-hint">🔐 Enter your secret number</p>
      <div class="pin-dots">${dots}</div>
      ${STATE.pinError ? `<p class="error-box">⚠️ ${STATE.pinError}</p>` : ""}
      <div class="numpad">${pad}</div>
    </div>
  </div>`;
}

const AV_CLASSES = [
  { key:"archer",  icon:"🏹", label:"Archer"  },
  { key:"warrior", icon:"⚔️", label:"Warrior" },
  { key:"fairy",   icon:"🧚", label:"Fairy"   },
  { key:"wizard",  icon:"🔮", label:"Wizard"  },
];
const AV_TONES = [
  { key:"light",  hex:"#FDDBB4", label:"Light"  },
  { key:"tan",    hex:"#D4956A", label:"Tan"    },
  { key:"medium", hex:"#8D5524", label:"Medium" },
  { key:"dark",   hex:"#3D1C02", label:"Dark"   },
];
function buildAvatarFile(char, variant, tone) {
  return `avatar_${char}_${variant}_${tone}.png`;
}

function renderHub() {
  const s = getMergedStudent(STATE.student);

  // Init picker from saved data on first visit
  if (STATE.avClass === null) {
    STATE.avClass   = s.character || "warrior";
    STATE.avVariant = s.variant   || "01";
    STATE.avTone    = s.skinTone  || "light";
  }
  const avStep    = STATE.avStep;
  const avClass   = STATE.avClass;
  const avVariant = STATE.avVariant;
  const avTone    = STATE.avTone;

  // Live preview uses in-progress picker state
  const previewFile = buildAvatarFile(avClass, avVariant, avTone);
  const savedHasNewFormat = s.character && s.variant && s.skinTone;
  const avatarFile = s.avatar || "avatar_blankchibi.png";
  const avatarUrl  = `/avatars/${savedHasNewFormat ? buildAvatarFile(s.character, s.variant, s.skinTone) : avatarFile}`;
  const xpPct = Math.round((s.xp / s.xpNext) * 100);

  // Step breadcrumb
  const stepLabels = ["Class","Style","Skin Tone"];
  const stepsHTML = stepLabels.map((lbl, i) => {
    const n = i + 1;
    const cls = n < avStep ? "av-step-done" : n === avStep ? "av-step-cur" : "";
    return `${i>0?'<span class="av-step-sep">›</span>':''}<span class="av-step-label ${cls}">${n}. ${lbl}</span>`;
  }).join("");

  // Live preview block
  const previewHTML = `
    <div class="av-live-preview">
      <img class="av-live-img" src="/avatars/${previewFile}"
        onerror="this.src='/avatars/avatar_${avClass}_${avVariant}.png';this.onerror=null"
        alt="Preview" width="168" height="168"/>
      <span class="av-live-label">Preview</span>
    </div>`;

  // Step bodies (no inline nav — nav is in the modal header)
  const step1Body = `
    <div class="av-class-grid">
      ${AV_CLASSES.map(c => `
        <button class="av-class-card${avClass===c.key?" av-sel":""}" data-avclass="${c.key}">
          <div class="av-class-icon-wrap">
            <img src="/icons/icon_${c.key}.png"
              onerror="this.src='/icons/icons_${c.key}.png';this.onerror=function(){this.style.opacity='.15'}"
              alt="${c.label}" width="96" height="96" loading="lazy"/>
          </div>
          <span class="av-class-name">${c.label}</span>
        </button>`).join("")}
    </div>`;

  const step2Body = `
    <div class="av-variant-grid">
      ${["01","02","03"].map(v => `
        <button class="av-variant-btn${avVariant===v?" av-sel":""}" data-avvariant="${v}">
          <img src="/avatars/avatar_${avClass}_${v}_light.png"
            onerror="this.src='/avatars/avatar_${avClass}_${v}.png';this.onerror=null"
            alt="Style ${parseInt(v)}" width="100" height="100" loading="lazy"/>
          <span>Style ${parseInt(v)}</span>
        </button>`).join("")}
    </div>`;

  const step3Body = `
    <div class="av-tone-row">
      ${AV_TONES.map(t => `
        <button class="av-tone-btn${avTone===t.key?" av-sel":""}" data-avtone="${t.key}">
          <div class="av-tone-dot" style="background:${t.hex}"></div>
          <span>${t.label}</span>
        </button>`).join("")}
    </div>`;

  const stepBody = avStep===1 ? step1Body : avStep===2 ? step2Body : step3Body;

  // Customize overlay — tabbed: avatar / title / companions
  const activeTitle = STATE.pendingTitle || s.title;
  const titleOptions = TITLE_OPTIONS.includes(s.title) ? TITLE_OPTIONS : [s.title, ...TITLE_OPTIONS];
  const sOv = getOverrides().students[String(s.id)] || {};
  const earnedCompanions = sOv.companions || [];
  const activeCompanion = STATE.pendingCompanion !== undefined ? STATE.pendingCompanion : (sOv.activeCompanion || null);
  const custTab = STATE.custTab || "avatar";

  const companionsTabHTML = `
    <div class="cust-section">
      <div class="cust-section-hdr">🐾 Companions <span style="font-size:10px;font-weight:600;opacity:.6">${earnedCompanions.length}/${COMPANIONS.length} collected</span></div>
      <div class="companion-grid">
        ${COMPANIONS.map(c => {
          const earned = earnedCompanions.includes(c.file);
          const isActive = activeCompanion === c.file;
          const border = COMPANION_RARITY_BORDER[c.rarity];
          return `<div class="companion-slot ${earned?"earned":"locked"}${isActive?" c-active":""}" style="border-color:${earned?border:"transparent"}" data-companion="${c.file}">
            <img src="/companions/${c.file}" alt="${c.name}" width="58" height="58" loading="lazy"/>
            <span class="c-name">${c.name}</span>
            <span class="c-rarity" style="color:${border}">${earned ? COMPANION_RARITY_LABEL[c.rarity] : "???"}</span>
          </div>`;
        }).join("")}
      </div>
    </div>`;

  const custHTML = STATE.customizeOpen ? `
    <div class="cust-overlay">
      <div class="cust-modal">
        <div class="cust-header">
          <span class="cust-header-title">✨ Customize Character</span>
          <button class="av-close-btn" id="cust-close">✕</button>
        </div>
        <div class="cust-tabs">
          <button class="cust-tab${custTab==="avatar"?" active":""}" data-custtab="avatar">🎭 Avatar</button>
          <button class="cust-tab${custTab==="title"?" active":""}" data-custtab="title">👑 Title</button>
          <button class="cust-tab${custTab==="companions"?" active":""}" data-custtab="companions">🐾 Companions</button>
        </div>
        <div class="cust-body">
          ${custTab==="avatar" ? `
          <div class="cust-section">
            <div class="cust-section-hdr">🎭 Choose Avatar</div>
            <div class="av-modal-nav">
              <div>${avStep > 1 ? `<button class="av-nav-btn" id="av-back-${avStep}">← Back</button>` : ""}</div>
              <div class="av-steps">${stepsHTML}</div>
              <div></div>
            </div>
            ${previewHTML}
            ${stepBody}
          </div>` : ""}
          ${custTab==="title" ? `
          <div class="cust-section">
            <div class="cust-section-hdr">👑 Choose Title</div>
            <div class="title-grid">
              ${titleOptions.map(t => `
                <button class="title-card${activeTitle===t?" cust-active":""}" data-title="${t}">${t}</button>`).join("")}
            </div>
          </div>` : ""}
          ${custTab==="companions" ? companionsTabHTML : ""}
        </div>
        <div class="cust-footer">
          <button class="cust-save-btn" id="cust-save">✓ Save Changes</button>
        </div>
      </div>
    </div>` : "";

  const stats = [
    ["hp", "❤️", "#EF4444", "#FEE2E2"],
    ["mp", "💙", "#3B82F6", "#DBEAFE"],
    ["sp", "💚", "#10B981", "#D1FAE5"],
  ].map(([k,icon,color,bg]) => `
    <div class="stat-row">
      <span class="stat-icon">${icon}</span>
      <span class="stat-lbl">${k.toUpperCase()}</span>
      <div class="stat-track" style="background:${bg}">
        <div class="stat-fill" style="background:${color}" data-w="${(s[k]/10*100).toFixed(0)}"></div>
      </div>
      <span class="stat-val">${s[k]}/10</span>
    </div>`).join("");

  const invSlots = [...s.items, ...Array(Math.max(0,8-s.items.length)).fill(null)]
    .map(it => {
      if (!it) return `<div class="item-slot empty"></div>`;
      const def = ITEMS[it] || { i:"❓", n: it };
      const imgTag = def.img
        ? `<img class="item-img" src="/icons/${def.img}" alt="${def.n}" width="64" height="64" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='block'"/><span style="display:none;font-size:22px">${def.i}</span>`
        : `<span style="font-size:22px">${def.i}</span>`;
      return `<div class="item-slot" title="${def.n}">${imgTag}<span class="item-name">${def.n}</span></div>`;
    }).join("");

  const bossRows = s.bosses.length
    ? s.bosses.map(b => `
        <div class="boss-row">
          <span class="boss-ico">${BOSS_ICON[b]||"💀"}</span>
          <span class="boss-nm">${b}</span>
          <span class="boss-std">${BOSS_STANDARD[b]||""}</span>
          <span>🏆</span>
        </div>`).join("")
    : `<p class="boss-empty">No bosses defeated yet — your quest awaits!</p>`;

  return `
  <div class="screen hub-screen">
    ${starsHTML()}
    <div class="hub-wrap">
      <div class="hub-header enter">
        <button class="btn-back" id="hub-logout">🚪 Log Out</button>
        <div class="hub-badge">⚔️ The Realm of ELA</div>
      </div>
      <div class="hub-panel id-panel-wrap enter" style="animation-delay:.05s">
        <div class="id-panel">
          <div class="id-avatar" style="flex-shrink:0;position:relative">
            <div class="avatar-ring-xl" style="overflow:hidden;padding:0"><img src="${avatarUrl}" class="hub-avatar-img" alt="Avatar" width="272" height="272"/></div>
            ${(() => {
              const _gOv = getOverrides().students[String(s.id)] || {};
              const _gKey = _gOv.guild;
              const _guilds = CLASS_DATA && CLASS_DATA.guilds;
              if (!_gKey || !_guilds || !_guilds[_gKey]) return "";
              const _g = _guilds[_gKey];
              return `<img class="hub-guild-badge" src="${_g.crest}" alt="${_g.name}" width="36" height="36"
                style="border-color:${_g.color}" title="${_g.name}"
                onerror="this.style.display='none'"/>`;
            })()}
          </div>
          <div class="id-info" style="justify-content:center">
            <div class="id-lvl">⭐ Level ${s.level}</div>
            <div class="id-name">${s.displayName}</div>
            <div class="id-title">👑 ${activeTitle}</div>
          </div>
          ${activeCompanion ? (() => {
            const comp = companionByFile(activeCompanion);
            return `<div class="companion-card-slot">
              <img src="/companions/${activeCompanion}" alt="${comp.name}" width="64" height="64"/>
              <span class="companion-card-name">${comp.name}</span>
            </div>`;
          })() : `<div class="companion-card-slot companion-card-empty">
            <span class="companion-card-empty-icon">🐾</span>
            <span class="companion-card-name">No Companion</span>
          </div>`}
        </div>
        <button class="id-cust-btn" id="cust-btn" title="Customize Character">
          <img src="/icons/icon_pencil.png" alt="Customize" width="20" height="20"/>
        </button>
      </div>
      ${(() => {
        const gOv = getOverrides().students[String(s.id)] || {};
        const gKey = gOv.guild;
        const guilds = CLASS_DATA && CLASS_DATA.guilds;
        if (!gKey || !guilds || !guilds[gKey]) return "";
        const guild = guilds[gKey];
        return `<div class="hub-panel hub-guild-panel enter" style="border-color:${guild.color};animation-delay:.07s">
          <img class="hub-guild-crest" src="${guild.crest}" alt="${guild.name}" width="52" height="52"
            onerror="this.style.fontSize='32px';this.style.lineHeight='1'"/>
          <div>
            <div class="hub-guild-name" style="color:${guild.color}">${guild.name}</div>
            <div class="hub-guild-motto">"${guild.motto}"</div>
          </div>
        </div>`;
      })()}
      <div class="hub-panel stats-panel-wrap enter" style="animation-delay:.1s">
        <div class="panel-title">⚡ Battle Stats</div>
        ${stats}
        <div class="xp-sect">
          <div class="xp-hdr"><span class="xp-lbl">✨ Experience</span><span class="xp-nums">${s.xp} / ${s.xpNext} XP</span></div>
          <div class="xp-track">
            <div class="xp-fill" data-w="${xpPct}"></div>
            <span class="xp-pct">${xpPct}%</span>
          </div>
        </div>
      </div>
      <div class="hub-panel inv-panel-wrap enter" style="animation-delay:.12s">
        <div class="panel-title">🎒 Inventory</div>
        <div class="inv-grid">${invSlots}</div>
      </div>
      <div class="hub-panel boss-panel-wrap enter" style="animation-delay:.2s">
        <div class="panel-title">🏆 Bosses Defeated</div>
        <div class="boss-list">${bossRows}</div>
      </div>
      <div class="hub-actions enter" style="animation-delay:.25s">
        <button class="btn btn-gold" id="continue-quest-btn">⚔️ Continue Quest</button>
        <button class="btn ${STATE.helpFlagged?"btn-red btn-red-dim":"btn-red"}" id="help-btn" ${STATE.helpFlagged?"disabled":""}>
          ${STATE.helpFlagged?"🙋 Help Requested!":"🚩 Flag for Help"}
        </button>
      </div>
    </div>
    ${custHTML}
  </div>`;
}

/* ─── AVATARS ─── */
const STARTER_AVATARS = [
  "avatar_warrior_01.png","avatar_warrior_02.png","avatar_warrior_03.png",
  "avatar_archer_01.png", "avatar_archer_02.png", "avatar_archer_03.png",
  "avatar_wizard_01.png", "avatar_wizard_02.png", "avatar_wizard_03.png",
  "avatar_fairy_01.png",  "avatar_fairy_02.png",  "avatar_fairy_03.png",
];

/* ─── QUEST BOARD ─── */
const BIOME_TILE_IMGS = [
  "/tiles/tile_verdant_vale.png",
  "/tiles/tile_stone_kingdoms.png",
  "/tiles/tile_drowned_depths.png",
  "/tiles/tile_thornwood.png",
  "/tiles/tile_ashen_hollows.png",
  "/tiles/tile_stormspire.png",
];
function tileImgURL(type, biome) {
  if (type==="dungeon") return "/tiles/tile_dungeon_entrance.png";
  if (type==="event")   return "/tiles/tile_writing_event.png";
  if (type==="boss")    return "/tiles/tile_boss.png";
  if (type==="loot")    return "/tiles/tile_loot.png";
  if (type==="arrival") return "/tiles/tile_arrival.png";
  if (type==="sg" || biome===0) return "/tiles/tile_starting_grounds.png";
  return BIOME_TILE_IMGS[(biome||1)-1];
}

function getLandPos(student) {
  const ov = getOverrides().students[String(student.id)] || {};
  const savedLand = ov.currentLand !== undefined ? ov.currentLand
                  : student.currentLand !== undefined ? student.currentLand
                  : null;
  // Brand-new students (no land set anywhere) always start in Land 0
  if (savedLand === null && !ov.completedLand0) {
    return { land:0, tile: ov.currentTile || 1, completed: ov.completedTiles || [] };
  }
  return {
    land: savedLand !== null ? savedLand : 1,
    tile: ov.currentTile || student.currentTile || 1,
    completed: ov.completedTiles || student.completedTiles || [],
  };
}

function tileState(tile, pos, board) {
  const id = typeof tile === "object" ? tile.id : tile;
  if (board) return "board";
  if (typeof tile === "object" && tile.type === "npc") {
    return pos.land >= tile.landId ? "open" : "locked";
  }
  if (id === pos.tile) return "here";
  if (pos.completed.includes(id)) return "done";
  if (typeof tile === "object" && tile.parentTileId && pos.completed.includes(tile.parentTileId)) return "open";
  return "locked";
}

function tileArt(biome, w, h) {
  const r = Math.round(w*.14);
  if (biome===1) return `<rect width="${w}" height="${h}" rx="${r}" fill="#14532D"/>
    <rect width="${w}" height="${h*.42}" rx="${r}" fill="#22C55E"/>
    <rect y="${h*.39}" width="${w}" height="${h*.61}" fill="#15803D"/>
    <rect y="${h*.65}" width="${w}" height="${h*.35}" fill="#166534"/>
    <ellipse cx="${w*.44}" cy="${h*.26}" rx="${w*.2}" ry="${h*.18}" fill="#4ADE80"/>
    <ellipse cx="${w*.33}" cy="${h*.31}" rx="${w*.14}" ry="${h*.13}" fill="#86EFAC"/>
    <rect x="${w*.41}" y="${h*.43}" width="${w*.07}" height="${h*.22}" fill="#92400E"/>
    <rect x="${w*.1}" y="${h*.53}" width="${w*.22}" height="${h*.18}" rx="${w*.03}" fill="#FDE68A" stroke="#D97706" stroke-width="1.2"/>
    <rect x="${w*.1}" y="${h*.44}" width="${w*.22}" height="${h*.1}" rx="${w*.02}" fill="#92400E"/>
    <circle cx="${w*.17}" cy="${h*.7}" r="${w*.04}" fill="#FCD34D"/>
    <circle cx="${w*.8}" cy="${h*.72}" r="${w*.035}" fill="#F9A8D4"/>
    <circle cx="${w*.88}" cy="${h*.66}" r="${w*.03}" fill="#FCD34D"/>`;
  if (biome===2) return `<rect width="${w}" height="${h}" rx="${r}" fill="#111827"/>
    <polygon points="${w*.06},0 ${w*.18},0 ${w*.12},${h*.3}" fill="#374151"/>
    <polygon points="${w*.28},0 ${w*.44},0 ${w*.36},${h*.36}" fill="#4B5563"/>
    <polygon points="${w*.55},0 ${w*.68},0 ${w*.615},${h*.27}" fill="#374151"/>
    <polygon points="${w*.75},0 ${w*.9},0 ${w*.825},${h*.22}" fill="#4B5563"/>
    <polygon points="${w*.46},${h*.46} ${w*.54},${h*.63} ${w*.46},${h*.8} ${w*.38},${h*.63}" fill="#3B82F6" opacity=".75"/>
    <polygon points="${w*.46},${h*.5} ${w*.52},${h*.63} ${w*.46},${h*.76} ${w*.4},${h*.63}" fill="#BAE6FD" opacity=".88"/>
    <ellipse cx="${w*.15}" cy="${h*.55}" rx="${w*.12}" ry="${h*.09}" fill="#F59E0B" opacity=".2"/>
    <rect x="${w*.11}" y="${h*.51}" width="${w*.07}" height="${h*.17}" fill="#92400E"/>
    <ellipse cx="${w*.145}" cy="${h*.51}" rx="${w*.07}" ry="${h*.07}" fill="#F97316"/>`;
  if (biome===3) return `<rect width="${w}" height="${h}" rx="${r}" fill="#0C4A6E"/>
    <rect width="${w}" height="${h*.32}" rx="${r}" fill="#38BDF8"/>
    <rect y="${h*.29}" width="${w}" height="${h*.71}" fill="#0369A1"/>
    <circle cx="${w*.2}" cy="${h*.17}" r="${w*.065}" fill="white" opacity=".8"/>
    <path d="M0,${h*.38} Q${w*.25},${h*.3} ${w*.5},${h*.38} Q${w*.75},${h*.46} ${w},${h*.38}" stroke="#7DD3FC" stroke-width="2.5" fill="none"/>
    <path d="M0,${h*.54} Q${w*.25},${h*.46} ${w*.5},${h*.54} Q${w*.75},${h*.62} ${w},${h*.54}" stroke="#BAE6FD" stroke-width="2" fill="none" opacity=".5"/>
    <ellipse cx="${w*.2}" cy="${h*.88}" rx="${w*.07}" ry="${h*.12}" fill="#F97316" opacity=".8"/>
    <ellipse cx="${w*.75}" cy="${h*.9}" rx="${w*.06}" ry="${h*.11}" fill="#EC4899" opacity=".8"/>
    <ellipse cx="${w*.58}" cy="${h*.66}" rx="${w*.08}" ry="${h*.04}" fill="#FDE68A"/>
    <polygon points="${w*.66},${h*.66} ${w*.78},${h*.61} ${w*.78},${h*.71}" fill="#FDE68A"/>`;
  if (biome===4) return `<rect width="${w}" height="${h}" rx="${r}" fill="#14081F"/>
    <rect width="${w}" height="${h*.5}" rx="${r}" fill="#1A0E2A"/>
    <circle cx="${w*.17}" cy="${h*.11}" r="${w*.022}" fill="white" opacity=".6"/>
    <circle cx="${w*.73}" cy="${h*.07}" r="${w*.016}" fill="white" opacity=".75"/>
    <path d="M${w*.28},${h} L${w*.19},${h*.52} L${w*.11},${h*.3} M${w*.19},${h*.52} L${w*.05},${h*.42}" stroke="#3B3526" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M${w*.67},${h} L${w*.75},${h*.52} L${w*.84},${h*.3} M${w*.75},${h*.52} L${w*.92},${h*.42}" stroke="#3B3526" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M${w*.1},${h*.3} L${w*.01},${h*.2}" stroke="#6B21A8" stroke-width="1.5" fill="none"/>
    <rect y="${h*.63}" width="${w}" height="${h*.37}" fill="rgba(45,27,78,.5)"/>`;
  if (biome===5) return `<rect width="${w}" height="${h}" rx="${r}" fill="#080514"/>
    <circle cx="${w*.15}" cy="${h*.12}" r="${w*.024}" fill="white" opacity=".7"/>
    <circle cx="${w*.75}" cy="${h*.07}" r="${w*.016}" fill="white" opacity=".8"/>
    <circle cx="${w*.5}" cy="${h*.05}" r="${w*.028}" fill="white" opacity=".55"/>
    <circle cx="${w*.88}" cy="${h*.2}" r="${w*.016}" fill="white" opacity=".65"/>
    <rect x="${w*.38}" y="${h*.24}" width="${w*.24}" height="${h*.32}" rx="${w*.04}" fill="#0F0A1A" stroke="#F59E0B" stroke-width="1.5"/>
    <rect x="${w*.41}" y="${h*.27}" width="${w*.18}" height="${h*.26}" rx="${w*.02}" fill="#FEF08A" opacity=".28"/>
    <ellipse cx="${w*.5}" cy="${h*.56}" rx="${w*.24}" ry="${h*.09}" fill="#F59E0B" opacity=".12"/>
    <line x1="${w*.5}" y1="${h*.08}" x2="${w*.5}" y2="${h*.24}" stroke="#78716C" stroke-width="1.5"/>
    <rect y="${h*.77}" width="${w}" height="${h*.23}" fill="#060310"/>`;
  return `<rect width="${w}" height="${h}" rx="${r}" fill="#1A0A00"/>
    <rect width="${w}" height="${h}" rx="${r}" fill="url(#epicGradFill)" opacity=".32"/>
    <circle cx="${w*.1}" cy="${h*.1}" r="${w*.028}" fill="#FCD34D" opacity=".8"/>
    <circle cx="${w*.88}" cy="${h*.14}" r="${w*.02}" fill="#FCD34D" opacity=".7"/>
    <polygon points="${w*.56},${h*.05} ${w*.38},${h*.44} ${w*.5},${h*.44} ${w*.34},${h*.93} ${w*.64},${h*.42} ${w*.52},${h*.42} ${w*.66},${h*.05}" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.2"/>
    <ellipse cx="${w*.5}" cy="${h*.5}" rx="${w*.3}" ry="${h*.36}" fill="#F59E0B" opacity=".06"/>`;
}

function landTileSVG(tile, biome, state, board) {
  const {id, type, name, x, y, skill} = tile;

  /* ── NPC tiles: completely separate render path ── */
  if (type === "npc") {
    const npcData = CLASS_DATA && CLASS_DATA.npcs && CLASS_DATA.npcs[tile.npcKey];
    const npcType = npcData ? npcData.type : "HINT";
    const npcName = npcData ? npcData.name : "???";
    const npcImg  = npcData ? npcData.image : "";
    const tc = NPC_TYPE_COLOR[npcType] || "#888";
    const ts = LW.TILE, r = Math.round(ts * .14);
    const tx = x - ts/2, ty = y - ts/2;
    const locked = state === "locked";
    const clipId = `npc-clip-${id}`;
    const hoverGlow = !locked && !board
      ? `<rect x="${tx-4}" y="${ty-4}" width="${ts+8}" height="${ts+8}" rx="${r+3}" fill="none" stroke="${tc}" stroke-width="1.5" opacity="0.5"/>`
      : "";
    const portrait = npcImg
      ? `<image href="${npcImg}" x="0" y="0" width="${ts}" height="${ts}" preserveAspectRatio="xMidYMid slice"/>`
      : `<rect width="${ts}" height="${ts}" rx="${r}" fill="#1a1235"/><text x="${ts/2}" y="${ts/2}" text-anchor="middle" dominant-baseline="central" font-size="28">👤</text>`;
    const overlay = locked
      ? `<rect width="${ts}" height="${ts}" rx="${r}" fill="rgba(0,0,0,.82)"/><text x="${ts/2}" y="${ts/2+1}" text-anchor="middle" dominant-baseline="central" font-size="20">🔒</text>`
      : `<rect width="${ts}" height="${ts}" rx="${r}" fill="rgba(0,0,0,.22)"/>`;
    const typeTag = !locked ? (() => {
      const short = npcType === "EASTER EGG" ? "★" : npcType === "ENCOURAGEMENT" ? "★" : npcType === "HINT" ? "?" : "◆";
      return `<rect x="${ts-22}" y="4" width="18" height="16" rx="4" fill="${tc}" opacity="0.92"/>
        <text x="${ts-13}" y="12" text-anchor="middle" dominant-baseline="central" font-size="9" fill="white" font-weight="900" font-family="Arial">${short}</text>`;
    })() : "";
    const nameY = ty + ts + 14;
    const nameFill = locked ? "#4B5563" : "rgba(255,255,255,.78)";
    const nameEl = `<text x="${x}" y="${nameY}" text-anchor="middle" font-size="7.5" font-weight="bold" fill="${nameFill}" font-family="Arial">${npcName.split(" ")[0]}</text>`;
    const typeEl = !locked ? `<text x="${x}" y="${nameY+11}" text-anchor="middle" font-size="6.5" fill="${tc}" font-family="Arial" font-weight="900" letter-spacing=".8">${npcType}</text>` : "";
    return `<g data-tid="${id}" data-npc="1" style="cursor:${locked?"default":"pointer"};opacity:0.6">
      ${hoverGlow}
      <clipPath id="${clipId}"><rect x="0" y="0" width="${ts}" height="${ts}" rx="${r}"/></clipPath>
      <g clip-path="url(#${clipId})" transform="translate(${tx},${ty})">${portrait}${overlay}${typeTag}</g>
      <rect x="${tx}" y="${ty}" width="${ts}" height="${ts}" rx="${r}" fill="none" stroke="${locked?"#2D3748":tc}" stroke-width="${locked?1.5:2}"/>
      ${nameEl}${typeEl}
    </g>`;
  }

  const D  = type==="dungeon";
  const B  = type==="boss";
  const E  = type==="event";
  const L  = type==="loot";
  const A  = type==="arrival";
  const SG = type==="sg";
  const ts = D ? LW.DTILE : E ? LW.ETILE : B ? LW.BTILE : L ? LW.LTILE : LW.TILE;
  const r  = Math.round(ts*.14);
  const tx = x - ts/2, ty = y - ts/2;
  const locked = state==="locked";
  const done   = state==="done";
  const here   = state==="here";
  const brd    = state==="board";

  /* ── border color / width ── */
  let bc="#4B5563", bw=2;
  if (locked)      { bc="#2D3748"; bw=1.5; }
  else if (here)   { bc="#7C3AED"; bw=3; }
  else if (done||brd) {
    bc = D?"#F59E0B": B?"#EF4444": E?"#F59E0B": L?"#10B981": A?"#34D399": SG?"#D97706":"#F59E0B";
    bw = 2.5;
  } else {
    bc = D?"#991B1B": B?"#7F1D1D": E?"#92400E": L?"#065F46": A?"#1A3A2A": SG?"#92400E":"#374151";
    bw = D?3:2;
  }

  /* ── animated outer rings ── */
  const bossRing = B && !locked && !brd ? `<rect x="${tx-5}" y="${ty-5}" width="${ts+10}" height="${ts+10}" rx="${r+4}" fill="none" stroke="${done?"rgba(245,158,11,.3)":here?"rgba(167,139,250,.3)":"rgba(127,29,29,.3)"}" stroke-width="2"/>` : "";

  /* Dungeon: double animated dark-red ring */
  const dungRing = D && !locked ? `<g class="dng-glow">
    <rect x="${tx-10}" y="${ty-10}" width="${ts+20}" height="${ts+20}" rx="${r+8}" fill="none" stroke="#DC2626" stroke-width="3.5"/>
    <rect x="${tx-18}" y="${ty-18}" width="${ts+36}" height="${ts+36}" rx="${r+14}" fill="none" stroke="#991B1B" stroke-width="2"/>
  </g>` : "";

  /* Event: animated gold sparkle ring */
  const evRing = E && !locked ? `<g class="ev-glow">
    <rect x="${tx-8}" y="${ty-8}" width="${ts+16}" height="${ts+16}" rx="${r+6}" fill="none" stroke="#F59E0B" stroke-width="3"/>
    <rect x="${tx-15}" y="${ty-15}" width="${ts+30}" height="${ts+30}" rx="${r+12}" fill="none" stroke="#FDE68A" stroke-width="1.5" stroke-dasharray="6 4"/>
  </g>` : "";

  const pulse = here ? `<rect class="qm-pr" x="${tx-8}" y="${ty-8}" width="${ts+16}" height="${ts+16}" rx="${r+7}" fill="none" stroke="#7C3AED" stroke-width="3"/>` : "";
  const yah   = here && !brd ? `<g class="qm-yh">
    <text x="${x}" y="${ty-24}" text-anchor="middle" font-size="8.5" font-weight="900" fill="#E9D5FF" font-family="Arial" letter-spacing="1.5">YOU ARE HERE</text>
    <text x="${x}" y="${ty-13}" text-anchor="middle" font-size="8" fill="#C4B5FD">▼</text></g>` : "";

  /* ── tile art interior — image-based ── */
  const interior = locked
    ? `<rect width="${ts}" height="${ts}" rx="${r}" fill="#111"/>`
    : `<foreignObject x="0" y="0" width="${ts}" height="${ts}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${ts}px;height:${ts}px;background-image:url(${tileImgURL(type,biome)});background-size:cover;background-position:center;"></div></foreignObject>`;

  const lockedOverlay = locked ? `
    <rect width="${ts}" height="${ts}" rx="${r}" fill="rgba(0,0,0,.78)"/>
    <text x="${ts/2}" y="${ts/2+1}" text-anchor="middle" dominant-baseline="central" font-size="${D?28:B?22:20}">🔒</text>` : "";
  const doneBadge = !brd && done ? `
    <circle cx="${ts-13}" cy="13" r="10" fill="#F59E0B" stroke="#78350F" stroke-width="1.5"/>
    <text x="${ts-13}" y="13" text-anchor="middle" dominant-baseline="central" font-size="9" fill="white" font-weight="900" font-family="Arial">✓</text>` : "";

  /* ── labels ── */
  const nameY   = ty + ts + (D?14:E?16:B?18:16);
  const nameFill = locked ? "#4B5563" : D?"#FCA5A5": E?"#FDE68A":"rgba(255,255,255,.88)";
  const nameFS   = D?10:E?9:B?8.5:8;
  const nameEl   = `<text x="${x}" y="${nameY}" text-anchor="middle" font-size="${nameFS}" font-weight="bold" fill="${nameFill}" font-family="Arial">${name}</text>`;
  const skillEl  = skill && !locked ? `<text x="${x}" y="${nameY+13}" text-anchor="middle" font-size="7.5" fill="${done||brd?"#FDE68A":"#93C5FD"}" font-family="Arial" font-weight="700">${skill}</text>` : "";
  const typeTag  = !locked ? (
    D ? `<text x="${x}" y="${nameY+(skill?27:14)}" text-anchor="middle" font-size="7.5" fill="${done||brd?"#FCD34D":"#FCA5A5"}" font-family="Arial" font-weight="900" letter-spacing="1">⚔ MASTER BOSS</text>` :
    B ? `<text x="${x}" y="${nameY+(skill?26:13)}" text-anchor="middle" font-size="7" fill="${done||brd?"#FCA5A5":"#F87171"}" font-family="Arial" font-weight="900" letter-spacing=".5">⚔ BOSS</text>` :
    E ? `<text x="${x}" y="${nameY+14}" text-anchor="middle" font-size="8" fill="#F59E0B" font-family="Arial" font-weight="900" letter-spacing=".5">✦ WRITING EVENT ✦</text>` : ""
  ) : "";

  return `<g data-tid="${id}">${dungRing}${evRing}${bossRing}${pulse}
    <clipPath id="clip-${id}"><rect x="0" y="0" width="${ts}" height="${ts}" rx="${r}"/></clipPath>
    <g clip-path="url(#clip-${id})" transform="translate(${tx},${ty})">${interior}${lockedOverlay}${doneBadge}</g>
    <rect x="${tx}" y="${ty}" width="${ts}" height="${ts}" rx="${r}" fill="none" stroke="${bc}" stroke-width="${bw}"/>
    ${yah}${nameEl}${skillEl}${typeTag}</g>`;
}

const DECO_IMGS = { mountains:"/tiles/mountains.png", lake:"/tiles/lake.png", castle:"/tiles/castle.png", graveyard:"/tiles/graveyard.png" };
const LAND_NPC_RACE = ["lumin","thornkin","gravenborn","tideweaver","briarfolk","embersoul","voltari"];
const NPC_TYPE_COLOR = { "HINT":"#0891B2", "LORE":"#7C3AED", "ENCOURAGEMENT":"#059669", "EASTER EGG":"#D97706" };
const NPC_TYPE_BG    = { "HINT":"rgba(8,145,178,.18)", "LORE":"rgba(124,58,237,.18)", "ENCOURAGEMENT":"rgba(5,150,105,.18)", "EASTER EGG":"rgba(217,119,6,.18)" };
function decorationSVG(name, cx, cy) {
  const url = DECO_IMGS[name];
  if (!url) return "";
  const ts = LW.TILE, r = Math.round(ts * .14);
  const x = cx - ts/2, y = cy - ts/2;
  const cid = `deco-clip-${name}`;
  return `<clipPath id="${cid}"><rect x="${x}" y="${y}" width="${ts}" height="${ts}" rx="${r}"/></clipPath>
  <image href="${url}" x="${x}" y="${y}" width="${ts}" height="${ts}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${cid})" opacity="0.82" style="pointer-events:none"/>`;
}

function buildLandSVG(land, pos, board, extraSVG) {
  const biome = land.biome;
  const W = land.W || LW.W;
  const H = land.H || LW.H;
  const bgColors = [
    ["#0D2008","#071005"],["#0A0C10","#060708"],["#061628","#040D1A"],
    ["#0A0614","#05030C"],["#060310","#030109"],["#1A0A00","#0D0500"]
  ];
  const [bgTop, bgBot] = biome===0 ? ["#1C1008","#0F0700"] : (bgColors[biome-1] || bgColors[0]);

  const stars = Array.from({length:55}, (_,i) => {
    const sx = ((i*137.508)%(W-20))+10;
    const sy = ((i*234.1)%(H-20))+10;
    const sr = .5+(i%3)*.5;
    return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr}" fill="white" opacity="${(.1+(i%6)*.07).toFixed(2)}"/>`;
  }).join("");

  const road = (paths,border,fill,w,dash) => paths.map(d =>
    `<path d="${d}" stroke="${border}" stroke-width="${w+5}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" stroke="${fill}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${dash?` stroke-dasharray="8 5"`:""}/>`
  ).join("");

  const mainPaths   = land.mainPaths   || LAND_MAIN_PATHS;
  const branchPaths = land.branchPaths || LAND_LOOT_PATHS;
  const tiles = land.tiles.map(t => landTileSVG(t, biome, tileState(t, pos, board), board)).join("");
  const decors = (land.decorations||[]).map(d => decorationSVG(d.name, d.x, d.y)).join("");

  return `<defs>
    <linearGradient id="epicGradFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  ${decors}
  ${road(branchPaths,"#064E3B","#34D399",9,true)}
  ${road(mainPaths,"#78350F","#FDE68A",13,false)}
  ${tiles}
  ${extraSVG||""}`;
}

function renderArrivalScreen() {
  const land = STATE.arrivalLand || LANDS[0];
  return `<div class="screen arrival-screen">
    <img class="arrival-banner" src="/tiles/tile_arrival.png" alt="Arrival" width="800" height="340" onerror="this.style.display='none'"/>
    <div class="arrival-body">
      <div class="arrival-land-name">Welcome to ${land.name}</div>
      <hr class="arrival-divider"/>
      <p class="arrival-intro">You have arrived at the Verdant Vale, a lush land of ancient forests and hidden paths. Your journey as a scholar-adventurer begins here. Prove your mastery and face the challenges that await.</p>
      <button class="arrival-btn" id="arrival-begin">Begin Your Quest! ⚔️</button>
    </div>
  </div>`;
}

function renderBossScreen() {
  const tile    = STATE.bossTile  || {};
  const land    = STATE.bossLand  || LANDS[0];
  const student = STATE.student;
  const m       = getMergedStudent(student);

  const bossName  = tile.name    || "Unknown Boss";
  const skillCode = tile.skill   || "";
  const skillName = STANDARD_NAMES[skillCode] || "";
  const portrait  = tile.portrait || null;
  const lore      = tile.lore    || "";
  const pearUrl   = tile.pearUrl || "https://app.peardeck.com/placeholder";
  const hp        = m.hp ?? 10;
  const hpLow     = hp < 5;
  const pos = getLandPos(student);
  const alreadyDefeated = (pos.completed || []).includes(tile.id);

  const hpDots = Array.from({length:10}, (_, i) =>
    `<span class="boss-hp-dot${i < hp ? " filled" : ""}"></span>`
  ).join("");

  return `
  <div class="screen boss-screen">
    ${starsHTML()}
    <div class="boss-wrap">

      <div class="boss-nav enter">
        <button class="btn-back" id="boss-back">← Quest Map</button>
        <div class="ls-breadcrumb">
          <span class="ls-bc-land">${land.name}</span>
          <span class="ls-bc-sep">›</span>
          <span class="ls-bc-tile">${bossName}</span>
        </div>
      </div>

      <div class="boss-portrait-wrap enter" style="animation-delay:.06s">
        ${portrait
          ? `<img class="boss-portrait" src="/bosses/${portrait}" alt="${bossName}" width="500" height="500"/>`
          : `<div class="boss-portrait boss-portrait-fallback">${BOSS_ICON[bossName] || "👹"}</div>`}
      </div>

      <div class="boss-identity enter" style="animation-delay:.12s">
        <h1 class="boss-name">${bossName}</h1>
        ${skillCode ? `<div class="boss-skill">${skillCode}${skillName ? ` — ${skillName}` : ""}</div>` : ""}
      </div>

      ${lore ? `
      <div class="boss-lore-card enter" style="animation-delay:.16s">
        <p class="boss-lore">${lore}</p>
      </div>` : ""}

      <div class="boss-hp-card enter" style="animation-delay:.20s">
        <div class="boss-hp-label">❤️ Your HP</div>
        <div class="boss-hp-dots">${hpDots}</div>
        <div class="boss-hp-val">${hp} / 10</div>
      </div>

      ${hpLow ? `
      <div class="boss-hp-warning enter" style="animation-delay:.22s">
        ⚠️ Your HP is low! Complete a Side Quest before challenging this boss.
      </div>` : ""}

      <button class="boss-fight-btn enter" id="boss-fight-btn" style="animation-delay:.25s">
        ⚔️ Begin Boss Fight
      </button>
      ${!alreadyDefeated ? `
      <button class="boss-defeat-btn enter" id="boss-defeat-btn" style="animation-delay:.3s">
        ✅ I Defeated It! — Claim Reward
      </button>` : `
      <div style="text-align:center;font-size:13px;font-weight:700;color:rgba(255,255,255,.4);margin-top:8px">✓ Already defeated</div>`}

    </div>
  </div>`;
}

function renderLessonStop() {
  const tile     = STATE.lessonTile || {};
  const land     = STATE.lessonLand || LANDS[0];
  const student  = STATE.student;
  const title    = tile.sessionTitle || tile.name || "Lesson";
  const desc     = tile.sessionDesc  || "";
  const mustDo   = tile.mustDo   || [];
  const shouldDo = tile.shouldDo || [];
  const aspireTo = tile.aspireTo || [];
  const wbRef    = tile.workbookRef || "";
  const progress = student ? getTaskProgress(student.id, tile.id) : {};
  const mustAllDone = mustDo.length === 0 || mustDo.every((_, i) => (progress.mustDo || [])[i]);
  const pos = student ? getLandPos(student) : {};
  const isCompleted  = (pos.completed || []).includes(tile.id);
  const isBranchTile = !!tile.parentTileId;
  // Branch tiles are actionable when their parent is completed and they aren't yet.
  // Main-path tiles are actionable only when they are the student's current tile.
  const isActionable = !isCompleted && (
    isBranchTile
      ? (pos.completed || []).includes(tile.parentTileId)
      : pos.tile === tile.id
  );

  const tierHTML = (tasks, tier, cls, icon, label) => {
    if (!tasks.length) return "";
    const prog = progress[tier] || [];
    const rows = tasks.map((t, i) => {
      const checked = prog[i] || false;
      return `<label class="ls-task${checked ? " ls-task-done" : ""}">
        <input type="checkbox" class="ls-check" data-tier="${tier}" data-idx="${i}" ${checked ? "checked" : ""}/>
        <span>${t}</span>
      </label>`;
    }).join("");
    return `<div class="ls-tier ${cls}">
      <div class="ls-tier-header">
        <span class="ls-tier-icon">${icon}</span>
        <span class="ls-tier-label">${label}</span>
      </div>
      <div class="ls-tier-body">${rows}</div>
    </div>`;
  };

  return `
  <div class="screen ls-screen">
    ${starsHTML()}
    <div class="ls-wrap">
      <div class="ls-nav enter">
        <button class="btn-back" id="ls-back">← Quest Map</button>
        <div class="ls-breadcrumb">
          <span class="ls-bc-land">${land.name}</span>
          <span class="ls-bc-sep">›</span>
          <span class="ls-bc-tile">${tile.name || ""}</span>
        </div>
      </div>

      <button class="ls-video-btn enter" id="ls-video-btn" style="animation-delay:.05s">
        <span class="ls-play-icon">▶</span>
        <span>Open Video Lesson</span>
      </button>

      <div class="ls-session-card enter" style="animation-delay:.08s">
        <div class="ls-session-title">${title}</div>
        ${desc ? `<div class="ls-session-desc">${desc}</div>` : ""}
      </div>

      <div class="ls-tiers enter" style="animation-delay:.12s">
        ${tierHTML(mustDo,   "mustDo",   "ls-tier-must",   "🔴", "Must Do")}
        ${tierHTML(shouldDo, "shouldDo", "ls-tier-should", "🟡", "Should Do")}
        ${tierHTML(aspireTo, "aspireTo", "ls-tier-aspire", "🟢", "Aspire To")}
      </div>

      <button class="ls-submit-btn enter" id="ls-submit" ${(!isActionable || !mustAllDone) ? "disabled" : ""} data-completed="${!isActionable}" style="animation-delay:.16s">
        ${!isActionable ? "Quest Complete ✓" : mustAllDone ? "✅ I'm Ready!" : "🔒 Complete Must Do tasks to continue"}
      </button>

      ${wbRef ? `<div class="ls-workbook enter" style="animation-delay:.20s">${wbRef}</div>` : ""}
    </div>
  </div>`;
}

function renderNpcModal() {
  if (!STATE.npcOpen || !STATE.currentNpcKey) return "";
  const npc = CLASS_DATA && CLASS_DATA.npcs && CLASS_DATA.npcs[STATE.currentNpcKey];
  if (!npc) return "";
  const tc  = NPC_TYPE_COLOR[npc.type] || "#888";
  const bg  = NPC_TYPE_BG[npc.type]   || "rgba(0,0,0,.18)";
  return `<div class="npc-overlay" id="npc-overlay">
    <div class="npc-modal" role="dialog" aria-modal="true">
      <button class="npc-modal-close" id="npc-close" aria-label="Close">✕</button>
      <img class="npc-modal-portrait" src="${npc.image}" alt="${npc.name}"
           style="border-color:${tc}" onerror="this.style.display='none'"/>
      <div class="npc-modal-name">${npc.name}</div>
      <div style="text-align:center;margin-bottom:16px">
        <span class="npc-type-badge" style="background:${bg};color:${tc};border:1.5px solid ${tc}">${npc.type}</span>
      </div>
      <div class="npc-modal-dialogue">"${npc.dialogue}"</div>
      <div class="npc-modal-footer"><button id="npc-close-btn">Close</button></div>
    </div>
  </div>`;
}

function renderWritingEvent() {
  const tile = STATE.lessonTile;
  const land = STATE.lessonLand || LANDS[0];
  const we   = CLASS_DATA && CLASS_DATA.writingEvents && CLASS_DATA.writingEvents["land" + land.id];
  const prog = tile ? getTaskProgress(STATE.student.id, tile.id) : {};
  const checks = prog.event || [];
  const checklist = we ? we.checklist : [];
  const allDone = checklist.length > 0 && checklist.every((_, i) => checks[i]);

  const particles = Array.from({length:16}, (_, i) => {
    const x = 3 + ((i * 67) % 94);
    const y = 3 + ((i * 137) % 94);
    const size = 1.5 + (i % 4);
    const delay = ((i * 0.38) % 3.2).toFixed(2);
    const dur   = (2.2 + (i % 4) * 0.6).toFixed(1);
    return `<span class="we-particle" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
  }).join("");

  const checkItems = checklist.map((item, i) => {
    const checked = checks[i] || false;
    return `<label class="we-check-item${checked?" checked":""}">
      <input type="checkbox" class="we-cb" data-idx="${i}"${checked?" checked":""}>
      <span class="we-check-icon">${checked?"✓":""}</span>
      <span>${item}</span>
    </label>`;
  }).join("") || `<p style="color:rgba(255,255,255,.4);text-align:center;font-size:13px">Checklist coming soon.</p>`;

  return `<div class="screen we-screen">
    ${particles}
    <a class="we-return" id="we-back">← Return to Map</a>
    <div class="we-inner">
      <div class="we-header">
        <div class="we-title">⚔ THE SCRIBE'S CALLING ⚔</div>
        ${we && we.portrait
          ? `<div class="boss-portrait-wrap" style="margin:12px 0 4px">
               <img class="boss-portrait" src="/bosses/${we.portrait}" alt="${we.boss}" width="260" height="260"
                    style="width:clamp(160px,40vw,260px);height:clamp(160px,40vw,260px)"
                    onerror="this.parentNode.innerHTML='<div class=\\'boss-portrait boss-portrait-fallback\\' style=\\'width:clamp(160px,40vw,260px);height:clamp(160px,40vw,260px)\\'>📜</div>'"/>
             </div>`
          : ""}
        <div class="we-boss">${we ? we.boss + " awaits..." : "The Scribe awaits..."}</div>
        <div class="we-badges">
          ${we ? `<span class="we-badge we-badge-type">${we.type.toUpperCase()}</span>` : ""}
          ${we ? `<span class="we-badge we-badge-std">${we.standard}</span>` : ""}
        </div>
      </div>
      <div class="we-prompt-card">
        <div class="we-prompt-label">THE PROMPT</div>
        <div class="we-prompt-text">${we ? we.prompt : "Your teacher will provide the writing prompt."}</div>
      </div>
      <div class="we-checklist-section">
        <div class="we-cl-title">Writer's Checklist</div>
        <div class="we-checklist" id="we-checklist">
          ${checkItems}
        </div>
        <button class="we-ready-btn${allDone?"":" disabled"}" id="we-ready-btn"${allDone?"":" disabled"}>
          ${allDone ? "✍ I Am Ready to Write" : "Check off all items to continue"}
        </button>
      </div>
    </div>
  </div>`;
}

function advanceSg0Tile(student, tileId) {
  const pos = getLandPos(student);
  const completed = [...(pos.completed || [])];
  if (!completed.includes(tileId)) completed.push(tileId);
  if (tileId === 6) {
    // Prologue complete — graduate to Land 1
    saveStudentOverride(student.id, {
      currentLand:1, currentTile:1, completedTiles:[], completedLand0:true,
    });
  } else {
    const order = LAND0.pathOrder;
    const idx   = order.indexOf(tileId);
    const next  = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : tileId;
    saveStudentOverride(student.id, { currentTile:next, completedTiles:completed });
  }
}

function renderSg0Modal() {
  if (!STATE.sg0Open || !STATE.sg0Tile) return "";
  const tile  = STATE.sg0Tile;
  const pos   = getLandPos(STATE.student);
  const isDone    = (pos.completed || []).includes(tile.id);
  const isCurrent = pos.tile === tile.id && pos.land === 0;

  const ICONS = {1:"📋",2:"⚔️",3:"🏛️",4:"🛡️",5:"⚔️",6:"🌟"};
  const icon  = ICONS[tile.id] || "✦";

  // Tile 3 — show assigned guild info (reveal animation is a separate overlay)
  if (tile.id === 3) {
    const gOv = getOverrides().students[String(STATE.student.id)] || {};
    const gKey = gOv.guild;
    const guilds = CLASS_DATA && CLASS_DATA.guilds;
    if (gKey && guilds && guilds[gKey]) {
      const guild = guilds[gKey];
      const gBody = `<p class="sg-modal-flavor">"${tile.flavor}"</p>
        <div class="sg-guild-card" style="border-color:${guild.color}">
          <img class="sg-guild-card-crest" src="${guild.crest}" alt="${guild.name}" width="72" height="72"
            onerror="this.style.fontSize='44px';this.style.lineHeight='1'"/>
          <div class="sg-guild-card-name" style="color:${guild.color}">${guild.name}</div>
          <div class="sg-guild-card-motto">"${guild.motto}"</div>
        </div>`;
      const gFooter = isDone
        ? `<div style="color:#10B981;font-weight:700;font-size:14px">✓ Completed</div>`
        : isCurrent
          ? `<button class="btn btn-purple" id="sg-complete-btn">Continue →</button>`
          : `<div style="color:rgba(0,0,0,.35);font-size:13px">Complete earlier tiles first</div>`;
      return `<div class="npc-overlay" id="sg-overlay">
        <div class="sg-modal">
          <button class="npc-modal-close" id="sg-close">✕</button>
          <div class="sg-modal-icon">${icon}</div>
          <div class="sg-modal-title">${tile.name}</div>
          <div class="sg-modal-body">${gBody}</div>
          <div class="sg-modal-footer">${gFooter}</div>
        </div>
      </div>`;
    }
    // No guild yet — reveal animation handles it; don't show the regular modal
    return "";
  }

  // Tile 4 — The Armory: full custom stat explainer layout
  if (tile.id === 4) {
    const statCards = [
      { icon:"❤️", name:"HP — Health Points",     color:"#C0392B", desc:"Your academic grade. HP mirrors your actual grade on a 1–10 scale — keep your grades up, keep your HP high." },
      { icon:"💙", name:"MP — Mana Points",        color:"#1A6B8A", desc:"Your behavior score. MP reflects how you show up every day — respect, effort, and how you treat your guild." },
      { icon:"💚", name:"SP — Stamina Points",     color:"#27AE60", desc:"Your effort score. SP tracks how hard you're working — completing tasks and pushing through hard content." },
      { icon:"⭐", name:"XP — Experience Points",  color:"#D4A017", desc:"XP counts up forever and never goes down. Every lesson completed earns XP. Every 1,000 XP = a new level." },
    ];
    const cardHTML = statCards.map(sc => `
      <div class="sg-stat-card" style="border-color:${sc.color}">
        <div class="sg-stat-card-hdr" style="color:${sc.color}">${sc.icon} ${sc.name}</div>
        <div class="sg-stat-card-desc">${sc.desc}</div>
      </div>`).join("");
    const tableRows = [
      ["8–10","⭐ Full access — all rewards unlocked"],
      ["5–7", "✅ Side quest required before boss fights"],
      ["3–4", "⚠️ Reteach or reflection needed"],
      ["1–2", "🚨 Intervention — let's talk"],
    ].map(r => `<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td></tr>`).join("");
    const armoryBody = `
      <div class="sg-armory-title">⚔ THE ARMORY ⚔</div>
      <div class="sg-armory-subtitle">Every warrior knows their stats. Learn yours before you take your first step into the Realm.</div>
      <hr class="sg-armory-divider">
      <div class="sg-stat-grid">${cardHTML}</div>
      <div class="sg-armory-tbl-lbl">WHAT YOUR STATS MEAN</div>
      <table class="sg-armory-table">
        <thead><tr><th>Score</th><th>Status</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="sg-armory-footer-note">You can check your stats anytime from your Character Hub.</div>`;
    const armoryFooter = isDone
      ? `<div style="color:#10B981;font-weight:700;font-size:14px">✓ Completed</div>`
      : isCurrent
        ? `<button class="btn btn-gold" id="sg-complete-btn">Got It — Onward! ✦</button>`
        : `<div style="color:rgba(0,0,0,.35);font-size:13px">Complete earlier tiles first</div>`;
    return `<div class="npc-overlay" id="sg-overlay">
      <div class="sg-modal">
        <button class="npc-modal-close" id="sg-close">✕</button>
        <div class="sg-modal-body">${armoryBody}</div>
        <div class="sg-modal-footer">${armoryFooter}</div>
      </div>
    </div>`;
  }

  let body = `<p class="sg-modal-flavor">"${tile.flavor}"</p>`;

  if (tile.sgModal === "avatar") {
    body += `<div class="sg-modal-avatar-hint">
      Tap <strong style="color:#7C3AED">Customize Hero</strong> to pick your class, style, and look — then come back and mark this complete when you're ready.
    </div>`;
  } else if (tile.sgModal === "lesson") {
    body += `<div class="sg-lesson-demo">
      <div class="sg-lesson-section">
        <div class="sg-lesson-label">📺 Lesson Video</div>
        <div class="sg-video-ph">🎬 Your teacher's video will appear here during real lessons</div>
      </div>
      <div class="sg-lesson-section">
        <div class="sg-lesson-label">🔴 Must Do</div>
        <label class="sg-check-item"><input type="checkbox" class="sg-demo-cb"> I read or listened to the lesson</label>
        <label class="sg-check-item"><input type="checkbox" class="sg-demo-cb"> I can explain the main idea in my own words</label>
      </div>
      <div class="sg-lesson-section">
        <div class="sg-lesson-label">🟡 Should Do</div>
        <label class="sg-check-item"><input type="checkbox" class="sg-demo-cb"> I used a text detail as evidence in my response</label>
      </div>
      <div class="sg-lesson-section">
        <div class="sg-lesson-label">🟢 Aspire To</div>
        <label class="sg-check-item"><input type="checkbox" class="sg-demo-cb"> I connected this idea to something I already knew</label>
      </div>
    </div>`;
  } else if (tile.sgModal === "gate") {
    body += `<div class="sg-gate-banner">🗺 The Verdant Vale awaits beyond the gate.<br>Once you step through, your real quest begins!</div>`;
  }

  let footer = "";
  if (isDone) {
    footer = `<div style="color:#10B981;font-weight:700;font-size:14px">✓ Completed</div>`;
  } else if (isCurrent) {
    if (tile.sgModal === "avatar") {
      footer = `<button class="btn btn-purple" style="flex:1" id="sg-open-avatar">🎨 Customize Hero</button>
                <button class="btn btn-purple" style="flex:1" id="sg-complete-btn">Continue →</button>`;
    } else {
      const label = tile.sgModal === "gate" ? "Begin Adventure! 🗺" : "Mark Complete ✓";
      footer = `<button class="btn btn-purple" id="sg-complete-btn">${label}</button>`;
    }
  } else {
    footer = `<div style="color:rgba(0,0,0,.35);font-size:13px">Complete earlier tiles first</div>`;
  }

  return `<div class="npc-overlay" id="sg-overlay">
    <div class="sg-modal">
      <button class="npc-modal-close" id="sg-close">✕</button>
      <div class="sg-modal-icon">${icon}</div>
      <div class="sg-modal-title">${tile.name}</div>
      <div class="sg-modal-body">${body}</div>
      <div class="sg-modal-footer">${footer}</div>
    </div>
  </div>`;
}

function renderWelcomeSplash() {
  const firstName = (STATE.student.displayName || "Adventurer").split(" ")[0];
  const particles = Array.from({length:22}, (_,i) => {
    const x = (i * 4.7 + 2) % 100;
    const y = 10 + (i * 8.3) % 85;
    const size = 1.5 + (i % 5) * 0.7;
    const delay = ((i * 0.43) % 5).toFixed(2);
    const dur   = (4 + (i % 5) * 0.9).toFixed(1);
    return `<span class="ws-particle" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;animation-delay:-${delay}s;animation-duration:${dur}s"></span>`;
  }).join("");
  return `<div class="screen ws-screen">
    <div class="ws-map-bg"></div>
    ${particles}
    <div class="ws-welcome-name">Welcome, ${firstName}</div>
    <div class="ws-inner">
      <div class="ws-title">REALM OF ELA</div>
      <hr class="ws-divider">
      <div class="ws-flavor">"The Realm of ELA has awaited your arrival, young adventurer. Ancient lands stir. Bosses grow restless. Your quest begins now."</div>
      <button class="ws-cta-btn" id="ws-cta">⚔ ANSWER THE CALL ⚔</button>
    </div>
  </div>`;
}

function renderQuestMap() {
  const student = getMergedStudent(STATE.student);
  const pos     = getLandPos(STATE.student);
  const land    = getLandData(pos.land);
  const ov      = getOverrides().students[String(STATE.student.id)] || {};

  // Land 0 world-map dot
  const sg0Cls  = ov.completedLand0 ? "sg-done" : pos.land === 0 ? "sg-here" : "locked";
  const sg0Dot  = `<div class="lm-dot ${sg0Cls}" title="The Starting Grounds">🏕️</div>`;

  const landDots = sg0Dot + LANDS.map(l => {
    let cls = "locked";
    if (ov.completedLand0 && l.id < pos.land) cls = "done";
    else if (ov.completedLand0 && l.id === pos.land) cls = "here";
    else if (!ov.completedLand0) cls = "locked";
    if (l.id < pos.land) cls = "done";
    else if (l.id === pos.land) cls = "here";
    return `<div class="lm-dot ${cls}" title="${l.name}">${LAND_EMOJIS[l.id-1]}</div>`;
  }).join("");

  return `<div class="screen land-map-screen">
    <div class="lm-header">
      <button class="btn btn-outline-sm" id="qm-back">← Hub</button>
      <span class="lm-title">🗺 ${land.name}</span>
      <div class="lm-lands">${landDots}</div>
      <span style="font-size:12px;font-weight:800;color:rgba(255,255,255,.55)">Lv.${student.level}</span>
    </div>
    <div class="lm-svg-wrap">
      <div class="lm-map-bg" ${land.bgImage ? `style="background-image:url('${land.bgImage}')"` : ""}></div>
      <svg viewBox="0 -30 ${land.W||LW.W} ${(land.H||LW.H)+30}" style="width:100%;max-height:100%;display:block" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        ${buildLandSVG(land,pos,false,"")}
      </svg>
    </div>
    ${renderNpcModal()}
    ${renderSg0Modal()}
    ${renderGuildReveal()}
  </div>`;
}

function renderTeacherTileView() {
  const tile   = STATE.teacherTile     || {};
  const land   = STATE.teacherTileLand || LANDS[0];
  const period = CLASS_DATA.periods[STATE.teacherPeriodIdx];
  const title  = tile.sessionTitle || tile.name || "Tile";
  const desc   = tile.sessionDesc  || "";
  const mustDo   = tile.mustDo   || [];
  const shouldDo = tile.shouldDo || [];
  const aspireTo = tile.aspireTo || [];

  const onTile = period.students.filter(s => {
    const p = getLandPos(s);
    return p.land === land.id && p.tile === tile.id;
  });
  const completedTile = period.students.filter(s => {
    const ov = getOverrides().students[String(s.id)] || {};
    const completed = (ov.completedTiles || s.completedTiles || []).map(Number);
    const p = getLandPos(s);
    return p.land === land.id && completed.includes(tile.id) && p.tile !== tile.id;
  });

  const tierRows = (tasks, tier, cls, icon, lbl) => {
    if (!tasks.length) return "";
    return `<div class="tt-tier-row ${cls}">
      <div class="tt-tier-lbl">${icon} ${lbl}</div>
      ${tasks.map((t, i) => `<div class="tt-task-item placeholder" data-tier="${tier}" data-idx="${i}">${t}</div>`).join("")}
    </div>`;
  };

  const weData = tile.type === "event" && CLASS_DATA && CLASS_DATA.writingEvents
    ? CLASS_DATA.writingEvents["land" + land.id] : null;
  const weCL = weData ? weData.checklist : [];

  const studentCards = onTile.map(s => {
    const m    = getMergedStudent(s);
    const prog = getTaskProgress(s.id, tile.id);
    const cc   = CLS_COLOR[clsKey(s, m)];
    const av   = m.avatar || "avatar_blankchibi.png";

    const taskLines = (tasks, tier, cls, icon, lbl) => {
      if (!tasks.length) return "";
      const items = tasks.map((t, i) => {
        const done = (prog[tier] || [])[i] || false;
        return `<div class="tt-task-item${done?" done":""}">
          <span class="tt-check">${done ? "✓" : "○"}</span>
          <span>${t}</span>
        </div>`;
      }).join("");
      return `<div class="tt-tier-row ${cls}">
        <div class="tt-tier-lbl">${icon} ${lbl}</div>
        ${items}
      </div>`;
    };

    const hasTasks = mustDo.length || shouldDo.length || aspireTo.length;

    const weChecks = (prog.event || []);
    const weProgress = weData
      ? `<div class="tt-tier-row tt-tier-must">
          <div class="tt-tier-lbl">✍ Writer's Checklist (${weChecks.filter(Boolean).length}/${weCL.length})</div>
          <div class="we-teacher-cl">
            ${weCL.map((item, i) => {
              const done = weChecks[i] || false;
              return `<div class="we-teacher-cl-item${done?" done":""}">
                <span class="tt-check">${done?"✓":"○"}</span>
                <span>${item}</span>
              </div>`;
            }).join("")}
          </div>
        </div>`
      : "";

    return `<div class="tt-student-row">
      <div class="tt-student-header">
        <div class="tt-av" style="border-color:${cc}"><img src="/avatars/${av}" alt="" width="40" height="40" loading="lazy"/></div>
        <div>
          <div class="tt-name">${s.displayName}</div>
          <div class="tt-cls" style="color:${cc}">Lv.${m.level} ${CLS_LABEL[clsKey(s, m)]}</div>
        </div>
      </div>
      <div class="tt-tiers">
        ${weData
          ? weProgress
          : hasTasks
            ? taskLines(mustDo,"mustDo","tt-tier-must","🔴","Must Do")
              + taskLines(shouldDo,"shouldDo","tt-tier-should","🟡","Should Do")
              + taskLines(aspireTo,"aspireTo","tt-tier-aspire","🟢","Aspire To")
            : `<div style="font-size:12px;color:var(--text-light);font-style:italic">No tasks defined for this tile</div>`}
      </div>
    </div>`;
  }).join("");

  const hasContent = mustDo.length || shouldDo.length || aspireTo.length;
  const tierSummary = (tasks, cls, icon, lbl) => {
    if (!tasks.length) return "";
    return `<div class="ls-tier ${cls}">
      <div class="ls-tier-header"><span class="ls-tier-icon">${icon}</span><span class="ls-tier-label">${lbl}</span></div>
      <div class="ls-tier-body">${tasks.map(t=>`<div style="font-size:14px;font-weight:700;color:var(--text-dark);padding:2px 0">${t}</div>`).join("")}</div>
    </div>`;
  };

  return `
  <div class="screen ls-screen">
    ${starsHTML()}
    <div class="ls-wrap">
      <div class="ls-nav enter">
        <button class="btn-back" id="tt-back">← Board View</button>
        <div class="ls-breadcrumb">
          <span class="ls-bc-land">${land.name}</span>
          <span class="ls-bc-sep">›</span>
          <span class="ls-bc-tile">${tile.name || ""}</span>
        </div>
      </div>

      ${title !== tile.name ? `
      <div class="ls-session-card enter" style="animation-delay:.04s">
        <div class="ls-session-title">${title}</div>
        ${desc ? `<div class="ls-session-desc">${desc}</div>` : ""}
      </div>` : ""}

      ${(tile.type === "boss" || tile.type === "dungeon") ? `
      <div class="enter" style="animation-delay:.05s;display:flex;gap:20px;align-items:flex-start;background:rgba(0,0,0,.35);border:1.5px solid rgba(239,68,68,.35);border-radius:14px;padding:16px 20px;margin-bottom:4px">
        ${tile.portrait ? `<img src="/bosses/${tile.portrait}" alt="${tile.name}" width="100" height="100" style="width:100px;height:100px;border-radius:50%;object-fit:cover;object-position:top center;border:3px solid #EF4444;flex-shrink:0" onerror="this.style.display='none'"/>` : ""}
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-display);font-size:17px;font-weight:900;color:#FCA5A5;margin-bottom:2px">${tile.name}</div>
          ${tile.skill ? `<div style="font-size:11px;font-weight:800;color:#F87171;letter-spacing:.5px;margin-bottom:8px">⚔️ ${tile.skill}</div>` : ""}
          ${tile.lore  ? `<div style="font-size:13px;color:rgba(255,255,255,.75);line-height:1.55;font-style:italic">"${tile.lore}"</div>` : ""}
          ${tile.pearUrl ? `<a href="${tile.pearUrl}" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px;font-size:12px;font-weight:800;color:#FBBF24;text-decoration:none">🔗 Open PearDeck →</a>` : ""}
        </div>
      </div>` : ""}

      <div class="tt-section-hdr enter" style="animation-delay:.07s">
        👥 Students on this tile
        <span class="tt-count">${onTile.length}</span>
      </div>

      <div class="tt-student-list enter" style="animation-delay:.10s">
        ${onTile.length ? studentCards : `<div class="tt-empty">No students are currently on this tile</div>`}
      </div>

      ${hasContent ? `
      <div class="tt-section-hdr enter" style="animation-delay:.13s">📋 Lesson Tasks</div>
      <div class="ls-tiers enter" style="animation-delay:.15s">
        ${tierSummary(mustDo,  "ls-tier-must",   "🔴","Must Do")}
        ${tierSummary(shouldDo,"ls-tier-should", "🟡","Should Do")}
        ${tierSummary(aspireTo,"ls-tier-aspire", "🟢","Aspire To")}
      </div>` : ""}

      <div class="tt-section-hdr enter" style="animation-delay:.18s">
        ✅ Completed
        <span class="tt-count">${completedTile.length}</span>
      </div>
      <div class="tt-student-list enter" style="animation-delay:.20s">
        ${completedTile.length ? completedTile.map(s => {
          const m  = getMergedStudent(s);
          const cc = CLS_COLOR[clsKey(s, m)];
          const av = m.avatar || "avatar_blankchibi.png";
          const ts = getTaskTimestamps(s.id, tile.id);
          const timeStr = ts.completedAt ? ts.completedAt.replace("T"," ").slice(0,16) : null;
          const rushed = ts.timeOnPage !== undefined && ts.timeOnPage < 120;
          const timeOnPageStr = ts.timeOnPage !== undefined
            ? `${rushed ? "⚠️ " : ""}${ts.timeOnPage < 60 ? ts.timeOnPage+"s" : Math.floor(ts.timeOnPage/60)+"m "+ts.timeOnPage%60+"s"}`
            : null;
          return `<div class="tt-student-row" style="opacity:.85">
            <div class="tt-student-header" style="margin-bottom:0;padding-bottom:0;border-bottom:none">
              <div class="tt-av" style="border-color:${cc}"><img src="/avatars/${av}" alt="" width="40" height="40" loading="lazy"/></div>
              <div style="flex:1">
                <div class="tt-name">${s.displayName}</div>
                <div class="tt-cls" style="color:${cc}">Lv.${m.level} ${CLS_LABEL[clsKey(s,m)]}</div>
              </div>
              <div style="text-align:right;font-size:11px;line-height:1.7">
                <div style="color:#555;font-weight:600">${timeStr || '<span style="color:#aaa;font-style:italic">No timestamp</span>'}</div>
                <div style="font-weight:700;${rushed ? "color:#DC2626" : "color:#888"}">${timeOnPageStr ? timeOnPageStr+" on page" : '<span style="color:#aaa;font-style:italic">Time not recorded</span>'}</div>
              </div>
            </div>
          </div>`;
        }).join("") : `<div class="tt-empty">No students have completed this tile yet</div>`}
      </div>
    </div>
  </div>`;
}

function renderBoardView() {
  const period   = CLASS_DATA.periods[STATE.teacherPeriodIdx];
  const flags    = getHelpFlags();
  const viewLand = STATE.boardLand || 1;
  const land     = LANDS[viewLand-1] || LANDS[0];

  const byTile = {};
  period.students.forEach(s => {
    const p = getLandPos(s);
    if (p.land !== viewLand) return;
    (byTile[p.tile] = byTile[p.tile]||[]).push(s);
  });

  const onOtherLand = period.students.filter(s => getLandPos(s).land !== viewLand);

  let dots = "";
  Object.entries(byTile).forEach(([tid, students]) => {
    const tile = land.tiles.find(t=>t.id===+tid) || land.tiles[0];
    const D = tile.type==="dungeon", B=(tile.type==="boss"||tile.type==="event");
    const ts = D?LW.DTILE:B?LW.BTILE:tile.type==="loot"?LW.LTILE:LW.TILE;
    const DR = 11, pad = DR+4;
    const perRow = Math.max(1, Math.floor((ts-pad*2)/(DR*2+4)));
    students.forEach((s,i) => {
      const col=i%perRow, row=Math.floor(i/perRow);
      const dx=(tile.x-ts/2)+pad+col*(DR*2+4)+DR;
      const dy=(tile.y-ts/2)+pad+row*(DR*2+4)+DR;
      const color=CLS_COLOR[clsKey(s, getMergedStudent(s))], fl=!!flags[String(s.id)];
      const first=s.displayName.split(" ")[0].slice(0,5);
      dots+=`<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${DR}" fill="${color}" stroke="white" stroke-width="2.2"/>
        ${fl?`<circle cx="${(dx+DR*.55).toFixed(1)}" cy="${(dy-DR*.55).toFixed(1)}" r="5" fill="#EF4444" stroke="white" stroke-width="1.2"/>`:``}
        <text x="${dx.toFixed(1)}" y="${dy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="6.5" fill="white" font-weight="900" font-family="Arial">${first}</text>`;
    });
  });

  const fc = Object.keys(flags).filter(id=>period.students.some(s=>String(s.id)===id)).length;
  const otherCount = onOtherLand.length;
  const landNav = LANDS.map(l => {
    const cnt = period.students.filter(s=>getLandPos(s).land===l.id).length;
    return `<button class="btn btn-outline-sm${l.id===viewLand?" btn-active":""}" data-bl="${l.id}" style="font-size:11px;padding:3px 8px">${LAND_EMOJIS[l.id-1]} ${cnt}</button>`;
  }).join("");

  return `<div class="screen board-screen">
    <div class="board-header">
      <span class="board-title">📡 ${period.periodName} — ${land.name}</span>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${landNav}
        ${fc>0?`<span style="background:#DC2626;color:white;font-size:12px;font-weight:800;padding:4px 10px;border-radius:10px">🚩 ${fc}</span>`:""}
        ${otherCount>0?`<span style="background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);font-size:11px;padding:4px 8px;border-radius:8px">${otherCount} on other lands</span>`:""}
        ${STATE.teacherPeriodIdx>0?`<button class="btn btn-outline-sm" id="board-prev">◀ P${STATE.teacherPeriodIdx}</button>`:""}
        ${STATE.teacherPeriodIdx<CLASS_DATA.periods.length-1?`<button class="btn btn-outline-sm" id="board-next">P${STATE.teacherPeriodIdx+2} ▶</button>`:""}
        <button class="btn btn-outline-sm" id="board-back">Exit</button>
      </div>
    </div>
    <div class="board-map-wrap" style="position:relative">
      <div class="lm-map-bg" ${land.bgImage ? `style="background-image:url('${land.bgImage}')"` : ""}></div>
      <svg viewBox="0 0 ${land.W||LW.W} ${land.H||LW.H}" style="width:100%;max-height:100%;display:block;position:relative" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        ${buildLandSVG(land,{land:viewLand,tile:0,completed:[]},true,dots)}
      </svg>
    </div>
  </div>`;
}

/* ─── TEACHER SCREENS ─── */
const TEACHER_PW = "TEACHER2026";

function renderTeacherLogin() {
  return `
  <div class="screen screen-center">
    ${starsHTML()}
    <div class="t-login-card enter">
      <span class="t-login-icon">🔐</span>
      <h2 class="t-login-title">Teacher Dashboard</h2>
      <p class="t-login-sub">Authorized Access Only</p>
      <input id="pw-inp" class="pw-input" type="password" placeholder="Enter password" autocomplete="off"/>
      ${STATE.pinError ? `<p class="error-box">⚠️ ${STATE.pinError}</p>` : ""}
      <button class="btn btn-purple btn-lg" id="pw-btn" style="width:100%">
        <span>Enter Dashboard</span><span class="btn-arrow">→</span>
      </button>
      <button class="teacher-link" id="t-login-back">← Back to class login</button>
    </div>
  </div>`;
}

function renderTeacherDashboard() {
  const periods = CLASS_DATA.periods;
  const period  = periods[STATE.teacherPeriodIdx];
  const flags   = getHelpFlags();
  const flagCount = Object.keys(flags).length;

  const tabs = periods.map((p, i) => `
    <button class="period-tab ${i===STATE.teacherPeriodIdx?"active":""}" data-pi="${i}">${p.periodName}</button>
  `).join("");

  const periodFlags = period.students.filter(s => flags[String(s.id)]);

  const cards = period.students.map(s => {
    const m   = getMergedStudent(s);
    const flg = flags[String(s.id)];
    const ov  = getOverrides().students[String(s.id)] || {};

    const cc  = CLS_COLOR[clsKey(s, m)];
    const av  = m.avatar || "avatar_blankchibi.png";
    const hpP = Math.round((m.hp/10)*100);
    const mpP = Math.round((m.mp/10)*100);
    const spP = Math.round((m.sp/10)*100);
    const pos = getLandPos(s);
    const sLand = getLandData(pos.land);
    const curTileObj = sLand.tiles.find(t => t.id === pos.tile);
    const tileName   = curTileObj?.name || `Tile ${pos.tile}`;
    const mustTotal  = curTileObj?.mustDo?.length || 0;
    const tileProgress = ((ov.taskProgress || {})[String(pos.tile)] || {});
    const mustDoneCount = mustTotal
      ? curTileObj.mustDo.filter((_, i) => (tileProgress.mustDo || [])[i]).length
      : 0;
    const mustAllDone = mustTotal > 0 && mustDoneCount === mustTotal;
    return `
    <div class="t-s-card ${flg?"has-flag":""}" data-sid="${s.id}" tabindex="0" role="button" aria-label="Edit ${s.displayName}">
      <div class="t-s-top">
        <div class="t-s-avatar" style="border-color:${cc};padding:0"><img src="/avatars/${av}" alt="${s.name}" width="44" height="44" loading="lazy"/></div>
        <div class="t-s-info">
          <div class="t-s-name">${s.displayName}</div>
          <div class="t-s-cls" style="color:${cc}">Lv.${m.level} ${CLS_LABEL[clsKey(s, m)]}</div>
        </div>
      </div>
      <div class="t-mini-bars">
        <div class="t-mini-row"><span class="t-mini-lbl">HP</span><div class="t-mini-track" style="background:#FEE2E2"><div class="t-mini-fill" style="width:${hpP}%;background:#EF4444"></div></div></div>
        <div class="t-mini-row"><span class="t-mini-lbl">MP</span><div class="t-mini-track" style="background:#E0F2FE"><div class="t-mini-fill" style="width:${mpP}%;background:#0EA5E9"></div></div></div>
        <div class="t-mini-row"><span class="t-mini-lbl">SP</span><div class="t-mini-track" style="background:#D1FAE5"><div class="t-mini-fill" style="width:${spP}%;background:#10B981"></div></div></div>
      </div>
      <div class="t-task-status">
        <span class="t-tile-badge">📍 ${tileName}</span>
        ${mustTotal ? `<span class="t-must-badge${mustAllDone?" t-must-done":""}">Must Do: ${mustDoneCount}/${mustTotal}${mustAllDone?" ✓":""}</span>` : ""}
      </div>
      ${flg ? `<div class="flag-badge">🚩 ${formatFlagTime(flg)}</div>` : ""}
      <button class="t-award-companion-btn" data-award-companion="${s.id}">🐾 Award Companion</button>
    </div>`;
  }).join("");

  return `
  <div class="screen t-dash-screen">
    <div class="t-dash-wrap">
      <div class="t-dash-hdr">
        <span class="t-dash-title">👩‍🏫 Teacher Dashboard</span>
        <div style="display:flex;gap:10px;align-items:center">
          <button class="btn btn-outline-sm" id="t-board-view">📡 Board View</button>
          <button class="btn btn-outline-sm" id="t-dash-logout">Exit</button>
        </div>
      </div>
      <div class="period-tabs">${tabs}</div>
      ${flagCount > 0 ? `
        <div class="help-alert">
          <div class="help-alert-count">${flagCount}</div>
          ${flagCount === 1 ? "1 student needs help" : flagCount + " students need help"} — click their card to view and clear
        </div>` : ""}
      <div class="t-student-grid">${cards}</div>
      ${(() => {
        const guilds = CLASS_DATA && CLASS_DATA.guilds;
        if (!guilds) return "";
        const counts = getGuildCounts();
        const ov = getOverrides();
        const guildMembers = {};
        Object.keys(guilds).forEach(k => { guildMembers[k] = []; });
        for (const p of CLASS_DATA.periods) {
          for (const st of p.students) {
            const sOv = ov.students[String(st.id)] || {};
            const g = sOv.guild || st.guild;
            if (g && guildMembers[g]) guildMembers[g].push(st.displayName || st.name);
          }
        }
        const chips = Object.keys(guilds).map(k => {
          const guild = guilds[k];
          const names = guildMembers[k] || [];
          return `<div class="t-guild-chip" style="border-color:${guild.color}">
            <img class="t-guild-chip-crest" src="${guild.crest}" alt="${guild.name}" width="28" height="28"
              onerror="this.style.display='none'"/>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="t-guild-chip-name" style="color:${guild.color}">${guild.name}</span>
                <span class="t-guild-chip-count" style="color:${guild.color}">${counts[k] || 0}</span>
              </div>
              <div class="t-guild-members">${names.length ? names.join(", ") : "No members yet"}</div>
            </div>
          </div>`;
        }).join("");
        return `<div class="t-section" style="margin-top:4px">
          <div class="t-section-title">⚔️ Guild Roster</div>
          <div class="t-guild-roster">${chips}</div>
        </div>`;
      })()}
    </div>
  </div>
  ${STATE.companionPickerOpen ? (() => {
    const pickerStudentName = (() => {
      if (!STATE.companionPickerStudentId) return "Student";
      for (const p of CLASS_DATA.periods) {
        const found = p.students.find(s => s.id === STATE.companionPickerStudentId);
        if (found) return found.displayName || found.name;
      }
      return "Student";
    })();
    return `<div class="cpicker-overlay" id="cpicker-overlay">
      <div class="cpicker-modal">
        <div class="cpicker-hdr">
          <span class="cpicker-title">🐾 Award Companion to ${pickerStudentName}</span>
          <button class="cpicker-award-btn" id="cpicker-close">✕</button>
        </div>
        <div class="cpicker-grid">
          ${COMPANIONS.map(c => `
            <div class="cpicker-item" data-cpick="${c.file}" title="${c.name} (${COMPANION_RARITY_LABEL[c.rarity]})">
              <img src="/companions/${c.file}" alt="${c.name}" style="border-radius:8px" width="46" height="46" loading="lazy"/>
              <span class="cp-name">${c.name}</span>
              <span class="cp-rarity" style="color:${COMPANION_RARITY_BORDER[c.rarity]}">${COMPANION_RARITY_LABEL[c.rarity]}</span>
            </div>`).join("")}
        </div>
      </div>
    </div>`;
  })() : ""}`;
}

function renderTeacherEdit() {
  const s    = STATE.teacherStudent;
  const edit = STATE.teacherEdit;
  const flags = getHelpFlags();
  const flgTime = flags[String(s.id)];
  const _m = getMergedStudent(s);
  const cc = CLS_COLOR[clsKey(s, _m)];

  const invChips = (edit.items || []).map(key => {
    const it = ITEMS[key];
    if (!it) return "";
    return `<span class="inv-chip">${it.i} ${it.n}<button class="chip-x" data-remove-item="${key}">×</button></span>`;
  }).join("");

  const addableItems = Object.keys(ITEMS).filter(k => !(edit.items||[]).includes(k));
  const itemOpts = addableItems.map(k => `<option value="${k}">${ITEMS[k].i} ${ITEMS[k].n}</option>`).join("");

  const bossChips = (edit.bosses || []).map(b => {
    const icon = BOSS_ICON[b] || "👾";
    return `<span class="boss-chip">${icon} ${b}<button class="chip-x" data-remove-boss="${b}">×</button></span>`;
  }).join("");

  const addableBosses = Object.keys(BOSS_ICON).filter(b => !(edit.bosses||[]).includes(b));
  const bossOpts = addableBosses.map(b => `<option value="${b}">${BOSS_ICON[b]} ${b}</option>`).join("");

  const xpPct = Math.round(Math.min(100,(edit.xp/edit.xpNext)*100));

  function statRow(icon, lbl, key, color, trackBg) {
    const v = edit[key];
    const pct = Math.round((v/10)*100);
    return `
    <div class="t-stat-row">
      <span class="t-stat-icon">${icon}</span>
      <span class="t-stat-lbl">${lbl}</span>
      <div class="t-stat-ctrl">
        <button class="stat-adj" data-dec="${key}" ${v<=1?"disabled":""}>−</button>
        <span class="stat-num" id="${key}-disp">${v}</span>
        <button class="stat-adj" data-inc="${key}" ${v>=10?"disabled":""}>+</button>
      </div>
      <div class="t-stat-mini" style="background:${trackBg}">
        <div class="t-stat-mini-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="t-stat-max">/ 10</span>
    </div>`;
  }

  return `
  <div class="screen t-edit-screen">
    <div class="t-edit-wrap">
      <div class="t-edit-hdr">
        <button class="btn btn-outline-sm" id="t-edit-back">← Back</button>
        <span class="t-dash-title">Edit: ${s.displayName}</span>
      </div>

      <div class="t-section" style="display:flex;align-items:center;gap:16px;padding:16px 20px">
        <div style="border-radius:50%;border:3px solid ${cc};width:60px;height:60px;overflow:hidden;flex-shrink:0"><img src="/avatars/${_m.avatar||'avatar_blankchibi.png'}" style="width:100%;height:100%;object-fit:cover;display:block" alt="" width="60" height="60" loading="lazy"/></div>
        <div>
          <div style="font-family:var(--font-display);font-size:18px;font-weight:900;color:var(--purple-dark)">${s.displayName}</div>
          <div style="font-size:12px;font-weight:700;color:${cc};text-transform:uppercase;letter-spacing:.5px">${CLS_LABEL[clsKey(s, _m)]} · ${s.title||""}</div>
        </div>
      </div>

      <div class="t-section">
        <div class="t-section-title">⚡ Stats</div>
        ${statRow("❤️","HP","hp","#EF4444","#FEE2E2")}
        ${statRow("💙","MP","mp","#0EA5E9","#E0F2FE")}
        ${statRow("💚","SP","sp","#10B981","#D1FAE5")}
        <div class="t-stat-row" style="margin-top:10px">
          <span class="t-stat-icon">⭐</span>
          <span class="t-stat-lbl">XP</span>
          <input class="t-xp-inp" id="xp-inp" type="number" min="0" max="99999" value="${edit.xp}"/>
          <span class="t-xp-sep">/</span>
          <input class="t-xp-inp" id="xpnext-inp" type="number" min="1" max="99999" value="${edit.xpNext}" style="width:80px"/>
          <div class="t-stat-mini" style="background:#FEF9C3"><div class="t-stat-mini-fill" style="width:${xpPct}%;background:#F59E0B"></div></div>
        </div>
      </div>

      <div class="t-section">
        <div class="t-section-title">🎒 Inventory</div>
        <div class="chip-row" id="inv-chips">${invChips || '<span style="color:var(--text-light);font-size:13px;font-style:italic">No items</span>'}</div>
        ${addableItems.length > 0 ? `<select class="t-add-sel" id="add-item-sel"><option value="">+ Add item…</option>${itemOpts}</select>` : ""}
      </div>

      <div class="t-section">
        <div class="t-section-title">🏆 Bosses Defeated</div>
        <div class="chip-row" id="boss-chips">${bossChips || '<span style="color:var(--text-light);font-size:13px;font-style:italic">No bosses defeated</span>'}</div>
        ${addableBosses.length > 0 ? `<select class="t-add-boss-sel" id="add-boss-sel"><option value="">+ Add boss…</option>${bossOpts}</select>` : ""}
      </div>

      ${(() => {
        const guilds = CLASS_DATA && CLASS_DATA.guilds;
        if (!guilds) return "";
        const sOvG = getOverrides().students[String(s.id)] || {};
        const currentGuild = sOvG.guild || "";
        const opts = `<option value="">— Unassigned —</option>` +
          Object.keys(guilds).map(k =>
            `<option value="${k}" ${currentGuild===k?"selected":""}>${guilds[k].name}</option>`
          ).join("");
        return `<div class="t-section">
          <div class="t-section-title">⚔️ Guild</div>
          <select class="t-add-sel" id="guild-sel" style="width:100%;padding:8px 10px">${opts}</select>
        </div>`;
      })()}
      <div class="t-section">
        <div class="t-section-title">🗺️ Map Position</div>
        <div style="display:flex;gap:8px;margin-bottom:6px">
          <select class="t-add-sel" id="land-sel" style="flex:1;padding:8px 10px">
            <option value="0" ${edit.currentLand===0?"selected":""}>🏕️ Land 0: The Starting Grounds</option>
            ${LANDS.map(l => `<option value="${l.id}" ${edit.currentLand===l.id?"selected":""}>${LAND_EMOJIS[l.id-1]} Land ${l.id}: ${l.name}</option>`).join("")}
          </select>
        </div>
        <select class="t-add-sel" id="tile-sel" style="width:100%;padding:8px 10px">
          ${getLandData(edit.currentLand).tiles.map(t => {
            const ico = t.type==="dungeon"?"🏰":t.type==="boss"?"💀":t.type==="event"?"📜":t.type==="loot"?"💰":t.type==="arrival"?"🌟":t.type==="sg"?"🏕️":"📍";
            return `<option value="${t.id}" ${edit.currentTile===t.id?"selected":""}>${ico} ${t.id}: ${t.name}${t.skill?" ("+t.skill+")":""}</option>`;
          }).join("")}
        </select>
      </div>

      <div class="t-section">
        <div class="t-section-title">🚩 Help Flag</div>
        ${flgTime
          ? `<div class="t-flag-row"><span class="t-flag-time">🚩 Flagged ${formatFlagTime(flgTime)}</span><button class="btn-clear-flag" id="clear-flag-btn">Clear Flag</button></div>`
          : `<p class="t-no-flag">No active help flag</p>`}
      </div>

      <div class="t-section">
        <div class="t-section-title">📋 Task Progress</div>
        ${(() => {
          const ov = getOverrides().students[String(s.id)] || {};
          const taskProgress = ov.taskProgress || {};

          // Tile IDs repeat across lands, so look up only within the student's current land
          const currentLand = LANDS.find(l => l.id === (edit.currentLand || 1)) || LANDS[0];
          const tileLookup = {};
          currentLand.tiles.forEach(tile => { tileLookup[String(tile.id)] = { tile, land: currentLand }; });

          // Union of: tiles with checkbox data + completed tiles + current tile
          const seenIds = new Set([
            ...Object.keys(taskProgress),
            ...(edit.completedTiles || []).map(String),
            String(edit.currentTile),
          ]);

          // Only keep tiles in this land that have at least one task defined
          const relevantIds = [...seenIds].filter(id => {
            const lookup = tileLookup[id];
            if (!lookup) return false;
            const t = lookup.tile;
            return (t.mustDo||[]).length || (t.shouldDo||[]).length || (t.aspireTo||[]).length;
          });

          if (relevantIds.length === 0) return '<div class="tp-empty">No lesson tiles with tasks found for this student.</div>';

          const tierBlock = (tasks, tierKey, prog, icon, label) => {
            if (!tasks || tasks.length === 0) return "";
            const doneCount = tasks.filter((_, i) => (prog[tierKey] || [])[i]).length;
            const allDone = doneCount === tasks.length;
            const rows = tasks.map((task, i) => {
              const done = (prog[tierKey] || [])[i];
              return `<div class="tp-task-row">
                <span>${done ? "✅" : "⬜"}</span>
                <span class="tp-task-text${done ? " tp-done" : ""}">${task}</span>
              </div>`;
            }).join("");
            return `<div class="tp-tier">
              <div class="tp-tier-hdr">${icon} ${label} <span class="tp-tier-count${allDone?" all-done":""}">${doneCount}/${tasks.length}</span></div>
              ${rows}
            </div>`;
          };

          const allTimestamps = (ov.taskTimestamps || {});
          return relevantIds.map(tileId => {
            const { tile, land } = tileLookup[tileId];
            const prog = taskProgress[tileId] || {};
            const ts   = allTimestamps[tileId] || {};
            const isCurrent   = String(edit.currentTile) === tileId;
            const isCompleted = (edit.completedTiles || []).map(String).includes(tileId);
            const hasData     = !!taskProgress[tileId];
            const statusBadge = isCurrent
              ? `<span class="tp-status tp-status-current">📍 Current</span>`
              : isCompleted
                ? `<span class="tp-status tp-status-done">✅ Completed</span>`
                : "";
            const rushFlag = (ts.timeOnPage !== undefined && ts.timeOnPage < 120)
              ? `<span class="tp-rush-flag" title="⚠️ Completed in ${ts.timeOnPage}s — may have rushed through">⚠️</span>`
              : "";
            const timeNote = ts.completedAt
              ? `<div class="tp-time-note">⏱ Completed at ${ts.completedAt.replace("T"," ")}${ts.timeOnPage !== null && ts.timeOnPage !== undefined ? ` · ${ts.timeOnPage < 60 ? ts.timeOnPage + "s" : Math.floor(ts.timeOnPage/60) + "m " + (ts.timeOnPage%60) + "s"} on page` : ""}</div>`
              : "";
            const noDataNote = !hasData
              ? `<div class="tp-no-data">No checkboxes recorded — student may have been moved manually</div>`
              : "";
            const mustH   = tierBlock(tile.mustDo,   "mustDo",   prog, "🔴", "Must Do");
            const shouldH = tierBlock(tile.shouldDo, "shouldDo", prog, "🟡", "Should Do");
            const aspireH = tierBlock(tile.aspireTo, "aspireTo", prog, "🟢", "Aspire To");
            return `<div class="tp-tile-card">
              <div class="tp-tile-name">${tile.name} <span class="tp-land-name">— ${land.name}</span>${statusBadge}${rushFlag}</div>
              ${timeNote}${noDataNote}${mustH}${shouldH}${aspireH}
            </div>`;
          }).join("");
        })()}
      </div>

      <button class="btn btn-save" id="t-save-btn">💾 Save Changes</button>

      <div class="t-section" style="border-color:#FECACA;margin-top:8px">
        <div class="t-section-title" style="color:#991B1B">⚠️ Danger Zone</div>
        <p style="font-size:13px;color:#6B7280;margin:0 0 12px">Permanently wipe all progress and return this student to a fresh start. This cannot be undone.</p>
        <button class="btn-danger-zone" id="t-reset-btn">☠️ Reset Character to Level 0</button>
      </div>
    </div>
  </div>
  ${STATE.teacherResetConfirm ? `
  <div class="reset-confirm-overlay" id="reset-overlay">
    <div class="reset-confirm-modal">
      <div class="reset-confirm-icon">☠️</div>
      <div class="reset-confirm-title">Full Character Reset</div>
      <div class="reset-confirm-name">${s.displayName}</div>
      <ul class="reset-confirm-list">
        <li>All XP, HP, MP, and SP reset to base values</li>
        <li>All task and lesson progress erased</li>
        <li>All inventory items and loot removed</li>
        <li>All bosses defeated cleared</li>
        <li>All titles removed</li>
        <li>All companions removed</li>
        <li>Map position returned to Land 0 — Notice Board</li>
        <li>Help flag cleared</li>
      </ul>
      <p class="reset-confirm-note">This action is permanent and cannot be undone.</p>
      <div class="reset-confirm-btns">
        <button class="reset-cancel-btn" id="reset-cancel-btn">← Cancel</button>
        <button class="reset-confirm-btn" id="reset-confirm-btn">Yes, Reset Everything</button>
      </div>
    </div>
  </div>` : ""}`;
}

/* ─── MOUNT & EVENTS ─── */
function mount() {
  const root = document.getElementById("root");
  if (STATE.screen === "loading") { root.innerHTML = renderLoading(); return; }
  if (STATE.screen === "error")   { root.innerHTML = renderError(STATE.errorMsg || "Could not load classData.json"); return; }
  if (STATE.screen === "code")           root.innerHTML = renderCode();
  if (STATE.screen === "grid")           root.innerHTML = renderGrid();
  if (STATE.screen === "pin")            root.innerHTML = renderPin();
  if (STATE.screen === "hub")            root.innerHTML = renderHub();
  if (STATE.screen === "teacher-login")  root.innerHTML = renderTeacherLogin();
  if (STATE.screen === "teacher-dash")   root.innerHTML = renderTeacherDashboard();
  if (STATE.screen === "teacher-edit")   root.innerHTML = renderTeacherEdit();
  if (STATE.screen === "quest-map")      root.innerHTML = renderQuestMap();
  if (STATE.screen === "arrival-screen") root.innerHTML = renderArrivalScreen();
  if (STATE.screen === "boss-screen")   root.innerHTML = renderBossScreen();
  if (STATE.screen === "lesson-stop")   root.innerHTML = renderLessonStop();
  if (STATE.screen === "writing-event")  root.innerHTML = renderWritingEvent();
  if (STATE.screen === "teacher-tile")   root.innerHTML = renderTeacherTileView();
  if (STATE.screen === "welcome-splash") root.innerHTML = renderWelcomeSplash();
  if (STATE.screen === "board-view")     root.innerHTML = renderBoardView();

  // No scroll needed for land map (fits on screen)

  // Animate stat bars after paint
  if (STATE.screen === "hub") {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelectorAll(".stat-fill[data-w]").forEach(el => el.style.width = el.dataset.w + "%");
      document.querySelectorAll(".xp-fill[data-w]").forEach(el => el.style.width = el.dataset.w + "%");
    }));
  }

  bindEvents();
}

function bindEvents() {
  const $ = id => document.getElementById(id);

  /* CLASS CODE */
  if (STATE.screen === "code") {
    const inp = $("code-inp");
    inp && inp.focus();
    $("code-btn") && $("code-btn").addEventListener("click", () => {
      const v = (inp ? inp.value : "").trim().toUpperCase();
      const period = CLASS_DATA.periods.find(p => p.classCode.toUpperCase() === v);
      if (period) {
        STATE.currentPeriod = period; STATE.screen = "grid"; STATE.pinError = ""; mount();
      } else {
        STATE.pinError = "That class code isn't recognized. Ask your teacher!";
        const w = document.getElementById("code-wrap");
        w && w.classList.add("shake");
        setTimeout(() => w && w.classList.remove("shake"), 600);
        mount();
      }
    });
    inp && inp.addEventListener("keydown", e => { if (e.key === "Enter") $("code-btn") && $("code-btn").click(); });
  }

  /* NAME GRID */
  if (STATE.screen === "grid") {
    $("grid-back") && $("grid-back").addEventListener("click", () => { STATE.screen = "code"; STATE.currentPeriod = null; STATE.pinError = ""; mount(); });
    document.querySelectorAll(".student-tile").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id, 10);
        STATE.student = STATE.currentPeriod.students.find(s => s.id === id);
        STATE.pin = ""; STATE.pinError = ""; STATE.screen = "pin"; mount();
      });
    });
  }

  /* PIN */
  if (STATE.screen === "pin") {
    $("pin-back") && $("pin-back").addEventListener("click", () => { STATE.screen = "grid"; STATE.student = null; STATE.pin = ""; STATE.pinError = ""; mount(); });
    $("num-del") && $("num-del").addEventListener("click", () => { STATE.pin = STATE.pin.slice(0,-1); mount(); });
    document.querySelectorAll("[data-digit]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (STATE.pin.length >= 4) return;
        STATE.pin += btn.dataset.digit;
        mount();
        if (STATE.pin.length === 4) {
          setTimeout(() => {
            if (STATE.pin === STATE.student.pin) {
              const _pos = getLandPos(STATE.student);
              const _firstTimer = _pos.land === 0 && (_pos.completed || []).length === 0;
              STATE.screen = _firstTimer ? "welcome-splash" : "hub";
              STATE.pin = ""; STATE.pinError = ""; STATE.helpFlagged = false; mount();
            } else {
              STATE.pinError = "Incorrect secret number! Try again, brave adventurer.";
              STATE.pin = ""; mount();
            }
          }, 200);
        }
      });
    });
  }

  /* WELCOME SPLASH */
  if (STATE.screen === "welcome-splash") {
    $("ws-cta") && $("ws-cta").addEventListener("click", () => {
      STATE.screen = "quest-map";
      mount();
    });
  }

  /* HUB */
  if (STATE.screen === "hub") {
    $("hub-logout") && $("hub-logout").addEventListener("click", () => { STATE.screen = "code"; STATE.student = null; STATE.pin = ""; STATE.pinError = ""; STATE.helpFlagged = false; STATE.avStep = 0; STATE.avClass = null; STATE.avVariant = null; STATE.avTone = null; STATE.customizeOpen = false; STATE.pendingTitle = null; STATE.custTab = "avatar"; mount(); });
    $("continue-quest-btn") && $("continue-quest-btn").addEventListener("click", () => { STATE.screen = "quest-map"; mount(); });
    // Customize button — opens full customize overlay
    $("cust-btn") && $("cust-btn").addEventListener("click", () => {
      STATE.customizeOpen = true; STATE.avStep = 1; STATE.pendingTitle = null; STATE.custTab = "avatar"; mount();
    });
    if (STATE.customizeOpen) {
      // Tab switching
      document.querySelectorAll(".cust-tab").forEach(tab => {
        tab.addEventListener("click", () => { STATE.custTab = tab.dataset.custtab; mount(); });
      });
      // Close without saving
      $("cust-close") && $("cust-close").addEventListener("click", () => {
        STATE.customizeOpen = false; STATE.avStep = 0;
        STATE.pendingTitle = null; STATE.avClass = null; STATE.avVariant = null; STATE.avTone = null;
        if (getLandPos(STATE.student).land === 0) {
          STATE.screen = "quest-map";
          if (STATE._sg0ReturnTile) { STATE.sg0Open = true; STATE.sg0Tile = STATE._sg0ReturnTile; STATE._sg0ReturnTile = null; }
        }
        mount();
      });
      // Save — commit avatar + title + active companion
      $("cust-save") && $("cust-save").addEventListener("click", () => {
        const overrides = {
          character: STATE.avClass, variant: STATE.avVariant, skinTone: STATE.avTone,
          avatar: buildAvatarFile(STATE.avClass, STATE.avVariant, STATE.avTone),
        };
        if (STATE.pendingTitle) overrides.title = STATE.pendingTitle;
        if (STATE.pendingCompanion !== undefined) overrides.activeCompanion = STATE.pendingCompanion;
        saveStudentOverride(STATE.student.id, overrides);
        STATE.customizeOpen = false; STATE.avStep = 0; STATE.pendingTitle = null; STATE.pendingCompanion = undefined;
        if (getLandPos(STATE.student).land === 0) {
          STATE.screen = "quest-map";
          if (STATE._sg0ReturnTile) { STATE.sg0Open = true; STATE.sg0Tile = STATE._sg0ReturnTile; STATE._sg0ReturnTile = null; }
        }
        mount();
      });
      // Avatar step nav
      document.querySelectorAll(".av-class-card").forEach(btn => {
        btn.addEventListener("click", () => { STATE.avClass = btn.dataset.avclass; STATE.avStep = 2; mount(); });
      });
      $("av-back-2") && $("av-back-2").addEventListener("click", () => { STATE.avStep = 1; mount(); });
      document.querySelectorAll(".av-variant-btn").forEach(btn => {
        btn.addEventListener("click", () => { STATE.avVariant = btn.dataset.avvariant; STATE.avStep = 3; mount(); });
      });
      $("av-back-3") && $("av-back-3").addEventListener("click", () => { STATE.avStep = 2; mount(); });
      document.querySelectorAll(".av-tone-btn").forEach(btn => {
        btn.addEventListener("click", () => { STATE.avTone = btn.dataset.avtone; mount(); });
      });
      // Title cards
      document.querySelectorAll(".title-card").forEach(card => {
        card.addEventListener("click", () => { STATE.pendingTitle = card.dataset.title; mount(); });
      });
      // Companion slots — only earned ones
      document.querySelectorAll(".companion-slot.earned").forEach(slot => {
        slot.addEventListener("click", () => { STATE.pendingCompanion = slot.dataset.companion; mount(); });
      });
    }
    $("help-btn") && $("help-btn").addEventListener("click", () => {
      STATE.helpFlagged = true;
      setHelpFlag(STATE.student.id);
      mount();
      const toast = document.createElement("div");
      toast.className = "toast"; toast.textContent = "🙋 Your teacher has been notified! Hang tight, hero.";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    });
  }

  /* TEACHER LOGIN */
  if (STATE.screen === "teacher-login") {
    const inp = $("pw-inp");
    inp && inp.focus();
    const doLogin = () => {
      const v = inp ? inp.value.trim() : "";
      if (v === TEACHER_PW) {
        STATE.screen = "teacher-dash"; STATE.pinError = ""; mount();
      } else {
        STATE.pinError = "Incorrect password. Try again.";
        inp && (inp.value = "");
        mount();
      }
    };
    $("pw-btn") && $("pw-btn").addEventListener("click", doLogin);
    inp && inp.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
    $("t-login-back") && $("t-login-back").addEventListener("click", () => { STATE.screen = "code"; STATE.pinError = ""; mount(); });
  }

  /* TEACHER DASHBOARD */
  if (STATE.screen === "teacher-dash") {
    $("t-dash-logout") && $("t-dash-logout").addEventListener("click", () => { STATE.screen = "code"; mount(); });
    $("t-board-view") && $("t-board-view").addEventListener("click", () => { STATE.screen = "board-view"; mount(); });
    document.querySelectorAll(".period-tab").forEach(btn => {
      btn.addEventListener("click", () => { STATE.teacherPeriodIdx = parseInt(btn.dataset.pi, 10); mount(); });
    });
    document.querySelectorAll(".t-s-card").forEach(card => {
      card.addEventListener("click", e => {
        if (e.target.closest("[data-award-companion]")) return; // handled separately
        const id = parseInt(card.dataset.sid, 10);
        const period = CLASS_DATA.periods[STATE.teacherPeriodIdx];
        const base = period.students.find(s => s.id === id);
        const merged = getMergedStudent(base);
        STATE.teacherStudent = base;
        const _sov = getOverrides().students[String(id)] || {};
        const _editPos = getLandPos(base);
        STATE.teacherEdit = {
          hp: merged.hp, mp: merged.mp, sp: merged.sp,
          xp: merged.xp, xpNext: merged.xpNext,
          items: (merged.items || []).slice(),
          bosses: (merged.bosses || []).slice(),
          currentLand: _editPos.land,
          currentTile: _editPos.tile,
          completedTiles: _editPos.completed.slice(),
        };
        STATE.screen = "teacher-edit"; mount();
      });
    });
    // Award companion buttons
    document.querySelectorAll("[data-award-companion]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        STATE.companionPickerStudentId = parseInt(btn.dataset.awardCompanion, 10);
        STATE.companionPickerOpen = true;
        mount();
      });
    });
    // Companion picker overlay
    if (STATE.companionPickerOpen) {
      $("cpicker-close") && $("cpicker-close").addEventListener("click", () => {
        STATE.companionPickerOpen = false; STATE.companionPickerStudentId = null; mount();
      });
      $("cpicker-overlay") && $("cpicker-overlay").addEventListener("click", e => {
        if (e.target === $("cpicker-overlay")) { STATE.companionPickerOpen = false; STATE.companionPickerStudentId = null; mount(); }
      });
      document.querySelectorAll(".cpicker-item").forEach(item => {
        item.addEventListener("click", () => {
          const file = item.dataset.cpick;
          const sid = STATE.companionPickerStudentId;
          // Find the student across all periods
          let targetStudent = null;
          for (const p of CLASS_DATA.periods) {
            const found = p.students.find(s => s.id === sid);
            if (found) { targetStudent = found; break; }
          }
          if (targetStudent) awardCompanion(targetStudent, file);
          STATE.companionPickerOpen = false; STATE.companionPickerStudentId = null;
          const toast = document.createElement("div");
          toast.className = "toast";
          toast.textContent = `🐾 ${companionByFile(file).name} awarded!`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 2500);
          mount();
        });
      });
    }
  }

  /* TEACHER EDIT */
  if (STATE.screen === "teacher-edit") {
    $("t-edit-back") && $("t-edit-back").addEventListener("click", () => { STATE.screen = "teacher-dash"; mount(); });

    /* Stat +/- */
    document.querySelectorAll(".stat-adj[data-inc]").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.inc;
        if (STATE.teacherEdit[k] < 10) { STATE.teacherEdit[k]++; mount(); }
      });
    });
    document.querySelectorAll(".stat-adj[data-dec]").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.dec;
        if (STATE.teacherEdit[k] > 1) { STATE.teacherEdit[k]--; mount(); }
      });
    });

    /* XP inputs — live sync into teacherEdit without full re-render */
    $("xp-inp") && $("xp-inp").addEventListener("input", e => { STATE.teacherEdit.xp = parseInt(e.target.value,10)||0; });
    $("xpnext-inp") && $("xpnext-inp").addEventListener("input", e => { STATE.teacherEdit.xpNext = parseInt(e.target.value,10)||1; });

    /* Land dropdown → refresh tile options */
    $("land-sel") && $("land-sel").addEventListener("change", e => {
      const landId = parseInt(e.target.value,10);
      STATE.teacherEdit.currentLand = landId;
      STATE.teacherEdit.currentTile = 1;
      const tileSel = $("tile-sel");
      if (tileSel) {
        const land = getLandData(landId);
        tileSel.innerHTML = land.tiles.map(t => {
          const ico = t.type==="dungeon"?"🏰":t.type==="boss"?"💀":t.type==="event"?"📜":t.type==="loot"?"💰":t.type==="arrival"?"🌟":t.type==="sg"?"🏕️":"📍";
          return `<option value="${t.id}">${ico} ${t.id}: ${t.name}${t.skill?" ("+t.skill+")":""}</option>`;
        }).join("");
      }
    });

    /* Remove item chips */
    document.querySelectorAll(".chip-x[data-remove-item]").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.removeItem;
        STATE.teacherEdit.items = STATE.teacherEdit.items.filter(x => x !== k);
        mount();
      });
    });

    /* Add item */
    $("add-item-sel") && $("add-item-sel").addEventListener("change", e => {
      const v = e.target.value;
      if (v && !STATE.teacherEdit.items.includes(v)) {
        STATE.teacherEdit.items.push(v);
        mount();
      }
    });

    /* Remove boss chips */
    document.querySelectorAll(".chip-x[data-remove-boss]").forEach(btn => {
      btn.addEventListener("click", () => {
        const b = btn.dataset.removeBoss;
        STATE.teacherEdit.bosses = STATE.teacherEdit.bosses.filter(x => x !== b);
        mount();
      });
    });

    /* Add boss */
    $("add-boss-sel") && $("add-boss-sel").addEventListener("change", e => {
      const v = e.target.value;
      if (v && !STATE.teacherEdit.bosses.includes(v)) {
        STATE.teacherEdit.bosses.push(v);
        mount();
      }
    });

    /* Clear help flag */
    $("clear-flag-btn") && $("clear-flag-btn").addEventListener("click", () => {
      clearHelpFlag(STATE.teacherStudent.id); mount();
    });

    /* Save */
    $("t-save-btn") && $("t-save-btn").addEventListener("click", () => {
      const xpVal = parseInt(($("xp-inp")||{}).value,10) || STATE.teacherEdit.xp;
      const xpNVal = parseInt(($("xpnext-inp")||{}).value,10) || STATE.teacherEdit.xpNext;
      const landSel  = $("land-sel");
      const tileSel  = $("tile-sel");
      const landVal  = landSel ? parseInt(landSel.value, 10) : (STATE.teacherEdit.currentLand ?? 1);
      const tileVal  = parseInt((tileSel||{}).value,10) || STATE.teacherEdit.currentTile || 1;
      const compTiles = Array.from({length: tileVal-1}, (_,i) => i+1);
      const extraOverrides = landVal === 0 ? { completedLand0: false } : {};
      const guildSel = $("guild-sel");
      const guildVal = guildSel ? guildSel.value : undefined;
      saveStudentOverride(STATE.teacherStudent.id, {
        hp: STATE.teacherEdit.hp,
        mp: STATE.teacherEdit.mp,
        sp: STATE.teacherEdit.sp,
        xp: xpVal, xpNext: xpNVal,
        items: STATE.teacherEdit.items,
        bosses: STATE.teacherEdit.bosses,
        currentLand: landVal,
        currentTile: tileVal,
        completedTiles: compTiles,
        ...(guildVal !== undefined ? { guild: guildVal || null } : {}),
        ...extraOverrides,
      });
      STATE.screen = "teacher-dash";
      const toast = document.createElement("div");
      toast.className = "toast"; toast.textContent = "✅ Changes saved for " + STATE.teacherStudent.displayName;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      mount();
    });

    $("t-reset-btn") && $("t-reset-btn").addEventListener("click", () => {
      STATE.teacherResetConfirm = true;
      mount();
    });
    $("reset-cancel-btn") && $("reset-cancel-btn").addEventListener("click", () => {
      STATE.teacherResetConfirm = false;
      mount();
    });
    $("reset-overlay") && $("reset-overlay").addEventListener("click", e => {
      if (e.target === $("reset-overlay")) { STATE.teacherResetConfirm = false; mount(); }
    });
    $("reset-confirm-btn") && $("reset-confirm-btn").addEventListener("click", () => {
      const name = STATE.teacherStudent.displayName;
      resetStudentFull(STATE.teacherStudent.id);
      STATE.teacherResetConfirm = false;
      STATE.teacherEdit = null;
      STATE.screen = "teacher-dash";
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = "☠️ " + name + " has been reset to Level 0.";
      toast.style.background = "#7F1D1D";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
      mount();
    });
  }

  /* QUEST MAP */
  if (STATE.screen === "quest-map") {
    $("qm-back") && $("qm-back").addEventListener("click", () => { STATE.screen = "hub"; mount(); });
    const qmSvg = document.querySelector(".lm-svg-wrap svg");
    qmSvg && qmSvg.addEventListener("click", e => {
      const g = e.target.closest("[data-tid]");
      if (!g) return;
      const tid  = parseInt(g.dataset.tid);
      const pos  = getLandPos(STATE.student);
      const land = getLandData(pos.land);
      const tile = land.tiles.find(t => t.id === tid);
      if (!tile) return;
      if (tileState(tile, pos, false) === "locked") return;
      if (tile.type === "sg") {
        // Tile 3: Guild Hall — trigger reveal animation for first-timers
        if (tile.id === 3) {
          const _gOv = getOverrides().students[String(STATE.student.id)] || {};
          if (!_gOv.guild) {
            assignGuild(STATE.student.id);
            STATE.sg0GuildReveal = "spinning";
            STATE.sg0Tile = tile;
            mount();
            setTimeout(() => {
              if (STATE.sg0GuildReveal === "spinning") {
                STATE.sg0GuildReveal = "chosen";
                mount();
              }
            }, 2500);
            return;
          }
        }
        STATE.sg0Open = true;
        STATE.sg0Tile = tile;
        mount();
      } else if (tile.type === "npc") {
        STATE.npcOpen = true;
        STATE.currentNpcKey = tile.npcKey;
        mount();
      } else if (tile.type === "arrival") {
        STATE.arrivalTile = tile;
        STATE.arrivalLand = land;
        STATE.screen = "arrival-screen";
        mount();
      } else if (tile.type === "event") {
        STATE.lessonTile = tile;
        STATE.lessonLand = land;
        STATE.lessonOpenedAt = Date.now();
        STATE.screen = "writing-event";
        mount();
      } else if (tile.type === "lesson" || (tile.type === "loot" && tile.parentTileId)) {
        STATE.lessonTile = tile;
        STATE.lessonLand = land;
        STATE.lessonOpenedAt = Date.now();
        STATE.screen = "lesson-stop";
        mount();
      } else if (tile.type === "boss" || tile.type === "dungeon") {
        STATE.bossTile = tile;
        STATE.bossLand = land;
        STATE.screen = "boss-screen";
        mount();
      }
    });
    // NPC modal close
    const closeNpc = () => { STATE.npcOpen = false; STATE.currentNpcKey = null; mount(); };
    $("npc-close")     && $("npc-close").addEventListener("click", closeNpc);
    $("npc-close-btn") && $("npc-close-btn").addEventListener("click", closeNpc);
    $("npc-overlay")   && $("npc-overlay").addEventListener("click", e => { if (e.target === $("npc-overlay")) closeNpc(); });
    // Guild reveal — continue button advances tile 3
    $("guild-continue-btn") && $("guild-continue-btn").addEventListener("click", () => {
      const tile = STATE.sg0Tile;
      if (tile) advanceSg0Tile(STATE.student, tile.id);
      STATE.sg0GuildReveal = null;
      STATE.sg0Tile = null;
      mount();
    });
    // Land 0 sg modal
    const closeSg = () => { STATE.sg0Open = false; STATE.sg0Tile = null; mount(); };
    $("sg-close")   && $("sg-close").addEventListener("click", closeSg);
    $("sg-overlay") && $("sg-overlay").addEventListener("click", e => { if (e.target === $("sg-overlay")) closeSg(); });
    $("sg-open-avatar") && $("sg-open-avatar").addEventListener("click", () => {
      STATE._sg0ReturnTile = STATE.sg0Tile;  // remember so we can re-open after customize
      STATE.sg0Open = false;
      STATE.sg0Tile = null;
      STATE.customizeOpen = true;
      STATE.avStep = 1;
      STATE.custTab = "avatar";
      STATE.pendingTitle = null;
      STATE.screen = "hub";
      mount();
    });
    $("sg-complete-btn") && $("sg-complete-btn").addEventListener("click", () => {
      const tile = STATE.sg0Tile;
      if (!tile) return;
      advanceSg0Tile(STATE.student, tile.id);
      STATE.sg0Open = false;
      STATE.sg0Tile = null;
      if (tile.id === 6) {
        // Graduate to Land 1 — brief travel then show quest map
        STATE.screen = "hub";
      }
      mount();
    });
  }

  if (STATE.screen === "writing-event") {
    $("we-back") && $("we-back").addEventListener("click", () => { STATE.screen = "quest-map"; mount(); });

    // Checkbox toggle — save state and re-render button live
    document.querySelectorAll(".we-cb").forEach(cb => {
      cb.addEventListener("change", () => {
        const tile = STATE.lessonTile;
        if (!tile) return;
        saveTaskCheck(STATE.student.id, tile.id, "event", parseInt(cb.dataset.idx), cb.checked);
        // Update UI without full remount for responsiveness
        const label = cb.closest(".we-check-item");
        if (label) {
          label.classList.toggle("checked", cb.checked);
          const icon = label.querySelector(".we-check-icon");
          if (icon) icon.textContent = cb.checked ? "✓" : "";
        }
        // Re-check if all done and update button
        const land = STATE.lessonLand || LANDS[0];
        const we   = CLASS_DATA && CLASS_DATA.writingEvents && CLASS_DATA.writingEvents["land" + land.id];
        const prog = getTaskProgress(STATE.student.id, tile.id);
        const checks = prog.event || [];
        const allDone = we && we.checklist.every((_, i) => checks[i]);
        const btn = $("we-ready-btn");
        if (btn) {
          btn.disabled = !allDone;
          btn.classList.toggle("disabled", !allDone);
          btn.textContent = allDone ? "✍ I Am Ready to Write" : "Check off all items to continue";
        }
      });
    });

    $("we-ready-btn") && $("we-ready-btn").addEventListener("click", () => {
      const tile = STATE.lessonTile;
      const land = STATE.lessonLand || LANDS[0];
      if (!tile) return;
      const we  = CLASS_DATA && CLASS_DATA.writingEvents && CLASS_DATA.writingEvents["land" + land.id];
      const prog = getTaskProgress(STATE.student.id, tile.id);
      const checks = prog.event || [];
      const allDone = we && we.checklist.every((_, i) => checks[i]);
      if (!allDone) return;
      const timeOnPage = Math.round((Date.now() - (STATE.lessonOpenedAt || Date.now())) / 1000);
      const { levelsGained, newLevel } = awardXP(STATE.student, tileXP(tile));
      saveTileCompletion(STATE.student.id, tile.id, timeOnPage);
      completeBranchTile(STATE.student, tile.id);
      advanceStudentTile(STATE.student, land);
      showXPCelebration(tileXP(tile), levelsGained, newLevel, () => {
        STATE.screen = "quest-map"; mount();
      });
    });
  }

  if (STATE.screen === "arrival-screen") {
    $("arrival-begin") && $("arrival-begin").addEventListener("click", () => {
      const tile = STATE.arrivalTile;
      const land = STATE.arrivalLand || LANDS[0];
      if (!tile) return;
      const pos = getLandPos(STATE.student);
      if (!(pos.completed || []).includes(tile.id)) {
        const { levelsGained, newLevel } = awardXP(STATE.student, 5);
        completeBranchTile(STATE.student, tile.id);
        advanceStudentTile(STATE.student, land);
        showXPCelebration(5, levelsGained, newLevel, () => {
          STATE.screen = "quest-map"; mount();
        });
      } else {
        STATE.screen = "quest-map"; mount();
      }
    });
  }

  if (STATE.screen === "boss-screen") {
    $("boss-back") && $("boss-back").addEventListener("click", () => { STATE.screen = "quest-map"; mount(); });
    $("boss-fight-btn") && $("boss-fight-btn").addEventListener("click", () => {
      const url = STATE.bossTile?.pearUrl || "https://app.peardeck.com";
      window.open(url, "_blank", "noopener");
    });
    $("boss-defeat-btn") && $("boss-defeat-btn").addEventListener("click", () => {
      const tile = STATE.bossTile;
      const land = STATE.bossLand || LANDS[0];
      const student = STATE.student;
      const isDungeon = tile.type === "dungeon";
      const isFirstBoss = !hasCompletedAnyBoss(student);
      // Advance the student past this tile
      const pos = getLandPos(student);
      const completed = [...(pos.completed||[])];
      if (!completed.includes(tile.id)) completed.push(tile.id);
      saveStudentOverride(student.id, { completedTiles: completed });
      advanceStudentTile(student, land);
      // Determine companion to award
      let companionFile = null;
      if (isDungeon) {
        companionFile = randFrom(companionsByRarity("rare")).file;
      } else if (isFirstBoss) {
        companionFile = randFrom(companionsByRarity("common")).file;
      }
      if (companionFile) {
        awardCompanion(student, companionFile);
        showCompanionReveal(companionFile, () => { STATE.screen = "quest-map"; mount(); });
      } else {
        STATE.screen = "quest-map"; mount();
      }
    });
  }

  if (STATE.screen === "lesson-stop") {
    $("ls-back") && $("ls-back").addEventListener("click", () => { STATE.screen = "quest-map"; mount(); });
    $("ls-video-btn") && $("ls-video-btn").addEventListener("click", () => {
      const url = STATE.lessonTile?.video || "https://edpuzzle.com";
      window.open(url, "_blank", "noopener");
    });
    $("ls-submit") && $("ls-submit").addEventListener("click", () => {
      const btn = $("ls-submit");
      if (btn.disabled) return;
      const pos  = getLandPos(STATE.student);
      const tile = STATE.lessonTile;
      const land = STATE.lessonLand || LANDS[0];
      const alreadyDone  = (pos.completed || []).includes(tile.id);
      const isBranchTile = !!tile.parentTileId;
      const isActionable = !alreadyDone && (
        isBranchTile
          ? (pos.completed || []).includes(tile.parentTileId)
          : pos.tile === tile.id
      );
      if (!isActionable) return;
      const prog = getTaskProgress(STATE.student.id, tile.id);
      const aspireItems = tile.aspireTo || [];
      const aspireAllDone = aspireItems.length > 0 && aspireItems.every((_, i) => (prog.aspireTo || [])[i]);
      const shouldBonus = (tile.shouldDo || []).length > 0 && (tile.shouldDo || []).every((_, i) => (prog.shouldDo || [])[i]) ? 5 : 0;
      const aspireBonus = aspireAllDone ? 5 : 0;
      const xpAmount = tileXP(tile) + shouldBonus + aspireBonus;
      const timeOnPage = STATE.lessonOpenedAt ? Math.round((Date.now() - STATE.lessonOpenedAt) / 1000) : null;
      saveTileCompletion(STATE.student.id, tile.id, timeOnPage);
      const { levelsGained, newLevel } = awardXP(STATE.student, xpAmount);
      const doAdvance = () => {
        if (isBranchTile) completeBranchTile(STATE.student, tile.id);
        else advanceStudentTile(STATE.student, land);
        STATE.screen = "quest-map"; mount();
      };
      showXPCelebration(xpAmount, levelsGained, newLevel, () => {
        // Aspire To companion drop
        if (aspireAllDone) {
          const pos2 = getLandPos(STATE.student);
          const rarity = landToRarity(pos2.land);
          const companionFile = randFrom(companionsByRarity(rarity)).file;
          awardCompanion(STATE.student, companionFile);
          showCompanionReveal(companionFile, doAdvance);
        } else {
          doAdvance();
        }
      });
    });
    document.querySelectorAll(".ls-check").forEach(cb => {
      cb.addEventListener("change", () => {
        saveTaskCheck(STATE.student.id, STATE.lessonTile.id, cb.dataset.tier, parseInt(cb.dataset.idx), cb.checked);
        if (cb.checked) saveTaskTimestamp(STATE.student.id, STATE.lessonTile.id, cb.dataset.tier, parseInt(cb.dataset.idx));
        cb.closest(".ls-task").classList.toggle("ls-task-done", cb.checked);
        const tile = STATE.lessonTile;
        const prog = getTaskProgress(STATE.student.id, tile.id);
        const allMust = (tile.mustDo || []).length === 0 || (tile.mustDo || []).every((_, i) => (prog.mustDo || [])[i]);
        const btn = $("ls-submit");
        if (btn && btn.dataset.completed !== "true") {
          btn.disabled = !allMust;
          btn.textContent = allMust ? "✅ I'm Ready!" : "🔒 Complete Must Do tasks to continue";
        }
      });
    });
  }

  /* BOARD VIEW */
  if (STATE.screen === "board-view") {
    $("board-back") && $("board-back").addEventListener("click", () => { STATE.screen = "teacher-dash"; mount(); });
    $("board-prev") && $("board-prev").addEventListener("click", () => { if (STATE.teacherPeriodIdx > 0) { STATE.teacherPeriodIdx--; mount(); } });
    $("board-next") && $("board-next").addEventListener("click", () => { if (STATE.teacherPeriodIdx < CLASS_DATA.periods.length-1) { STATE.teacherPeriodIdx++; mount(); } });
    document.querySelectorAll("[data-bl]").forEach(btn => {
      btn.addEventListener("click", () => { STATE.boardLand = parseInt(btn.dataset.bl); mount(); });
    });
    const boardSvg = document.querySelector(".board-map-wrap svg");
    boardSvg && boardSvg.addEventListener("click", e => {
      const g = e.target.closest("[data-tid]");
      if (!g) return;
      const tid = parseInt(g.dataset.tid);
      const land = LANDS[(STATE.boardLand || 1) - 1] || LANDS[0];
      const tile = land.tiles.find(t => t.id === tid);
      if (!tile) return;
      STATE.teacherTile = tile;
      STATE.teacherTileLand = land;
      STATE.screen = "teacher-tile";
      mount();
    });
  }

  if (STATE.screen === "teacher-tile") {
    $("tt-back") && $("tt-back").addEventListener("click", () => { STATE.screen = "board-view"; mount(); });
  }

  /* TEACHER LOGIN link from code screen */
  $("teacher-link-btn") && $("teacher-link-btn").addEventListener("click", () => { STATE.pinError = ""; STATE.screen = "teacher-login"; mount(); });
}

/* ─── FIREBASE INIT + BOOT ─── */
function initFirebaseCache() {
  return new Promise((resolve, reject) => {
    let ovReady = false, hfReady = false;
    function checkReady() { if (ovReady && hfReady) resolve(); }

    onValue(ref(db, 'overrides'), (snap) => {
      _overrides = snap.exists() ? snap.val() : {};
      if (!ovReady) { ovReady = true; checkReady(); }
      else liveMount();
    }, reject);

    onValue(ref(db, 'helpflags'), (snap) => {
      _helpflags = snap.exists() ? snap.val() : {};
      if (!hfReady) { hfReady = true; checkReady(); }
      else liveMount();
    }, reject);
  });
}

function liveMount() {
  // Only auto-remount on screens that benefit from real-time updates.
  // Avoids wiping in-progress student lesson forms on foreign writes.
  if (['teacher-dash', 'hub', 'grid'].includes(STATE.screen)) mount();
}

/* ─── BOOT — fetch classData.json + init Firebase, then start ─── */
mount(); // show loading spinner immediately
Promise.all([
  fetch('./classData.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
  initFirebaseCache(),
]).then(([data]) => {
  CLASS_DATA = data;
  STATE.screen = 'code';
  mount();
}).catch(err => {
  STATE.screen = 'error';
  STATE.errorMsg = 'Failed to load. Check that classData.json is present and the page is served over HTTP (not file://).';
  mount();
});
