import { db, auth, ref, set, get, update, onValue, push, query, limitToLast, signInAnonymously } from './firebaseClient.js'
import { NAMES, EPITHETS } from './data/characterNames.js'

/* ═══════════════════════════════════════════════
   REALM OF ELA  —  Pure Vanilla JS
   No dependencies · Works offline · Chromebook safe
═══════════════════════════════════════════════ */

/* ─── EDIT STUDENTS HERE ───────────────────────
   Data is loaded from classData.json — edit that file to update students.
──────────────────────────────────────────────── */
let CLASS_DATA = null;
let BOSS_SCHEDULE = {};

/* ─── CONSTANTS ─── */
const CLS_COLOR = {
  warrior:"#7C3AED", archer:"#059669", elf:"#16A34A", wizard:"#0891B2",
  fairy:"#EC4899", // legacy fallback
  mage:"#0891B2", ranger:"#059669", healer:"#16A34A", rogue:"#7C3AED"
};
const CLS_LABEL = {
  warrior:"Warrior", archer:"Archer", elf:"Elf", wizard:"Wizard",
  fairy:"Elf", // legacy fallback
  mage:"Wizard", ranger:"Archer", healer:"Elf", rogue:"Warrior"
};
function clsKey(student, merged) {
  const raw = merged.avatarClass || merged.character || student.avatarClass || "warrior";
  return raw === "fairy" ? "elf" : raw; // migrate legacy "fairy" to "elf"
}
const ITEMS = {
  health_potion:    { i:"🧪", img:"icon_potion_red.png",  n:"Health Potion",   desc:"Restore 2 HP" },
  behavior_potion:  { i:"🔵", img:"icon_potion_blue.png",  n:"Mana Potion",     desc:"Restore 2 MP" },
  stamina_potion:   { i:"💚", img:"icon_potion_green.png", n:"Focus Potion",    desc:"Restore 2 SP" },
  gold_pouch:       { i:"💰", img:"icon_gold.png",         n:"Gold Pouch",      desc:"Open for +25 Gold" },
  scroll:           { i:"📜", img:"icon_scroll.png",       n:"Scroll",          desc:"Hint during boss fight" },
  shield:           { i:"🛡️", img:"icon_shield.png",       n:"Shield",          desc:"Protect 1 missed assignment" },
  amulet:           { i:"🟣", img:"icon_star.png",         n:"Starlight Sigil", desc:"Preview boss questions" },
  phoenix:          { i:"🔥", img:"icon_feather.png",      n:"Phoenix Feather", desc:"Restore all stats" },
  sword:            { i:"⚔️", img:null,                    n:"Sword",           desc:"Mark of a true warrior" },
  badge:            { i:"🏅", img:null,                    n:"Honor Badge",     desc:"Awarded for excellence" },
  crown:            { i:"👑", img:null,                    n:"Crown",           desc:"Symbol of legendary status" },
};
const EQUIPPABLE = new Set(['sword', 'shield', 'amulet']);
const EQUIP_SLOTS = [
  { label: 'Weapon',    icon: '⚔️', key: 'weapon',    itemKey: 'sword'  },
  { label: 'Shield',    icon: '🛡️', key: 'shield',    itemKey: 'shield' },
  { label: 'Accessory', icon: '💎', key: 'accessory', itemKey: 'amulet' },
];
const EQUIP_TIER_COLOR  = { common:"#9CA3AF", rare:"#3B82F6", epic:"#8B5CF6", legendary:"#F59E0B" };
const EQUIP_TYPE_ICON   = { weapon:"⚔️", shield:"🛡️", accessory:"💎" };
const EQUIP_LINE_NAMES  = {
  valeblade:"Vale Blade", valefang:"Vale Fang",
  valeguard:"Vale Guard", valecharm:"Vale Charm",
};
const EQUIP_LEGENDARY_NAMES = {
  "weapon_valeblade_legendary":    "Seraphine's Thorn",
  "shield_valeguard_legendary":    "Seraphine's Ward",
  "accessory_valecharm_legendary": "Seraphine's Blessing",
};
const EQUIP_POOLS = {
  "The Verdant Vale": {
    weapon:    { common:["weapon_valeblade_common","weapon_valefang_common"], rare:["weapon_valeblade_rare","weapon_valefang_rare"], epic:["weapon_valeblade_epic","weapon_valefang_epic"], legendary:"weapon_valeblade_legendary" },
    shield:    { common:["shield_valeguard_common"], rare:["shield_valeguard_rare"], epic:["shield_valeguard_epic"], legendary:"shield_valeguard_legendary" },
    accessory: { common:["accessory_valecharm_common"], rare:["accessory_valecharm_rare"], epic:["accessory_valecharm_epic"], legendary:"accessory_valecharm_legendary" },
  }
};
/* ─── SEASONAL COLLECTIBLES ─── */
const SEASONAL_SETS = [
  { id:"back_to_school",     label:"Back to School",        emoji:"✏️",  startDate:"2026-08-01", endDate:"2026-09-30",
    badges:[
      { id:"seasonal_bts_pencil",      name:"Pencil of Knowledge",   img:"back_to_school_pencil.png"      },
      { id:"seasonal_bts_backpack",    name:"Scholar's Backpack",    img:"back_to_school_backpack.png"    },
      { id:"seasonal_bts_apple",       name:"Teacher's Apple",       img:"back_to_school_apple.png"       },
      { id:"seasonal_bts_scissors",    name:"Scissors of Craft",     img:"back_to_school_scissors.png"    },
      { id:"seasonal_bts_sharpener",   name:"Sharpener's Edge",      img:"back_to_school_sharpener.png"   },
      { id:"seasonal_bts_glue",        name:"Glue of Creation",      img:"back_to_school_glue.png"        },
      { id:"seasonal_bts_tape",        name:"Tape of Unity",         img:"back_to_school_tape.png"        },
      { id:"seasonal_bts_calendar",    name:"Scholar's Calendar",    img:"back_to_school_calendar.png"    },
      { id:"seasonal_bts_exam",        name:"Champion's Exam",       img:"back_to_school_exam.png"        },
      { id:"seasonal_bts_calculator",  name:"Calculator of Logic",   img:"back_to_school_calculator.png"  },
    ]},
  { id:"fall_halloween",     label:"Fall & Halloween",      emoji:"🎃",  startDate:"2026-10-01", endDate:"2026-10-31",
    badges:[
      { id:"seasonal_fall_pumpkin",   name:"Lantern Pumpkin",      img:"seasonal_fall_pumpkin.png"   },
      { id:"seasonal_fall_leaf",      name:"Crimson Leaf",         img:"seasonal_fall_leaf.png"      },
      { id:"seasonal_fall_ghost",     name:"Wandering Spirit",     img:"seasonal_fall_ghost.png"     },
      { id:"seasonal_fall_witch",     name:"Witch's Hat",          img:"seasonal_fall_witch.png"     },
      { id:"seasonal_fall_bat",       name:"Shadow Bat",           img:"seasonal_fall_bat.png"       },
      { id:"seasonal_fall_cauldron",  name:"Bubbling Cauldron",    img:"seasonal_fall_cauldron.png"  },
    ]},
  { id:"winter_holiday",     label:"Winter Holiday",        emoji:"❄️",  startDate:"2026-11-01", endDate:"2026-12-31",
    badges:[
      { id:"seasonal_winter_snowflake", name:"Frost Snowflake",    img:"seasonal_winter_snowflake.png" },
      { id:"seasonal_winter_star",    name:"Winter Star",          img:"seasonal_winter_star.png"    },
      { id:"seasonal_winter_bell",    name:"Jingle Bell",          img:"seasonal_winter_bell.png"    },
      { id:"seasonal_winter_mitten",  name:"Cozy Mitten",          img:"seasonal_winter_mitten.png"  },
      { id:"seasonal_winter_pine",    name:"Pine Bough",           img:"seasonal_winter_pine.png"    },
      { id:"seasonal_winter_gift",    name:"Wrapped Gift",         img:"seasonal_winter_gift.png"    },
    ]},
  { id:"new_year_valentine", label:"New Year & Valentine's", emoji:"💝", startDate:"2027-01-01", endDate:"2027-02-28",
    badges:[
      { id:"seasonal_nyw_firework",   name:"Celebration Firework", img:"seasonal_nyw_firework.png"   },
      { id:"seasonal_nyw_heart",      name:"Crimson Heart",        img:"seasonal_nyw_heart.png"      },
      { id:"seasonal_nyw_confetti",   name:"Confetti Burst",       img:"seasonal_nyw_confetti.png"   },
      { id:"seasonal_nyw_rose",       name:"Rose of Valor",        img:"seasonal_nyw_rose.png"       },
      { id:"seasonal_nyw_crown",      name:"New Year Crown",       img:"seasonal_nyw_crown.png"      },
      { id:"seasonal_nyw_arrow",      name:"Cupid's Arrow",        img:"seasonal_nyw_arrow.png"      },
    ]},
  { id:"spring",             label:"Spring",                emoji:"🌸",  startDate:"2027-03-01", endDate:"2027-04-30",
    badges:[
      { id:"seasonal_spring_flower",  name:"Bloom Flower",         img:"seasonal_spring_flower.png"  },
      { id:"seasonal_spring_egg",     name:"Painted Egg",          img:"seasonal_spring_egg.png"     },
      { id:"seasonal_spring_butterfly",name:"Spring Butterfly",    img:"seasonal_spring_butterfly.png"},
      { id:"seasonal_spring_rain",    name:"April Rain Drop",      img:"seasonal_spring_rain.png"    },
      { id:"seasonal_spring_chick",   name:"Golden Chick",         img:"seasonal_spring_chick.png"   },
      { id:"seasonal_spring_rainbow", name:"Rainbow Arch",         img:"seasonal_spring_rainbow.png" },
    ]},
  { id:"end_of_year",        label:"End of Year",           emoji:"🎓",  startDate:"2027-05-01", endDate:"2027-06-30",
    badges:[
      { id:"seasonal_eoy_scroll",     name:"Scholar's Scroll",     img:"seasonal_eoy_scroll.png"     },
      { id:"seasonal_eoy_medal",      name:"Gold Medal",           img:"seasonal_eoy_medal.png"      },
      { id:"seasonal_eoy_mortarboard",name:"Graduation Cap",       img:"seasonal_eoy_mortarboard.png"},
      { id:"seasonal_eoy_trophy",     name:"Champion Trophy",      img:"seasonal_eoy_trophy.png"     },
      { id:"seasonal_eoy_book",       name:"Tome of Tales",        img:"seasonal_eoy_book.png"       },
      { id:"seasonal_eoy_star",       name:"Star of Excellence",   img:"seasonal_eoy_star.png"       },
    ]},
];
function getActiveSeasonalSet() {
  const today = new Date().toISOString().slice(0, 10);
  return SEASONAL_SETS.find(s => today >= s.startDate && today <= s.endDate) || null;
}

/* ─── COSMETICS MANIFEST ─── */
const COSMETICS_MANIFEST = [
  // ── Land frames (unlock on completing each land) ─────────────────────────
  { id:'frame_land_1', displayName:'Verdant Vale Frame',    category:'land', assetPath:'/cosmetics/frames/land/verdant-vale.png',    unlockType:'land_complete', unlockValue:1 },
  { id:'frame_land_2', displayName:'Stone Kingdoms Frame',  category:'land', assetPath:'/cosmetics/frames/land/stone-kingdoms.png',  unlockType:'land_complete', unlockValue:2 },
  { id:'frame_land_3', displayName:'Drowned Depths Frame',  category:'land', assetPath:'/cosmetics/frames/land/drowned-depths.png',  unlockType:'land_complete', unlockValue:3 },
  { id:'frame_land_4', displayName:'Thornwood Frame',       category:'land', assetPath:'/cosmetics/frames/land/thornwood.png',       unlockType:'land_complete', unlockValue:4 },
  { id:'frame_land_5', displayName:'Ashen Hollows Frame',   category:'land', assetPath:'/cosmetics/frames/land/ashen-hollows.png',   unlockType:'land_complete', unlockValue:5 },
  { id:'frame_land_6', displayName:'Stormspire Frame',      category:'land', assetPath:'/cosmetics/frames/land/stormspire.png',      unlockType:'land_complete', unlockValue:6 },
  // ── Guild frames (unlock on guild assignment) ─────────────────────────────
  { id:'frame_guild_ember', displayName:'Ember Guild Frame', category:'guild', assetPath:'/cosmetics/frames/guild/ember.png', unlockType:'guild', unlockValue:'ember' },
  { id:'frame_guild_tide',  displayName:'Tide Guild Frame',  category:'guild', assetPath:'/cosmetics/frames/guild/tide.png',  unlockType:'guild', unlockValue:'tide'  },
  { id:'frame_guild_thorn', displayName:'Thorn Guild Frame', category:'guild', assetPath:'/cosmetics/frames/guild/thorn.png', unlockType:'guild', unlockValue:'thorn' },
  { id:'frame_guild_storm', displayName:'Storm Guild Frame', category:'guild', assetPath:'/cosmetics/frames/guild/storm.png', unlockType:'guild', unlockValue:'storm' },
  // ── Rank frames (level threshold) ────────────────────────────────────────
  { id:'frame_rank_5',  displayName:'Bronze Adventurer Frame', category:'rank', assetPath:'/cosmetics/frames/rank/bronze.png', unlockType:'level', unlockValue:5  },
  { id:'frame_rank_10', displayName:'Silver Knight Frame',     category:'rank', assetPath:'/cosmetics/frames/rank/silver.png', unlockType:'level', unlockValue:10 },
  { id:'frame_rank_15', displayName:'Gold Champion Frame',     category:'rank', assetPath:'/cosmetics/frames/rank/gold.png',   unlockType:'level', unlockValue:15 },
  { id:'frame_rank_20', displayName:'Mythic Hero Frame',       category:'rank', assetPath:'/cosmetics/frames/rank/mythic.png', unlockType:'level', unlockValue:20 },
  // ── Seasonal frames ───────────────────────────────────────────────────────
  { id:'frame_seasonal_bts',          displayName:'Back to School Frame',  category:'seasonal', assetPath:'/cosmetics/frames/seasonal/back-to-school.png',   unlockType:'seasonal_window', unlockValue:{ start:'2026-08-01', end:'2026-09-30' } },
  { id:'frame_seasonal_halloween',    displayName:'Halloween Frame',       category:'seasonal', assetPath:'/cosmetics/frames/seasonal/halloween.png',         unlockType:'seasonal_window', unlockValue:{ start:'2026-10-01', end:'2026-10-31' } },
  { id:'frame_seasonal_thanksgiving', displayName:'Thanksgiving Frame',    category:'seasonal', assetPath:'/cosmetics/frames/seasonal/thanksgiving.png',      unlockType:'seasonal_window', unlockValue:{ start:'2026-11-01', end:'2026-11-30' } },
  { id:'frame_seasonal_christmas',    displayName:'Christmas Frame',       category:'seasonal', assetPath:'/cosmetics/frames/seasonal/christmas.png',         unlockType:'seasonal_window', unlockValue:{ start:'2026-12-01', end:'2026-12-31' } },
  { id:'frame_seasonal_nyw',          displayName:'New Year Frame',        category:'seasonal', assetPath:'/cosmetics/frames/seasonal/new-years.png',         unlockType:'seasonal_window', unlockValue:{ start:'2027-01-01', end:'2027-01-07' } },
  { id:'frame_seasonal_valentines',   displayName:"Valentine's Frame",     category:'seasonal', assetPath:'/cosmetics/frames/seasonal/valentines.png',        unlockType:'seasonal_window', unlockValue:{ start:'2027-01-08', end:'2027-02-14' } },
  { id:'frame_seasonal_stpat',        displayName:"St. Patrick's Frame",   category:'seasonal', assetPath:'/cosmetics/frames/seasonal/st-patricks-day.png',  unlockType:'seasonal_window', unlockValue:{ start:'2027-02-15', end:'2027-03-17' } },
  { id:'frame_seasonal_easter',       displayName:'Easter Frame',          category:'seasonal', assetPath:'/cosmetics/frames/seasonal/easter.png',            unlockType:'seasonal_window', unlockValue:{ start:'2027-03-18', end:'2027-04-30' } },
];
// Special avatar overrides — one per dungeon boss defeat
const COSMETIC_AVATARS = [
  { id:'avatar_special_warden',    displayName:'Warden Knight',          category:'special', assetPath:'/cosmetics/avatars/avatar_special_warden.png',    unlockType:'boss_defeat', unlockValue:'The Warden of the Vale'  },
  { id:'avatar_special_architect', displayName:'Eternal Architect',      category:'special', assetPath:'/cosmetics/avatars/avatar_special_architect.png', unlockType:'boss_defeat', unlockValue:'The Eternal Architect'   },
  { id:'avatar_special_sovereign', displayName:'Abyssal Sovereign',      category:'special', assetPath:'/cosmetics/avatars/avatar_special_sovereign.png', unlockType:'boss_defeat', unlockValue:'The Abyssal Sovereign'   },
  { id:'avatar_special_rootfather',displayName:'Rootborn Champion',      category:'special', assetPath:'/cosmetics/avatars/avatar_special_rootfather.png',unlockType:'boss_defeat', unlockValue:'The Rootfather'          },
  { id:'avatar_special_hollow',    displayName:'Hollow Knight',          category:'special', assetPath:'/cosmetics/avatars/avatar_special_hollow.png',    unlockType:'boss_defeat', unlockValue:'The Hollow King'         },
  { id:'avatar_special_voice',     displayName:'Voice of the Realm',     category:'special', assetPath:'/cosmetics/avatars/avatar_special_voice.png',     unlockType:'boss_defeat', unlockValue:'The Voice of the Realm'  },
];

/* ─── MYSTERY DROP POOL ─── */
// Add entries here to extend the pool — no code change needed.
const MYSTERY_POOL = [
  // ── Special Avatars (actual files in /cosmetics/avatars/) ──────────────
  { id:'mys_av_barbarian',      type:'avatar', displayName:'Barbarian',          assetPath:'/cosmetics/avatars/Barbarian_01_Idle_000.png',      flavorText:'A lone warrior walks out of the storm...' },
  { id:'mys_av_dark_elf_1',     type:'avatar', displayName:'Dark Elf I',         assetPath:'/cosmetics/avatars/Dark_Elf_01_Idle_000.png',       flavorText:'From ancient shadows, an emissary arrives...' },
  { id:'mys_av_dark_elf_2',     type:'avatar', displayName:'Dark Elf II',        assetPath:'/cosmetics/avatars/Dark_Elf_02_Idle_000.png',       flavorText:'A wandering spirit crosses the veil...' },
  { id:'mys_av_dark_elf_3',     type:'avatar', displayName:'Dark Elf III',       assetPath:'/cosmetics/avatars/Dark_Elf_03_Idle_000.png',       flavorText:'The Realm stirs — a mystery arrival...' },
  { id:'mys_av_demon_knight_1', type:'avatar', displayName:'Demon Knight I',     assetPath:'/cosmetics/avatars/Demon_Knight_01_Idle_000.png',   flavorText:'A fearsome presence materialises from the void...' },
  { id:'mys_av_demon_knight_2', type:'avatar', displayName:'Demon Knight II',    assetPath:'/cosmetics/avatars/Demon_Knight_02_Idle_000.png',   flavorText:'Ancient armor echoes across the Realm...' },
  { id:'mys_av_demon_knight_3', type:'avatar', displayName:'Demon Knight III',   assetPath:'/cosmetics/avatars/Demon_Knight_03_Idle_000.png',   flavorText:'The dark knight answers the call...' },
  { id:'mys_av_druid',          type:'avatar', displayName:'Druid',              assetPath:'/cosmetics/avatars/Druid_02_Idle_000.png',          flavorText:'The forest speaks — and a guardian emerges...' },
  { id:'mys_av_elemental_1',    type:'avatar', displayName:'Elemental I',        assetPath:'/cosmetics/avatars/Elemental_01_Idle_000.png',      flavorText:'Pure energy takes form in the Realm...' },
  { id:'mys_av_elemental_2',    type:'avatar', displayName:'Elemental II',       assetPath:'/cosmetics/avatars/Elemental_02_Idle_000.png',      flavorText:'The elements converge on a wandering soul...' },
  { id:'mys_av_elemental_3',    type:'avatar', displayName:'Elemental III',      assetPath:'/cosmetics/avatars/Elemental_03_Idle_000.png',      flavorText:'A mystery arrival blazes into being...' },
  { id:'mys_av_goblin',         type:'avatar', displayName:'Goblin',             assetPath:'/cosmetics/avatars/Goblin_01_Idle_000.png',         flavorText:'A mischievous wanderer sneaks through...' },
  { id:'mys_av_mummy_1',        type:'avatar', displayName:'Mummy I',            assetPath:'/cosmetics/avatars/Mummy_01_Idle_000.png',          flavorText:'Something stirs beneath the sands...' },
  { id:'mys_av_mummy_2',        type:'avatar', displayName:'Mummy II',           assetPath:'/cosmetics/avatars/Mummy_02_Idle_000.png',          flavorText:'Ancient wrappings unwind in the Realm...' },
  { id:'mys_av_mummy_3',        type:'avatar', displayName:'Mummy III',          assetPath:'/cosmetics/avatars/Mummy_03_Idle_000.png',          flavorText:'A wandering spirit crosses into the Realm...' },
  { id:'mys_av_necromancer',    type:'avatar', displayName:'Necromancer',        assetPath:'/cosmetics/avatars/Necromancer_03_Idle_000.png',    flavorText:'The mystery arrival whispers of forgotten lore...' },
  { id:'mys_av_ninja_1',        type:'avatar', displayName:'Ninja I',            assetPath:'/cosmetics/avatars/Ninja_01_Idle_000.png',          flavorText:'From the shadows, a silent figure emerges...' },
  { id:'mys_av_ninja_2',        type:'avatar', displayName:'Ninja II',           assetPath:'/cosmetics/avatars/Ninja_02_Idle_000.png',          flavorText:'Quick as lightning, the wanderer appears...' },
  { id:'mys_av_ninja_3',        type:'avatar', displayName:'Ninja III',          assetPath:'/cosmetics/avatars/Ninja_03_Idle_000.png',          flavorText:'The Realm holds its breath as they arrive...' },
  { id:'mys_av_satyr_1',        type:'avatar', displayName:'Satyr I',            assetPath:'/cosmetics/avatars/Satyr_01_Idle_000.png',          flavorText:'Wild music drifts from an unknown wanderer...' },
  { id:'mys_av_satyr_2',        type:'avatar', displayName:'Satyr II',           assetPath:'/cosmetics/avatars/Satyr_03_Idle_000.png',          flavorText:'The forest whispers a mystery arrival...' },
  { id:'mys_av_skull_1',        type:'avatar', displayName:'Skull I',            assetPath:'/cosmetics/avatars/Skull_01_Idle_000.png',          flavorText:'A chilling presence drifts through the veil...' },
  { id:'mys_av_skull_2',        type:'avatar', displayName:'Skull II',           assetPath:'/cosmetics/avatars/Skull_02_Idle_000.png',          flavorText:'The Realm shudders as the wanderer crosses...' },
  { id:'mys_av_skull_3',        type:'avatar', displayName:'Skull III',          assetPath:'/cosmetics/avatars/Skull_03_Idle_000.png',          flavorText:'Mystery arrival: the veil thins...' },
  { id:'mys_av_vampire_1',      type:'avatar', displayName:'Vampire I',          assetPath:'/cosmetics/avatars/Vampire_01_Idle_000.png',        flavorText:'Night falls early — a mysterious guest arrives...' },
  { id:'mys_av_vampire_2',      type:'avatar', displayName:'Vampire II',         assetPath:'/cosmetics/avatars/Vampire_02_Idle_000.png',        flavorText:'The wandering spirit chooses you...' },
  { id:'mys_av_vampire_3',      type:'avatar', displayName:'Vampire III',        assetPath:'/cosmetics/avatars/Vampire_03_Idle_000.png',        flavorText:'A mystery arrival stirs the Realm...' },
  { id:'mys_av_wraith_1',       type:'avatar', displayName:'Wraith I',           assetPath:'/cosmetics/avatars/Wraith_01_Idle_000.png',         flavorText:'A spectral wanderer drifts through the mist...' },
  { id:'mys_av_wraith_2',       type:'avatar', displayName:'Wraith II',          assetPath:'/cosmetics/avatars/Wraith_02_Idle_000.png',         flavorText:'The veil tears — and a wanderer steps through...' },
  { id:'mys_av_wraith_3',       type:'avatar', displayName:'Wraith III',         assetPath:'/cosmetics/avatars/Wraith_03_Idle_000.png',         flavorText:'A mystery arrival echoes across the Realm...' },
  // ── Legendary Frames ─────────────────────────────────────────────────────
  { id:'mys_fr_ancient_relic',  type:'frame', displayName:'Ancient Relic Frame',  assetPath:'/cosmetics/frames/legendary/ancient-relic.png',  flavorText:'Forged in an age before memory...' },
  { id:'mys_fr_dragon_scale',   type:'frame', displayName:'Dragon Scale Frame',   assetPath:'/cosmetics/frames/legendary/dragon-scale.png',   flavorText:'Shed by a wyrm that shook the Realm...' },
  { id:'mys_fr_phoenix_flame',  type:'frame', displayName:'Phoenix Flame Frame',  assetPath:'/cosmetics/frames/legendary/phoenix-flame.png',  flavorText:'Born from ashes, reborn in glory...' },
  { id:'mys_fr_starfall',       type:'frame', displayName:'Starfall Frame',       assetPath:'/cosmetics/frames/legendary/starfall.png',       flavorText:'A constellation descended just for you...' },
  { id:'mys_fr_void_portal',    type:'frame', displayName:'Void Portal Frame',    assetPath:'/cosmetics/frames/legendary/void-portal.png',    flavorText:'A rift between worlds, captured in glass...' },
];

// Per-event mystery drop rates — tune these without touching drop logic
const MYSTERY_DROP_RATES = {
  lesson:     0.02,  // routine Must Do / loot path tile
  boss:       0.05,  // boss or dungeon defeat
  side_quest: 0.02,  // side quest completion
  shop:       0.02,  // gold shop loot roll
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
/* ─── SIDE QUESTS ─── */
const LAND1_SOLO_QUESTS = {
  5:  { title:"Metaphor Map",       desc:"Draw one metaphor from Garvey's Choice two ways — what it literally says, and what it really means.", xp:10 },
  9:  { title:"The Implied Scene",  desc:"Draw a scene the text never directly describes — only implies. Label the text evidence that led you there.", xp:10 },
  13: { title:"Central Idea Cover", desc:"Design a book cover for one nonfiction passage from this module that captures its central idea in a single image.", xp:10 },
  17: { title:"Two Sides",          desc:"Draw two characters side-by-side showing one thing that makes them alike and one thing that makes them different.", xp:10 },
  20: { title:"Theme as Symbol",    desc:"Illustrate a text's theme as a symbol, not a scene — force the abstract idea into one image.", xp:10 },
  27: { title:"Trophy Shelf",       desc:"Draw a trophy shelf — one object representing each skill you mastered this unit.", xp:10 },
  26: { title:"Your Story",         desc:"Illustrate a scene from your own piece of writing.", xp:10 },
};
const _SOLO_FALLBACK = { title:"Art Quest", desc:"", xp:10 };
function resolveSoloQuest(tileId, _idx) {
  return LAND1_SOLO_QUESTS[tileId] || _SOLO_FALLBACK;
}
const COLLAB_QUESTS = [
  { title:"Guild Scholars",     desc:"Discuss the main idea with a partner. Agree on one key point together.",         xp:15 },
  { title:"Peer Forge",         desc:"Share your written response with a partner and give each other one piece of feedback.", xp:15 },
  { title:"Alliance Quest",     desc:"Work with a partner to find 2 pieces of text evidence and compare them.",        xp:15 },
  { title:"Council of Two",     desc:"Compare your answers — what's the same? What's different? Discuss why.",          xp:15 },
  { title:"Twin Scribes",       desc:"Write a 2-sentence collaborative summary together with a partner.",               xp:15 },
  { title:"Debate Knights",     desc:"Each of you takes a different side of a question from the text. Discuss!",        xp:15 },
  { title:"Echo Chamber",       desc:"Read your answer aloud to a partner. They echo back what they heard. Switch.",    xp:15 },
];
const COLLAB_QUEST_TEMPLATES = [
  { title:"Debate Knights",       template:"With a partner, pick opposite sides of a question from [TEXT] and each defend your view with one piece of evidence.", xp:15 },
  { title:"Peer Forge",           template:"Trade your Must Do answer with a partner. Give one honest piece of feedback: what's strong, what's missing.", xp:15 },
  { title:"Evidence Hunter",      template:"With a partner, find two different quotes that could each support the main idea — compare which one is stronger and why.", xp:15 },
  { title:"Storyteller's Circle", template:"In a small group, retell [TEXT]'s key event in order — each person adds the next part.", xp:15 },
];
function resolveCollabQuest(tileId, tile) {
  const idx = Math.abs(tileId * 17 + 31) % COLLAB_QUEST_TEMPLATES.length;
  const tmpl = COLLAB_QUEST_TEMPLATES[idx];
  const textRef = tile?.sessionTitle || tile?.name || "today's lesson";
  return { title: tmpl.title, desc: tmpl.template.replace(/\[TEXT\]/g, textRef), xp: tmpl.xp };
}
function pickQuestIdx(pool, tileId, salt) {
  return Math.abs((tileId * 17 + salt * 31)) % pool.length;
}
/* ─── SHOP ─── */
const SHOP_ITEMS = [
  { id:'jolly_rancher',  emoji:'🍬', label:'Jolly Rancher',         cost:25,  desc:'A sweet reward for a brave adventurer.' },
  { id:'loot_roll',      emoji:'🎲', label:'Loot Roll',              cost:50,  desc:'Try your luck — a mystery item awaits.' },
  { id:'sit_anywhere',   emoji:'🪑', label:'Sit Anywhere Day',       cost:75,  desc:'Choose your throne for the day.' },
  { id:'plinko',         emoji:'🎯', label:'Plinko Drop',            cost:75,  desc:'Drop the puck, claim your fate.' },
  { id:'free_game_time', emoji:'🎮', label:'10 Min Free Game Time',  cost:150, desc:'A moment of rest for a seasoned hero.' },
  { id:'gimkit',         emoji:'🎉', label:'Whole Class Gimkit',     cost:200, desc:'Rally your classmates — victory for all!' },
];
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

/* ─── PET POOLS (mirrors EQUIP_POOLS structure, keyed by land name) ─── */
const PET_POOLS = {
  "The Verdant Vale": {
    common:    companionsByRarity('common').map(c => c.file),
    rare:      companionsByRarity('uncommon').map(c => c.file),
    epic:      companionsByRarity('rare').map(c => c.file),
    legendary: "051-lion.png",
  }
};
function pickPetItem(landName, tier) {
  const pool = PET_POOLS[landName];
  if (!pool) return null;
  if (tier === 'legendary') return pool.legendary || null;
  const arr = pool[tier] || [];
  return arr.length ? randFrom(arr) : null;
}
function awardFromPool(student, landName, tier, onComplete = null) {
  const done = () => { if (onComplete) onComplete(); };
  const ov = getOverrides().students[String(student.id)] || {};
  const ownedCompanions = new Set(ov.companions || []);
  const ownedEquip      = new Set(ov.equipInventory || []);

  if (tier === 'legendary') {
    const items = [];
    const petFile = pickPetItem(landName, 'legendary');
    if (petFile && !ownedCompanions.has(petFile)) {
      awardCompanion(student, petFile);
      items.push({ type: 'pet', file: petFile });
    }
    ['weapon', 'shield'].forEach(slot => {
      const id = pickEquipItem(landName, slot, 'legendary');
      if (id && !ownedEquip.has(id)) {
        awardEquipItem(student, id, false);
        items.push({ type: 'equip', def: getEquipItemDef(id) });
      }
    });
    if (!items.length) { done(); return; }
    const showNext = (idx) => {
      if (idx >= items.length) { done(); return; }
      const item = items[idx];
      if (item.type === 'pet') showCompanionReveal(item.file, () => showNext(idx + 1));
      else showEquipReveal(item.def, () => showNext(idx + 1));
    };
    showNext(0);
    return;
  }

  // Build eligible pools excluding already-owned items (FIX 3)
  const petPool    = (PET_POOLS[landName]?.[tier] || []).filter(f => !ownedCompanions.has(f));
  const weaponPool = ((EQUIP_POOLS[landName]?.weapon?.[tier]) || []).filter(id => !ownedEquip.has(id));
  const shieldPool = ((EQUIP_POOLS[landName]?.shield?.[tier]) || []).filter(id => !ownedEquip.has(id));
  const hasPet   = petPool.length > 0;
  const hasEquip = weaponPool.length > 0 || shieldPool.length > 0;

  if (!hasPet && !hasEquip) {
    // Student owns everything available — award +5 bonus XP instead
    const { levelsGained, newLevel } = awardXP(student, 5);
    logActivity(student.id, '🎒', 'Bag full of rare finds! (+5 Bonus XP)');
    showXPCelebration(5, levelsGained, newLevel, done, "Your bag is full of rare finds! +5 Bonus XP");
    return;
  }

  const givePet = hasPet && (!hasEquip || Math.random() < 0.5);
  if (givePet) {
    const file = randFrom(petPool);
    awardCompanion(student, file);
    showCompanionReveal(file, done);
  } else {
    const eligibleSlots = [];
    if (weaponPool.length > 0) eligibleSlots.push('weapon');
    if (shieldPool.length > 0) eligibleSlots.push('shield');
    const slot = randFrom(eligibleSlots);
    const id   = randFrom(slot === 'weapon' ? weaponPool : shieldPool);
    awardEquipItem(student, id, false);
    showEquipReveal(getEquipItemDef(id), done);
  }
}

function awardCompanion(student, file) {
  const ov = getOverrides().students[String(student.id)] || {};
  const companions = [...new Set([...(ov.companions||[]), file])];
  saveStudentOverride(student.id, {companions});
  return file;
}
function getEquipItemDef(id) {
  if (EQUIP_LEGENDARY_NAMES[id]) {
    const type = id.split('_')[0];
    return { id, type, tier:'legendary', tierColor:EQUIP_TIER_COLOR.legendary, icon:EQUIP_TYPE_ICON[type]||'📦', img:`/equipment/${id}.png`, n:EQUIP_LEGENDARY_NAMES[id], slotKey:type };
  }
  const parts = id.split('_'); // e.g. ["weapon","valeblade","common"]
  const type = parts[0];
  const tier = parts[parts.length - 1];
  const lineKey = parts.slice(1, -1).join('_');
  const lineName = EQUIP_LINE_NAMES[lineKey] || lineKey;
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  return { id, type, tier, tierColor:EQUIP_TIER_COLOR[tier]||"#9CA3AF", icon:EQUIP_TYPE_ICON[type]||'📦', img:`/equipment/${id}.png`, n:`${lineName} (${tierLabel})`, slotKey:type };
}
function pickEquipItem(landName, slotKey, tier) {
  const pool = EQUIP_POOLS[landName];
  if (!pool || !pool[slotKey]) return null;
  const slotPool = pool[slotKey];
  if (tier === 'legendary') return slotPool.legendary || null;
  const arr = slotPool[tier] || [];
  return arr.length ? randFrom(arr) : null;
}
function awardEquipItem(student, itemId, doReveal = false, onRevealComplete = null) {
  if (!itemId) return;
  const ov = getOverrides().students[String(student.id)] || {};
  const inv = [...new Set([...(ov.equipInventory || []), itemId])];
  saveStudentOverride(student.id, { equipInventory: inv });
  const def = getEquipItemDef(itemId);
  logActivity(student.id, def.icon, `Found ${def.n}!`);
  if (doReveal) showEquipReveal(def, onRevealComplete);
}
function getEquipInventory(student) {
  return (_overrides[String(student.id)] || {}).equipInventory || [];
}
function getEquippedSlots(student) {
  return (_overrides[String(student.id)] || {}).equippedSlots || {};
}
function equipSlotItem(student, slotKey, itemId) {
  const slots = Object.assign({}, getEquippedSlots(student), { [slotKey]: itemId });
  saveStudentOverride(student.id, { equippedSlots: slots });
}
function unequipSlotItem(student, slotKey) {
  const slots = Object.assign({}, getEquippedSlots(student));
  delete slots[slotKey];
  saveStudentOverride(student.id, { equippedSlots: Object.keys(slots).length ? slots : null });
}
const SPECIAL_BADGES = [
  { id:"special_loot_1", name:"Vale Pathfinder",   desc:"Explored every loot path in The Verdant Vale",   landId:1, emoji:"🌿" },
  { id:"special_loot_2", name:"Kingdom Delver",    desc:"Explored every loot path in The Stone Kingdoms", landId:2, emoji:"⛏️" },
  { id:"special_loot_3", name:"Depth Diver",       desc:"Explored every loot path in The Drowned Depths", landId:3, emoji:"🌊" },
  { id:"special_loot_4", name:"Thorn Blazer",      desc:"Explored every loot path in The Thornwood",      landId:4, emoji:"🌿" },
  { id:"special_loot_5", name:"Hollow Wanderer",   desc:"Explored every loot path in The Ashen Hollows",  landId:5, emoji:"🕯️" },
  { id:"special_loot_6", name:"Storm Seeker",      desc:"Explored every loot path in The Stormspire",     landId:6, emoji:"⚡" },
];
const LOOT_TILE_IDS = [28,29,30,31,32,33,34,35];

function getSeasonalBadges(student) {
  return (_overrides[String(student.id)] || {}).seasonalBadges || [];
}
function getSpecialBadges(student) {
  return (_overrides[String(student.id)] || {}).specialBadges || [];
}
function checkAndAwardSpecialBadges(student) {
  const ov = getOverrides().students[String(student.id)] || {};
  const pos = getLandPos(student);
  if (!pos.land) return;
  const completedSet = new Set((ov.completedTiles || []).map(Number));
  const allLootDone = LOOT_TILE_IDS.every(id => completedSet.has(id));
  if (!allLootDone) return;
  const badgeId = `special_loot_${pos.land}`;
  const existing = ov.specialBadges || [];
  if (existing.includes(badgeId)) return;
  saveStudentOverride(student.id, { specialBadges: [...existing, badgeId] });
  const badge = SPECIAL_BADGES.find(b => b.id === badgeId);
  if (badge) {
    logActivity(student.id, '🏅', `Special Badge earned: ${badge.name}!`);
    showSpecialBadgeReveal(badge);
  }
}
function awardSeasonalBadge(student) {
  const season = getActiveSeasonalSet();
  if (!season) return;
  const ov = getOverrides().students[String(student.id)] || {};
  const owned = new Set(ov.seasonalBadges || []);
  const unowned = season.badges.filter(b => !owned.has(b.id));
  if (!unowned.length) return;
  const badge = randFrom(unowned);
  saveStudentOverride(student.id, { seasonalBadges: [...(ov.seasonalBadges || []), badge.id] });
  logActivity(student.id, '🏅', `Found seasonal badge: ${badge.name}!`);
}
function findLandByTileId(tileId) {
  return LANDS.find(l => l.tiles.some(t => t.id === tileId)) || null;
}
function hasCompletedAnyBoss(student) {
  const ov = getOverrides().students[String(student.id)] || {};
  const completed = ov.completedTiles || student.completedTiles || [];
  return LANDS.some(land => land.tiles.some(t => t.type==="boss" && completed.includes(t.id)));
}

/* ─── QUEST BOARD DATA ─── */
const QB = { W:1050, H:430, TILE:80, DTILE:96, LTILE:66 };
const LW = { W:1050, H:560, TILE:88, BTILE:96, DTILE:132, ETILE:120, LTILE:72, NPTILE:120 };

const LANDS = [
  {
    id:1, name:"The Verdant Vale", subtitle:"Unit 1: Overcoming Obstacles", biome:1,
    lore:"The Vale has stood for an age uncounted, its roots drinking deep from rivers of story. Many have come to this forest broken and left it stronger. Every scar in its bark marks a reader who refused to quit.",
    W:1195, H:980,
    mainPaths:[
      "M 65 70 L 195 70 L 325 70 L 455 70 L 585 70 L 715 70 L 845 70",
      "M 845 70 C 895 70 895 350 845 350",
      "M 845 350 L 715 350 L 585 350 L 455 350 L 325 350 L 195 350 L 65 350",
      "M 65 350 C 15 350 15 630 65 630",
      "M 65 630 L 195 630 L 325 630 L 455 630 L 585 630 L 715 630 L 845 630 L 975 630",
    ],
    branchPaths:[
      // Top loot loop: S5→S6→S8→S7 rectangle
      "M 585 70 L 585 210",
      "M 585 210 L 715 210",
      "M 715 210 L 715 70",
      // Middle loot chain: S11→S12→S14→S13
      "M 715 350 L 715 490",
      "M 715 490 L 455 490",
      "M 455 490 L 455 420 L 585 420 L 585 350",
      // Bottom loot chain: S20→S21→S23→Warden
      "M 195 630 L 195 750",
      "M 195 750 L 455 750",
      "M 455 750 L 455 700 L 325 700 L 325 630",
    ],
    decorations:[],
    tiles:[
      // ── Row 0: main path L→R (S1–S5, S7, S9) ──
      {id: 1, type:"arrival",  name:"The Vale's Welcome",    x:65,   y:70},
      {id: 2, type:"lesson",   name:"S2",  x:195,  y:70,
        video:"https://app.nearpod.com/?pin=E8SWM",
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id: 3, type:"lesson",   name:"S3",  x:325,  y:70,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id: 4, type:"lesson",   name:"S4",  x:455,  y:70,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id: 5, type:"lesson",   name:"S5",  x:585,  y:70,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id: 7, type:"lesson",   name:"S7",  x:715,  y:70,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id: 9, type:"lesson",   name:"S9",  x:845,  y:70,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      // ── Row 2: main path R→L (S10–S11, S13, S15–S18) ──
      {id:10, type:"lesson",   name:"S10", x:845,  y:350,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id:11, type:"lesson",   name:"S11", x:715,  y:350,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id:13, type:"lesson",   name:"S13", x:585,  y:350,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id:15, type:"lesson",   name:"S15", x:455,  y:350,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id:16, type:"lesson",   name:"S16", x:325,  y:350,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id:17, type:"lesson",   name:"S17", x:195,  y:350,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id:18, type:"lesson",   name:"S18", x:65,   y:350,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      // ── Row 4: main path L→R (S19–S20, Warden, Scribe's Calling) ──
      {id:19, type:"lesson",   name:"S19", x:65,   y:630,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id:20, type:"lesson",   name:"S20", x:195,  y:630,
        mustDo:["Completed Must Do activities in workbook"], shouldDo:["Completed Should Do activity"], aspireTo:["Completed optional Aspire To activity"]},
      {id:27, type:"dungeon",  name:"The Warden of the Vale", x:325, y:630, portrait:"boss_warden.png"},
      {id:26, type:"event",    name:"The Scribe's Calling",  x:975,  y:630},
      // ── Loot branches — each pair branches independently from their hub tile ──
      // Row 1 (y=210): S6 + S8 branch from S5 (lesson before Abysmara), rejoin at S7
      {id: 6, type:"loot", name:"S6",  skill:"Should Do", x:585,  y:210, parentTileId: 5, nextTile: 7},
      {id: 8, type:"loot", name:"S8",  skill:"Aspire To", x:715,  y:210, parentTileId: 5, nextTile: 7},
      // Row 3 (y=490): S12 unlocked by S11, S14 unlocked by S12, chain rejoins at S13
      {id:12, type:"loot", name:"S12", skill:"Should Do", x:715,  y:490, parentTileId:11, nextTile:14},
      {id:14, type:"loot", name:"S14", skill:"Aspire To", x:455,  y:490, parentTileId:12, nextTile:13},
      // Row 5 (y=750): S21 unlocked by S20, S23 unlocked by S21, chain rejoins at Warden
      {id:21, type:"loot", name:"S21", skill:"Should Do", x:195,  y:750, parentTileId:20, nextTile:40},
      {id:40, type:"loot", name:"S23", skill:"Aspire To", x:455,  y:750, parentTileId:21, nextTile:27},
      // ── NPC tiles ──
      {id:36, type:"npc", npcKey:"thornkin_hint",          x:195,  y:210, landId:1},
      {id:37, type:"npc", npcKey:"thornkin_lore",          x:325,  y:210, landId:1},
      {id:38, type:"npc", npcKey:"thornkin_encouragement", x:65,   y:490, landId:1},
      {id:39, type:"npc", npcKey:"thornkin_easter",        x:325,  y:490, landId:1},
    ],
    pathOrder:[1,2,3,4,5,7,9,10,11,13,15,16,17,18,19,20,27,26],
    standardBosses:{
      duskmantle: { standard:"RL.5.1", portrait:"boss_duskmantle.png", sessions:[2,9]     },
      mirrorkin:  { standard:"RL.5.3", portrait:"boss_mirrowick.png",  sessions:[3,18,19] },
      seraphine:  { standard:"RL.5.2", portrait:"boss_seraphine.png",  sessions:[5,16,20] },
      keystone:   { standard:"RI.5.2", portrait:"boss_keystone.png",   sessions:[10,11]   },
    },
    gateBosses:{
      abysmara: { session:7,  assessment:"module1", portrait:"boss_abysmara.png" },
      feraxis:  { session:13, assessment:"module2", portrait:"boss_feraxis.png"  },
    },
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
    lore:"These walls were raised by those who believed beauty was worth fighting for. Carved into every stone is the memory of an artist who shaped chaos into meaning. To walk these halls is to hear a thousand unfinished songs.",
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
      {id:36, type:"npc", npcKey:"gravenborn_lore",          x:195,  y:210, landId:2},
      {id:37, type:"npc", npcKey:"gravenborn_encouragement", x:715,  y:210, landId:2},
      {id:38, type:"npc", npcKey:"gravenborn_easter",        x:975,  y:490, landId:2},
      {id:39, type:"npc", npcKey:"gravenborn_hint",          x:325,  y:490, landId:2},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27],
  },
  {
    id:3, name:"The Drowned Depths", subtitle:"Unit 3: Earth's Water", biome:3,
    lore:"Beneath the surface, currents carry secrets older than memory. The waters here do not forget — they hold every word ever spoken into the deep. To read the Depths is to listen to the world breathing.",
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
      {id:36, type:"npc", npcKey:"tideweaver_encouragement", x:195,  y:210, landId:3},
      {id:37, type:"npc", npcKey:"tideweaver_easter",        x:715,  y:210, landId:3},
      {id:38, type:"npc", npcKey:"tideweaver_hint",          x:975,  y:490, landId:3},
      {id:39, type:"npc", npcKey:"tideweaver_lore",          x:325,  y:490, landId:3},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,26,27],
  },
  {
    id:4, name:"The Thornwood", subtitle:"Unit 4: Survival", biome:4,
    lore:"The Thornwood does not welcome the careless. It rewards only those willing to think carefully, adapt, and press through the dark. Every thorn here has a lesson, and every lesson has thorns.",
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
      {id:36, type:"npc", npcKey:"briarfolk_easter",        x:195,  y:210, landId:4},
      {id:37, type:"npc", npcKey:"briarfolk_hint",          x:715,  y:210, landId:4},
      {id:38, type:"npc", npcKey:"briarfolk_lore",          x:975,  y:490, landId:4},
      {id:39, type:"npc", npcKey:"briarfolk_encouragement", x:325,  y:490, landId:4},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,26,27],
  },
  {
    id:5, name:"The Ashen Hollows", subtitle:"Unit 5: Underground Railroad", biome:5,
    lore:"The Hollows remember those who walked in silence and shadow toward something greater than themselves. These passages were carved by courage and lit by the fire of hope. To know this land is to carry their memory forward.",
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
      {id:36, type:"npc", npcKey:"embersoul_hint",          x:195,  y:210, landId:5},
      {id:37, type:"npc", npcKey:"embersoul_lore",          x:715,  y:210, landId:5},
      {id:38, type:"npc", npcKey:"embersoul_encouragement", x:975,  y:490, landId:5},
      {id:39, type:"npc", npcKey:"embersoul_easter",        x:325,  y:490, landId:5},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,26,27],
  },
  {
    id:6, name:"The Stormspire", subtitle:"Unit 6: Communication", biome:6,
    lore:"At the peak of the Stormspire, every word becomes lightning. The scholars who built it believed that the right message, sent at the right moment, could change everything. Choose your words well — they echo here for centuries.",
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
      {id:36, type:"npc", npcKey:"voltari_lore",          x:195,  y:210, landId:6},
      {id:37, type:"npc", npcKey:"voltari_easter",        x:715,  y:210, landId:6},
      {id:38, type:"npc", npcKey:"voltari_hint",          x:975,  y:490, landId:6},
      {id:39, type:"npc", npcKey:"voltari_encouragement", x:325,  y:490, landId:6},
    ],
    pathOrder:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,26,27],
  },
];
/* ─── SCRIBE'S SANCTUM TILES ─── */
const SANCTUM_TILES = [
  { id:1, name:"Planning Table",  img:"/tiles/01-planning-table.png",  action:"Plan",
    checklist:[
      "I read the writing prompt carefully",
      "I know what type of writing this is asking for",
      "I identified my topic or main idea",
      "I thought about my audience and purpose",
      "I brainstormed ideas before I started writing",
    ]},
  { id:2, name:"Drafting Desk",   img:"/tiles/02-drafting-desk.png",   action:"Outline",
    checklist:[
      "I created an outline for my writing",
      "My outline has an introduction, body, and conclusion",
      "I identified my main points or plot events",
      "I know what evidence or details I will use",
      "My outline follows the prompt requirements",
    ]},
  { id:3, name:"Revision Mirror", img:"/tiles/03-revision-mirror.png", action:"Write",
    checklist:[
      "I used my outline to write my draft",
      "I wrote a strong introduction",
      "Each paragraph has a main idea and supporting details",
      "I used transition words to connect my ideas",
      "I wrote a conclusion that wraps up my writing",
    ]},
  { id:4, name:"Editing Quill",   img:"/tiles/04-editing-quill.png",   action:"Edit",
    checklist:[
      "I checked my spelling",
      "I checked my punctuation and capitalization",
      "I read my writing aloud to catch errors",
      "My sentences are complete and make sense",
      "I made corrections to my draft",
    ]},
  { id:5, name:"Scribe's Podium", img:"/tiles/05-scribes-podium.png",  action:"Revise",
    checklist:[
      "I reread my entire piece from beginning to end",
      "My writing clearly answers the prompt",
      "I strengthened any weak sentences or ideas",
      "I am proud of this piece and ready to submit",
      "I clicked \"My Battle Is Complete\" to notify my teacher",
    ]},
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
    { id:1, type:"sg", name:"The Notice Board",      x:455, y:350,
      flavor:"Adventurer! A fresh notice has appeared on the board. Your journey begins here! Read what awaits you in the Realm of ELA and take the first step toward legend.",
      flavorDramatic:"✦ The Hall of Heroes is already expecting you. ✦" },
    { id:2, type:"sg", name:"The Hall of Heroes",    x:195, y:350, sgModal:"avatar",
      flavor:"Every legend begins with a face and a name. Step into the Hall of Heroes to choose your class and forge the hero you will become. Your look, your story." },
    { id:3, type:"sg", name:"The Guild Hall",         x:455, y:630,
      flavor:"All heroes belong to a guild. Enter and see where your talents place you — your guild will be your companion through every challenge that lies ahead." },
    { id:4, type:"sg", name:"The Armory",             x:715, y:630,
      flavor:"Know your power before the battle. The Armory holds the secrets of XP, levels, and the strength that grows within you with every tile you complete." },
    { id:5, type:"sg", name:"The Training Grounds",   x:715, y:350, sgModal:"lesson",
      flavor:"No hero charges into battle untrained. Walk through a practice run and learn how your quests will be tracked before the real lessons begin." },
    { id:6, type:"sg", name:"The Village Gate",       x:195, y:630, sgModal:"gate",
      flavor:"You've chosen your class. You've found your guild. The Realm knows your name now.<br><br>Beyond this gate, the real trials begin — new lands, new challenges, and a legend still waiting to be written. Take a breath, hero. It's time." },
    { id:10, type:"npc", npcKey:"lumin_hint",          x:195,  y:210, landId:0 },
    { id:11, type:"npc", npcKey:"lumin_lore",          x:715,  y:210, landId:0 },
    { id:12, type:"npc", npcKey:"lumin_encouragement", x:975,  y:490, landId:0 },
    { id:13, type:"npc", npcKey:"lumin_easter",        x:325,  y:490, landId:0 },
  ],
  pathOrder:[2,1,5,4,3,6],
};

function getLandData(id) {
  if (id === 0) return LAND0;
  return LANDS[id-1] || LANDS[0];
}

function findTileById(tileId) {
  const allLands = [LAND0, ...LANDS];
  for (const land of allLands) {
    const tile = (land.tiles || []).find(t => t.id === tileId);
    if (tile) return { tile, land };
  }
  return null;
}

const LAND_EMOJIS = ["🌿","⛏️","🌊","🌿","🕯️","⚡"];
const LAND_TRAVEL_COPY = {
  2: "Ancient power sleeps in these halls.",
  3: "Something stirs beneath the waves.",
  4: "The forest does not welcome strangers.",
  5: "Not all shadows are empty.",
  6: "The final reckoning awaits.",
};
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
let _overrides = {};       // { studentNumber: { hp, xp, ... } } — keyed by 3-digit number
let _roster   = {};        // optional { "101": "Real Name" } from roster.local.json — never uploaded

const COHORT_SIZE = 30;

const STUDENT_DEFAULTS = {
  claimed: false,
  characterName: null,
  guild: null,
  avatarClass: null,
  title: null,
  level: 1, xp: 0, xpNext: 50,
  hp: 10, mp: 10, sp: 5,
  items: [], bosses: [],
  completedTiles: [], completedLand0: false,
  companions: [], activeCompanion: null,
};

function makeStudentBase(number) {
  const s = String(number);
  const pin = s[0] + '0' + s.slice(1); // 101→1001, 201→2001, 125→1025
  return { id: number, number, cohort: Math.floor(number / 100), pin };
}
function isValidStudentNumber(n) {
  const c = Math.floor(n / 100);
  const o = n % 100;
  return c >= 1 && c <= 4 && o >= 1 && o <= COHORT_SIZE;
}
function getPeriodStudents(cohortId) {
  const start = cohortId * 100 + 1;
  return Array.from({ length: COHORT_SIZE }, (_, i) => makeStudentBase(start + i));
}
function getAllStudents() {
  return [1, 2, 3, 4].flatMap(c => getPeriodStudents(c));
}
let _helpflags = {};       // { studentId: { flaggedAt, message } }
let _craftRequests = {};   // { studentId: { requestedAt } } — pending potion requests
let _settings = {};        // { pacing: { startDate, targetDate, targetCount } }
let _activityLog = {};     // { studentId: { pushKey: { type, message, icon, ts } } }
let _sqInvites = {};       // { studentId: { questKey: { fromStudentId, fromStudentName, questKey, questName, tileId, type, idx, timestamp, status } } }
let _shopPending = {};     // { key: { studentId, studentName, itemId, itemName, cost, timestamp } }

function getOverrides() {
  return { students: _overrides };
}
function saveStudentOverride(id, changes) {
  const sid = String(id);
  _overrides[sid] = Object.assign({}, _overrides[sid] || {}, changes);
  update(ref(db, `students/${sid}`), changes).catch(console.error);
}
function getBossStatus(student, bossKey) {
  return ((_overrides[String(student.id)] || {}).bossStatus || {})[bossKey] || 'not_attempted';
}
function setBossStatus(studentId, bossKey, status) {
  const sid = String(studentId);
  if (!_overrides[sid]) _overrides[sid] = {};
  if (!_overrides[sid].bossStatus) _overrides[sid].bossStatus = {};
  _overrides[sid].bossStatus[bossKey] = status;
  set(ref(db, `overrides/${sid}/bossStatus/${bossKey}`), status).catch(console.error);
}
function getStdBossState(studentId, bossKey) {
  return ((_overrides[String(studentId)] || {}).standardBossState || {})[bossKey]
    || { status:'not_started', encounterCount:0, lastAttemptSession:null, failedAt:null };
}
function setStdBossState(studentId, bossKey, stateObj) {
  const sid = String(studentId);
  if (!_overrides[sid]) _overrides[sid] = {};
  if (!_overrides[sid].standardBossState) _overrides[sid].standardBossState = {};
  _overrides[sid].standardBossState[bossKey] = stateObj;
  update(ref(db, `students/${sid}/standardBossState`), { [bossKey]: stateObj }).catch(console.error);
}
function getGateBossState(studentId, bossKey) {
  return ((_overrides[String(studentId)] || {}).gateBossState || {})[bossKey]
    || { status:'locked' };
}
function setGateBossState(studentId, bossKey, stateObj) {
  const sid = String(studentId);
  if (!_overrides[sid]) _overrides[sid] = {};
  if (!_overrides[sid].gateBossState) _overrides[sid].gateBossState = {};
  _overrides[sid].gateBossState[bossKey] = stateObj;
  update(ref(db, `students/${sid}/gateBossState`), { [bossKey]: stateObj }).catch(console.error);
}
function updateBossStateOnTileComplete(student, tileId, land) {
  const sid = String(student.id);
  if (!land) return;
  if (land.standardBosses) {
    Object.entries(land.standardBosses).forEach(([bk, boss]) => {
      const sessionIdx = boss.sessions.indexOf(tileId);
      if (sessionIdx < 0) return;
      const cur = getStdBossState(sid, bk);
      if (sessionIdx === 0) {
        if (cur.status === 'not_started') {
          setStdBossState(sid, bk, { status:'sighted', encounterCount:1, lastAttemptSession:tileId, failedAt:null });
        }
      } else {
        if (cur.status !== 'defeated') {
          setStdBossState(sid, bk, {
            status:'awaiting_judgment',
            encounterCount: Math.max(cur.encounterCount, sessionIdx + 1),
            lastAttemptSession:tileId, failedAt:null,
          });
        }
      }
    });
  }
  if (land.gateBosses) {
    Object.entries(land.gateBosses).forEach(([bk, boss]) => {
      if (boss.session !== tileId) return;
      const cur = getGateBossState(sid, bk);
      if (cur.status === 'locked') {
        setGateBossState(sid, bk, { status:'active' });
      }
    });
  }
}
function backfillBossStates() {
  // One-time backfill for students whose completedTiles were seeded before
  // updateBossStateOnTileComplete existed. Safe to re-run: only writes states
  // that are still 'not_started' or 'locked', never overwrites teacher marks.
  const periods = CLASS_DATA.periods || [];
  let count = 0;
  LANDS.forEach(land => {
    if (!land.standardBosses && !land.gateBosses) return;
    periods.forEach(period => {
      (period.students || []).forEach(student => {
        const sid = String(student.id);
        const completed = (_overrides[sid] || {}).completedTiles || [];
        if (land.standardBosses) {
          Object.entries(land.standardBosses).forEach(([bk, boss]) => {
            const cur = getStdBossState(sid, bk);
            if (cur.status !== 'not_started') return; // already set by teacher or real flow
            let highestIdx = -1;
            boss.sessions.forEach((sessId, idx) => {
              if (completed.includes(sessId)) highestIdx = idx;
            });
            if (highestIdx < 0) return;
            const newState = highestIdx === 0
              ? { status:'sighted', encounterCount:1, lastAttemptSession:boss.sessions[0], failedAt:null }
              : { status:'awaiting_judgment', encounterCount:highestIdx+1, lastAttemptSession:boss.sessions[highestIdx], failedAt:null };
            setStdBossState(sid, bk, newState);
            count++;
          });
        }
        if (land.gateBosses) {
          Object.entries(land.gateBosses).forEach(([bk, boss]) => {
            const cur = getGateBossState(sid, bk);
            if (cur.status !== 'locked') return;
            if (completed.includes(boss.session)) {
              setGateBossState(sid, bk, { status:'active' });
              count++;
            }
          });
        }
      });
    });
  });
  return count;
}
function getWriteStatus(student, landId) {
  return getBossStatus(student, `event_${landId}`);
}
function setWriteStatus(studentId, landId, status) {
  setBossStatus(studentId, `event_${landId}`, status);
}
function savePreEventPosition(studentId, landId, tileId) {
  const sid = String(studentId);
  if (!_overrides[sid]) _overrides[sid] = {};
  _overrides[sid].preEventLandId = landId;
  _overrides[sid].preEventTileId = tileId;
  update(ref(db, `overrides/${sid}`), { preEventLandId: landId, preEventTileId: tileId }).catch(console.error);
}
function getPreEventPosition(student) {
  const ov = _overrides[String(student.id)] || {};
  return { landId: ov.preEventLandId || null, tileId: ov.preEventTileId || null };
}
function getSanctumProgress(student, landId) {
  const ov = _overrides[String(student.id)] || {};
  return (ov.sanctumProgress || {})[String(landId)] || 0;
}
function setSanctumProgress(studentId, landId, progress) {
  const sid = String(studentId);
  if (!_overrides[sid]) _overrides[sid] = {};
  if (!_overrides[sid].sanctumProgress) _overrides[sid].sanctumProgress = {};
  _overrides[sid].sanctumProgress[String(landId)] = progress;
  set(ref(db, `overrides/${sid}/sanctumProgress/${landId}`), progress).catch(console.error);
}
function getSanctumChecklist(student, landId, tileId) {
  const ov = _overrides[String(student.id)] || {};
  return ((ov.sanctumChecklist || {})[String(landId)] || {})[String(tileId)] || 0;
}
function setSanctumChecklist(studentId, landId, tileId, bits) {
  const sid = String(studentId);
  if (!_overrides[sid]) _overrides[sid] = {};
  if (!_overrides[sid].sanctumChecklist) _overrides[sid].sanctumChecklist = {};
  if (!_overrides[sid].sanctumChecklist[String(landId)]) _overrides[sid].sanctumChecklist[String(landId)] = {};
  _overrides[sid].sanctumChecklist[String(landId)][String(tileId)] = bits;
  set(ref(db, `overrides/${sid}/sanctumChecklist/${landId}/${tileId}`), bits).catch(console.error);
}
function isInSanctum(student) {
  const ov = _overrides[String(student.id)] || {};
  const preLand = ov.preEventLandId;
  if (!preLand) return null;
  const ws = (ov.bossStatus || {})[`event_${preLand}`] || 'not_attempted';
  return ws === 'confirmed' ? null : preLand;
}
function getHelpFlags() {
  return Object.assign({}, _helpflags);
}
function setHelpFlag(id, message) {
  const sid = String(id);
  _helpflags[sid] = { flaggedAt: new Date().toISOString(), message: message || '' };
  set(ref(db, `helpflags/${sid}`), _helpflags[sid]).catch(console.error);
}
function clearHelpFlag(id) {
  const sid = String(id);
  delete _helpflags[sid];
  set(ref(db, `helpflags/${sid}`), null).catch(console.error);
}
function _countSchoolDays(fromIso, toDate) {
  if (!fromIso) return 0;
  const from = new Date(fromIso); from.setHours(0,0,0,0);
  const to = new Date(toDate); to.setHours(0,0,0,0);
  let count = 0;
  const cur = new Date(from); cur.setDate(cur.getDate() + 1);
  while (cur <= to) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
function getStudentFlags(student) {
  const flags = [];
  const sid = String(student.id);
  const ov = _overrides[sid] || {};
  const ts = ov.taskTimestamps || {};
  const completed = (ov.completedTiles || student.completedTiles || []).map(Number);
  const bossStatus = ov.bossStatus || {};
  const today = new Date();
  // ⚡ RUSHED — any completed tile under 120s
  const rushedTileId = completed.find(tid => {
    const t = ts[String(tid)];
    return t && t.timeOnPage !== undefined && t.timeOnPage !== null && t.timeOnPage < 120;
  });
  if (rushedTileId !== undefined) {
    flags.push({ key:'rushed', icon:'⚡', color:'#CA8A04', tip:'Completed a tile in under 2 minutes' });
  }
  // 🚩 STUCK — no advancement in 3+ school days
  if (completed.length > 0) {
    const lastTileId = completed[completed.length - 1];
    const lastTs = ts[String(lastTileId)];
    const schoolDays = _countSchoolDays(lastTs ? lastTs.completedAt : null, today);
    if (schoolDays >= 3) {
      flags.push({ key:'stuck', icon:'🚩', color:'#DC2626', tip:`No tile advancement in ${schoolDays} school days` });
    }
  }
  // ❌ FAILED BOSS — any bossStatus === 'retake'
  if (Object.values(bossStatus).some(v => v === 'retake')) {
    flags.push({ key:'failed_boss', icon:'❌', color:'#7F1D1D', tip:'Failed a boss fight — needs to retake' });
  }
  // ⏳ AWAITING JUDGMENT — any bossStatus === 'submitted'
  if (Object.values(bossStatus).some(v => v === 'submitted')) {
    flags.push({ key:'awaiting', icon:'⏳', color:'#7C3AED', tip:'Submitted work awaiting teacher review' });
  }
  // 🤚 NEEDS HELP
  if (_helpflags[sid]) {
    const msg = _helpflags[sid].message;
    flags.push({ key:'help', icon:'🤚', color:'#EA580C', tip:`Needs help${msg ? ': ' + msg : ''}` });
  }
  return flags;
}
function gradeToHP(grade) {
  const g = Math.max(0, Math.min(100, Math.round(grade)));
  return Math.min(10, Math.floor(g / 10) + 1);
}
function saveGradeLog(studentId, lessonId, rawGrade, convertedHP) {
  const sid = String(studentId);
  const entry = { rawGrade, convertedHP, timestamp: new Date().toISOString() };
  set(ref(db, `gradeLog/${sid}/${lessonId}`), entry).catch(console.error);
}
function saveGradeReminder(studentId, lessonId) {
  const sid = String(studentId);
  if (!_overrides[sid]) _overrides[sid] = {};
  if (!_overrides[sid].gradeReminders) _overrides[sid].gradeReminders = {};
  _overrides[sid].gradeReminders[String(lessonId)] = true;
  set(ref(db, `overrides/${sid}/gradeReminders/${lessonId}`), true).catch(console.error);
}
function clearGradeReminder(studentId, lessonId) {
  const sid = String(studentId);
  if (_overrides[sid] && _overrides[sid].gradeReminders) {
    delete _overrides[sid].gradeReminders[String(lessonId)];
  }
  set(ref(db, `overrides/${sid}/gradeReminders/${lessonId}`), null).catch(console.error);
}
function getGradeReminders(studentId) {
  return (_overrides[String(studentId)] || {}).gradeReminders || {};
}
function getCraftRequests() { return Object.assign({}, _craftRequests); }
function requestCraft(studentId, itemKey) {
  const sid = String(studentId);
  _craftRequests[sid] = { itemRequested: itemKey, checkboxConfirmed: true, requestedAt: new Date().toISOString(), status: 'pending' };
  set(ref(db, `craftRequests/${sid}`), _craftRequests[sid]).catch(console.error);
}
function approveCraft(studentId) {
  const sid = String(studentId);
  const req = _craftRequests[sid] || {};
  const itemKey = req.itemRequested || 'health_potion';
  delete _craftRequests[sid];
  set(ref(db, `craftRequests/${sid}`), null).catch(console.error);
  const ov = _overrides[sid] || {};
  const items = [...(ov.items || []), itemKey];
  saveStudentOverride(studentId, { items });
  const itemDef = ITEMS[itemKey] || { i:'🧪', n: itemKey };
  logActivity(sid, itemDef.i, `Crafted ${itemDef.n}`);
}
function denyCraft(studentId) {
  const sid = String(studentId);
  delete _craftRequests[sid];
  set(ref(db, `craftRequests/${sid}`), null).catch(console.error);
}
function getPacingSettings() { return (_settings && _settings.pacing) || null; }
function getBossOpenKeys() { return (_settings && _settings.bossOpenKeys) || []; }
function getProgressCap(cohortId, landId) {
  return (((_settings && _settings.progressCap) || {})[String(cohortId)] || {})[String(landId)] ?? null;
}
function setProgressCap(cohortId, landId, capTileId) {
  if (!_settings) _settings = {};
  if (!_settings.progressCap) _settings.progressCap = {};
  const cid = String(cohortId);
  if (!_settings.progressCap[cid]) _settings.progressCap[cid] = {};
  if (capTileId === null) {
    delete _settings.progressCap[cid][String(landId)];
  } else {
    _settings.progressCap[cid][String(landId)] = capTileId;
  }
  set(ref(db, `settings/progressCap/${cid}/${landId}`), capTileId).catch(console.error);
}
function logActivity(studentId, icon, message) {
  const sid = String(studentId);
  const entry = { icon, message, ts: new Date().toISOString() };
  const logRef = push(ref(db, `activityLog/${sid}`));
  set(logRef, entry).catch(console.error);
  if (!_activityLog[sid]) _activityLog[sid] = {};
  _activityLog[sid][logRef.key] = entry;
  const keys = Object.keys(_activityLog[sid]).sort();
  if (keys.length > 20) keys.slice(0, keys.length - 20).forEach(k => delete _activityLog[sid][k]);
}
function getActivityLog(studentId) {
  const sid = String(studentId);
  const log = _activityLog[sid] || {};
  return Object.entries(log).sort(([a],[b]) => b.localeCompare(a)).slice(0, 20).map(([,v]) => v);
}
function getSQInvites(studentId) {
  return _sqInvites[String(studentId)] || {};
}
function sendQuestInvite(fromStudent, recipientId, questKey, questName, tileId, type, idx, landId = null) {
  const invite = {
    fromStudentId: fromStudent.id,
    fromStudentName: getCharName(fromStudent),
    questKey,
    questName,
    tileId,
    landId,
    type,
    idx,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  const sid = String(recipientId);
  if (!_sqInvites[sid]) _sqInvites[sid] = {};
  _sqInvites[sid][questKey] = invite;
  set(ref(db, `sideQuestInvites/${sid}/${questKey}`), invite).catch(console.error);
}
function clearQuestInvite(studentId, questKey) {
  const sid = String(studentId);
  if (_sqInvites[sid]) delete _sqInvites[sid][questKey];
  set(ref(db, `sideQuestInvites/${sid}/${questKey}`), null).catch(console.error);
}
function setBossOpen(landId, tileId, open) {
  if (!_settings) _settings = {};
  const key = `${landId}-${tileId}`;
  const curr = getBossOpenKeys();
  const next = open ? (curr.includes(key) ? curr : [...curr, key]) : curr.filter(k => k !== key);
  _settings.bossOpenKeys = next;
  set(ref(db, 'settings/bossOpenKeys'), next.length ? next : null).catch(console.error);
}
function getExitTicketEnabled(tileId) {
  return !!((_settings.sessions || {})[String(tileId)] || {}).hasExitTicket;
}
function setExitTicket(tileId, enabled) {
  if (!_settings.sessions) _settings.sessions = {};
  if (!_settings.sessions[String(tileId)]) _settings.sessions[String(tileId)] = {};
  _settings.sessions[String(tileId)].hasExitTicket = enabled || null;
  set(ref(db, `settings/sessions/${tileId}/hasExitTicket`), enabled || null).catch(console.error);
}
function savePacingSettings(startDate, targetDate, targetCount) {
  if (!_settings) _settings = {};
  _settings.pacing = { startDate, targetDate, targetCount: Number(targetCount) };
  set(ref(db, 'settings/pacing'), _settings.pacing).catch(console.error);
}
function countCompletedSessions(student) {
  const ov = _overrides[String(student.id)] || {};
  const ts = ov.taskTimestamps || {};
  const lessonIds = new Set();
  for (const land of LANDS) {
    for (const tile of land.tiles) {
      if (tile.type === 'lesson') lessonIds.add(String(tile.id));
    }
  }
  return Object.keys(ts).filter(tid => lessonIds.has(tid) && ts[tid] && ts[tid].completedAt).length;
}
function calcPacedSP(student) {
  const pacing = getPacingSettings();
  if (!pacing || !pacing.startDate || !pacing.targetDate || !pacing.targetCount) return null;
  const start = new Date(pacing.startDate).getTime();
  const target = new Date(pacing.targetDate).getTime();
  const now = Date.now();
  const totalMs = target - start;
  if (totalMs <= 0) return null;
  const fraction = Math.max(0, Math.min(1, (now - start) / totalMs));
  const expected = fraction * Number(pacing.targetCount);
  if (expected <= 0) return 10;
  const actual = countCompletedSessions(student);
  return Math.max(1, Math.min(10, Math.round((actual / expected) * 10)));
}
function getEffectiveSP(student) {
  const pacing = getPacingSettings();
  if (pacing) {
    const ov = _overrides[String(student.id)] || {};
    if (ov.spOverrideAt) {
      const age = Date.now() - new Date(ov.spOverrideAt).getTime();
      if (age < 24 * 60 * 60 * 1000) return getMergedStudent(student).sp;
    }
    const paced = calcPacedSP(student);
    if (paced !== null) return paced;
  }
  return getMergedStudent(student).sp;
}
function useHealthPotion(student) {
  return useStatPotion(student, 'health_potion', 'hp', 2);
}
function useStatPotion(student, itemKey, stat, amount) {
  const s = getMergedStudent(student);
  const items = [...(s.items || [])];
  const idx = items.indexOf(itemKey);
  if (idx === -1) return false;
  items.splice(idx, 1);
  const newVal = Math.min(10, (s[stat] || 0) + amount);
  saveStudentOverride(student.id, { items, [stat]: newVal });
  return true;
}
function getEquipped(student) {
  return (_overrides[String(student.id)] || {}).equipped || {};
}
function equipItem(student, itemKey) {
  const eq = Object.assign({}, getEquipped(student), { [itemKey]: true });
  saveStudentOverride(student.id, { equipped: eq });
}
function unequipItem(student, itemKey) {
  const eq = Object.assign({}, getEquipped(student));
  delete eq[itemKey];
  saveStudentOverride(student.id, { equipped: Object.keys(eq).length ? eq : null });
}
function getActiveSideQuests(student) {
  const ov = _overrides[String(student.id)] || {};
  return ov.sideQuests || {};
}
function acceptSideQuest(studentId, tileId, type, questIdx, landId = null) {
  const sid = String(studentId);
  const ov = _overrides[sid] || {};
  const sq = Object.assign({}, ov.sideQuests || {});
  sq[`${tileId}_${type}`] = { questIdx, tileId, landId, type, acceptedAt: new Date().toISOString() };
  saveStudentOverride(sid, { sideQuests: sq });
}
function completeSideQuest(student, key) {
  const sid = String(student.id);
  const ov = _overrides[sid] || {};
  const sq = Object.assign({}, ov.sideQuests || {});
  const entry = sq[key];
  if (!entry) return;
  const quest = entry.type === 'collab'
    ? resolveCollabQuest(entry.tileId, findTileById(entry.tileId))
    : resolveSoloQuest(entry.tileId, entry.questIdx);
  delete sq[key];
  const history = [...(ov.completedQuests || []), {
    key, title: quest.title, type: entry.type, xp: quest.xp, landId: entry.landId || null, completedAt: new Date().toISOString()
  }].slice(-20);
  saveStudentOverride(sid, { sideQuests: Object.keys(sq).length ? sq : null, completedQuests: history });
  logActivity(sid, '✨', `Completed quest: ${quest.title} (+${quest.xp} XP)`);
  const { levelsGained, newLevel } = awardXP(student, quest.xp);
  if (levelsGained > 0) logActivity(sid, '⬆️', `Reached Level ${newLevel}!`);
  // Rare drop for side quest completion
  const _sqLand = entry.landId
    ? LANDS.find(l => l.id === entry.landId) || findLandByTileId(entry.tileId)
    : findLandByTileId(entry.tileId);
  if (_sqLand) {
    const _doSQLoot = () => awardFromPool(student, _sqLand.name, 'rare');
    if (!tryMysteryDrop(student, 'side_quest', _doSQLoot)) _doSQLoot();
  }
  if (Math.random() < 0.5) awardSeasonalBadge(student);
  showXPCelebration(quest.xp, levelsGained, newLevel, () => mount());
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
  unlockCosmeticsForGuild(studentId, chosen);
  return chosen;
}
const GUILD_BLURBS = {
  ember: "The Ember Guild is first through every door. They are the bold ones — full of energy, impossible to ignore, always ready to take the first step. To wear their crest is to carry a spark that never goes out.",
  tide:  "The Tide Guild always comes back. They are the steady ones — resilient, consistent, unshaken by setbacks. To wear their crest is to carry the quiet certainty that you will return, every time.",
  thorn: "The Thorn Guild holds the line. They are the disciplined ones — gritty, loyal, unbroken by hard ground. To wear their crest is to carry the understanding that real strength is grown, not given.",
  storm: "The Storm Guild never stands still. They are the bold movers — fast, adaptable, always three steps ahead. To wear their crest is to carry the wind at your back and the boldness to use it.",
};

function renderGuildReveal() {
  const step = STATE.sg0GuildReveal;

  if (step === "intro") {
    return `<div class="guild-reveal-overlay" id="guild-intro-overlay">
      <div class="guild-reveal-inner guild-intro-inner">
        <div class="guild-intro-modal">
          <div class="guild-intro-header">⚔️ Your Guild</div>
          <div class="guild-intro-body">
            <p>Every hero belongs somewhere. In the Realm, that place is your guild — the people who'll stand with you through every trial, every tile, every boss fight. Guilds aren't about being better than anyone else. They're about being part of something bigger than yourself.</p>
            <p>Crimson. Storm. Ember. Shadow. Four guilds, one Realm. Yours is waiting to meet you.</p>
          </div>
          <div class="guild-intro-footer">
            <button class="btn btn-gold" id="guild-intro-btn">I'm Ready to Join →</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  const ov = getOverrides().students[String(STATE.student.id)] || {};
  const guildKey = ov.guild;
  const guilds = CLASS_DATA && CLASS_DATA.guilds;
  if (!guilds || !guildKey || !guilds[guildKey]) return "";
  const guild = guilds[guildKey];
  const allKeys = Object.keys(guilds);

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

  if (step === "watching") {
    return `<div class="guild-reveal-overlay">
      <div class="guild-reveal-inner">
        <div class="guild-watching-text">The Realm has been watching you since you arrived.<br>Now, it has made its choice.</div>
      </div>
    </div>`;
  }

  if (step === "chosen") {
    const blurb = GUILD_BLURBS[guild.name.toLowerCase()] || "";
    return `<div class="guild-reveal-overlay">
      <div class="guild-color-flash" style="background:${guild.color}"></div>
      <div class="guild-reveal-inner">
        <div class="guild-chosen-eyebrow">YOU HAVE BEEN CHOSEN BY THE</div>
        <img class="guild-chosen-crest" src="${guild.crest}" alt="${guild.name}" width="170" height="170"
          style="--gc:${guild.color}"
          onerror="this.style.fontSize='80px';this.style.lineHeight='1'"/>
        <div class="guild-chosen-name" style="color:${guild.color}">${guild.name.toUpperCase()}</div>
        <div class="guild-chosen-motto">"${guild.motto}"</div>
        ${blurb ? `<div class="guild-chosen-blurb">${blurb}</div>` : ''}
        <button class="guild-continue-btn" id="guild-continue-btn"
          style="background:${guild.color};color:#fff;animation-delay:.9s">Continue Your Quest →</button>
      </div>
    </div>`;
  }
  return "";
}

function resetStudentFull(studentId) {
  const sid = String(studentId);
  // Firebase strips null and [] when writing, so we rely on _isReset:true as a
  // sentinel that getMergedStudent and getLandPos use to restore those defaults.
  const resetData = {
    _isReset: true,
    _resetVersion: Date.now(),
    currentLand: null, completedTiles: [], completedLand0: false,
    hp: 10, mp: 10, sp: 10, xp: 0, xpNext: 50, level: 1,
    taskProgress: {}, taskTimestamps: {},
    bosses: [], items: [], companions: [],
    title: null, activeCompanion: null,
    guild: null,
  };
  _overrides[sid] = { ...resetData, claimed: true };
  delete _activityLog[sid];
  set(ref(db, `students/${sid}`), { ...resetData, claimed: true }).catch(console.error);
  set(ref(db, `activityLog/${sid}`), null).catch(console.error);
  clearHelpFlag(studentId);
}
function getMergedStudent(base) {
  const ov = _overrides[String(base.id)] || {};
  const merged = Object.assign({}, STUDENT_DEFAULTS, ov);
  if (ov._isReset) {
    if (!('currentLand' in ov))      merged.currentLand      = null;
    if (!('guild' in ov))            merged.guild            = null;
    if (!('title' in ov))            merged.title            = null;
    if (!('activeCompanion' in ov))  merged.activeCompanion  = null;
    if (!('bosses' in ov))           merged.bosses           = [];
    if (!('items' in ov))            merged.items            = [];
    if (!('companions' in ov))       merged.companions       = [];
    if (!('completedTiles' in ov))   merged.completedTiles   = [];
  }
  merged.id      = base.id;
  merged.number  = base.id;
  merged.displayName = merged.characterName || `#${base.id}`;
  return merged;
}
function getCharName(student) {
  return (getMergedStudent(student).characterName) || student.displayName;
}
function getAllClaimedNames() {
  return new Set(Object.values(_overrides).map(ov => ov.characterName).filter(Boolean));
}
function randName()    { return NAMES[Math.floor(Math.random() * NAMES.length)]; }
function randEpithet() { return EPITHETS[Math.floor(Math.random() * EPITHETS.length)]; }
function uniqueFullName(namePart, epithetPart) {
  const claimed = getAllClaimedNames();
  let epithet = epithetPart;
  let tries = 0;
  while (claimed.has(`${namePart} ${epithet}`) && tries < 200) {
    epithet = randEpithet();
    tries++;
  }
  return { name: namePart, epithet };
}

function migrateCharacterNames() {
  if (!CLASS_DATA) return;
  const writes = {};
  for (const p of CLASS_DATA.periods) {
    for (const s of p.students) {
      const sid = String(s.id);
      const ov = _overrides[sid] || {};
      if (Object.keys(ov).length > 0 && !ov.characterName && s.displayName) {
        writes[`students/${sid}/characterName`] = s.displayName;
      }
    }
  }
  if (Object.keys(writes).length > 0) {
    update(ref(db), writes).catch(console.error);
  }
}
function getTaskProgress(studentId, tileId) {
  const ov = getOverrides().students[String(studentId)] || {};
  return (ov.taskProgress || {})[String(tileId)] || {};
}
function saveVideoOpened(studentId, tileId) {
  const ov = getOverrides();
  const st = ov.students[String(studentId)] || {};
  const tp = Object.assign({}, st.taskProgress || {});
  const td = Object.assign({}, tp[String(tileId)] || {});
  td.videoOpened = true;
  tp[String(tileId)] = td;
  saveStudentOverride(studentId, { taskProgress: tp });
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
function triggerLandTravel(student, fromLand) {
  const nextIdx = LANDS.findIndex(l => l.id === fromLand.id) + 1;
  if (nextIdx >= LANDS.length) {
    // Land 6 complete — realm end screen
    STATE.screen = "realm-complete";
    mount();
    return;
  }
  const nextLand = LANDS[nextIdx];
  const firstTileId = (nextLand.pathOrder || [])[0] || 1;
  saveStudentOverride(student.id, {
    currentLand: nextLand.id,
    currentTile: firstTileId,
    completedTiles: [],
  });
  STATE.travelDestName = nextLand.name;
  STATE.travelDestDesc = LAND_TRAVEL_COPY[nextLand.id] || "";
  STATE.screen = "land-travel";
  mount();
  // Title card visible 1.0–3.8s; map fades in at 4.8s
  setTimeout(() => { STATE.screen = "quest-map"; mount(); }, 4800);
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
  const startLevel = level;
  while (xp >= threshold) { xp -= threshold; level++; levelsGained++; }
  saveStudentOverride(student.id, { xp, level });
  // Unlock rank frames for each newly crossed level threshold
  if (levelsGained > 0) {
    for (let lvl = startLevel + 1; lvl <= level; lvl++) {
      unlockCosmeticsForLevel(student, lvl);
    }
  }
  return { levelsGained, newLevel: level };
}
function showXPCelebration(amount, levelsGained, newLevel, onComplete, message = null) {
  const el = document.createElement("div");
  el.className = "xp-celebrate";
  el.innerHTML = `<div class="xp-pop">
    ${message ? `<div class="xp-pop-msg">${message}</div>` : ""}
    <div class="xp-pop-amount">+${amount} XP!</div>
    ${levelsGained > 0
      ? `<div class="xp-pop-levelup">⬆️ Level Up!</div><div class="xp-pop-newlvl">Level ${newLevel}</div>`
      : ""}
  </div>`;
  document.body.appendChild(el);
  const dismiss = () => {
    el.classList.add("xp-celebrate-out");
    setTimeout(() => { el.remove(); if (onComplete) onComplete(); }, 380);
  };
  setTimeout(dismiss, levelsGained > 0 ? 1800 : 1200);
}
/* ─── GOLD HELPERS ─── */
function getGold(student) {
  return (_overrides[String(student.id)] || {}).gold || 0;
}
function awardGold(student, amount) {
  const current = getGold(student);
  saveStudentOverride(student.id, { gold: current + amount });
}
function spendGold(student, amount) {
  const current = getGold(student);
  saveStudentOverride(student.id, { gold: Math.max(0, current - amount) });
}
function showGoldToast(amount, onComplete) {
  const el = document.createElement("div");
  el.className = "gold-toast";
  el.innerHTML = `<div class="gold-pop">🪙 +${amount} Gold!</div>`;
  document.body.appendChild(el);
  const dismiss = () => {
    el.classList.add("gold-toast-out");
    setTimeout(() => { el.remove(); if (onComplete) onComplete(); }, 380);
  };
  setTimeout(dismiss, 1000);
}
/* ─── SHOP PENDING REDEMPTIONS ─── */
function getShopPending() { return Object.assign({}, _shopPending); }
function addShopPending(student, item) {
  const key = `${String(student.id)}_${Date.now()}`;
  const entry = { studentId: String(student.id), studentName: getCharName(student), itemId: item.id, itemName: item.label, cost: item.cost, timestamp: new Date().toISOString() };
  _shopPending[key] = entry;
  set(ref(db, `shopPending/${key}`), entry).catch(console.error);
}
function clearShopPending(key) {
  delete _shopPending[key];
  set(ref(db, `shopPending/${key}`), null).catch(console.error);
}
function getShopItemEnabled(itemId) {
  return (_settings.shopItems || {})[itemId] !== false;
}
function setShopItemEnabled(itemId, enabled) {
  if (!_settings.shopItems) _settings.shopItems = {};
  _settings.shopItems[itemId] = enabled;
  set(ref(db, `settings/shopItems/${itemId}`), enabled).catch(console.error);
}
/* ─── COSMETICS HELPERS ─── */
function getEquippedFrame(student) {
  return (_overrides[String(student.id)] || {}).equippedFrame || null;
}
function getEquippedAvatarOverride(student) {
  return (_overrides[String(student.id)] || {}).equippedAvatarOverride || null;
}
function getUnlockedCosmetics(student) {
  return (_overrides[String(student.id)] || {}).unlockedCosmetics || [];
}
function unlockCosmetic(student, cosmeticId) {
  const owned = getUnlockedCosmetics(student);
  if (!owned.includes(cosmeticId)) {
    saveStudentOverride(student.id, { unlockedCosmetics: [...owned, cosmeticId] });
  }
}
function isCosmeticUnlocked(student, cosmetic) {
  const ov = _overrides[String(student.id)] || {};
  // Teacher-granted always wins regardless of normal unlock condition
  if ((ov.unlockedCosmetics || []).includes(cosmetic.id)) return true;
  const s = getMergedStudent(student);
  const pos = getLandPos(student);
  const today = new Date().toISOString().slice(0, 10);
  switch (cosmetic.unlockType) {
    case 'land_complete':
      return pos.land > cosmetic.unlockValue;
    case 'level':
      return s.level >= cosmetic.unlockValue;
    case 'boss_defeat':
      return (s.bosses || []).includes(cosmetic.unlockValue);
    case 'seasonal_window':
      return today >= cosmetic.unlockValue.start && today <= cosmetic.unlockValue.end;
    case 'guild':
      return (ov.guild || null) === cosmetic.unlockValue;
    case 'shop':
    case 'drop':
      return (ov.unlockedCosmetics || []).includes(cosmetic.id);
    default: return false;
  }
}
function unlockCosmeticsForBoss(student, bossName) {
  [...COSMETICS_MANIFEST, ...COSMETIC_AVATARS]
    .filter(c => c.unlockType === 'boss_defeat' && c.unlockValue === bossName)
    .forEach(c => unlockCosmetic(student, c.id));
}
function unlockCosmeticsForGuild(studentId, guildKey) {
  const student = { id: studentId };
  COSMETICS_MANIFEST
    .filter(c => c.unlockType === 'guild' && c.unlockValue === guildKey)
    .forEach(c => unlockCosmetic(student, c.id));
}
function unlockCosmeticsForLevel(student, newLevel) {
  COSMETICS_MANIFEST
    .filter(c => c.unlockType === 'level' && c.unlockValue === newLevel)
    .forEach(c => unlockCosmetic(student, c.id));
}
function unlockCosmeticsForLandComplete(student, landId) {
  COSMETICS_MANIFEST
    .filter(c => c.unlockType === 'land_complete' && c.unlockValue === landId)
    .forEach(c => unlockCosmetic(student, c.id));
}
function equipFrame(student, frameId) {
  saveStudentOverride(student.id, { equippedFrame: frameId });
}
function unequipFrame(student) {
  saveStudentOverride(student.id, { equippedFrame: null });
}
function equipAvatarOverride(student, avatarId) {
  saveStudentOverride(student.id, { equippedAvatarOverride: avatarId });
}
function unequipAvatarOverride(student) {
  saveStudentOverride(student.id, { equippedAvatarOverride: null });
}

function renderShopModal(student) {
  const gold = getGold(student);
  const confirmItem = STATE.shopConfirmItem ? SHOP_ITEMS.find(i => i.id === STATE.shopConfirmItem) : null;
  const enabledItems = SHOP_ITEMS.filter(i => getShopItemEnabled(i.id));
  return `<div class="shop-overlay" id="shop-overlay">
    <div class="shop-modal">
      <div class="shop-hdr">
        <span class="shop-title">🏪 Item Shop</span>
        <span class="shop-gold-bal">🪙 ${gold} Gold</span>
        <button class="shop-close" id="shop-close">✕</button>
      </div>
      ${STATE.shopSuccess ? `<div class="shop-success">✅ Your teacher has been notified!</div>` : ''}
      ${confirmItem ? `<div class="shop-confirm">
        <div class="shop-confirm-q">Purchase ${confirmItem.emoji} ${confirmItem.label}?</div>
        <div class="shop-confirm-cost">This will cost 🪙 ${confirmItem.cost} Gold</div>
        <div class="shop-confirm-btns">
          <button class="shop-confirm-yes" id="shop-confirm-yes" data-confirm-id="${confirmItem.id}">Yes, Buy It!</button>
          <button class="shop-confirm-no" id="shop-confirm-no">Cancel</button>
        </div>
      </div>` : ''}
      <div class="shop-items">
        ${enabledItems.map(item => {
          const canAfford = gold >= item.cost;
          return `<div class="shop-item">
            <span class="shop-item-icon">${item.emoji}</span>
            <div class="shop-item-info">
              <div class="shop-item-name">${item.label}</div>
              <div class="shop-item-desc">${item.desc}</div>
              <div class="shop-item-cost">🪙 ${item.cost} Gold</div>
            </div>
            <button class="shop-buy-btn${!canAfford ? ' not-enough' : ''}" data-shop-item="${item.id}" ${!canAfford ? 'disabled' : ''}>
              ${canAfford ? 'Buy' : 'Not enough\nGold'}
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
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
function showEquipReveal(def, onComplete) {
  const el = document.createElement("div");
  el.className = "equip-reveal-overlay";
  el.innerHTML = `
    <div class="equip-reveal-card" style="--tier-color:${def.tierColor}">
      <div class="equip-reveal-label">⚔️ Equipment Found!</div>
      <div class="equip-reveal-img-wrap">
        <img src="${def.img}" alt="${def.n}" width="80" height="80" onerror="this.style.display='none'"/>
      </div>
      <div class="equip-reveal-name">${def.n}</div>
      <div class="equip-reveal-tier">${def.tier.charAt(0).toUpperCase()+def.tier.slice(1)}</div>
      <button class="equip-reveal-btn">Awesome!</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector(".equip-reveal-btn").addEventListener("click", () => {
    el.remove();
    if (onComplete) onComplete();
  });
}
function showSpecialBadgeReveal(badge) {
  const el = document.createElement("div");
  el.className = "equip-reveal-overlay";
  el.innerHTML = `
    <div class="equip-reveal-card" style="--tier-color:#F59E0B">
      <div class="equip-reveal-label">🏅 Special Badge Unlocked!</div>
      <div class="equip-reveal-img-wrap" style="border-color:#F59E0B">
        <span style="font-size:52px;line-height:1">${badge.emoji}</span>
      </div>
      <div class="equip-reveal-name" style="color:#F59E0B">${badge.name}</div>
      <div class="equip-reveal-tier" style="color:#9CA3AF;font-size:11px;font-weight:600;text-transform:none;letter-spacing:0">${badge.desc}</div>
      <button class="equip-reveal-btn">Awesome!</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector(".equip-reveal-btn").addEventListener("click", () => el.remove());
}
function formatFlagTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return diff + " min ago";
  return new Date(iso).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}

/* ─── MYSTERY DROP ─── */
function tryMysteryDrop(student, eventType, onComplete) {
  const rate = MYSTERY_DROP_RATES[eventType] ?? 0.02;
  if (Math.random() >= rate) return false;
  const owned = new Set(getUnlockedCosmetics(student));
  const eligible = MYSTERY_POOL.filter(item => !owned.has(item.id));
  if (!eligible.length) return false; // pool exhausted — caller falls through to normal tier
  const item = randFrom(eligible);
  unlockCosmetic(student, item.id);
  logActivity(student.id, '✨', `Mystery Drop! Unlocked: ${item.displayName}`);
  showMysteryReveal(item, onComplete);
  return true;
}
function showMysteryReveal(item, onComplete) {
  const isAvatar = item.type === 'avatar';
  const el = document.createElement('div');
  el.className = 'mystery-reveal-overlay';
  el.innerHTML = `
    <div class="mystery-reveal-card">
      <div class="mystery-stars">✦ ✧ ✦ ✧ ✦</div>
      <div class="mystery-reveal-eyebrow">${isAvatar ? '✨ Mystery Arrival' : '⭐ Legendary Frame'}</div>
      <div class="mystery-reveal-img-wrap">
        <img src="${item.assetPath}" alt="${item.displayName}" width="120" height="120"
          onerror="this.style.opacity='.2'"/>
        <div class="mystery-reveal-glow"></div>
      </div>
      <div class="mystery-reveal-name">${item.displayName}</div>
      ${item.flavorText ? `<div class="mystery-reveal-flavor">"${item.flavorText}"</div>` : ''}
      <div class="mystery-reveal-sub">Added to your Cosmetics tab</div>
      <button class="mystery-reveal-btn">Claim It!</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('.mystery-reveal-btn').addEventListener('click', () => {
    el.classList.add('mystery-reveal-out');
    setTimeout(() => { el.remove(); if (onComplete) onComplete(); }, 350);
  });
}

/* ─── TITLE OPTIONS ─── */
const TITLE_OPTIONS = [
  "Apprentice Scholar","Keeper of Scrolls","Word Mender","Champion of Clarity",
  "Swift Reader","Lore Seeker","Story Weaver","Quest Scribe",
  "Seeker of Tales","Ink and Iron","Verse Walker","Archive Knight",
];

/* ─── STATE ─── */
let STATE = { screen:"loading", student:null, currentPeriod:null, pin:"", pinError:"", studentNumEntry:"", helpFlagged:false, helpModalOpen:false,
              gradeModalOpen:false, gradeModalLessonId:null,
              teacherPeriodIdx:0, teacherStudent:null, teacherEdit:null, boardLand:1,
              lessonTile:null, lessonLand:null, teacherTile:null, teacherTileLand:null,
              bossTile:null, bossLand:null, arrivalTile:null, arrivalLand:null,
              avStep:0, avGender:null, avClass:null, avVariant:null, avTone:null,
              customizeOpen:false, pendingTitle:null, pendingCompanion:undefined, custTab:"avatar",
              companionPickerOpen:false, companionPickerStudentId:null,
              studentCompanionOpen:false,
              equipPickerOpen:false, equipPickerStudentId:null,
              tgDialogueOpen:false, tgContinueReady:false,
              bossLockedOpen:false,
              weaponPickerOpen:false, shieldPickerOpen:false, collectiblesOpen:false, collectiblesTab:'collectibles', cosmTab:'frames',
              mpBulkOpen:false, mpBulkSort:'asc', mpBulkPeriod:'all',
              sideQuestModalOpen:false, sideQuestTileId:null, sideQuestSoloIdx:0, sideQuestCollabIdx:0,
              pendingSQAfterGrade:null, sqBoardOpen:false, sqBoardLandId:null,
              sqPartnerPickOpen:false, sqPartnerPickKey:null, sqPartnerPickIdx:0, sqPartnerPickType:null, sqPartnerPickTile:null, sqPartnerPickLand:null, sqPartnerPickSelected:null,
              shopOpen:false, shopConfirmItem:null, shopSuccess:false,
              teacherGoldShopOpen:false,
              bossRosterPeriodIdx:0, bossRosterKey:null, bossRosterMarks:{},
              judgmentHallMarks:{}, jhExcellenceAwarded:{},
              sqInviteNotifOpen:false,
              questJournalTab:'active',
              craftingOpen:false, craftingStep:1, craftingSelected:null,
              lessonOpenedAt:null,
              npcOpen:false, currentNpcKey:null,
              sg0Open:false, sg0Tile:null,
              sg0GuildReveal:null,
              catchUpModalOpen:false, gradeFromCatchUp:false,
              teacherResetConfirm:false,
              scribeIntroOpen: false, bossIntroOpen: false,
              writingHoldIdx: 0, bossHoldIdx: 0,
              writingTransportDir: 'in',
              sanctumReturnOpen: false, sanctumReturnLandId: null,
              sanctumLand: null, sanctumTileOpen: null, writingEventReturnTo: 'quest-map',
              travelDestDesc: null, classSettingsOpen: false, cardMenuSid: null, capMessageOpen: false,
              teacherViewStudent: null, genName: null, genEpithet: null,
              namingOptions: null, epithetOptions: null, _namingReturnScreen: null};

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
      <img src="/swords.png" alt="⚔️" class="logo-icon" style="width:90px;height:90px;object-fit:contain;display:block;margin:0 auto 16px"/>
      <h1 class="logo-title">The Realm of ELA</h1>
      <p class="logo-sub">Where Stories Come to Life</p>
      <p class="logo-school-sub">A 5th grade English Language Arts learning platform</p>
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
      <p class="login-page-footer">Built and operated by Amber Odom, 5th Grade ELA, Lake Charles Charter Academy. This site stores no student-identifying information.<br><a href="/about.html" class="login-page-footer-link">About</a> · <a href="/privacy.html" class="login-page-footer-link">Privacy</a></p>
    </div>
  </div>`;
}

function renderGrid() {
  const p = STATE.currentPeriod;
  const tiles = p.students.map((s, i) => {
    const m    = getMergedStudent(s);
    const cls  = clsKey(s, m);
    const av   = m.avatar || "avatar_blankchibi.png";
    const charName = m.characterName;
    const spaceIdx = charName ? charName.indexOf(' ') : -1;
    const firstName = charName ? (spaceIdx > -1 ? charName.slice(0, spaceIdx) : charName) : '';
    const epithet   = charName && spaceIdx > -1 ? charName.slice(spaceIdx + 1) : '';
    return `
    <button class="student-tile enter" style="animation-delay:${i*0.05}s" data-id="${s.id}">
      <div class="avatar-ring" style="border-color:${CLS_COLOR[cls]};padding:0">
        <img src="/avatars/${av}" alt="${s.id}" width="130" height="130" loading="lazy"/>
      </div>
      <div class="tile-name-block">
        <div class="tile-num">${s.id}</div>
        <div class="tile-name">${firstName}</div>
        ${epithet ? `<div class="tile-epithet">${epithet}</div>` : ''}
      </div>
      <div class="tile-cls" style="color:${CLS_COLOR[cls]}">Lv.${m.level} ${CLS_LABEL[cls]}</div>
      <span class="tile-lvl" style="background:${CLS_COLOR[cls]}">⭐ ${m.level}</span>
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
        <div class="avatar-ring-lg" style="overflow:hidden;padding:0"><img src="/avatars/${getMergedStudent(s).avatar||'avatar_blankchibi.png'}" style="width:122px;height:122px;object-fit:cover;border-radius:50%;display:block" alt="${getCharName(s)}" width="122" height="122" loading="lazy"/></div>
        <div class="pin-name">${getCharName(s)}</div>
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
  { key:"elf",     icon:"🧝", label:"Elf"     },
  { key:"wizard",  icon:"🔮", label:"Wizard"  },
];
const AV_TONES = [
  { key:"light",  hex:"#FDDBB4", label:"Light"  },
  { key:"tan",    hex:"#D4956A", label:"Tan"    },
  { key:"medium", hex:"#8D5524", label:"Medium" },
  { key:"dark",   hex:"#3D1C02", label:"Dark"   },
];
const AV_GENDERS = [
  { key:"female", icon:"🌸", label:"Female" },
  { key:"male",   icon:"🛡️", label:"Male"   },
];
function buildAvatarFile(gender, char, variant, tone) {
  return `avatar_${char}_${variant}_${tone}_${gender}.png`;
}

function renderCatchUpModal() {
  if (!STATE.catchUpModalOpen) return '';
  const reminders = getGradeReminders(STATE.student.id);
  const keys = Object.keys(reminders).sort((a, b) => Number(a) - Number(b));
  if (!keys.length) {
    return `<div class="grade-modal-overlay" id="catchup-modal-overlay">
      <div class="grade-modal" style="max-width:460px">
        <div class="grade-modal-title">✅ All caught up!</div>
        <p class="grade-modal-sub">All your grades have been logged. Your stats are up to date.</p>
        <div class="grade-modal-btns">
          <button class="btn btn-purple" id="catchup-close">Close</button>
        </div>
      </div>
    </div>`;
  }
  const rows = keys.map(k => {
    const id = Number(k);
    const found = findTileById(id);
    const label = found ? found.tile.name : `Lesson ${id}`;
    const title = found && found.tile.sessionTitle ? found.tile.sessionTitle : label;
    return `<div class="catchup-row">
      <div class="catchup-row-info">
        <span class="catchup-session-label">${label}</span>
        <span class="catchup-lesson-name">${title !== label ? title : ''}</span>
      </div>
      <button class="btn btn-purple btn-sm catchup-log-btn" data-lesson-id="${id}">Log Grade</button>
    </div>`;
  }).join('');
  return `<div class="grade-modal-overlay" id="catchup-modal-overlay">
    <div class="grade-modal" style="max-width:460px;display:flex;flex-direction:column;max-height:80vh">
      <div class="grade-modal-title">⚠️ Unlogged Grades</div>
      <p class="grade-modal-sub">You have grades that haven't been logged yet. Log them below to keep your stats current.</p>
      <div class="catchup-list">${rows}</div>
      <div class="grade-modal-btns" style="margin-top:16px">
        <button class="btn btn-outline-sm" id="catchup-close">Close</button>
      </div>
    </div>
  </div>`;
}

function renderCharName() {
  const name = STATE.generatedName || "";
  return `
  <div class="screen screen-center">
    ${starsHTML()}
    <div class="login-card enter" style="max-width:480px">
      <img src="/swords.png" alt="⚔️" style="width:72px;height:72px;object-fit:contain;display:block;margin:0 auto 16px"/>
      <h2 class="logo-title" style="font-size:clamp(1.4rem,5vw,2rem)">Your Character Name</h2>
      <p class="logo-sub" style="font-size:0.92rem;margin-bottom:1.5rem">The Realm has chosen a name for you.<br>Reroll until you find one you love — then claim it forever.</p>
      <div class="char-name-generated" id="char-name-display">${name}</div>
      <div class="char-name-actions">
        <button class="btn btn-outline-sm" id="char-name-reroll">🎲 Reroll</button>
        <button class="btn btn-purple btn-lg" id="char-name-claim" ${!name ? "disabled" : ""}>
          <span>Claim This Name</span><span class="btn-arrow">→</span>
        </button>
      </div>
    </div>
  </div>`;
}

function renderNaming() {
  // Initialize option pools once per login session so they don't reshuffle on every mount()
  if (!STATE.namingOptions) {
    const sn = NAMES.slice().sort(() => Math.random() - 0.5);
    STATE.namingOptions = sn.slice(0, 6);
  }
  if (!STATE.epithetOptions) {
    const se = EPITHETS.slice().sort(() => Math.random() - 0.5);
    STATE.epithetOptions = se.slice(0, 6);
  }

  const selName    = STATE.genName    || null;
  const selEpithet = STATE.genEpithet;          // null = untouched, "" = skip, string = chosen
  const epithetChosen = selEpithet != null;     // user has interacted with the epithet section

  const previewText = selName
    ? (selEpithet ? `${selName} ${selEpithet}` : selName)
    : null;

  const nameGrid = STATE.namingOptions.map(n => `
    <button class="nm-pill${selName === n ? ' nm-pill-sel' : ''}" data-pick-name="${n}">${n}</button>
  `).join('');

  const epithetGrid = STATE.epithetOptions.map(e => `
    <button class="nm-pill nm-epithet-pill${selEpithet === e ? ' nm-pill-sel' : ''}" data-pick-epithet="${e}">${e}</button>
  `).join('') + `<button class="nm-pill nm-skip-pill${selEpithet === '' ? ' nm-pill-sel' : ''}" data-pick-skip>— Skip —</button>`;

  return `
  <div class="screen naming-screen">
    ${starsHTML()}
    <div class="nm-wrap">
      <div class="nm-modal enter">

        <div class="nm-header">
          <div class="nm-title">⚔️ Choose Your Name</div>
          <p class="nm-sub">This is who you will be in the Realm of ELA. Choose wisely.</p>
        </div>

        <div class="nm-preview${selName ? ' nm-preview-active' : ''}">
          <span class="nm-preview-lbl">YOUR NAME</span>
          <span class="nm-preview-val">${previewText || '—'}</span>
        </div>

        <div class="nm-section">
          <div class="nm-section-hdr">First Name <span class="nm-req">*</span></div>
          <div class="nm-grid">${nameGrid}</div>
          <button class="nm-reroll-btn" id="nm-reroll-name">🔄 New Names</button>
        </div>

        <div class="nm-section">
          <div class="nm-section-hdr">Epithet <span class="nm-opt">optional</span></div>
          <div class="nm-grid nm-epithet-grid">${epithetGrid}</div>
          <button class="nm-reroll-btn" id="nm-reroll-epithet">🔄 New Epithets</button>
        </div>

        <button class="nm-confirm-btn" id="nm-confirm" ${!selName ? 'disabled' : ''}>
          ${selName ? '⚔️ Enter the Realm' : 'Choose a first name to continue'}
        </button>

      </div>
    </div>
  </div>`;
}

function renderHub() {
  const s = getMergedStudent(STATE.student);

  // Init picker from saved data on first visit
  if (STATE.avClass === null) {
    const rawClass = s.avatarClass || s.character || "warrior";
    STATE.avGender  = s.avatarGender || "female";
    STATE.avClass   = rawClass === "fairy" ? "elf" : rawClass;
    STATE.avVariant = s.avatarStyle  || s.variant  || "01";
    STATE.avTone    = s.avatarSkinTone || s.skinTone || "light";
  }
  const avStep    = STATE.avStep;
  const avGender  = STATE.avGender || "female";
  const avClass   = STATE.avClass  || "warrior";
  const avVariant = STATE.avVariant || "01";
  const avTone    = STATE.avTone   || "light";

  // Live preview uses in-progress picker state
  const previewFile = buildAvatarFile(avGender, avClass, avVariant, avTone);
  // Resolve saved avatar — new fields take priority over legacy fields
  const savedClass  = (() => { const r = s.avatarClass || s.character || ""; return r === "fairy" ? "elf" : r; })();
  const savedStyle  = s.avatarStyle  || s.variant  || "";
  const savedTone   = s.avatarSkinTone || s.skinTone || "";
  const savedGender = s.avatarGender || "female";
  const savedHasNewFormat = savedClass && savedStyle && savedTone;
  const avatarFile = s.avatar || "avatar_blankchibi.png";
  const avatarUrl  = `/avatars/${savedHasNewFormat ? buildAvatarFile(savedGender, savedClass, savedStyle, savedTone) : avatarFile}`;
  // Cosmetics overrides (independent of picker state)
  const equippedFrameId         = getEquippedFrame(STATE.student);
  const equippedAvatarOverrideId = getEquippedAvatarOverride(STATE.student);
  const displayAvatarUrl = equippedAvatarOverrideId
    ? (COSMETIC_AVATARS.find(a => a.id === equippedAvatarOverrideId) ||
       MYSTERY_POOL.find(p => p.id === equippedAvatarOverrideId && p.type === 'avatar') ||
       {}).assetPath || avatarUrl
    : avatarUrl;
  const xpPct = Math.round((s.xp / s.xpNext) * 100);

  // Step breadcrumb
  const stepLabels = ["Gender","Class","Style","Skin Tone"];
  const stepsHTML = stepLabels.map((lbl, i) => {
    const n = i + 1;
    const cls = n < avStep ? "av-step-done" : n === avStep ? "av-step-cur" : "";
    return `${i>0?'<span class="av-step-sep">›</span>':''}<span class="av-step-label ${cls}">${n}. ${lbl}</span>`;
  }).join("");

  // Live preview block — fallback chain: new {class}_{style}_{tone}_{gender} → old no-gender → legacy no-tone
  const previewHTML = `
    <div class="av-live-preview">
      <img class="av-live-img" src="/avatars/${previewFile}"
        onerror="this.src='/avatars/avatar_${avClass}_${avVariant}_${avTone}.png';this.onerror=function(){this.src='/avatars/avatar_${avClass}_${avVariant}.png';this.onerror=null;}"
        alt="Preview" width="168" height="168"/>
      <span class="av-live-label">Preview</span>
    </div>`;

  // Step 1 — Gender
  const step1Body = `
    <div class="av-gender-grid">
      ${AV_GENDERS.map(g => `
        <button class="av-gender-card${avGender===g.key?" av-sel":""}" data-avgender="${g.key}">
          <span class="av-gender-icon">${g.icon}</span>
          <span class="av-class-name">${g.label}</span>
        </button>`).join("")}
    </div>`;

  // Step 2 — Class
  const step2Body = `
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

  // Step 3 — Style (2 variants per gender+class combination)
  const step3Body = `
    <div class="av-variant-grid">
      ${["01","02"].map(v => `
        <button class="av-variant-btn${avVariant===v?" av-sel":""}" data-avvariant="${v}">
          <img src="/avatars/avatar_${avClass}_${v}_light_${avGender}.png"
            onerror="this.src='/avatars/avatar_${avClass}_${v}_light.png';this.onerror=function(){this.src='/avatars/avatar_${avClass}_${v}.png';this.onerror=null;}"
            alt="Style ${parseInt(v)}" width="100" height="100" loading="lazy"/>
          <span>Style ${parseInt(v)}</span>
        </button>`).join("")}
    </div>`;

  // Step 4 — Skin Tone
  const step4Body = `
    <div class="av-tone-row">
      ${AV_TONES.map(t => `
        <button class="av-tone-btn${avTone===t.key?" av-sel":""}" data-avtone="${t.key}">
          <div class="av-tone-dot" style="background:${t.hex}"></div>
          <span>${t.label}</span>
        </button>`).join("")}
    </div>`;

  const stepBody = avStep===1 ? step1Body : avStep===2 ? step2Body : avStep===3 ? step3Body : step4Body;

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

  const needsName = !s.characterName;
  const nameRowHTML = needsName ? `
    <div class="av-name-row">
      <div class="av-name-part">
        <span class="av-name-val">${STATE.genName || ""}</span>
        <button class="av-name-reroll-btn" id="reroll-name" title="Reroll name">↺</button>
      </div>
      <span class="av-name-sep">+</span>
      <div class="av-name-part">
        <span class="av-name-val">${STATE.genEpithet || ""}</span>
        <button class="av-name-reroll-btn" id="reroll-epithet" title="Reroll epithet">↺</button>
      </div>
    </div>` : "";

  const custHTML = STATE.customizeOpen ? `
    <div class="cust-overlay">
      <div class="cust-modal">
        <div class="cust-header">
          <span class="cust-header-title">${needsName ? "⚔️ Create Your Character" : "✨ Customize Character"}</span>
          ${needsName ? "" : `<button class="av-close-btn" id="cust-close">✕</button>`}
        </div>
        ${needsName ? "" : `<div class="cust-tabs">
          <button class="cust-tab${custTab==="avatar"?" active":""}" data-custtab="avatar">🎭 Avatar</button>
          <button class="cust-tab${custTab==="title"?" active":""}" data-custtab="title">👑 Title</button>
        </div>`}
        <div class="cust-body">
          ${!needsName && custTab==="title" ? `
          <div class="cust-section">
            <div class="cust-section-hdr">👑 Choose Title</div>
            <div class="title-grid">
              ${titleOptions.map(t => `
                <button class="title-card${activeTitle===t?" cust-active":""}" data-title="${t}">${t}</button>`).join("")}
            </div>
          </div>` : `
          <div class="cust-section">
            ${needsName ? `<div class="cust-section-hdr" style="margin-bottom:6px">✨ Your Character Name</div>${nameRowHTML}` : `<div class="cust-section-hdr">🎭 Choose Avatar</div>`}
            <div class="av-modal-nav">
              <div>${avStep > 1 ? `<button class="av-nav-btn" id="av-back-${avStep}">← Back</button>` : ""}</div>
              <div class="av-steps">${stepsHTML}</div>
              <div></div>
            </div>
            ${previewHTML}
            ${stepBody}
          </div>`}
        </div>
        <div class="cust-footer">
          <button class="cust-save-btn" id="cust-save" ${needsName && !STATE.genName ? "disabled" : ""}>
            ${needsName ? "⚔️ Enter the Realm" : "✓ Save Changes"}
          </button>
        </div>
      </div>
    </div>` : "";

  const pacingActive = (() => {
    const p = getPacingSettings();
    if (!p) return false;
    const ov = _overrides[String(STATE.student.id)] || {};
    if (ov.spOverrideAt && (Date.now() - new Date(ov.spOverrideAt).getTime()) < 24*60*60*1000) return false;
    return calcPacedSP(STATE.student) !== null;
  })();
  const stats = [
    ["hp", "HP", "#EF4444", "#FEE2E2"],
    ["mp", "MP", "#3B82F6", "#DBEAFE"],
    ["sp", "SP", "#10B981", "#D1FAE5"],
  ].map(([k,label,color,bg]) => {
    const val = k === 'sp' ? getEffectiveSP(STATE.student) : s[k];
    const isPaced = k === 'sp' && pacingActive;
    return `<div class="stat-row">
      <span class="stat-lbl">${label}</span>
      <div class="stat-track" style="background:${bg}">
        <div class="stat-fill" style="background:${color}" data-w="${(val/10*100).toFixed(0)}"></div>
        ${isPaced ? '<span class="sp-auto-badge" style="position:absolute;right:6px;top:50%;transform:translateY(-50%)">auto</span>' : ''}
      </div>
      <span class="stat-val">${val}/10</span>
    </div>`;
  }).join("");

  const craftReqs = getCraftRequests();
  const hasPendingPotion = !!craftReqs[String(s.id)];
  const equipped = getEquipped(STATE.student);
  const equippedSlots = getEquippedSlots(STATE.student);
  const equipInventory = getEquipInventory(STATE.student);
  const legacySlots = s.items.map((it, idx) => {
    const def = ITEMS[it] || { i:"❓", n: it };
    const usable = ['health_potion', 'behavior_potion', 'stamina_potion', 'gold_pouch'].includes(it);
    const equippable = EQUIPPABLE.has(it);
    const isEquipped = equippable && !!equipped[it];
    const imgTag = def.img
      ? `<img class="item-img" src="/icons/${def.img}" alt="${def.n}" width="64" height="64" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='block'"/><span style="display:none;font-size:22px">${def.i}</span>`
      : `<span style="font-size:28px">${def.i}</span>`;
    return `<div class="item-slot${usable?' item-usable':''}${isEquipped?' item-equipped':''}" title="${def.n}"
      ${usable  ? `data-use-item="${it}" data-item-idx="${idx}"` : ''}
      ${equippable ? `data-equip-item="${it}"` : ''}>
      ${imgTag}
      <span class="item-name">${def.n}</span>
      ${usable     ? `<span class="item-use-lbl">Tap to Use</span>` : ''}
      ${equippable ? `<span class="item-equip-lbl">${isEquipped ? '✓ Equipped' : 'Equip'}</span>` : ''}
    </div>`;
  });
  const totalSlots = Math.max(8, legacySlots.length);
  const emptyCount = totalSlots - legacySlots.length;
  const invSlots = [
    ...legacySlots,
    ...Array(emptyCount).fill(`<div class="item-slot empty"></div>`)
  ].join("");

  const ownedWeapons      = equipInventory.filter(id => getEquipItemDef(id).type === 'weapon');
  const ownedShields      = equipInventory.filter(id => getEquipItemDef(id).type === 'shield');
  const ownedCollectibles = equipInventory.filter(id => getEquipItemDef(id).type === 'accessory');
  const ownedSeasonalBadges = getSeasonalBadges(STATE.student);
  const ownedSpecialBadges  = getSpecialBadges(STATE.student);
  const activeSeasonForHub  = getActiveSeasonalSet();
  const weaponEquippedId  = equippedSlots['weapon'];
  const shieldEquippedId  = equippedSlots['shield'];

  function _equipPickerSlot(equippedId, label, phIcon, ownedItems, openAttr, ghostImg) {
    if (equippedId) {
      const def = getEquipItemDef(equippedId);
      return `<div class="equip-slot equip-slot-on equip-slot-new equip-slot-equipped" style="--tier-color:${def.tierColor}" ${openAttr}>
        <img src="${def.img}" alt="${def.n}" class="equip-slot-main-img" onerror="this.style.display='none';this.nextSibling.style.display='block'"/>
        <span style="display:none;font-size:48px;line-height:1">${def.icon}</span>
        <span class="equip-slot-sub">✓ Equipped</span>
      </div>`;
    }
    return `<div class="equip-slot${ownedItems.length ? ' equip-slot-off' : ' equip-slot-empty'}" ${openAttr}>
      <div class="equip-slot-img">
        ${ghostImg ? `<img src="${ghostImg}" class="equip-slot-ghost" alt="" aria-hidden="true"/>` : ''}
      </div>
      ${ownedItems.length ? `<span class="equip-slot-owned-badge">${ownedItems.length}</span>` : ''}
    </div>`;
  }

  const equipSlotsHTML = [
    _equipPickerSlot(weaponEquippedId, 'Weapon', '⚔️', ownedWeapons, 'data-open-weapon-picker', '/equipment/weapon_valeblade_common.png'),
    _equipPickerSlot(shieldEquippedId, 'Shield', '🛡️', ownedShields, 'data-open-shield-picker', '/equipment/shield_valeguard_common.png'),
    `<div class="equip-slot equip-slot-collectibles${ownedCollectibles.length ? '' : ' equip-slot-empty'}" data-open-collectibles>
      <div class="equip-slot-img">
        <img src="/equipment/accessory_bag.png" alt="Collectibles" style="object-fit:contain" onerror="this.style.display='none'"/>
      </div>
      ${ownedCollectibles.length ? `<span class="equip-slot-owned-badge">${ownedCollectibles.length}</span>` : ''}
    </div>`
  ].join('');

  const _trophyOv = _overrides[String(s.id)] || {};
  const _stdBossState = _trophyOv.standardBossState || {};
  const _bossStatusMap = _trophyOv.bossStatus || {};
  const HUB_TROPHY_BOSSES = [
    { key:'duskmantle', name:'Duskmantle',   std:'RL.5.1', img:'/trophies/trophy_duskmantle.jpeg', type:'std' },
    { key:'keystone',   name:'The Keystone', std:'RI.5.2', img:'/trophies/trophy_keystone.jpeg',   type:'std' },
    { key:'mirrorkin',  name:'Mirrorkin',    std:'RL.5.3', img:'/trophies/trophy_mirrorkin.jpeg',  type:'std' },
    { key:'seraphine',  name:'Seraphine',    std:'RL.5.2', img:'/trophies/trophy_seraphine.jpeg',  type:'std' },
    { key:'1_27',       name:'The Warden',   std:'',       img:'/trophies/trophy_warden.jpeg',     type:'dungeon' },
  ];
  const trophyGridHTML = `<div class="trophy-grid">${
    HUB_TROPHY_BOSSES.map(b => {
      const earned = b.type === 'std'
        ? (_stdBossState[b.key] || {}).status === 'defeated'
        : _bossStatusMap[b.key] === 'confirmed';
      return `<div class="trophy-cell ${earned ? 'trophy-earned' : 'trophy-locked'}">
        <div class="trophy-img-wrap">
          <img src="${b.img}" class="trophy-img" alt="${b.name}" onerror="this.style.display='none'"/>
          ${earned ? '' : '<div class="trophy-lock">🔒</div>'}
        </div>
        <div class="trophy-name">${b.name}</div>
        ${earned && b.std ? `<div class="trophy-std-tag">${b.std}</div>` : ''}
      </div>`;
    }).join('')
  }</div>`;

  const actEntries = getActivityLog(STATE.student.id);
  const actFeedHTML = actEntries.length
    ? actEntries.map(e => {
        const d = new Date(e.ts);
        const timeStr = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const dateStr = d.toLocaleDateString([], {month:'short', day:'numeric'});
        return `<div class="act-entry">
          <span class="act-icon">${e.icon}</span>
          <span class="act-msg">${e.message}</span>
          <span class="act-time">${dateStr} ${timeStr}</span>
        </div>`;
      }).join('')
    : `<p class="act-empty">No activity yet — start your quest!</p>`;

  return `
  <div class="screen hub-screen">
    ${starsHTML()}
    <div class="hub-wrap">
      <div class="hub-header enter">
        <button class="btn-back" id="hub-logout">🚪 Log Out</button>
        <div class="hub-badge">⚔️ The Realm of ELA</div>
      </div>
      ${(() => {
        const reminders = getGradeReminders(STATE.student.id);
        if (!Object.keys(reminders).length) return '';
        return `<button class="grade-reminder-banner" id="grade-reminder-banner">⚠️ You have unlogged grades. Tap here to catch up.</button>`;
      })()}
      <div class="hub-inv-bosses">
        <!-- Left panel: Avatar + Equipment -->
        <div class="hub-panel char-card-unified enter" style="animation-delay:.05s">
          <div class="char-card-cols">
            <div class="char-col-identity">
              <div class="char-name-row">
                <div class="char-name">${getCharName(STATE.student)}</div>
                <button class="id-cust-btn" id="cust-btn" title="Customize Character">
                  <img src="/icons/icon_pencil.png" alt="Customize" width="18" height="18"/>
                </button>
              </div>
              ${activeTitle ? `<div class="char-title-badge">👑 ${activeTitle}</div>` : ''}
              <div class="char-avatar-area">
                <div class="char-avatar-wrap">
                  ${(() => {
                    const _frameDef = equippedFrameId
                      ? (COSMETICS_MANIFEST.find(f => f.id === equippedFrameId) ||
                         MYSTERY_POOL.find(p => p.id === equippedFrameId && p.type === 'frame') || null)
                      : null;
                    if (_frameDef) {
                      const isSpecialAvatar = !!equippedAvatarOverrideId;
                      const innerScale = isSpecialAvatar
                        ? (_frameDef.specialAvatarInnerScale || 0.87)
                        : (_frameDef.innerScale || 0.70);
                      const innerPct = Math.round(innerScale * 100) + '%';
                      return `<div class="avatar-hub-frame-wrap">
                        <img src="${displayAvatarUrl}" style="width:${innerPct};height:${innerPct};border-radius:50%;object-fit:contain;flex-shrink:0;z-index:1" alt="Avatar"/>
                        <img src="${_frameDef.assetPath||''}" class="avatar-frame-overlay" alt="Frame" onerror="this.style.display='none'"/>
                      </div>`;
                    }
                    const _avGOv = getOverrides().students[String(s.id)] || {};
                    const _avGKey = _avGOv.guild;
                    const _avGuilds = CLASS_DATA && CLASS_DATA.guilds;
                    const _avColor = (_avGKey && _avGuilds && _avGuilds[_avGKey]) ? _avGuilds[_avGKey].color : '#3B1F8C';
                    const _avBg = `radial-gradient(ellipse at 45% 40%, ${_avColor}28 0%, ${_avColor}88 100%)`;
                    return `<div class="avatar-ring-xl" style="overflow:hidden;padding:0;position:relative;background:${_avBg};border-color:${_avColor};box-shadow:0 6px 24px ${_avColor}59">
                      <img src="${displayAvatarUrl}" class="hub-avatar-img" alt="Avatar" width="250" height="250"/>
                    </div>`;
                  })()}
                </div>
                <div class="char-companion-slot${activeCompanion ? '' : ' char-companion-empty'}" id="companion-slot-btn" title="Choose companion">
                  ${activeCompanion ? `<img src="/companions/${activeCompanion}" alt="companion" width="65" height="65"/>` : `<span style="font-size:22px;opacity:.35">🐾</span>`}
                  <span class="char-companion-name">${activeCompanion ? companionByFile(activeCompanion).name : 'Companion'}</span>
                </div>
              </div>
            </div>
            <div class="char-col-equip">
              <div class="equip-slot-col">${equipSlotsHTML}</div>
            </div>
          </div>
        </div>
        <!-- Right panel: Battle Stats -->
        <div class="hub-panel char-stats-panel enter" style="animation-delay:.08s">
          <div class="char-col-stats">
            <div class="char-col-hdr">Battle Stats</div>
            ${stats}
            <div class="xp-sect" style="margin-top:10px;padding-top:10px">
              <div class="xp-hdr"><span class="xp-lbl">✨ XP</span><span class="xp-nums">${s.xp} / ${s.xpNext}</span></div>
              <div class="xp-track">
                <div class="xp-fill" data-w="${xpPct}"></div>
                <span class="xp-pct">${xpPct}%</span>
              </div>
              <div class="gold-sect">
                <span class="gold-display">🪙 ${getGold(STATE.student)} Gold</span>
                <button class="shop-open-btn" id="open-shop-btn">🏪 Shop</button>
              </div>
            </div>
            <div class="stats-footer-divider"></div>
            <div class="char-level-stat-compact">⭐ Level ${s.level}</div>
            ${(() => {
              const _gOv = getOverrides().students[String(s.id)] || {};
              const _gKey = _gOv.guild;
              const _guilds = CLASS_DATA && CLASS_DATA.guilds;
              if (!_gKey || !_guilds || !_guilds[_gKey]) return '';
              const _g = _guilds[_gKey];
              return `<div class="guild-banner-compact" style="border-color:${_g.color};background:${_g.color}18">
                <img class="guild-banner-crest-sm" src="${_g.crest}" alt="${_g.name}" width="32" height="32" onerror="this.style.display='none'"/>
                <div class="guild-hub-info">
                  <div class="guild-hub-header">
                    <span class="guild-banner-label-sm">GUILD</span>
                    <span class="guild-hub-name" style="color:${_g.color}">${_g.name}</span>
                    ${_g.element ? `<span class="guild-hub-element" style="color:${_g.color}">· ${_g.element}</span>` : ''}
                  </div>
                  ${_g.motto ? `<div class="guild-hub-motto">"${_g.motto}"</div>` : ''}
                  ${_g.values ? `<div class="guild-hub-values">${_g.values}</div>` : ''}
                  ${_g.chant ? `<div class="guild-hub-chant" style="color:${_g.color}">${_g.chant}</div>` : ''}
                </div>
              </div>`;
            })()}
          </div>
        </div>
      </div>
      <div class="hub-actions enter" style="animation-delay:.2s">
        <button class="btn btn-gold" id="continue-quest-btn">⚔️ Continue Quest</button>
        <button class="btn ${STATE.helpFlagged?"btn-red btn-red-dim":"btn-red"}" id="help-btn" ${STATE.helpFlagged?"disabled":""}>
          ${STATE.helpFlagged?"🙋 Help Requested!":"🚩 Flag for Help"}
        </button>
        ${(() => {
          const invites = getSQInvites(STATE.student.id);
          const pendingCount = Object.values(invites).filter(i => i.status === 'pending').length;
          if (!pendingCount) return '';
          return `<button class="btn sq-invite-badge" id="sq-invite-badge">📨 Quest Invite (${pendingCount})</button>`;
        })()}
      </div>
      <div class="character-hub-two-col-row">
      <div class="hub-panel inv-panel-wrap enter" style="animation-delay:.12s">
        <div class="panel-title">🎒 Inventory</div>
        <div class="inv-grid">${invSlots}</div>
        <div class="brew-row">
          ${hasPendingPotion
            ? `<div class="brew-pending">⏳ Crafting request sent — awaiting teacher approval</div>`
            : `<button class="btn-brew" id="brew-crafting-btn">⚗️ Visit Crafting Station</button>`}
        </div>
      </div>
      <div class="hub-panel boss-panel-wrap enter" style="animation-delay:.16s">
        <div class="panel-title">🏆 Boss Mastery</div>
        ${trophyGridHTML}
      </div>
        ${(() => {
          const activeSQ = getActiveSideQuests(STATE.student);
          const activeEntries = Object.entries(activeSQ);
          const ov = _overrides[String(STATE.student.id)] || {};
          const completedSQ = ov.completedQuests || [];
          const pos = getLandPos(STATE.student);
          const curLand = getLandData(pos.land);
          const curTile = curLand.tiles.find(t => t.id === pos.tile);
          const completedIds = pos.completed || [];
          const lastCompletedLesson = [...completedIds].reverse()
            .map(id => curLand.tiles.find(t => t.id === id))
            .find(t => t && t.type === 'lesson');
          const questTile = (curTile && curTile.type === 'lesson') ? curTile : lastCompletedLesson;
          const completedKeys = new Set((completedSQ || []).map(c => c.key));
          const availQuests = [];
          if (questTile) {
            const collabKey = `${questTile.id}_collab`;
            if (!activeSQ[collabKey] && !completedKeys.has(collabKey))
              availQuests.push({ key: collabKey, q: resolveCollabQuest(questTile.id, questTile), type:'collab', tileId: questTile.id, landId: curLand.id });
          }
          const tab = STATE.questJournalTab || 'active';
          const tabs = ['available','active','completed'].map(t =>
            `<button class="qj-tab${tab===t?' qj-tab-active':''}" data-qj-tab="${t}">${t==='available'?'Available':t==='active'?'Active':'Completed'}</button>`
          ).join('');
          const activeContent = activeEntries.length
            ? activeEntries.map(([key, e]) => {
                const activeTileId = parseInt(key.split('_')[0]);
                const q = e.type === 'collab'
                  ? resolveCollabQuest(activeTileId, findTileById(activeTileId))
                  : resolveSoloQuest(activeTileId, e.questIdx);
                const typeIcon = e.type === 'collab' ? '🤝' : '🗡️';
                return `<div class="sq-hub-card">
                  <div class="sq-hub-type">${typeIcon} ${e.type === 'collab' ? 'Collaborative' : 'Solo'}</div>
                  <div class="sq-hub-name">${q.title}</div>
                  <div class="sq-hub-desc">${q.desc}</div>
                  <div class="sq-hub-footer">
                    <span class="sq-hub-xp">+${q.xp} XP</span>
                    <button class="sq-view-lesson-btn" data-sq-tile="${activeTileId}" data-sq-land="${e.landId || ''}">📖 View Lesson</button>
                    <button class="btn-sq-complete" data-sq-key="${key}">✓ Mark Complete</button>
                  </div>
                </div>`;
              }).join('')
            : `<div class="sq-empty">No active quests — accept some from your current lesson!</div>`;
          const availContent = availQuests.length
            ? availQuests.map(({key, q, type, tileId, landId}) => {
                return `<div class="sq-hub-card">
                  <div class="sq-hub-type">🤝 Collaborative</div>
                  <div class="sq-hub-name">${q.title}</div>
                  <div class="sq-hub-desc">${q.desc}</div>
                  <div class="sq-hub-footer">
                    <span class="sq-hub-xp">+${q.xp} XP</span>
                    <button class="sq-view-lesson-btn" data-sq-tile="${tileId}" data-sq-land="${landId || ''}">📖 View Lesson</button>
                    <button class="ls-sq-accept-btn" data-sq-key="${key}" data-sq-idx="0" data-sq-type="${type}" data-sq-tile="${tileId}" data-sq-land="${landId || ''}">Accept</button>
                  </div>
                </div>`;
              }).join('')
            : `<div class="sq-empty">No quests available right now — complete your current tile first!</div>`;
          const completedContent = completedSQ.length
            ? [...completedSQ].reverse().map(c => {
                const typeIcon = c.type === 'collab' ? '🤝' : '🗡️';
                const doneTileId = c.key ? parseInt(c.key.split('_')[0]) : null;
                return `<div class="sq-hub-card sq-done-card">
                  <div class="sq-hub-type">${typeIcon} ${c.type === 'collab' ? 'Collaborative' : 'Solo'}</div>
                  <div class="sq-hub-name">${c.title}</div>
                  <div class="sq-hub-footer">
                    <span class="sq-hub-xp">+${c.xp} XP</span>
                    ${doneTileId ? `<button class="sq-view-lesson-btn" data-sq-tile="${doneTileId}" data-sq-land="${c.landId || ''}">📖 View Lesson</button>` : ''}
                    <span class="sq-done-badge">✓ Done</span>
                  </div>
                </div>`;
              }).join('')
            : `<div class="sq-empty">No completed quests yet — keep adventuring!</div>`;
          return `<div class="hub-panel sq-hub-panel enter" style="animation-delay:.25s">
            <div class="panel-title">📜 Quest Journal</div>
            <div class="qj-tabs">${tabs}</div>
            <div class="qj-body">
              ${tab === 'available' ? availContent : tab === 'active' ? activeContent : completedContent}
            </div>
          </div>`;
        })()}
        <div class="hub-panel act-feed-panel enter" style="animation-delay:.28s">
          <div class="panel-title">📰 Activity Feed</div>
          <div class="act-feed">${actFeedHTML}</div>
        </div>
      </div>
      ${STATE.craftingOpen ? (() => {
        if (STATE.craftingStep === 1) {
          return `<div class="crafting-overlay" id="crafting-overlay">
            <div class="crafting-modal">
              <button class="crafting-close" id="crafting-close">✕</button>
              <div class="crafting-title">⚗️ Crafting Station</div>
              <div class="crafting-subtitle">What would you like to craft?</div>
              <div class="crafting-cards">
                ${['health_potion','behavior_potion','gold_pouch'].map(key => {
                  const def = ITEMS[key];
                  const imgTag = def.img
                    ? `<img class="crafting-card-img item-img" src="/icons/${def.img}" alt="${def.n}" width="64" height="64" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='block'"/><span style="display:none;font-size:32px">${def.i}</span>`
                    : `<span style="font-size:32px">${def.i}</span>`;
                  return `<div class="crafting-card" data-craft-pick="${key}">
                  <div class="crafting-card-img-wrap">${imgTag}</div>
                  <span class="crafting-card-name">${def.n}</span>
                  <span class="crafting-card-desc">${def.desc}</span>
                </div>`;
                }).join('')}
              </div>
            </div>
          </div>`;
        } else {
          const sel = ITEMS[STATE.craftingSelected] || { i:'⚗️', n: STATE.craftingSelected, desc:'' };
          return `<div class="crafting-overlay" id="crafting-overlay">
            <div class="crafting-modal">
              <button class="crafting-back" id="crafting-back">← Back</button>
              <button class="crafting-close" id="crafting-close">✕</button>
              <div class="crafting-title">⚗️ Crafting Station</div>
              <div class="crafting-selected-card">
                <span class="crafting-card-icon" style="font-size:48px">${sel.i}</span>
                <span class="crafting-card-name" style="font-size:18px">${sel.n}</span>
                <span class="crafting-card-desc">${sel.desc}</span>
              </div>
              <label class="crafting-checkbox-row">
                <input type="checkbox" id="crafting-confirm-cb"/>
                <span>I have completed the crafting binder activity for this item and I am ready for my teacher to review it.</span>
              </label>
              <button class="btn-brew crafting-submit" id="crafting-submit" disabled>Submit Request</button>
            </div>
          </div>`;
        }
      })() : ''}
    </div>
    ${custHTML}
    ${renderCatchUpModal()}
    ${STATE.gradeModalOpen && STATE.gradeFromCatchUp ? `
    <div class="grade-modal-overlay" id="grade-modal-overlay">
      <div class="grade-modal">
        <div class="grade-modal-title">📊 Log Your Progress</div>
        <p class="grade-modal-sub">Enter the grade you received on this lesson's assignment. This keeps your stats current.</p>
        <input type="number" class="grade-modal-input" id="grade-modal-input" min="0" max="100" placeholder="0 – 100" />
        <div class="grade-modal-btns">
          <button class="btn btn-outline-sm" id="grade-modal-skip">Remind Me Later</button>
          <button class="btn btn-purple" id="grade-modal-submit">✅ Save Grade</button>
        </div>
      </div>
    </div>` : ''}
    ${renderPartnerPickerModal()}
    ${STATE.sqInviteNotifOpen ? renderInviteNotifModal() : ''}
    ${STATE.helpModalOpen ? `
    <div class="help-modal-overlay" id="help-modal-overlay">
      <div class="help-modal">
        <div class="help-modal-title">🚩 Flag for Help</div>
        <p class="help-modal-sub">What do you need help with? <span style="opacity:.6">(optional)</span></p>
        <textarea class="help-modal-input" id="help-modal-input" maxlength="200" rows="3" placeholder="Type your question or leave blank to just raise your flag…"></textarea>
        <div class="help-modal-btns">
          <button class="btn btn-outline-sm" id="help-modal-skip">Skip</button>
          <button class="btn btn-red" id="help-modal-send">🚩 Send Flag</button>
        </div>
      </div>
    </div>` : ''}
    ${STATE.studentCompanionOpen ? `
    <div class="equip-picker-overlay" id="student-companion-overlay">
      <div class="equip-picker-box" style="max-width:520px">
        <button class="npc-modal-close" id="student-companion-close">✕</button>
        <div class="equip-picker-title">🐾 Companions <span style="font-size:12px;font-weight:600;opacity:.55">${earnedCompanions.length}/${COMPANIONS.length} collected</span></div>
        <div class="companion-grid" style="overflow-y:auto;max-height:55vh;padding:4px 2px">
          ${COMPANIONS.map(c => {
            const earned = earnedCompanions.includes(c.file);
            const isActive = activeCompanion === c.file;
            const border = COMPANION_RARITY_BORDER[c.rarity];
            return `<div class="companion-slot ${earned?'earned':'locked'}${isActive?' c-active':''}" style="border-color:${earned?border:'transparent'}" data-student-companion="${c.file}">
              <img src="/companions/${c.file}" alt="${c.name}" width="58" height="58" loading="lazy"/>
              <span class="c-name">${c.name}</span>
              <span class="c-rarity" style="color:${border}">${earned ? COMPANION_RARITY_LABEL[c.rarity] : '???'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>` : ''}
    ${STATE.weaponPickerOpen ? (() => {
      const dedupedWeapons = [...new Set(ownedWeapons)];
      return `<div class="equip-picker-overlay" id="weapon-picker-overlay">
        <div class="equip-picker-box">
          <button class="npc-modal-close" id="weapon-picker-close">✕</button>
          <div class="equip-picker-title">⚔️ Weapons</div>
          <div class="equip-picker-list">
            ${dedupedWeapons.length ? dedupedWeapons.map(id => {
              const def = getEquipItemDef(id);
              const isEq = weaponEquippedId === id;
              return `<div class="equip-picker-item${isEq ? ' equip-picker-item-eq' : ''}" data-pick-weapon="${id}" data-equip-unequip="${isEq}" style="--tier-color:${def.tierColor}">
                <img src="${def.img}" alt="${def.n}" class="equip-picker-img" onerror="this.style.display='none';this.nextSibling.style.display='block'"/>
                <span style="display:none;font-size:36px">${def.icon}</span>
                <div class="equip-picker-info">
                  <span class="equip-picker-name" style="color:${def.tierColor}">${def.n}</span>
                  <span class="equip-picker-tier">${def.tier.charAt(0).toUpperCase()+def.tier.slice(1)}</span>
                </div>
                <button class="equip-picker-btn${isEq ? ' equip-picker-btn-eq' : ''}">${isEq ? '✓ Unequip' : 'Equip'}</button>
              </div>`;
            }).join('') : '<p class="equip-picker-empty">No weapons owned yet.</p>'}
          </div>
        </div>
      </div>`;
    })() : ''}
    ${STATE.shieldPickerOpen ? (() => {
      const dedupedShields = [...new Set(ownedShields)];
      return `<div class="equip-picker-overlay" id="shield-picker-overlay">
        <div class="equip-picker-box">
          <button class="npc-modal-close" id="shield-picker-close">✕</button>
          <div class="equip-picker-title">🛡️ Shields</div>
          <div class="equip-picker-list">
            ${dedupedShields.length ? dedupedShields.map(id => {
              const def = getEquipItemDef(id);
              const isEq = shieldEquippedId === id;
              return `<div class="equip-picker-item${isEq ? ' equip-picker-item-eq' : ''}" data-pick-shield="${id}" data-equip-unequip="${isEq}" style="--tier-color:${def.tierColor}">
                <img src="${def.img}" alt="${def.n}" class="equip-picker-img" onerror="this.style.display='none';this.nextSibling.style.display='block'"/>
                <span style="display:none;font-size:36px">${def.icon}</span>
                <div class="equip-picker-info">
                  <span class="equip-picker-name" style="color:${def.tierColor}">${def.n}</span>
                  <span class="equip-picker-tier">${def.tier.charAt(0).toUpperCase()+def.tier.slice(1)}</span>
                </div>
                <button class="equip-picker-btn${isEq ? ' equip-picker-btn-eq' : ''}">${isEq ? '✓ Unequip' : 'Equip'}</button>
              </div>`;
            }).join('') : '<p class="equip-picker-empty">No shields owned yet.</p>'}
          </div>
        </div>
      </div>`;
    })() : ''}
    ${STATE.collectiblesOpen ? (() => {
      const tab = STATE.collectiblesTab || 'collectibles';
      const today = new Date().toISOString().slice(0,10);
      const earnedSeasonalSet = new Set(ownedSeasonalBadges);
      const earnedSpecialSet  = new Set(ownedSpecialBadges);

      // ── Tab: Collectibles ──────────────────────────────────────────────
      // Seasonal sections (all 6 sets)
      const seasonalSections = SEASONAL_SETS.map(set => {
        const isActive = today >= set.startDate && today <= set.endDate;
        const isFuture = today < set.startDate;
        const isPast   = today > set.endDate;
        const earnedCount = set.badges.filter(b => earnedSeasonalSet.has(b.id)).length;
        const statusLabel = isActive ? '<span class="coll-season-active">● Active</span>'
          : isFuture ? '<span class="coll-season-status">Starts ' + set.startDate + '</span>'
          : '<span class="coll-season-status coll-season-past">Season ended</span>';
        const cells = set.badges.map(badge => {
          const earned = earnedSeasonalSet.has(badge.id);
          const imgSrc = '/collectibles/' + set.id + '/' + badge.img;
          const imgStyle = 'object-fit:contain' + (earned ? '' : ';filter:grayscale(100%) opacity(40%)');
          return '<div class="seasonal-badge-slot' + (earned ? '' : ' seasonal-badge-locked') + '" title="' + (earned ? badge.name : '') + '">'
            + '<img src="' + imgSrc + '" width="52" height="52" style="' + imgStyle + '" onerror="this.style.display=\'none\'">'
            + (earned ? '<span class="seasonal-badge-name">' + badge.name + '</span>' : '')
            + '</div>';
        }).join('');
        return '<div class="coll-section' + (isActive ? ' coll-section-active' : '') + '">'
          + '<div class="coll-section-hdr"><span class="coll-section-season">' + set.emoji + ' ' + set.label + '</span>'
          + statusLabel
          + '<span class="coll-season-count">' + earnedCount + '/' + set.badges.length + '</span></div>'
          + '<div class="seasonal-badge-grid">' + cells + '</div>'
          + '</div>';
      }).join('');

      const collectiblesContent = seasonalSections;

      // ── Tab: Special ───────────────────────────────────────────────────
      const specialContent = '<div class="seasonal-badge-grid" style="grid-template-columns:repeat(2,1fr);gap:12px">'
        + SPECIAL_BADGES.map(badge => {
          const earned = earnedSpecialSet.has(badge.id);
          return '<div class="special-badge-slot' + (earned ? '' : ' seasonal-badge-locked') + '">'
            + '<span class="special-badge-emoji">' + badge.emoji + '</span>'
            + '<span class="seasonal-badge-name" style="font-size:10px;font-weight:800">' + (earned ? badge.name : '???') + '</span>'
            + '<span class="special-badge-desc">' + (earned ? badge.desc : 'Keep exploring...') + '</span>'
            + '</div>';
        }).join('')
        + '</div>';

      // ── Tab: Cosmetics ─────────────────────────────────────────────────
      const cosmSubTab = STATE.cosmTab || 'frames';
      const equippedFrame   = getEquippedFrame(STATE.student);
      const equippedAvatar  = getEquippedAvatarOverride(STATE.student);

      const _ownedCosmetics = new Set(getUnlockedCosmetics(STATE.student));
      const _cosmSlot = (id, assetPath, displayName, unlocked, isEquipped, equipAttr) =>
        '<div class="cosm-slot' + (unlocked ? '' : ' cosm-locked') + (isEquipped ? ' cosm-equipped' : '') + '" '
        + (unlocked ? equipAttr + '="' + id + '"' : '') + '>'
        + '<div class="cosm-img-wrap">'
        + '<img src="' + assetPath + '" alt="' + displayName + '" width="64" height="64" '
        + 'style="object-fit:contain' + (unlocked ? '' : ';filter:grayscale(100%) opacity(35%)') + '" onerror="this.style.display=\'none\'">'
        + (isEquipped ? '<span class="cosm-check">✓</span>' : '')
        + '</div>'
        + '<span class="cosm-name">' + (unlocked ? displayName : '???') + '</span>'
        + (unlocked ? '<span class="cosm-action">' + (isEquipped ? 'Unequip' : 'Equip') + '</span>'
                    : '<span class="cosm-locked-lbl">Locked</span>')
        + '</div>';

      const framesGrid = '<div class="cosm-grid">'
        + COSMETICS_MANIFEST.map(c =>
            _cosmSlot(c.id, c.assetPath, c.displayName, isCosmeticUnlocked(STATE.student, c), equippedFrame === c.id, 'data-equip-frame')
          ).join('')
        + MYSTERY_POOL.filter(p => p.type === 'frame').map(p =>
            _cosmSlot(p.id, p.assetPath, p.displayName, _ownedCosmetics.has(p.id), equippedFrame === p.id, 'data-equip-frame')
          ).join('')
        + '</div>';

      const revertBtn = equippedAvatar
        ? '<button class="cosm-revert-btn" id="cosm-revert-avatar">↩ Revert to My Character</button>'
        : '';
      const avatarsGrid = revertBtn + '<div class="cosm-grid">'
        + COSMETIC_AVATARS.map(av =>
            _cosmSlot(av.id, av.assetPath, av.displayName, isCosmeticUnlocked(STATE.student, av), equippedAvatar === av.id, 'data-equip-avatar')
          ).join('')
        + MYSTERY_POOL.filter(p => p.type === 'avatar').map(p =>
            _cosmSlot(p.id, p.assetPath, p.displayName, _ownedCosmetics.has(p.id), equippedAvatar === p.id, 'data-equip-avatar')
          ).join('')
        + '</div>';

      const cosmSubToggle = '<div class="cosm-subtabs">'
        + '<button class="cosm-subtab' + (cosmSubTab==='frames'?' cosm-subtab-active':'') + '" data-cosmtab="frames">🖼️ Frames</button>'
        + '<button class="cosm-subtab' + (cosmSubTab==='avatars'?' cosm-subtab-active':'') + '" data-cosmtab="avatars">🧙 Avatars</button>'
        + '</div>';
      const cosmeticsContent = cosmSubToggle + (cosmSubTab === 'frames' ? framesGrid : avatarsGrid);

      return '<div class="equip-picker-overlay" id="collectibles-overlay">'
        + '<div class="equip-picker-box">'
        + '<button class="npc-modal-close" id="collectibles-close">✕</button>'
        + '<div class="equip-picker-title">💼 Collectibles</div>'
        + '<div class="coll-tabs">'
        + '<button class="coll-tab' + (tab==='collectibles'?' coll-tab-active':'') + '" data-colltab="collectibles">🏔️ Collectibles</button>'
        + '<button class="coll-tab' + (tab==='special'?' coll-tab-active':'') + '" data-colltab="special">🏅 Special</button>'
        + '<button class="coll-tab' + (tab==='cosmetics'?' coll-tab-active':'') + '" data-colltab="cosmetics">✨ Cosmetics</button>'
        + '</div>'
        + '<div class="equip-picker-list" style="margin-top:0">'
        + (tab === 'collectibles' ? collectiblesContent : tab === 'special' ? specialContent : cosmeticsContent)
        + '</div>'
        + '</div>'
        + '</div>';
    })() : ''}
  </div>
  ${STATE.shopOpen ? renderShopModal(STATE.student) : ''}`;
}

/* ─── AVATARS ─── */
const STARTER_AVATARS = [
  // Canonical: avatar_{class}_{style}_{tone}_{gender}.png
  "avatar_archer_01_light_female.png",  "avatar_archer_01_light_male.png",
  "avatar_archer_02_light_female.png",  "avatar_archer_02_light_male.png",
  "avatar_elf_01_light_female.png",     "avatar_elf_01_light_male.png",
  "avatar_elf_02_light_female.png",     "avatar_elf_02_light_male.png",
  "avatar_warrior_01_light_male.png",   "avatar_warrior_02_light_female.png",
  "avatar_warrior_02_light_male.png",
  "avatar_wizard_01_light_female.png",  "avatar_wizard_01_light_male.png",
  "avatar_wizard_02_light_female.png",  "avatar_wizard_02_light_male.png",
  // Legacy filenames — still resolve for students who haven't re-customised
  "avatar_warrior_01.png","avatar_warrior_02.png","avatar_warrior_03.png",
  "avatar_archer_01.png", "avatar_archer_02.png",
  "avatar_wizard_01.png", "avatar_wizard_02.png",
  "avatar_fairy_01.png",  "avatar_fairy_02.png",
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
  // Firebase strips null on write, so absent currentLand always means "Land 0 not yet completed."
  // This covers new students, any reset (with or without _isReset flag in Firebase),
  // and Land 0 in-progress students. Never fall through to classData's currentLand.
  // _isReset + !claimed means a full platform reset — ignore any stale progress written back by an active session.
  if ((ov._isReset && !ov.claimed) || (ov.currentLand === undefined && !ov.completedLand0)) {
    return { land:0, tile: 2, completed: [], studentId: String(student.id) };
  }
  return {
    land: ov.currentLand !== null ? ov.currentLand : 1,
    tile: ov.currentTile || student.currentTile || 1,
    completed: ov.completedTiles || [],
    studentId: String(student.id),
  };
}

function tileState(tile, pos, board, land) {
  const id = typeof tile === "object" ? tile.id : tile;
  if (board) return "board";
  if (typeof tile === "object" && tile.type === "npc") {
    return pos.land >= tile.landId ? "open" : "locked";
  }
  // Progress cap: lock tiles beyond the teacher-set cap for this cohort+land.
  // Fires before boss locks so capped tiles show the friendly student message,
  // not the boss-locked modal. Done/here tiles are exempt — they stay done.
  if (land && land.pathOrder && pos.studentId && !pos.completed.includes(id) && id !== pos.tile) {
    const _cohort = Math.floor(parseInt(pos.studentId) / 100);
    const _cap = getProgressCap(_cohort, land.id);
    if (_cap !== null) {
      const _capIdx = land.pathOrder.indexOf(_cap);
      const _tileIdx = land.pathOrder.indexOf(id);
      if (_capIdx !== -1 && _tileIdx > _capIdx) return "capped";
    }
  }
  if (typeof tile === "object" && tile.type === "boss") {
    const bossKey = land ? `${land.id}-${id}` : String(id);
    if (!pos.completed.includes(id) && !getBossOpenKeys().includes(bossKey)) return "locked";
  }
  // Gate boss lesson tiles (Land 1: Abysmara S7, Feraxis S13): teacher must unlock via bossOpenKeys
  if (typeof tile === "object" && tile.type === "lesson" && land && land.gateBosses) {
    const isGateBoss = Object.values(land.gateBosses).some(gb => gb.session === id);
    if (isGateBoss) {
      const bossKey = `${land.id}-${id}`;
      if (!pos.completed.includes(id) && !getBossOpenKeys().includes(bossKey)) return "locked";
    }
  }
  if (typeof tile === "object" && tile.type === "dungeon" && tile.id === 27 && land) {
    const bossKey = `${land.id}-${id}`;
    // Teacher can force-unlock the Warden via bossOpenKeys; otherwise all standard bosses must be defeated
    if (!getBossOpenKeys().includes(bossKey) && land.standardBosses && pos.studentId) {
      const allDefeated = Object.keys(land.standardBosses).every(
        bk => getStdBossState(pos.studentId, bk).status === 'defeated'
      );
      if (!allDefeated) return "locked";
    }
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

function landTileSVG(tile, biome, state, board, bossOverlay, bossTileVisual, gateVisual) {
  const {id, type, name, x, y, skill} = tile;

  /* ── NPC tiles: completely separate render path ── */
  if (type === "npc") {
    const npcData = CLASS_DATA && CLASS_DATA.npcs && CLASS_DATA.npcs[tile.npcKey];
    const npcType = npcData ? npcData.type : "HINT";
    const npcName = npcData ? npcData.name : "???";
    const npcImg  = npcData ? npcData.image : "";
    const tc = NPC_TYPE_COLOR[npcType] || "#888";
    const ts = LW.NPTILE;
    const tx = x - ts/2, ty = y - ts/2;
    const locked = state === "locked";
    const filterId = `npc-f-${id}`;
    // Soft aura glow beneath the character — no hard box
    const aura = !locked
      ? `<ellipse cx="${x}" cy="${y + ts*0.08}" rx="${ts*0.42}" ry="${ts*0.22}" fill="${tc}" opacity="0.22"/>
         <ellipse cx="${x}" cy="${y + ts*0.08}" rx="${ts*0.3}" ry="${ts*0.14}" fill="${tc}" opacity="0.18"/>`
      : "";
    const portrait = npcImg
      ? `<image href="${npcImg}" x="${tx}" y="${ty}" width="${ts}" height="${ts}" preserveAspectRatio="xMidYMid meet" filter="url(#${filterId})"/>`
      : `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="40">👤</text>`;
    const lockedOverlay = locked
      ? `<rect x="${tx}" y="${ty}" width="${ts}" height="${ts}" fill="rgba(0,0,0,.72)"/>
         <text x="${x}" y="${y+1}" text-anchor="middle" dominant-baseline="central" font-size="22">🔒</text>`
      : "";
    const short = npcType === "EASTER EGG" ? "★" : npcType === "ENCOURAGEMENT" ? "★" : npcType === "HINT" ? "?" : "◆";
    const typeTag = !locked
      ? `<rect x="${tx+ts-20}" y="${ty+4}" width="16" height="16" rx="8" fill="${tc}" opacity="0.95"/>
         <text x="${tx+ts-12}" y="${ty+12}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="white" font-weight="900" font-family="Arial">${short}</text>`
      : "";
    const nameY = ty + ts + 12;
    const nameFill = locked ? "#4B5563" : "rgba(255,255,255,.88)";
    const nameEl = `<text x="${x}" y="${nameY}" text-anchor="middle" font-size="8" font-weight="bold" fill="${nameFill}" font-family="Arial">${npcName.split(" ")[0]}</text>`;
    const typeEl = !locked ? `<text x="${x}" y="${nameY+11}" text-anchor="middle" font-size="7" fill="${tc}" font-family="Arial" font-weight="900" letter-spacing=".8">${npcType}</text>` : "";
    return `<g data-tid="${id}" data-npc="1" style="cursor:${locked?"default":"pointer"}">
      <defs><filter id="${filterId}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="${tc}" flood-opacity="0.45"/>
      </filter></defs>
      ${aura}
      ${portrait}${lockedOverlay}${typeTag}
      ${nameEl}${typeEl}
    </g>`;
  }

  /* ── Visual type ─────────────────────────────────────────────────────────
     Derive the rendering category from tile.type + structural boss maps.
     gateVisual   = gate boss data for this tile (Abysmara, Feraxis)
     bossTileVisual = standard boss data (sighted or boss_fight)
  ── */
  const vt = type==='arrival'   ? 'welcome'
           : type==='dungeon'   ? 'finalGatekeeper'
           : type==='event'     ? 'scribesCalling'
           : type==='loot'      ? 'loot'
           : type==='boss'      ? 'standaloneBoss'
           : gateVisual         ? 'gatekeeper'
           : bossTileVisual?.type === 'boss_fight' ? 'boss'
           : 'regular';

  const SG = type==="sg";

  /* ── Sizing ── */
  const ts = vt==='scribesCalling' ? LW.ETILE
           : vt==='loot'           ? LW.LTILE
           : vt==='standaloneBoss' ? LW.BTILE
           : LW.TILE;   // welcome, regular, boss, gatekeeper, finalGatekeeper all match base tile
  const r  = Math.round(ts*.14);
  const tx = x - ts/2, ty = y - ts/2;
  const locked = state==="locked";
  const done   = state==="done";
  const here   = state==="here";
  const brd    = state==="board";

  /* ── Border color / width ── */
  let bc, bw=2;
  if (locked) {
    bc="#2D3748"; bw=1.5;
  } else if (here) {
    bc="#7C3AED"; bw=3;
  } else if (done||brd) {
    bc = vt==='finalGatekeeper' ? "#C4B5FD"
       : vt==='gatekeeper'      ? "#FCD34D"
       : vt==='boss'            ? "#F59E0B"
       : vt==='standaloneBoss'  ? "#EF4444"
       : vt==='scribesCalling'  ? "#F59E0B"
       : vt==='loot'            ? "#10B981"
       : vt==='welcome'         ? "#34D399"
       : "#F59E0B";
    bw=2.5;
  } else {
    bc = vt==='finalGatekeeper' ? "#7C3AED"
       : vt==='gatekeeper'      ? "#D97706"
       : vt==='boss'            ? "#DC2626"
       : vt==='standaloneBoss'  ? "#7F1D1D"
       : vt==='scribesCalling'  ? "#92400E"
       : vt==='loot'            ? "#065F46"
       : vt==='welcome'         ? "#1A3A2A"
       : SG                     ? "#92400E"
       : "#374151";
    bw = (vt==='finalGatekeeper'||vt==='boss'||vt==='gatekeeper') ? 2.5 : 2;
  }

  /* ── Glow rings ── */
  // Standalone boss tile (tile.type==="boss" — used in other lands)
  const bossRing = vt==='standaloneBoss' && !locked && !brd
    ? `<rect x="${tx-5}" y="${ty-5}" width="${ts+10}" height="${ts+10}" rx="${r+4}" fill="none" stroke="${done?"rgba(245,158,11,.3)":here?"rgba(167,139,250,.3)":"rgba(127,29,29,.3)"}" stroke-width="2"/>` : "";

  // Final gatekeeper (Warden) — purple + deep violet double ring
  const dungRing = vt==='finalGatekeeper' && !locked ? `<g class="dng-glow">
    <rect x="${tx-8}" y="${ty-8}" width="${ts+16}" height="${ts+16}" rx="${r+6}" fill="none" stroke="#7C3AED" stroke-width="3"/>
    <rect x="${tx-16}" y="${ty-16}" width="${ts+32}" height="${ts+32}" rx="${r+13}" fill="none" stroke="#4C1D95" stroke-width="1.5" stroke-dasharray="8 4"/>
  </g>` : "";

  // Event / scribesCalling — animated gold sparkle ring
  const evRing = vt==='scribesCalling' && !locked ? `<g class="ev-glow">
    <rect x="${tx-8}" y="${ty-8}" width="${ts+16}" height="${ts+16}" rx="${r+6}" fill="none" stroke="#F59E0B" stroke-width="3"/>
    <rect x="${tx-15}" y="${ty-15}" width="${ts+30}" height="${ts+30}" rx="${r+12}" fill="none" stroke="#FDE68A" stroke-width="1.5" stroke-dasharray="6 4"/>
  </g>` : "";

  // Standard boss fight tile — double crimson ring
  const stdBossFightRing = vt==='boss' && !locked && !brd ? `<g>
    <rect x="${tx-6}" y="${ty-6}" width="${ts+12}" height="${ts+12}" rx="${r+5}" fill="none" stroke="#DC2626" stroke-width="2.5"/>
    <rect x="${tx-13}" y="${ty-13}" width="${ts+26}" height="${ts+26}" rx="${r+11}" fill="none" stroke="#7F1D1D" stroke-width="1.5" stroke-dasharray="7 4"/>
  </g>` : "";

  // Gatekeeper (Abysmara / Feraxis) — amber chain double ring
  const gateRing = vt==='gatekeeper' && !locked && !brd ? `<g>
    <rect x="${tx-6}" y="${ty-6}" width="${ts+12}" height="${ts+12}" rx="${r+5}" fill="none" stroke="#D97706" stroke-width="2.5"/>
    <rect x="${tx-13}" y="${ty-13}" width="${ts+26}" height="${ts+26}" rx="${r+11}" fill="none" stroke="#92400E" stroke-width="1.5" stroke-dasharray="5 5"/>
  </g>` : "";

  const pulse = here ? `<rect class="qm-pr" x="${tx-8}" y="${ty-8}" width="${ts+16}" height="${ts+16}" rx="${r+7}" fill="none" stroke="#7C3AED" stroke-width="3"/>` : "";
  const yah   = here && !brd ? `<g class="qm-yh">
    <text x="${x}" y="${ty-24}" text-anchor="middle" font-size="8.5" font-weight="900" fill="#E9D5FF" font-family="Arial" letter-spacing="1.5">YOU ARE HERE</text>
    <text x="${x}" y="${ty-13}" text-anchor="middle" font-size="8" fill="#C4B5FD">▼</text></g>` : "";

  /* ── Tile art interior ── */
  const tileArtURL = vt==='finalGatekeeper' && tile.portrait ? `/bosses/${tile.portrait}`
    : vt==='gatekeeper'    ? `/tiles/tile_gatekeeper.png`
    : vt==='boss'          ? `/tiles/tile_boss.png`
    : tileImgURL(type, biome);
  const portraitPos   = vt==='finalGatekeeper' ? 'center top' : 'center';
  const portraitFilter = vt==='finalGatekeeper' ? 'filter:brightness(.82) saturate(1.2);' : '';

  const interior = locked
    ? `<rect width="${ts}" height="${ts}" rx="${r}" fill="#111"/>`
    : `<foreignObject x="0" y="0" width="${ts}" height="${ts}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${ts}px;height:${ts}px;background-image:url(${tileArtURL});background-size:cover;background-position:${portraitPos};${portraitFilter}"></div></foreignObject>`;

  const lockedOverlay = locked ? `
    <rect width="${ts}" height="${ts}" rx="${r}" fill="rgba(0,0,0,.78)"/>
    <text x="${ts/2}" y="${ts/2+1}" text-anchor="middle" dominant-baseline="central" font-size="${vt==='finalGatekeeper'?24:20}">🔒</text>` : "";
  const doneBadge = !brd && done ? `
    <circle cx="${ts-13}" cy="13" r="10" fill="#F59E0B" stroke="#78350F" stroke-width="1.5"/>
    <text x="${ts-13}" y="13" text-anchor="middle" dominant-baseline="central" font-size="9" fill="white" font-weight="900" font-family="Arial">✓</text>` : "";

  /* ── Labels ── */
  const nameY    = ty + ts + (vt==='scribesCalling'?16 : vt==='standaloneBoss'?18 : 16);
  const nameFill = locked ? "#4B5563"
    : vt==='finalGatekeeper' ? "#FCA5A5"
    : vt==='scribesCalling'  ? "#FDE68A"
    : "rgba(255,255,255,.88)";
  const nameFS   = vt==='finalGatekeeper'?10 : vt==='scribesCalling'?9 : vt==='standaloneBoss'?8.5 : 8;
  const nameEl   = `<text x="${x}" y="${nameY}" text-anchor="middle" font-size="${nameFS}" font-weight="bold" fill="${nameFill}" font-family="Arial">${name}</text>`;
  const skillEl  = skill && !locked ? `<text x="${x}" y="${nameY+13}" text-anchor="middle" font-size="7.5" fill="${done||brd?"#FDE68A":"#93C5FD"}" font-family="Arial" font-weight="700">${skill}</text>` : "";
  const typeTag  = !locked ? (
    vt==='finalGatekeeper'
      ? `<text x="${x}" y="${nameY+(skill?27:14)}" text-anchor="middle" font-size="7.5" fill="${done||brd?"#FCD34D":"#FCA5A5"}" font-family="Arial" font-weight="900" letter-spacing="1">⚔ MASTER BOSS</text>`
    : vt==='gatekeeper'
      ? `<text x="${x}" y="${nameY+14}" text-anchor="middle" font-size="7" fill="${done||brd?"#FDE68A":"#FCD34D"}" font-family="Arial" font-weight="900" letter-spacing=".5">🔑 GATE BOSS</text>`
    : vt==='standaloneBoss'
      ? `<text x="${x}" y="${nameY+(skill?26:13)}" text-anchor="middle" font-size="7" fill="${done||brd?"#FCA5A5":"#F87171"}" font-family="Arial" font-weight="900" letter-spacing=".5">⚔ BOSS</text>`
    : vt==='scribesCalling'
      ? `<text x="${x}" y="${nameY+14}" text-anchor="middle" font-size="8" fill="#F59E0B" font-family="Arial" font-weight="900" letter-spacing=".5">✦ WRITING EVENT ✦</text>`
    : ""
  ) : "";

  const sightedBadge = bossTileVisual?.type === 'sighted' && !locked && !brd
    ? `<g opacity="0.92">
         <circle cx="${tx+ts-11}" cy="${ty+11}" r="10" fill="#1C1033" stroke="#6D28D9" stroke-width="1.5"/>
         <text x="${tx+ts-11}" y="${ty+11}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="#C4B5FD" font-family="Arial">👁</text>
       </g>`
    : "";

  // Ahead-of-player glow — slow-breathing outer ring for boss/gate tiles not yet completed
  const _isBossVt = vt==='boss' || vt==='gatekeeper' || vt==='finalGatekeeper' || vt==='standaloneBoss';
  const _glowColor = vt==='finalGatekeeper' ? '#7C3AED' : vt==='gatekeeper' ? '#D97706' : '#DC2626';
  const bossAheadGlow = (_isBossVt && !done && !here && !brd)
    ? `<rect class="boss-ahead-glow" x="${tx-11}" y="${ty-11}" width="${ts+22}" height="${ts+22}" rx="${r+9}" fill="none" stroke="${_glowColor}" stroke-width="2.5"/>`
    : "";

  // Boss overlay badge — top-left corner, shown when a boss is in-flight for this student
  let bossOverlayBadge = "";
  if (bossOverlay && !locked && !brd) {
    const bst = bossOverlay.bossState.status;
    const badgeColor = bst === 'defeated'          ? '#10B981'
      : bst === 'failed'                           ? '#EF4444'
      : bst === 'awaiting_judgment'                ? '#F59E0B'
      : (bst === 'fightable' || bst === 'active')  ? '#DC2626'
      : '';
    const badgeEmoji = bst === 'defeated' ? '✓'
      : bst === 'failed'                  ? '✕'
      : (bst === 'awaiting_judgment' || bst === 'fightable' || bst === 'active') ? '⚔'
      : '';
    if (badgeColor && badgeEmoji) {
      const bx = tx + 9, by = ty + 9;
      const isGate = bossOverlay.type === 'gate';
      bossOverlayBadge = `
        <circle cx="${bx}" cy="${by}" r="10" fill="${badgeColor}" stroke="#111" stroke-width="1.5"/>
        <text x="${bx}" y="${by}" text-anchor="middle" dominant-baseline="central" font-size="${isGate?8:9}" fill="white" font-weight="900" font-family="Arial">${badgeEmoji}</text>`;
    }
  }

  return `<g data-tid="${id}">${bossAheadGlow}${dungRing}${evRing}${bossRing}${stdBossFightRing}${gateRing}${pulse}
    <clipPath id="clip-${id}"><rect x="0" y="0" width="${ts}" height="${ts}" rx="${r}"/></clipPath>
    <g clip-path="url(#clip-${id})" transform="translate(${tx},${ty})">${interior}${lockedOverlay}${doneBadge}</g>
    <rect x="${tx}" y="${ty}" width="${ts}" height="${ts}" rx="${r}" fill="none" stroke="${bc}" stroke-width="${bw}"/>
    ${bossOverlayBadge}${sightedBadge}${yah}${nameEl}${skillEl}${typeTag}</g>`;
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

  // Build boss overlay info keyed by tile id (standard + gate bosses, Land 1 only)
  const bossOverlayMap = {};
  if (!board && pos.studentId) {
    if (land.standardBosses) {
      // sessions[0] = sighted-only (no badge); sessions[1+] = fightable encounters that get a badge
      Object.entries(land.standardBosses).forEach(([bk, boss]) => {
        const bState = getStdBossState(pos.studentId, bk);
        boss.sessions.slice(1).forEach(sid => {
          bossOverlayMap[sid] = { type:'standard', bossKey:bk, boss, bossState:bState };
        });
      });
    }
    if (land.gateBosses) {
      // Gate bosses have a single session and no sighted state — index 0 always gets a badge
      Object.entries(land.gateBosses).forEach(([bk, boss]) => {
        const bState = getGateBossState(pos.studentId, bk);
        // boss.session (singular) is the one tile that carries the gate boss overlay
        bossOverlayMap[boss.session] = { type:'gate', bossKey:bk, boss, bossState:bState };
      });
    }
  }

  // Build tile visual map: session[0] = sighted silhouette, session[1+] = boss_fight reskin
  const tileBossVisualMap = {};
  if (!board && land.standardBosses) {
    Object.entries(land.standardBosses).forEach(([bk, boss]) => {
      if (!boss.sessions || !boss.portrait) return;
      tileBossVisualMap[boss.sessions[0]] = { type:'sighted',    bossKey:bk, boss };
      boss.sessions.slice(1).forEach(sid => {
        tileBossVisualMap[sid]            = { type:'boss_fight', bossKey:bk, boss };
      });
    });
  }

  // Build gate tile visual map: each gate boss session → boss info with portrait
  const gateTileVisualMap = {};
  if (!board && land.gateBosses) {
    Object.entries(land.gateBosses).forEach(([bk, boss]) => {
      if (boss.session && boss.portrait) {
        gateTileVisualMap[boss.session] = { bossKey: bk, boss };
      }
    });
  }

  const tiles = land.tiles.map(t => landTileSVG(t, biome, tileState(t, pos, board, land), board, bossOverlayMap[t.id], tileBossVisualMap[t.id], gateTileVisualMap[t.id])).join("");
  const decors = (land.decorations||[]).map(d => decorationSVG(d.name, d.x, d.y)).join("");

  const getHalf = t => t.type==='boss'?LW.BTILE/2:t.type==='event'?LW.ETILE/2:t.type==='loot'?LW.LTILE/2:LW.TILE/2;
  const coverSeg = (tA, tB, y) => {
    const [lT,rT] = tA.x <= tB.x ? [tA,tB] : [tB,tA];
    const x1 = lT.x + getHalf(lT), x2 = rT.x - getHalf(rT);
    if (x2 <= x1) return '';
    return `<rect x="${x1}" y="${y-9}" width="${x2-x1}" height="18" fill="#08080F"/><text x="${(x1+x2)/2}" y="${y+4}" text-anchor="middle" font-size="11" fill="#374151" font-family="Arial">⛓</text>`;
  };
  const bossOpenKeys = getBossOpenKeys();
  const tileById = Object.fromEntries(land.tiles.map(t => [t.id, t]));
  const pathOrder = land.pathOrder || [];
  const bossBlockers = board ? '' : land.tiles
    .filter(t => t.type==='boss' && !pos.completed.includes(t.id) && !bossOpenKeys.includes(`${land.id}-${t.id}`))
    .map(t => {
      const idx = pathOrder.indexOf(t.id);
      const prev = idx > 0 ? tileById[pathOrder[idx-1]] : null;
      const next = idx < pathOrder.length-1 ? tileById[pathOrder[idx+1]] : null;
      return (prev ? coverSeg(prev, t, t.y) : '') + (next ? coverSeg(t, next, t.y) : '');
    }).join('');

  return `<defs>
    <linearGradient id="epicGradFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  ${decors}
  ${road(branchPaths,"#064E3B","#34D399",9,true)}
  ${road(mainPaths,"#78350F","#FDE68A",13,false)}
  ${bossBlockers}
  ${tiles}
  ${extraSVG||""}`;
}

function renderTravelScreen() {
  const destName = STATE.travelDestName || "The Next Land";
  const sparks = Array.from({length:8}, (_, i) => {
    const x = 10 + (i * 11) % 80;
    const y = 20 + (i * 17) % 60;
    const delay = (i * 0.22).toFixed(2);
    const dur   = (1.4 + (i % 3) * 0.4).toFixed(1);
    return `<span class="travel-spark" style="left:${x}%;top:${y}%;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
  }).join("");
  return `<div class="screen travel-screen">
    ${sparks}
    <div class="travel-inner">
      <div class="travel-eyebrow">Traveling to</div>
      <div class="travel-dest">${destName}</div>
      <div class="travel-spinner"></div>
    </div>
  </div>`;
}

function renderLandTravelScreen() {
  const destName = STATE.travelDestName || "The Next Land";
  const destDesc = STATE.travelDestDesc || "";
  // Stars: mix of streaks (wide) and dots, scattered across the full screen
  const stars = Array.from({length:40}, (_, i) => {
    const x = (i * 7.3 + 3) % 100;
    const y = (i * 11.7 + 5) % 100;
    const len = 6 + (i % 5) * 10;
    const delay = ((i * 0.09) % 1.8).toFixed(2);
    const dur   = (0.5 + (i % 4) * 0.18).toFixed(2);
    const opacity = 0.35 + (i % 5) * 0.13;
    return `<span class="lt-star" style="left:${x}%;top:${y}%;width:${len}px;animation-delay:${delay}s;animation-duration:${dur}s;opacity:${opacity}"></span>`;
  }).join("");
  return `<div class="screen lt-screen">
    <div class="lt-starfield">${stars}</div>
    <div class="lt-title-card">
      <div class="lt-eyebrow">Now entering</div>
      <div class="lt-land-name">${destName}</div>
      ${destDesc ? `<div class="lt-land-desc">${destDesc}</div>` : ''}
    </div>
  </div>`;
}

function renderRealmComplete() {
  const student = STATE.student;
  const name = student ? (student.name || "Hero") : "Hero";
  return `<div class="screen rc-screen">
    <div class="rc-starfield">${Array.from({length:30},(_,i)=>{
      const x=(i*9.1+4)%100, y=(i*13.3+6)%100;
      const d=((i*0.12)%2).toFixed(2), s=(0.6+(i%4)*0.25).toFixed(2);
      return `<span class="lt-star" style="left:${x}%;top:${y}%;width:${4+(i%4)*8}px;animation-delay:${d}s;animation-duration:${s}s;opacity:${0.3+(i%5)*0.12}"></span>`;
    }).join('')}</div>
    <div class="rc-content">
      <div class="rc-eyebrow">✦ The Realm is Complete ✦</div>
      <h1 class="rc-title">You Have Conquered the Realm</h1>
      <p class="rc-hero">${name}</p>
      <p class="rc-body">Six lands. Every darkness faced. Every page mastered.<br>The Realm of ELA bows before its champion.</p>
      <div class="rc-crest">⚔️</div>
      <button class="boss-intro-btn rc-btn" id="rc-return-btn">Return to the Realm →</button>
    </div>
  </div>`;
}

function renderArrivalScreen() {
  const land = STATE.arrivalLand || LANDS[0];
  return `<div class="screen arrival-screen">
    <img class="arrival-banner" src="/tiles/tile_arrival.png" alt="Arrival" width="800" height="340" onerror="this.style.display='none'"/>
    <div class="arrival-body">
      <div class="arrival-land-name">Welcome to ${land.name}</div>
      <hr class="arrival-divider"/>
      <div class="arrival-intro">
        <p>You have arrived at the Verdant Vale — a land where ancient trees grow so tall their canopies swallow the sky, and every rustling leaf sounds like a whispered story waiting to be told.</p>
        <p>The Thornkin people make their home here among the roots and moss. Small, quick, and woven from bark and living green, they are the keepers of every tale the forest holds. They speak in riddles, trade in questions, and trust only those who can prove they truly understand what they read — not just the words, but the meaning beneath them.</p>
        <p>They have been watching you since you arrived.</p>
        <p>But something else watches too. Deep in the heart of the Vale, where the oldest trees grow dark and close together, a presence stirs. The Thornkin call her Seraphine. They do not say her name loudly. They say she was once a guardian — but that something changed her, and now she tests those who dare to seek mastery in her forest. Not everyone who enters the deep wood comes back out.</p>
        <p>Your journey as a scholar-adventurer begins here. Earn the trust of the Thornkin. Master the skills of this land. And when the time comes — face whatever waits for you in the dark.</p>
      </div>
      <button class="arrival-btn" id="arrival-begin">Begin Your Quest! ⚔️</button>
    </div>
  </div>`;
}

function renderSanctumMap() {
  const land = STATE.sanctumLand || STATE.lessonLand || LANDS[0];
  const landId = land.id;
  const student = STATE.student;
  const we = CLASS_DATA && CLASS_DATA.writingEvents && CLASS_DATA.writingEvents["land" + landId];
  const writeStatus = getWriteStatus(student, landId);
  const progress = getSanctumProgress(student, landId);

  // Tile positions on 1200×680 canvas — gentle arc
  const POSITIONS = [
    {x:64,  y:380}, {x:290, y:230}, {x:572, y:175},
    {x:854, y:230}, {x:1080,y:380},
  ];

  // Per-tile state: done < progress, current = progress+1 (or podium when progress>=4), else locked
  const tileNodes = SANCTUM_TILES.map((st, i) => {
    const {x, y} = POSITIONS[i];
    let state;
    const isPodium = st.id === 5;
    if (isPodium) {
      if (writeStatus === 'submitted' || writeStatus === 'approved' || writeStatus === 'revision') state = 'submitted';
      else if (writeStatus === 'confirmed') state = 'done';
      else if (progress >= 4) state = 'current';
      else state = 'locked';
    } else {
      if (i + 1 <= progress) state = 'done';
      else if (i + 1 === progress + 1) state = 'current';
      else state = 'locked';
    }
    const clickable = state === 'current' || state === 'done' || state === 'submitted' || state === 'approved' || state === 'revision';
    return `<div class="st-tile st-tile-${state}${clickable ? ' st-tile-click' : ''}" style="left:${x}px;top:${y}px"${clickable ? ` data-st="${st.id}"` : ''}>
      <div class="st-tile-img-wrap">
        <img src="${st.img}" alt="${st.name}" width="112" height="112" onerror="this.style.display='none'"/>
        ${state === 'done' ? '<div class="st-done-badge">✓</div>' : ''}
        ${state === 'current' ? '<div class="st-pulse"></div>' : ''}
        ${state === 'submitted' ? '<div class="st-pulse st-pulse-gold"></div>' : ''}
        ${state === 'approved' ? '<div class="st-done-badge st-done-badge-green">✓</div>' : ''}
        ${state === 'revision' ? '<div class="st-done-badge st-done-badge-orange">✍</div>' : ''}
      </div>
      <div class="st-tile-label">${st.name}</div>
    </div>`;
  }).join('');

  // SVG path
  const pts = POSITIONS.map(p => `${p.x + 56},${p.y + 56}`);
  const pathD = `M ${pts.join(' L ')}`;

  // Scribe intro overlay
  const bossName = (we && we.boss) ? we.boss : 'The Ancient Scribe';
  const bossSrc  = we && we.portrait ? `/bosses/${we.portrait}` : null;
  const introOverlay = STATE.scribeIntroOpen ? `
    <div class="boss-intro-overlay" id="scribe-intro-overlay">
      <div class="boss-intro-card">
        <div class="boss-intro-eyebrow">✦ The Scribe's Sanctum ✦</div>
        ${bossSrc ? `<img class="boss-intro-portrait" src="${bossSrc}" onerror="this.style.display='none'"/>` : `<div style="font-size:48px;margin:0 auto 12px;text-align:center">📜</div>`}
        <div class="boss-intro-name">${bossName}</div>
        <p class="boss-intro-text">"Welcome, young author. A great work stirs within you. Make your way through the Sanctum — each station will guide your craft."</p>
        <button class="boss-intro-btn" id="scribe-intro-close">Answer the Calling →</button>
      </div>
    </div>` : '';

  // Station modal (all tile clicks — checklist)
  const openSt = STATE.sanctumTileOpen ? SANCTUM_TILES.find(t => t.id === STATE.sanctumTileOpen) : null;
  const stModal = openSt ? (() => {
    const bits = getSanctumChecklist(student, landId, openSt.id);
    const allChecked = bits === 31;
    const isPodium = openSt.id === 5;
    const checkItems = openSt.checklist.map((text, idx) => {
      const checked = !!(bits & (1 << idx));
      return `<li class="st-check-item">
        <label class="st-check-label">
          <input type="checkbox" class="st-checkbox" data-idx="${idx}" ${checked ? 'checked' : ''}/>
          <span class="st-check-text${checked ? ' st-check-done' : ''}">${text}</span>
        </label>
      </li>`;
    }).join('');
    const btnLabel = allChecked
      ? (isPodium ? 'Submit to the Scribe ✦' : 'Mark Complete ✓')
      : 'Complete the checklist to continue';
    return `<div class="boss-intro-overlay" id="st-modal-overlay">
      <div class="st-checklist-card">
        <div class="boss-intro-eyebrow">✦ Station ${openSt.id} of 5 — ${openSt.action} ✦</div>
        <img src="${openSt.img}" style="width:72px;height:72px;object-fit:contain;margin:0 auto 10px;display:block" onerror="this.style.display='none'"/>
        <div class="boss-intro-name" style="margin-bottom:16px">${openSt.name}</div>
        <ul class="st-checklist">
          ${checkItems}
        </ul>
        <button class="boss-intro-btn" id="st-continue-btn" ${allChecked ? '' : 'disabled'}>${btnLabel}</button>
      </div>
    </div>`;
  })() : '';

  // Status bar beneath the map
  const statusBars = {
    submitted: `<div class="sanctum-status-bar sb-wait">⏳ Awaiting the Scribe's review — your teacher will update your status here.</div>`,
    approved:  `<div class="sanctum-status-bar sb-ok">✅ The Scribe is Pleased — visit the Podium to claim your reward!</div>`,
    revision:  `<div class="sanctum-status-bar sb-rev">📝 Revision requested — visit the Podium to view feedback and resubmit.</div>`,
  };

  return `<div class="screen sanctum-screen">
    <div class="sanctum-bg" style="background-image:url('/tiles/scribes-sanctum-bg.png')"></div>
    <div class="sanctum-nav">
      <button class="btn-back" id="sanctum-back">← Return to Map</button>
      <div class="ls-breadcrumb">
        <span class="ls-bc-land">${land.name}</span>
        <span class="ls-bc-sep">›</span>
        <span class="ls-bc-tile">Scribe's Sanctum</span>
      </div>
    </div>
    <div class="sanctum-map-outer">
      <div class="sanctum-map-inner">
        <img class="sanctum-boss-portrait" src="/bosses/boss_kaeltharion_bg.png" alt="" aria-hidden="true" onerror="this.style.display='none'"/>
        <svg class="st-path-svg" viewBox="0 0 1200 680" preserveAspectRatio="xMidYMid meet">
          <path d="${pathD}" fill="none" stroke="rgba(245,224,144,.15)" stroke-width="10"/>
          <path d="${pathD}" fill="none" stroke="rgba(245,224,144,.45)" stroke-width="3" stroke-dasharray="10 6"/>
        </svg>
        ${tileNodes}
      </div>
    </div>
    ${statusBars[writeStatus] || ''}
    ${introOverlay}
    ${stModal}
  </div>`;
}

function renderWritingTransport() {
  const isReturn = STATE.writingTransportDir === 'out';
  const accentRgb = isReturn ? '245,158,11' : '90,40,160';
  const particles = Array.from({length:22}, (_,i) => {
    const x = 5 + ((i*37+13)%85), y = 5 + ((i*53+17)%85);
    const size = 6 + (i%5)*7, delay = (i*0.07).toFixed(2);
    return `<span style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;animation-delay:${delay}s;position:absolute;border-radius:50%;background:rgba(${accentRgb},.45);animation:wt-swirl 1.9s ease-in-out ${delay}s forwards;"></span>`;
  }).join('');
  return `<div class="screen wt-screen">
    <div class="wt-inkblast">${particles}</div>
    <div class="wt-title-card">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:rgba(168,139,250,.75);text-transform:uppercase;margin-bottom:16px">✦ ${isReturn ? 'RETURNING HOME' : 'WRITING EVENT'} ✦</div>
      <h1>${isReturn ? 'The Calling Answered' : "The Scribe's Calling"}</h1>
      <p>${isReturn ? 'Your land awaits...' : 'The Sanctum awaits...'}</p>
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

  const bossKey = `${land.id}_${tile.id}`;
  const bossStatus = getBossStatus(student, bossKey);
  const alreadyConfirmed = bossStatus === 'confirmed' || (pos.completed || []).includes(tile.id);

  const hpDots = Array.from({length:10}, (_, i) =>
    `<span class="boss-hp-dot${i < hp ? " filled" : ""}"></span>`
  ).join("");

  const portraitHTML = portrait
    ? `<img class="boss-portrait" src="/bosses/${portrait}" alt="${bossName}" width="500" height="500"/>`
    : `<div class="boss-portrait boss-portrait-fallback">${BOSS_ICON[bossName] || "👹"}</div>`;

  const tombstoneHTML = `<img src="/bosses/defeated-tombstone.png" alt="Defeated" class="boss-portrait boss-tombstone" onerror="this.style.display='none'"/>`;

  const _bsEntry = BOSS_SCHEDULE[String(tile.id)];
  const introOverlay = (STATE.bossIntroOpen && bossStatus === 'not_attempted') ? `
    <div class="boss-intro-overlay" id="boss-intro-overlay">
      <div class="boss-encounter-card${portrait ? '' : ' boss-encounter-card-fallback'}"${portrait ? ` style="background-image:url('/bosses/${portrait}')"` : ''}>
        <div class="bec-eyebrow-bar">
          <div class="boss-intro-eyebrow">${_bsEntry?.label ? _bsEntry.label : '⚔ Boss Encounter ⚔'}</div>
        </div>
        <div class="bec-content">
          ${!portrait ? `<div class="bec-fallback-icon">${BOSS_ICON[bossName] || '👹'}</div>` : ''}
          <div class="boss-intro-name">${bossName}</div>
          <p class="boss-intro-text">"Before your skills can be judged, you must face the assessment. Study the lore well — your knowledge will carry you through."</p>
          <button class="boss-intro-btn" id="boss-intro-close">Enter the Battle →</button>
        </div>
      </div>
    </div>` : '';

  let bodyHTML = '';

  if (alreadyConfirmed) {
    // State 1 — Already confirmed/completed
    bodyHTML = `
      <div class="boss-portrait-wrap enter" style="animation-delay:.06s">
        ${tombstoneHTML}
      </div>
      <div class="boss-defeated-banner enter" style="animation-delay:.10s">⚔️ DEFEATED</div>
      <div class="boss-identity enter" style="animation-delay:.12s">
        <h1 class="boss-name boss-name-defeated">${bossName}</h1>
        ${skillCode ? `<div class="boss-skill">${skillCode}${skillName ? ` — ${skillName}` : ""}</div>` : ""}
      </div>
      <div style="text-align:center;font-size:13px;font-weight:700;color:rgba(255,255,255,.4);margin-top:8px">✓ Already defeated</div>`;
  } else if (bossStatus === 'defeated') {
    // State 2 — Teacher marked defeated, awaiting student confirmation
    bodyHTML = `
      <div class="boss-portrait-wrap enter" style="animation-delay:.06s">
        ${tombstoneHTML}
      </div>
      <div class="boss-defeated-banner enter" style="animation-delay:.10s">⚔️ DEFEATED</div>
      <div class="boss-identity enter" style="animation-delay:.12s">
        <h1 class="boss-name boss-name-defeated">${bossName}</h1>
        ${skillCode ? `<div class="boss-skill">${skillCode}${skillName ? ` — ${skillName}` : ""}</div>` : ""}
      </div>
      ${lore ? `
      <div class="boss-lore-card enter" style="animation-delay:.16s">
        <p class="boss-lore">${lore}</p>
      </div>` : ""}
      <button class="boss-confirm-btn enter" id="boss-confirm-btn" style="animation-delay:.20s">
        📜 I Reviewed My Results — Claim Reward
      </button>`;
  } else if (bossStatus === 'retake') {
    // State 3 — Teacher marked retake
    bodyHTML = `
      <div class="boss-portrait-wrap enter" style="animation-delay:.06s">
        ${portraitHTML}
      </div>
      <div class="boss-identity enter" style="animation-delay:.12s">
        <h1 class="boss-name">${bossName}</h1>
        ${skillCode ? `<div class="boss-skill">${skillCode}${skillName ? ` — ${skillName}` : ""}</div>` : ""}
      </div>
      <div class="boss-retake-card enter" style="animation-delay:.16s">
        <div class="boss-retake-title">↩ Retake Needed</div>
        <p class="boss-retake-msg">Your teacher has reviewed your results. Some areas need more work. Complete the Craft Binder activity below, then use the Retake button.</p>
      </div>
      <button class="boss-fight-btn enter" id="boss-fight-btn" style="animation-delay:.22s">
        ↩ Retake Boss Fight
      </button>`;
  } else if (bossStatus === 'submitted') {
    const holdLines = [
      '"The ancient chamber awaits your results..."',
      '"Your teacher is reviewing the scrolls..."',
      '"Patience, young scholar. Judgment comes..."',
    ];
    const holdText = holdLines[Math.floor(Date.now()/4000) % holdLines.length];
    bodyHTML = `
      <div class="boss-portrait-wrap enter" style="animation-delay:.06s">
        ${portraitHTML}
      </div>
      <div class="boss-identity enter" style="animation-delay:.12s">
        <h1 class="boss-name">${bossName}</h1>
        ${skillCode ? `<div class="boss-skill">${skillCode}${skillName ? ` — ${skillName}` : ''}</div>` : ''}
      </div>
      <div class="boss-holding-card enter" style="animation-delay:.16s">
        <div class="boss-holding-label">⏳ Awaiting Judgment</div>
        <div class="boss-holding-spinner"></div>
        <div class="boss-holding-text">${holdText}</div>
      </div>
      <p class="boss-awaiting-review enter" style="animation-delay:.22s">Your teacher will review your results and update your status here.</p>`;
  } else {
    // State 4 — Normal / not_attempted
    bodyHTML = `
      <div class="boss-portrait-wrap enter" style="animation-delay:.06s">
        ${portraitHTML}
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
      <button class="boss-fight-btn enter" id="boss-complete-btn" style="animation-delay:.28s;background:linear-gradient(135deg,#059669,#047857);margin-top:8px">
        ✅ My Battle Is Complete
      </button>
      <p class="boss-awaiting-review enter" style="animation-delay:.32s">Complete the assessment above, then tap "My Battle Is Complete" — your teacher will review and confirm your results.</p>`;
  }

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

      ${bodyHTML}

    </div>
  </div>
  ${introOverlay}`;
}

function renderPartnerPickerModal() {
  if (!STATE.sqPartnerPickOpen) return '';
  const period = STATE.currentPeriod;
  if (!period) return '';
  const peers = period.students.filter(s => s.id !== STATE.student.id);
  const quest = resolveCollabQuest(STATE.sideQuestTileId || 0, findTileById(STATE.sideQuestTileId));
  return `<div class="grade-modal-overlay" id="partner-pick-overlay">
    <div class="grade-modal" style="max-width:400px">
      <div class="grade-modal-title">🤝 Invite a Partner</div>
      <p class="grade-modal-sub" style="margin:0">${quest.title}</p>
      <div class="partner-list">
        ${peers.length ? peers.map(p => {
          const m = getMergedStudent(p);
          const sel = STATE.sqPartnerPickSelected === p.id;
          return `<button class="partner-row${sel ? ' partner-row-sel' : ''}" data-partner-id="${p.id}">
            <span class="partner-name">${getCharName(p)}</span>
            ${sel ? '<span class="partner-check">✓</span>' : ''}
          </button>`;
        }).join('') : '<p style="color:#94A3B8;text-align:center;font-size:13px">No classmates found.</p>'}
      </div>
      <div class="grade-modal-btns">
        <button class="btn btn-outline-sm" id="partner-pick-cancel">Cancel</button>
        <button class="btn btn-purple" id="partner-pick-send" ${!STATE.sqPartnerPickSelected ? 'disabled' : ''}>📨 Send Invite</button>
      </div>
    </div>
  </div>`;
}

function renderInviteNotifModal() {
  if (!STATE.sqInviteNotifOpen || !STATE.student) return '';
  const invites = getSQInvites(STATE.student.id);
  const pending = Object.values(invites).filter(i => i.status === 'pending');
  if (!pending.length) return '';
  const inv = pending[0];
  return `<div class="grade-modal-overlay" id="invite-notif-overlay">
    <div class="grade-modal" style="max-width:380px">
      <div class="grade-modal-title">📨 Quest Invite</div>
      <p class="grade-modal-sub"><strong>${inv.fromStudentName}</strong> wants to work on <strong>"${inv.questName || inv.questKey}"</strong> with you!</p>
      <div class="grade-modal-btns">
        <button class="btn btn-outline-sm" id="invite-decline">Decline</button>
        <button class="btn btn-purple" id="invite-accept">⚔️ Accept</button>
      </div>
    </div>
  </div>`;
}

function renderTrainingGroundsTutorial() {
  const tile    = STATE.lessonTile || {};
  const land    = STATE.lessonLand || LAND0;
  const student = STATE.student;
  const pos     = student ? getLandPos(student) : {};
  const isCompleted  = (pos.completed || []).includes(tile.id);
  const isActionable = !isCompleted && pos.tile === tile.id;

  const lumielleImg = (() => {
    const npcs = CLASS_DATA?.npcs;
    if (!npcs) return null;
    for (const key of ['lumin_lore','lumin_hint','lumin_encouragement','lumin_easter']) {
      if (npcs[key]?.image) return npcs[key].image;
    }
    return null;
  })();

  const npcClickable = isActionable && !STATE.tgContinueReady;

  const npcDialogue = STATE.tgDialogueOpen ? `
    <div class="npc-overlay" id="tg-npc-overlay">
      <div class="npc-modal">
        <button class="npc-modal-close" id="tg-npc-close" aria-label="Close">✕</button>
        ${lumielleImg ? `<img class="npc-modal-portrait" src="${lumielleImg}" alt="Lumielle" style="border-color:#0891B2"/>` : ''}
        <div class="npc-modal-name">Lumielle</div>
        <div style="text-align:center;margin-bottom:16px">
          <span class="npc-type-badge" style="background:rgba(8,145,178,.18);color:#0891B2;border:1.5px solid #0891B2">HINT</span>
        </div>
        <div class="npc-modal-dialogue">"There you go — that's all it takes. Every Lumin, Thornkin, and creature you meet works the same way. Keep your eyes open. Onward, hero."</div>
        <div class="npc-modal-footer"><button id="tg-npc-close-btn">Close</button></div>
      </div>
    </div>` : '';

  return `
  <div class="screen ls-screen">
    <div class="ls-wrap">
      <div class="ls-nav enter">
        <button class="btn-back" id="ls-back">← Quest Map</button>
        <div class="ls-breadcrumb">
          <span class="ls-bc-land">${land.name}</span>
          <span class="ls-bc-sep">›</span>
          <span class="ls-bc-tile">${tile.name || ""}</span>
        </div>
      </div>

      <div class="tg-intro-card enter" style="animation-delay:.06s">
        <p>Every hero needs a place to call home. This is yours — the quiet corner of the Realm where you'll return between every quest, every trial, every victory. And you're not alone here. The Lumin have lived in this village since before the Realm had a name.</p>
      </div>

      <div class="tg-npc-stage enter" style="animation-delay:1s">
        <div class="tg-npc-figure${npcClickable ? ' tg-npc-clickable' : ''}" ${npcClickable ? 'id="tg-lumielle"' : ''}>
          <div class="tg-npc-ring tg-npc-ring-outer"></div>
          <div class="tg-npc-ring tg-npc-ring-inner"></div>
          ${lumielleImg
            ? `<img class="tg-npc-portrait" src="${lumielleImg}" alt="Lumielle"/>`
            : `<div class="tg-npc-portrait tg-npc-fallback">👤</div>`}
          <div class="tg-npc-name">Lumielle</div>
        </div>
        ${!isCompleted && !STATE.tgContinueReady ? `
          <div class="tg-speech-bubble">
            <p>Psst — over here! I'm Lumielle. You'll meet folks like me in every land you visit. Some of us know a helpful hint. Some of us just like to talk. Go on — give me a click and see what I say.</p>
          </div>` : ''}
      </div>

      ${STATE.tgContinueReady || isCompleted ? `
        <button class="ls-submit-btn enter" id="ls-submit" ${!isActionable ? 'disabled' : ''} data-completed="${!isActionable}" style="animation-delay:.1s">
          ${!isActionable ? 'Quest Complete ✓' : 'Continue →'}
        </button>` : ''}
    </div>
    ${npcDialogue}
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
  const videoOpened = !!progress.videoOpened;
  const mustAllDone = mustDo.length === 0 || mustDo.every((_, i) => (progress.mustDo || [])[i]);
  const pos = student ? getLandPos(student) : {};
  const isCompleted  = (pos.completed || []).includes(tile.id);
  const isBranchTile = !!tile.parentTileId;
  const isRegularLesson = tile.type === 'lesson' && !isBranchTile && !BOSS_SCHEDULE[String(tile.id)];
  const nearpodDone    = isRegularLesson && !!(progress.nearpod       || [])[0];
  const workbookDone   = isRegularLesson && !!(progress.workbook      || [])[0];
  const selfAssessLevel= isRegularLesson ?  ((progress.selfAssessLevel|| [])[0] || 0) : 0;
  const ASSESS_TEXTS   = { 4:"I understand it and could teach it to someone else.", 3:"I understand it.", 2:"I think I get it, but I'm still getting some problems wrong.", 1:"I don't get it. I need help." };
  // Branch tiles are actionable when their parent is completed and they aren't yet.
  // Main-path tiles are actionable only when they are the student's current tile.
  const isActionable = !isCompleted && (
    isBranchTile
      ? (pos.completed || []).includes(tile.parentTileId)
      : pos.tile === tile.id
  );

  const tierHTML = (tasks, tier, cls, icon, label, tierLocked = false, xpNote = null) => {
    if (!tasks.length) return "";
    const prog = progress[tier] || [];
    const isDisabled = tierLocked;
    const rows = tasks.map((t, i) => {
      const checked = prog[i] || false;
      return `<label class="ls-task${checked ? " ls-task-done" : ""}${isDisabled ? " ls-task-locked" : ""}">
        <input type="checkbox" class="ls-check" data-tier="${tier}" data-idx="${i}" ${checked ? "checked" : ""} ${isDisabled ? "disabled" : ""}/>
        <span>${t}</span>
      </label>`;
    }).join("");
    return `<div class="ls-tier ${cls}${tierLocked ? " ls-tier-dimmed" : ""}">
      <div class="ls-tier-header">
        <span class="ls-tier-icon">${icon}</span>
        <span class="ls-tier-label">${label}</span>
        ${xpNote ? `<span class="ls-xp-note">${xpNote}</span>` : ""}
      </div>
      <div class="ls-tier-body">${rows}</div>
    </div>`;
  };

  const loreText = tile.sessionLore || land.lore;
  const loreSection = loreText ? `<div class="ls-lore">
    <div class="ls-lore-inner">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="rgba(0,0,0,.38)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="ls-lore-icon" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
      <p class="ls-lore-text">${loreText}</p>
    </div>
  </div>` : '';

  const _overlays = `
    ${STATE.sideQuestModalOpen ? (() => {
      const tid = STATE.sideQuestTileId;
      const tile = findTileById(tid);
      const collab = resolveCollabQuest(tid, tile);
      const sq = STATE.student ? getActiveSideQuests(STATE.student) : {};
      const collabKey = `${tid}_collab`;
      const collabAccepted = !!sq[collabKey];
      const soloL1 = LAND1_SOLO_QUESTS[tid];
      const soloKey = `${tid}_solo`;
      const soloAccepted = !!sq[soloKey];
      return `<div class="sq-overlay" id="sq-overlay">
        <div class="sq-modal">
          <div class="sq-title">⚔️ Side Quest Unlocked!</div>
          <p class="sq-sub">Complete this bonus challenge to earn extra XP!</p>
          ${soloL1 ? `<div class="sq-card sq-solo">
            <div class="sq-card-type">🎨 Art Deliverable</div>
            <div class="sq-card-name">${soloL1.title}</div>
            <div class="sq-card-desc">${soloL1.desc}</div>
            <div class="sq-card-footer">
              <span class="sq-xp">+${soloL1.xp} XP</span>
              ${soloAccepted
                ? `<span class="sq-accepted">✓ Accepted</span>`
                : `<button class="btn-sq-accept" data-sq-key="${soloKey}" data-sq-idx="${STATE.sideQuestSoloIdx}" data-sq-type="solo">Accept</button>`}
            </div>
          </div>` : ''}
          <div class="sq-card sq-collab">
            <div class="sq-card-type">🤝 Collaborative Quest</div>
            <div class="sq-card-name">${collab.title}</div>
            <div class="sq-card-desc">${collab.desc}</div>
            <div class="sq-card-footer">
              <span class="sq-xp">+${collab.xp} XP</span>
              ${collabAccepted
                ? `<span class="sq-accepted">✓ Accepted</span>`
                : `<button class="btn-sq-accept" data-sq-key="${collabKey}" data-sq-idx="0" data-sq-type="collab">Accept</button>`}
            </div>
          </div>
          <button class="btn-sq-close" id="sq-close">Continue to Quest Map →</button>
        </div>
      </div>`;
    })() : ''}
    ${STATE.gradeModalOpen ? `
    <div class="grade-modal-overlay" id="grade-modal-overlay">
      <div class="grade-modal">
        <div class="grade-modal-title">📊 Log Your Progress</div>
        <p class="grade-modal-sub">Enter the grade you received on this lesson's assignment. This keeps your stats current.</p>
        <input type="number" class="grade-modal-input" id="grade-modal-input" min="0" max="100" placeholder="0 – 100" />
        <div class="grade-modal-btns">
          <button class="btn btn-outline-sm" id="grade-modal-skip">Remind Me Later</button>
          <button class="btn btn-purple" id="grade-modal-submit">✅ Save Grade</button>
        </div>
      </div>
    </div>` : ''}
    ${renderPartnerPickerModal()}`;

  if (isRegularLesson) {
    return `
  <div class="screen ls-screen">
    <div class="sg-modal ls-rlesson-modal enter">
      <button class="npc-modal-close ls-back-btn" aria-label="Close">✕</button>
      <div class="sg-modal-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="rgba(30,27,75,.4)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      </div>
      <div class="sg-modal-title">${tile.sessionTitle || tile.name || "Lesson"}</div>
      ${loreText ? `<p class="sg-modal-flavor">"${loreText}"</p>` : ''}
      <button class="ls-video-btn" id="ls-video-btn" style="margin-bottom:18px">
        <span class="ls-play-icon">▶</span>
        <span>Open NearPod Lesson</span>
      </button>
      <div class="sg-lesson-demo">
        <div class="sg-lesson-section ls-rlesson-red">
          <div class="sg-lesson-label">🔴 Your Quest Checklist</div>
          <label class="sg-check-item${nearpodDone?' sg-check-item-done':''}${!videoOpened?' sg-check-locked':''}">
            <input type="checkbox" class="ls-check-new" data-ls-kind="nearpod" ${nearpodDone?'checked':''} ${!videoOpened?'disabled':''}/>
            I completed all Nearpod activities to the best of my ability
            <span class="sg-reward-note">${nearpodDone?'✓ Earned: +5 Gold / +10 XP':'+5 Gold / +10 XP on completion'}</span>
          </label>
          <label class="sg-check-item${workbookDone?' sg-check-item-done':''}${!nearpodDone?' sg-check-locked':''}">
            <input type="checkbox" class="ls-check-new" data-ls-kind="workbook" ${workbookDone?'checked':''} ${!nearpodDone?'disabled':''}/>
            I showed my completed workbook pages to a peer or the teacher
            <span class="sg-reward-note">${workbookDone?'✓ Earned: +3 Gold / +5 XP':'+3 Gold / +5 XP on completion'}</span>
          </label>
        </div>
        <div class="sg-lesson-section ls-rlesson-teal${!nearpodDone?' ls-section-locked':''}" id="ls-assess-section">
          <div class="sg-lesson-label">🔵 How Am I Comprehending?</div>
          ${[4,3,2,1].map(lvl => `
            <label class="sg-assess-demo sg-assess-demo-${lvl}${selfAssessLevel===lvl?' ls-assess-selected':''}" data-level="${lvl}">
              <input type="radio" name="ls-self-assess" class="ls-assess-radio" data-level="${lvl}" ${selfAssessLevel===lvl?'checked':''} ${!nearpodDone?'disabled':''}/>
              <span class="sg-assess-demo-num">${lvl}.</span>
              <span>${ASSESS_TEXTS[lvl]}${lvl===1?' <span class="sg-assess-alert">— alerts your teacher</span>':''}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="sg-modal-footer" style="margin-top:14px">
        <button class="ls-submit-btn" id="ls-submit" ${(!isActionable || !nearpodDone) ? "disabled" : ""} data-completed="${!isActionable}" style="width:100%">
          ${!isActionable ? "Quest Complete ✓" : nearpodDone ? "✅ I'm Ready!" : "Complete Lesson"}
        </button>
      </div>
      ${wbRef ? `<div class="ls-workbook">${wbRef}</div>` : ""}
    </div>
    ${_overlays}
  </div>`;
  }

  return `
  <div class="screen ls-screen">
    <div class="ls-card enter">
      <button class="npc-modal-close ls-back-btn" aria-label="Close">✕</button>
      <div class="ls-breadcrumb" style="padding-right:28px;margin-bottom:4px">
        <button class="ls-bc-back ls-back-btn">← Quest Map</button>
        <span class="ls-bc-sep" style="margin:0 4px;opacity:.35">|</span>
        <span class="ls-bc-land">${land.name}</span>
        <span class="ls-bc-sep">›</span>
        <span class="ls-bc-tile">${tile.name || ""}${tile.sessionTitle ? ` — ${tile.sessionTitle}` : ""}</span>
      </div>
      ${(() => {
        const bs = BOSS_SCHEDULE[String(tile.id)];
        if (bs && bs.portrait) {
          const isFGK = bs.type === 'finalGatekeeper';
          const w = isFGK ? 'clamp(220px,85%,340px)' : 'clamp(180px,75%,280px)';
          const bookFallback = "<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' width=\\'48\\' height=\\'48\\' fill=\\'none\\' stroke=\\'rgba(30,27,75,.2)\\' stroke-width=\\'1.5\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><path d=\\'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z\\'/><path d=\\'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z\\'/></svg>";
          return `<div style="text-align:center;padding:12px 0 4px">
            ${isFGK ? `<div style="font-size:11px;font-weight:800;letter-spacing:1.8px;color:rgba(251,191,36,.85);text-transform:uppercase;margin-bottom:8px">Final Trial of the Vale</div>` : ''}
            <div style="width:${w};aspect-ratio:16/9;overflow:hidden;border-radius:10px;margin:0 auto;background:rgba(30,27,75,.08)">
              <img src="/bosses/${bs.portrait}" alt="${bs.bossName || ''}"
                   style="width:100%;height:100%;object-fit:cover;display:block"
                   onerror="this.outerHTML='${bookFallback}'"/>
            </div>
          </div>`;
        }
        return `<div style="text-align:center;padding:12px 0 4px" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="rgba(30,27,75,.2)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>`;
      })()}
      ${loreSection}
      <button class="ls-video-btn" id="ls-video-btn">
        <span class="ls-play-icon">▶</span>
        <span>Open NearPod Lesson</span>
      </button>
      <div class="ls-tiers">
        ${!videoOpened ? `<div class="ls-video-lock-hint">🔒 Watch the video first to unlock this checklist.</div>` : ''}
        ${tierHTML(mustDo, "mustDo", "ls-tier-must", "🔴", "Must Do", !videoOpened)}
        ${tierHTML(shouldDo, "shouldDo", "ls-tier-should", "🟡", "Should Do", !mustAllDone, "+5 XP")}
        ${tierHTML(aspireTo, "aspireTo", "ls-tier-aspire", "🟢", "Aspire To", !mustAllDone, "+5 XP")}
      </div>
      <button class="ls-submit-btn" id="ls-submit" ${(!isActionable || !mustAllDone) ? "disabled" : ""} data-completed="${!isActionable}">
        ${!isActionable ? "Quest Complete ✓" : mustAllDone ? "✅ I'm Ready!" : "🔒 Complete Must Do tasks to continue"}
      </button>
      ${wbRef ? `<div class="ls-workbook">${wbRef}</div>` : ""}
    </div>
    ${_overlays}
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
  const student = STATE.student;
  const we   = CLASS_DATA && CLASS_DATA.writingEvents && CLASS_DATA.writingEvents["land" + land.id];
  const writeStatus = getWriteStatus(student, land.id);

  const particles = Array.from({length:16}, (_,i) => {
    const x=3+((i*67)%94), y=3+((i*137)%94), size=1.5+(i%4);
    const delay=((i*0.38)%3.2).toFixed(2), dur=(2.2+(i%4)*.6).toFixed(1);
    return `<span class="we-particle" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
  }).join('');

  const bossName = (we && we.boss) ? we.boss : 'The Ancient Scribe';
  const bossSrc  = we && we.portrait ? `/bosses/${we.portrait}` : null;
  const bossPortrait = bossSrc
    ? `<div class="boss-portrait-wrap" style="margin:12px 0 4px"><img class="boss-portrait" src="${bossSrc}" alt="${bossName}" width="200" height="200" style="width:clamp(140px,35vw,200px);height:clamp(140px,35vw,200px)" onerror="this.parentNode.innerHTML='<div class=\\'boss-portrait boss-portrait-fallback\\'>📜</div>'"/></div>`
    : `<div style="font-size:56px;text-align:center;margin:12px 0">📜</div>`;

  const introOverlay = STATE.scribeIntroOpen ? `
    <div class="boss-intro-overlay" id="scribe-intro-overlay">
      <div class="boss-intro-card">
        <div class="boss-intro-eyebrow">✦ The Scribe's Sanctum ✦</div>
        ${bossSrc ? `<img class="boss-intro-portrait" src="${bossSrc}" onerror="this.style.display='none'"/>` : `<div style="font-size:48px;margin:0 auto 12px;text-align:center">📜</div>`}
        <div class="boss-intro-name">${bossName}</div>
        <p class="boss-intro-text">"Welcome, young author. A great work stirs within you. Gather your thoughts, hone your craft, and let the story emerge. The Sanctum is yours."</p>
        <button class="boss-intro-btn" id="scribe-intro-close">Answer the Calling →</button>
      </div>
    </div>` : '';

  if (writeStatus === 'confirmed') {
    return `<div class="screen we-screen">${particles}
      <a class="we-return" id="we-back">← Return to Map</a>
      <div class="we-inner">
        <div class="we-header">
          <div class="we-title">⚔ THE SCRIBE'S SANCTUM ⚔</div>
          ${bossPortrait}
          <div class="we-boss scribe-approved-banner">✅ The Scribe is Pleased</div>
        </div>
        <div style="text-align:center;font-size:13px;font-weight:700;color:rgba(255,255,255,.4);margin-top:8px">✓ Writing task completed</div>
      </div>${introOverlay}
    </div>`;
  }

  if (writeStatus === 'approved') {
    return `<div class="screen we-screen">${particles}
      <a class="we-return" id="we-back">← Return to Map</a>
      <div class="we-inner">
        <div class="we-header">
          <div class="we-title">⚔ THE SCRIBE'S SANCTUM ⚔</div>
          ${bossPortrait}
          <span class="scribe-approved-glow">✅</span>
          <div class="scribe-approved-banner">The Scribe is Pleased!</div>
          <div class="we-boss" style="color:rgba(255,255,255,.65)">${bossName}</div>
        </div>
        <div class="we-submitted-card" style="background:rgba(52,211,153,.08);border-color:rgba(52,211,153,.25)">
          <div class="we-submitted-body">"Your words have found their strength. The Sanctum acknowledges your effort. Claim your reward, young author — you have earned it."</div>
        </div>
        <button class="we-ready-btn enter" id="we-confirm-btn" style="background:linear-gradient(135deg,#059669,#047857)">
          📜 Claim My Reward
        </button>
      </div>${introOverlay}
    </div>`;
  }

  if (writeStatus === 'submitted') {
    const holdLines = [
      '"The Scribe studies your words with careful eyes..."',
      '"Your story echoes through the halls of the Sanctum..."',
      '"Patience, young author. The judgment comes in time..."',
    ];
    const holdText = holdLines[Math.floor(Date.now()/4000) % holdLines.length];
    return `<div class="screen we-screen">${particles}
      <a class="we-return" id="we-back">← Return to Map</a>
      <div class="we-inner">
        <div class="we-header">
          <div class="we-title">⚔ THE SCRIBE'S SANCTUM ⚔</div>
          ${bossPortrait}
          <div class="we-boss">${bossName}</div>
        </div>
        <div class="we-submitted-card">
          <span class="we-submitted-icon">⏳</span>
          <div class="we-submitted-title">The Scribe Reviews Your Work</div>
          <div class="we-submitted-body">${holdText}</div>
        </div>
        <p class="boss-awaiting-review" style="margin-top:12px">Your teacher will review your writing and update your status here.</p>
      </div>${introOverlay}
    </div>`;
  }

  if (writeStatus === 'revision') {
    return `<div class="screen we-screen">${particles}
      <a class="we-return" id="we-back">← Return to Map</a>
      <div class="we-inner">
        <div class="we-header">
          <div class="we-title">⚔ THE SCRIBE'S SANCTUM ⚔</div>
          ${bossPortrait}
          <div class="we-boss">${bossName}</div>
        </div>
        <div class="boss-retake-card enter">
          <div class="boss-retake-title">📝 Revision Requested</div>
          <p class="boss-retake-msg">Your teacher has reviewed your writing and has some feedback. Revise your work in the Craft Binder, then resubmit when ready.</p>
        </div>
        <button class="we-ready-btn enter" id="we-resubmit-btn" style="background:linear-gradient(135deg,#7C3AED,#5B21B6)">
          ✍ Resubmit My Writing
        </button>
      </div>${introOverlay}
    </div>`;
  }

  // not_attempted — normal checklist UI
  const prog = tile ? getTaskProgress(student.id, tile.id) : {};
  const checks = prog.event || [];
  const checklist = we ? we.checklist : [];
  const allDone = checklist.length > 0 && checklist.every((_,i) => checks[i]);
  const checkItems = checklist.map((item,i) => {
    const checked = checks[i] || false;
    return `<label class="we-check-item${checked?" checked":""}">
      <input type="checkbox" class="we-cb" data-idx="${i}"${checked?" checked":""}>
      <span class="we-check-icon">${checked?"✓":""}</span>
      <span>${item}</span>
    </label>`;
  }).join('') || `<p style="color:rgba(255,255,255,.4);text-align:center;font-size:13px">Checklist coming soon.</p>`;

  return `<div class="screen we-screen">${particles}
    <a class="we-return" id="we-back">← Return to Map</a>
    <div class="we-inner">
      <div class="we-header">
        <div class="we-title">⚔ THE SCRIBE'S SANCTUM ⚔</div>
        ${we && we.portrait ? `<div class="boss-portrait-wrap" style="margin:12px 0 4px">
          <img class="boss-portrait" src="/bosses/${we.portrait}" alt="${bossName}" width="260" height="260"
               style="width:clamp(160px,40vw,260px);height:clamp(160px,40vw,260px)"
               onerror="this.parentNode.innerHTML='<div class=\\'boss-portrait boss-portrait-fallback\\' style=\\'width:clamp(160px,40vw,260px);height:clamp(160px,40vw,260px)\\'>📜</div>'"/>
        </div>` : ''}
        <div class="we-boss">${bossName} awaits...</div>
        <div class="we-badges">
          ${we ? `<span class="we-badge we-badge-type">${we.type.toUpperCase()}</span>` : ''}
          ${we ? `<span class="we-badge we-badge-std">${we.standard}</span>` : ''}
        </div>
      </div>
      <div class="we-prompt-card">
        <div class="we-prompt-label">THE PROMPT</div>
        <div class="we-prompt-text">${we ? we.prompt : "Your teacher will provide the writing prompt."}</div>
      </div>
      <div class="we-checklist-section">
        <div class="we-cl-title">Writer's Checklist</div>
        <div class="we-checklist" id="we-checklist">${checkItems}</div>
        <button class="we-ready-btn${allDone?'':" disabled"}" id="we-ready-btn"${allDone?'':' disabled'}>
          ${allDone ? '⚔ My Battle Is Complete' : 'Check off all items to continue'}
        </button>
      </div>
    </div>
    ${introOverlay}
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
    // currentLand:0 must be written explicitly — without it getLandPos sees currentLand===undefined
    // and resets the student back to tile 2 with empty completedTiles on every render
    saveStudentOverride(student.id, { currentLand:0, currentTile:next, completedTiles:completed });
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
      { icon:"❤️", name:"HP — Health Points",     color:"#C0392B", desc:"Your academic health. HP mirrors your performance on exit tickets, letting you know if you are prepared to fight the gatekeeper." },
      { icon:"💙", name:"MP — Mana Points",        color:"#1A6B8A", desc:"Your behavior score. MP reflects how you show up every day — respect, effort, and how you treat your guild." },
      { icon:"💚", name:"SP — Stamina Points",     color:"#27AE60", desc:"Your effort score. SP tracks how hard you're working — completing tasks and pushing through challenges." },
      { icon:"⭐", name:"XP — Experience Points",  color:"#D4A017", desc:"Counts up forever and never goes down. Every lesson earns XP. This is how you will level up. Prizes are awarded for certain level milestones." },
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
      <div class="sg-armory-footer-note">You can check your stats anytime from your Character Hub.</div>
      <div class="sg-armory-pace-note">Every hero levels at their own pace in the Realm. Some heroes are quick with a blade, some take their time mastering old magic — both end up just as strong. Watch your own stats grow. Your journey isn't a race against anyone else's.</div>`;
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

  // Tile 1 — The Notice Board: Hometown intro + Lumielle NPC sequence
  if (tile.id === 1) {
    const lumielleImg1 = (() => {
      const npcs = CLASS_DATA?.npcs;
      if (!npcs) return null;
      for (const key of ['lumin_lore','lumin_hint','lumin_encouragement','lumin_easter']) {
        if (npcs[key]?.image) return npcs[key].image;
      }
      return null;
    })();
    const npc1Clickable = isCurrent && !isDone && !STATE.tgContinueReady;
    const npc1Dialogue = STATE.tgDialogueOpen
      ? '<div class="npc-overlay" id="tg-npc-overlay">'
        + '<div class="npc-modal">'
        + '<button class="npc-modal-close" id="tg-npc-close" aria-label="Close">✕</button>'
        + (lumielleImg1 ? '<img class="npc-modal-portrait" src="' + lumielleImg1 + '" alt="Lumielle" style="border-color:#0891B2"/>' : '')
        + '<div class="npc-modal-name">Lumielle</div>'
        + '<div style="text-align:center;margin-bottom:16px"><span class="npc-type-badge" style="background:rgba(8,145,178,.18);color:#0891B2;border:1.5px solid #0891B2">HINT</span></div>'
        + '<div class="npc-modal-dialogue">"There you go — that\'s all it takes. Every Lumin, Thornkin, and creature you meet works the same way. Keep your eyes open. Onward, hero."</div>'
        + '<div class="npc-modal-footer"><button id="tg-npc-close-btn">Close</button></div>'
        + '</div></div>'
      : '';
    const npc1Stage = '<div class="tg-npc-stage" style="display:flex;align-items:flex-start;gap:12px;margin:10px 0">'
      + '<div class="tg-npc-figure' + (npc1Clickable ? ' tg-npc-clickable' : '') + '"' + (npc1Clickable ? ' id="tg-lumielle"' : '') + '>'
      + '<div class="tg-npc-ring tg-npc-ring-outer"></div>'
      + '<div class="tg-npc-ring tg-npc-ring-inner"></div>'
      + (lumielleImg1 ? '<img class="tg-npc-portrait" src="' + lumielleImg1 + '" alt="Lumielle"/>' : '<div class="tg-npc-portrait tg-npc-fallback">👤</div>')
      + '<div class="tg-npc-name">Lumielle</div>'
      + '</div>'
      + (!isDone && !STATE.tgContinueReady
        ? '<div class="tg-speech-bubble" style="flex:1"><p>Psst — over here! I\'m Lumielle. You\'ll meet folks like me in every land you visit. Some of us know a helpful hint. Some of us just like to talk. Go on — give me a click and see what I say.</p></div>'
        : STATE.tgContinueReady
          ? '<div class="tg-speech-bubble" style="flex:1"><p>There you go — that\'s all it takes. Every Lumin, Thornkin, and creature you meet works the same way. Keep your eyes open. Onward, hero.</p></div>'
          : '')
      + '</div>';
    const nb1Body = '<p class="sg-modal-flavor">"' + tile.flavor + '"</p>'
      + (tile.flavorDramatic ? '<p class="sg-modal-flavor-dramatic">' + tile.flavorDramatic + '</p>' : '')
      + '<div class="tg-intro-card" style="margin:10px 0 14px;padding:12px 14px;background:rgba(124,58,237,.07);border-radius:12px;font-size:13px;line-height:1.6;color:#374151">'
      + 'Every hero needs a place to call home. This is yours — the quiet corner of the Realm where you\'ll return between every quest, every trial, every victory. And you\'re not alone here. The Lumin have lived in this village since before the Realm had a name.'
      + '</div>'
      + npc1Stage;
    const nb1Footer = isDone
      ? '<div style="color:#10B981;font-weight:700;font-size:14px">✓ Completed</div>'
      : isCurrent
        ? '<button class="btn btn-purple" id="sg-complete-btn"' + (!STATE.tgContinueReady ? ' disabled' : '') + '>Mark Complete ✓</button>'
        : '<div style="color:rgba(0,0,0,.35);font-size:13px">Complete earlier tiles first</div>';
    return '<div class="npc-overlay" id="sg-overlay">'
      + '<div class="sg-modal">'
      + '<button class="npc-modal-close" id="sg-close">✕</button>'
      + '<div class="sg-modal-icon">' + icon + '</div>'
      + '<div class="sg-modal-title">' + tile.name + '</div>'
      + '<div class="sg-modal-body">' + nb1Body + '</div>'
      + '<div class="sg-modal-footer">' + nb1Footer + '</div>'
      + '</div></div>'
      + npc1Dialogue;
  }

  let body = `<p class="sg-modal-flavor">"${tile.flavor}"</p>${tile.flavorDramatic ? `<p class="sg-modal-flavor-dramatic">${tile.flavorDramatic}</p>` : ''}`;

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
        <div class="sg-lesson-label">🔴 Your Quest Checklist</div>
        <label class="sg-check-item"><input type="checkbox" class="sg-demo-cb"> I watched the practice video all the way through <span class="sg-reward-note">+5 Gold / +10 XP on completion</span></label>
        <label class="sg-check-item sg-check-locked"><input type="checkbox" class="sg-demo-cb" disabled> I showed my practice work to a partner or the teacher <span class="sg-reward-note">+3 Gold / +5 XP — unlocks after the first box is checked</span></label>
      </div>
      <div class="sg-lesson-section">
        <div class="sg-lesson-label">🟡 How Am I Comprehending?</div>
        <p class="sg-assess-intro">After every lesson, you'll rate how well you understood it. If you're stuck, this is how your teacher finds out — fast.</p>
        <label class="sg-assess-demo sg-assess-demo-4"><input type="radio" name="sg-demo-assess" disabled> <span class="sg-assess-demo-num">4.</span> I understand it and could teach it to someone else.</label>
        <label class="sg-assess-demo sg-assess-demo-3"><input type="radio" name="sg-demo-assess" disabled> <span class="sg-assess-demo-num">3.</span> I understand it.</label>
        <label class="sg-assess-demo sg-assess-demo-2"><input type="radio" name="sg-demo-assess" disabled> <span class="sg-assess-demo-num">2.</span> I think I get it, but I'm still getting some problems wrong.</label>
        <label class="sg-assess-demo sg-assess-demo-1"><input type="radio" name="sg-demo-assess" disabled> <span class="sg-assess-demo-num">1.</span> I don't get it. I need help. <span class="sg-assess-alert">— automatically alerts your teacher</span></label>
      </div>
      <div class="sg-lesson-section sg-loot-note">
        <div class="sg-lesson-label">🟢 Don't Forget the Loot Path</div>
        <p class="sg-loot-desc">Should Do and Aspire To challenges aren't part of every lesson. Look for their own special tiles branching off the main path. Complete them for bonus Gold or other rewards!</p>
      </div>
    </div>`;
  } else if (tile.sgModal === "gate") {
    body += `<div class="sg-gate-banner">🗺️ Ahead of you: The Verdant Vale — six lessons, a Writing Event, and a Master Boss guarding its secrets.</div>`;
  }

  let footer = "";
  if (isDone) {
    footer = `<div style="color:#10B981;font-weight:700;font-size:14px">✓ Completed</div>`;
  } else if (isCurrent) {
    if (tile.sgModal === "avatar") {
      footer = `<button class="btn btn-purple" style="flex:1" id="sg-open-avatar">🎨 Customize Hero</button>
                <button class="btn btn-purple" style="flex:1" id="sg-complete-btn">Continue →</button>`;
    } else {
      const label = tile.sgModal === "gate" ? "Begin Adventure! 🗺️" : "Mark Complete ✓";
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
  const firstName = (getCharName(STATE.student) || "Adventurer").split(" ")[0];
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

function renderBossLockedModal() {
  if (!STATE.bossLockedOpen) return "";
  return `<div class="npc-overlay" id="boss-locked-overlay">
    <div class="npc-modal" style="max-width:360px">
      <button class="npc-modal-close" id="boss-locked-close">✕</button>
      <div style="font-size:48px;text-align:center;margin-bottom:12px">🔒</div>
      <div class="npc-modal-name" style="font-size:17px">Foe Not Yet Unlocked</div>
      <div class="npc-modal-dialogue" style="margin-top:16px">"This foe is not yet ready to face you — or perhaps it is you who is not yet ready. Sharpen your skills with a side quest, or lend your strength to a fellow hero still finding their way."</div>
      <div class="npc-modal-footer"><button id="boss-locked-close-btn">Understood</button></div>
    </div>
  </div>`;
}

function renderCapMessageModal() {
  if (!STATE.capMessageOpen) return "";
  return `<div class="npc-overlay" id="cap-msg-overlay">
    <div class="npc-modal" style="max-width:360px">
      <button class="npc-modal-close" id="cap-msg-close">✕</button>
      <div style="font-size:48px;text-align:center;margin-bottom:12px">⏳</div>
      <div class="npc-modal-name" style="font-size:17px">You've reached today's stopping point</div>
      <div class="npc-modal-dialogue" style="margin-top:16px">"More quests will unlock soon — your teacher is preparing the next stretch of your journey. Keep practicing, side quests await!"</div>
      <div class="npc-modal-footer"><button id="cap-msg-close-btn">Got it!</button></div>
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

  const completedInLand = (pos.completed || []).some(tid =>
    land.tiles.some(t => t.id === tid && t.type === 'lesson')
  );
  const sqBoardHTML = STATE.sqBoardOpen && STATE.sqBoardLandId === land.id ? (() => {
    const completed = pos.completed || [];
    const activeSQ = getActiveSideQuests(STATE.student);
    const completedSQ = (getOverrides().students[String(STATE.student.id)] || {}).completedQuests || [];
    const rows = land.tiles.filter(t => t.type === 'lesson').map(t => {
      const lessonDone = completed.includes(t.id);
      return { q: resolveCollabQuest(t.id, t), type:'collab', key:`${t.id}_collab`, tileId:t.id, lessonDone, tileName:t.name };
    });
    return `<div class="sq-board-overlay" id="sq-board-overlay">
      <div class="sq-board-modal">
        <button class="crafting-close" id="sq-board-close">✕</button>
        <div class="sq-board-title">📜 Side Quest Board</div>
        <div class="sq-board-subtitle">${land.name}</div>
        <div class="sq-board-list">
          ${rows.map(({ q, type, key, tileId, lessonDone, tileName }) => {
            const isActive    = !!activeSQ[key];
            const isDone      = completedSQ.some(c => c.key === key);
            const locked      = !lessonDone;
            const statusBadge = isDone ? `<span class="sq-board-badge sq-board-done">✓ Done</span>`
              : isActive ? `<span class="sq-board-badge sq-board-active">⚡ Active</span>`
              : locked   ? `<span class="sq-board-badge sq-board-locked">🔒 Locked</span>`
              :            `<button class="ls-sq-accept-btn sq-board-accept sq-board-badge sq-board-accept-badge" data-sq-key="${key}" data-sq-idx="0" data-sq-type="${type}" data-sq-tile="${tileId}" data-sq-land="${land.id}">Accept</button>`;
            return `<div class="sq-board-row${locked ? ' sq-board-row-locked' : ''}">
              <div class="sq-board-row-info">
                <span class="sq-board-row-type">🤝 Collab</span>
                <span class="sq-board-row-name">${q.title}</span>
                <span class="sq-board-row-xp">+${q.xp} XP</span>
              </div>
              <div class="sq-board-row-right">
                ${statusBadge}
                <button class="sq-view-lesson-btn" data-sq-tile="${tileId}" data-sq-land="${land.id}">📖 Lesson${tileName ? ` · ${tileName}` : ''}</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  })() : '';

  return `<div class="screen land-map-screen">
    <div class="lm-header">
      <button class="btn btn-outline-sm" id="qm-back">← Hub</button>
      <span class="lm-title">🗺 ${land.name}</span>
      <div class="lm-lands">${landDots}</div>
      <span style="font-size:12px;font-weight:800;color:rgba(255,255,255,.55)">Lv.${student.level}</span>
    </div>
    <div class="lm-svg-wrap">
      <div class="lm-map-bg" ${land.bgImage ? `style="background-image:url('${land.bgImage}')"` : ""}></div>
      <svg viewBox="0 -30 ${land.W||LW.W} ${(land.H||LW.H)+30}" style="width:100%;height:auto;max-width:${land.W||LW.W}px;display:block" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        ${buildLandSVG(land,pos,false,"")}
      </svg>
    </div>
    <button class="qm-help-btn${STATE.helpFlagged?' flagged':''}" id="qm-help-btn" ${STATE.helpFlagged?'disabled':''}>
      ${STATE.helpFlagged?'🙋 Help Requested':'🤚 Need Help'}
    </button>
    ${completedInLand ? `
    <button class="sq-board-banner" id="sq-board-btn">
      <span class="sq-board-banner-scroll">📜</span>
      <span class="sq-board-banner-text">Side Quest Board</span>
      <span class="sq-board-banner-sub">View available side quests for this land</span>
    </button>` : ''}
    ${sqBoardHTML}
    ${renderPartnerPickerModal()}
    ${renderNpcModal()}
    ${renderSg0Modal()}
    ${renderGuildReveal()}
    ${renderBossLockedModal()}
    ${renderCapMessageModal()}
    ${STATE.sanctumReturnOpen ? (() => {
      const sanctumLand = LANDS.find(l => l.id === STATE.sanctumReturnLandId) || LANDS[0];
      const dungeonTile = sanctumLand.tiles.find(t => t.type === 'dungeon');
      const dungeonName = dungeonTile ? dungeonTile.name : 'the dungeon';
      return `<div class="sanctum-return-overlay" id="sanctum-return-popup">
        <div class="sanctum-return-card">
          <h2>⚔ ${dungeonName}</h2>
          <p>"${dungeonName} senses your newfound power... The dungeon awaits."</p>
          <button class="boss-intro-btn" id="sanctum-return-close">Return to the Map</button>
        </div>
      </div>`;
    })() : ''}
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
          <div class="tt-name">${getCharName(s)}</div>
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
  <div class="screen">
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
                <div class="tt-name">${getCharName(s)}</div>
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

function renderTeacherStudentMap() {
  const student = getMergedStudent(STATE.teacherViewStudent);
  const pos = getLandPos(STATE.teacherViewStudent);
  const land = getLandData(pos.land);
  return `<div class="screen land-map-screen">
    <div class="lm-top-bar">
      <button class="lm-back-btn" id="tsm-back">← Dashboard</button>
      <span class="lm-title">🗺 ${getCharName(STATE.teacherViewStudent) || `Student ${STATE.teacherViewStudent.id}`} — ${land.name}</span>
      <span style="font-size:11px;font-weight:700;opacity:.6;color:white">TEACHER VIEW · READ ONLY</span>
    </div>
    <div class="lm-svg-wrap">
      <div class="lm-map-bg" ${land.bgImage ? `style="background-image:url('${land.bgImage}')"` : ""}></div>
      <svg viewBox="0 -30 ${land.W||LW.W} ${(land.H||LW.H)+30}" style="width:100%;height:auto;max-width:${land.W||LW.W}px;display:block" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        ${buildLandSVG(land, pos, false, "")}
      </svg>
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
      const first=(getCharName(s)||"?").split(" ")[0].slice(0,5);
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
  const pacing = getPacingSettings();
  const pacingExpected = (() => {
    if (!pacing || !pacing.startDate || !pacing.targetDate || !pacing.targetCount) return null;
    const start = new Date(pacing.startDate).getTime();
    const target = new Date(pacing.targetDate).getTime();
    const totalMs = target - start;
    if (totalMs <= 0) return null;
    const fraction = Math.max(0, Math.min(1, (Date.now() - start) / totalMs));
    return Math.round(fraction * Number(pacing.targetCount));
  })();
  const craftReqs = getCraftRequests();
  const pendingPotions = Object.entries(craftReqs)
    .map(([sid, req]) => {
      const allStudents = periods.flatMap(p => p.students);
      const stu = allStudents.find(s => String(s.id) === sid);
      return stu ? { student: stu, ...req } : null;
    }).filter(Boolean);

  const tabs = periods.map((p, i) => `
    <button class="period-tab ${i===STATE.teacherPeriodIdx?"active":""}" data-pi="${i}">${p.periodName}</button>
  `).join("");

  const periodFlags = period.students.filter(s => flags[String(s.id)]);

  const cards = period.students.map(s => {
    const m        = getMergedStudent(s);
    const ov       = getOverrides().students[String(s.id)] || {};
    const unclaimed = !ov.claimed;
    const sFlags   = getStudentFlags(s);
    const hasFlags = sFlags.length > 0;
    const rosterName = _roster[String(s.id)] || null;

    const cc  = unclaimed ? "#9CA3AF" : CLS_COLOR[clsKey(s, m)];
    const av  = m.avatar || "avatar_blankchibi.png";
    const hpP = Math.round((m.hp/10)*100);
    const mpP = Math.round((m.mp/10)*100);
    const spP = Math.round((getEffectiveSP(s)/10)*100);
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
    const flagBadges = sFlags.map(f =>
      `<span class="t-flag-badge" style="background:${f.color}" data-flag-key="${f.key}" data-flag-sid="${s.id}">
        ${f.icon}<span class="t-flag-tip">${f.tip}</span>
      </span>`
    ).join('');
    const menuOpen = STATE.cardMenuSid === s.id;
    return `
    <div class="t-s-card ${hasFlags?"has-flag":""} ${unclaimed?"t-s-card-unclaimed":""}" data-sid="${s.id}" tabindex="0" role="button" aria-label="Edit ${getCharName(s)}">
      <button class="t-card-menu-btn" data-card-menu="${s.id}" title="More actions">⋮</button>
      ${menuOpen ? `<div class="t-card-menu-dropdown" data-card-menu-drop="${s.id}">
        <button class="t-card-menu-item" data-view-map="${s.id}">🗺 View Map</button>
        <button class="t-card-menu-item" data-award-companion="${s.id}">🐾 Award Companion</button>
        <button class="t-card-menu-item" data-reroll-name="${s.id}">🎲 Reroll Name</button>
      </div>` : ''}
      ${hasFlags ? `<div class="t-flag-badges">${flagBadges}</div>` : ''}
      <div class="t-s-top">
        <div class="t-s-avatar" style="border-color:${cc};padding:0"><img src="/avatars/${av}" alt="${getCharName(s)}" width="44" height="44" loading="lazy"/></div>
        <div class="t-s-info">
          <div class="t-s-name"><span class="t-s-num">${s.id}</span>${unclaimed ? '<span class="t-s-unclaimed-lbl">Unclaimed</span>' : ` – ${getCharName(s)}`}</div>
          ${rosterName ? `<div class="t-s-roster-name">${rosterName}</div>` : ''}
          <div class="t-s-cls" style="color:${cc}">${unclaimed ? "No character yet" : `Lv.${m.level} ${CLS_LABEL[clsKey(s, m)]}`}</div>
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
    </div>`;
  }).join("");

  return `
  <div class="screen t-dash-screen">
    <div class="t-dash-wrap">
      <div class="t-dash-hdr">
        <span class="t-dash-title">👩‍🏫 Teacher Dashboard</span>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-outline-sm" id="t-board-view">📡 Board View</button>
          <button class="btn btn-outline-sm" id="t-boss-roster-btn">⚔️ Battle Records</button>
          <button class="btn btn-outline-sm" id="t-judgment-hall-btn">⚖️ Judgment Hall</button>
          <button class="btn btn-outline-sm" id="t-boss-backfill-btn" title="One-time backfill for seeded test accounts">🔧 Backfill Boss States</button>
          <button class="btn btn-outline-sm" id="t-class-settings-btn">⚙️ Class Settings</button>
          <button class="btn btn-outline-sm t-gold-shop-btn" id="t-gold-shop-btn">
            🪙 Gold Shop${(() => { const n = Object.keys(getShopPending()).length; return n ? `<span class="t-gold-badge">${n}</span>` : ''; })()}
          </button>
          <button class="btn btn-outline-sm" id="t-mp-bulk-btn">💙 MP Bulk Edit</button>
          <button class="btn btn-outline-sm" id="t-dash-logout">Exit</button>
        </div>
      </div>
      <div class="period-tabs">${tabs}</div>
      ${STATE.classSettingsOpen ? `<div class="cs-overlay" id="cs-overlay">
        <div class="cs-modal">
          <div class="cs-hdr">
            <span class="cs-title">⚙️ Class Settings</span>
            <button class="cs-close" id="cs-close">✕</button>
          </div>
          <div class="cs-section">
            <div class="cs-section-title">📈 SP Pacing ${pacing ? `<span class="pacing-on-badge">ON — expect ${pacingExpected ?? '?'} sessions by today</span>` : '<span class="pacing-off-badge">OFF</span>'}</div>
            <div class="pacing-form" style="border-top:none;padding:0">
              <label class="pacing-lbl">Class Start Date
                <input type="date" id="pacing-start" value="${pacing ? pacing.startDate : ''}" class="pacing-input"/>
              </label>
              <label class="pacing-lbl">Target Date
                <input type="date" id="pacing-target-date" value="${pacing ? (pacing.targetDate || '') : ''}" class="pacing-input"/>
              </label>
              <label class="pacing-lbl">Sessions by Target Date
                <input type="number" id="pacing-target-count" min="1" max="200" value="${pacing ? (pacing.targetCount || '') : ''}" class="pacing-input pacing-input-sm" placeholder="e.g. 24"/>
              </label>
              <button class="btn-pacing-save" id="pacing-save">Save</button>
              ${pacing ? `<button class="btn-pacing-off" id="pacing-off">Turn Off</button>` : ''}
            </div>
          </div>
          ${(() => {
            // Find the highest land most students are on (land 0 = starting grounds, skip it)
            const landCounts = {};
            for (const p of periods) for (const s of p.students) {
              const lid = getLandPos(s).land;
              if (lid > 0) landCounts[String(lid)] = (landCounts[String(lid)] || 0) + 1;
            }
            let activeLandId = 1;
            let best = 0;
            for (const [lid, cnt] of Object.entries(landCounts)) {
              if (cnt > best) { best = cnt; activeLandId = Number(lid); }
            }
            return `
          <div class="cs-section">
            <div class="cs-section-title">📋 Session Settings — Exit Ticket Toggles</div>
            <div class="cs-accordions">
              ${LANDS.map(land => {
                const lessonTiles = land.tiles.filter(t => t.type === 'lesson');
                if (!lessonTiles.length) return '';
                return `<details class="cs-land-details" ${land.id === activeLandId ? 'open' : ''}>
                  <summary class="cs-land-summary">${land.name.toUpperCase()}</summary>
                  <div class="cs-land-body">
                    ${lessonTiles.map(t => {
                      const on = getExitTicketEnabled(t.id);
                      const label = t.sessionTitle ? `${t.name} — ${t.sessionTitle}` : t.name;
                      return `<div class="ss-row">
                        <span class="ss-tile-name">${label}</span>
                        <button class="ss-toggle ${on ? 'ss-on' : 'ss-off'}" data-et-tile="${t.id}" data-et-val="${on ? '1' : '0'}">
                          ${on ? '✅ Exit Ticket ON' : 'Exit Ticket OFF'}
                        </button>
                      </div>`;
                    }).join('')}
                  </div>
                </details>`;
              }).join('')}
            </div>
          </div>
          <div class="cs-section">
            <div class="cs-section-title">⚔️ Boss Fights — Locked by Default</div>
            <div class="cs-accordions">
              ${LANDS.map(land => {
                // Land 1 has no type:"boss" tiles — gatekeepers live on lesson tiles and the
                // master boss is type:"dungeon". Build entries from gateBosses + dungeon instead.
                let bossEntries;
                if (land.gateBosses) {
                  const GATE_NAMES = { abysmara:'Abysmara', feraxis:'Feraxis' };
                  const gateEntries = Object.entries(land.gateBosses).map(([bk, gb]) => ({
                    id: gb.session, name: GATE_NAMES[bk] || bk, skill: `S${gb.session}`,
                  }));
                  const dungeon = land.tiles.find(t => t.type === 'dungeon');
                  bossEntries = dungeon
                    ? [...gateEntries, { id: dungeon.id, name: dungeon.name }]
                    : gateEntries;
                } else {
                  bossEntries = land.tiles
                    .filter(t => t.type === 'boss')
                    .map(t => ({ id: t.id, name: t.name, skill: t.skill }));
                }
                if (!bossEntries.length) return '';
                return `<details class="cs-land-details" ${land.id === activeLandId ? 'open' : ''}>
                  <summary class="cs-land-summary">${land.name.toUpperCase()}</summary>
                  <div class="cs-land-body">
                    ${bossEntries.map(e => {
                      const bossKey = `${land.id}-${e.id}`;
                      const open = getBossOpenKeys().includes(bossKey);
                      return `<div class="ss-row">
                        <span class="ss-tile-name">⚔ ${e.name}${e.skill ? ` <span class="ss-skill-tag">${e.skill}</span>` : ''}</span>
                        <button class="ss-toggle ${open ? 'ss-on' : 'ss-off'} boss-fight-toggle" data-boss-land="${land.id}" data-boss-tile="${e.id}" data-boss-open="${open ? '1' : '0'}">
                          ${open ? '🔓 Boss Fight OPEN' : '🔒 Boss Fight LOCKED'}
                        </button>
                      </div>`;
                    }).join('')}
                  </div>
                </details>`;
              }).join('')}
            </div>
          </div>
          <div class="cs-section" style="border-bottom:none">
            <div class="cs-section-title">🔒 Progress Lock</div>
            <div class="cs-pl-note">Cap how far students can advance per period &amp; land. Students complete normally up to the cap — the next tile stays locked until you raise it or turn it off. Default is Off.</div>
            <div class="cs-accordions">
              ${LANDS.map(land => {
                if (!land.pathOrder || !land.pathOrder.length) return '';
                const _pathTiles = land.pathOrder.map(tid => land.tiles.find(t => t.id === tid)).filter(Boolean);
                return `<details class="cs-land-details" ${land.id === activeLandId ? 'open' : ''}>
                  <summary class="cs-land-summary">${land.name.toUpperCase()}</summary>
                  <div class="cs-land-body">
                    ${CLASS_DATA.periods.map(period => {
                      const _cap = getProgressCap(period.id, land.id);
                      return `<div class="ss-row">
                        <span class="ss-tile-name">${period.periodName}</span>
                        <select class="pl-cap-select" data-pl-cohort="${period.id}" data-pl-land="${land.id}">
                          <option value="" ${_cap === null ? 'selected' : ''}>Off (unlimited)</option>
                          ${_pathTiles.map(t => `<option value="${t.id}" ${_cap === t.id ? 'selected' : ''}>Through ${t.name}</option>`).join('')}
                        </select>
                      </div>`;
                    }).join('')}
                  </div>
                </details>`;
              }).join('')}
            </div>
          </div>`;
          })()}
        </div>
      </div>` : ''}
      ${flagCount > 0 ? `
        <div class="help-alert">
          <div class="help-alert-count">${flagCount}</div>
          ${flagCount === 1 ? "1 student needs help" : flagCount + " students need help"} — click their card to view and clear
        </div>` : ""}
      ${pendingPotions.length > 0 ? `
        <div class="potion-alert">
          <div class="potion-alert-hdr">⚗️ Crafting Submissions (${pendingPotions.length})</div>
          ${pendingPotions.map(p => {
            const m = getMergedStudent(p.student);
            const itemKey = p.itemRequested || 'health_potion';
            const itemDef = ITEMS[itemKey] || { i:'🧪', n: itemKey };
            return `<div class="potion-req-row">
              <span class="potion-req-name">${getCharName(p.student)}</span>
              <span class="potion-req-item">${itemDef.i} ${itemDef.n}</span>
              <span class="potion-req-time">${formatFlagTime(p.requestedAt)}</span>
              <button class="btn-approve-potion" data-approve-potion="${p.student.id}">✅ Approve</button>
              <button class="btn-deny-potion" data-deny-potion="${p.student.id}">✕ Deny</button>
            </div>`;
          }).join("")}
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
            if (g && guildMembers[g]) guildMembers[g].push(getCharName(st));
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
  ${STATE.teacherGoldShopOpen ? (() => {
    const allStudents = periods.flatMap(p => p.students);
    const pendingEntries = Object.entries(getShopPending());
    return `<div class="tgs-overlay" id="tgs-overlay">
      <div class="tgs-modal">
        <div class="tgs-hdr">
          <span class="tgs-title">🪙 Gold Shop</span>
          <button class="tgs-close" id="tgs-close">✕</button>
        </div>

        <div class="tgs-section">
          <div class="tgs-section-hdr">HOMEWORK GOLD (+15 PER STUDENT)</div>
          <button class="tgs-award-all-btn" id="gold-award-all-btn">🎁 Award All Students +15 Gold</button>
          <div class="tgs-student-list">
            ${allStudents.map((s, idx) => {
              const m = getMergedStudent(s);
              const g = getGold(s);
              return `<div class="tgs-student-row ${idx % 2 === 0 ? 'tgs-row-even' : 'tgs-row-odd'}">
                <span class="tgs-student-name">${getCharName(s)}</span>
                <span class="tgs-student-bal">🪙 ${g}</span>
                <button class="tgs-hw-btn" data-hw-gold="${s.id}">+15 Gold</button>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="tgs-divider"></div>

        <div class="tgs-section">
          <div class="tgs-section-hdr">PENDING REDEMPTIONS</div>
          ${pendingEntries.length
            ? pendingEntries.map(([key, p]) => `
              <div class="tgs-redemption-row">
                <span class="tgs-redemption-name">${p.studentName}</span>
                <span class="tgs-redemption-item">${p.itemName}</span>
                <span class="tgs-redemption-time">${new Date(p.timestamp).toLocaleDateString()}</span>
                <button class="gold-fulfill-btn" data-fulfill-key="${key}">✓ Fulfilled</button>
              </div>`).join('')
            : '<p class="tgs-empty">No pending redemptions</p>'}
        </div>

        <div class="tgs-divider"></div>

        <div class="tgs-section">
          <div class="tgs-section-hdr">SHOP INVENTORY</div>
          ${SHOP_ITEMS.map(item => {
            const on = getShopItemEnabled(item.id);
            return `<div class="tgs-toggle-row">
              <span class="tgs-toggle-name">${item.emoji} ${item.label} <span class="tgs-toggle-cost">🪙 ${item.cost}</span></span>
              <button class="tgs-toggle-btn ${on ? 'tgs-on' : 'tgs-off'}" data-shop-toggle="${item.id}" data-shop-toggle-val="${on ? '1' : '0'}">
                ${on ? 'Available' : 'Hidden'}
              </button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  })() : ''}
  ${STATE.mpBulkOpen ? (() => {
    const allStudents = periods.flatMap(p => p.students.map(s => ({ ...s, periodName: p.periodName })));
    const filtered = STATE.mpBulkPeriod === 'all'
      ? allStudents
      : allStudents.filter(s => s.periodName === STATE.mpBulkPeriod);
    const withMP = filtered.map(s => ({ s, mp: getMergedStudent(s).mp }));
    if (STATE.mpBulkSort === 'name') {
      withMP.sort((a, b) => (getMergedStudent(a.s).displayName || '').localeCompare(getMergedStudent(b.s).displayName || ''));
    } else {
      withMP.sort((a, b) => STATE.mpBulkSort === 'asc' ? a.mp - b.mp : b.mp - a.mp);
    }
    const periodTabs = ['all', ...periods.map(p => p.periodName)].map(p =>
      `<button class="mp-period-tab${STATE.mpBulkPeriod===p?' active':''}" data-mp-period="${p}">${p === 'all' ? 'All' : p}</button>`
    ).join('');
    const rows = withMP.map(({ s, mp }) => {
      const m = getMergedStudent(s);
      const pct = Math.round((mp / 10) * 100);
      return `<div class="mp-row" data-mp-sid="${s.id}">
        <div class="mp-row-info">
          <span class="mp-row-name">${getCharName(s)}</span>
          <span class="mp-row-period">${s.periodName}</span>
        </div>
        <div class="mp-bar-wrap">
          <div class="mp-bar-track"><div class="mp-bar-fill" style="width:${pct}%"></div></div>
          <span class="mp-val">${mp}/10</span>
        </div>
        <div class="mp-controls">
          <button class="mp-btn mp-minus" data-mp-sid="${s.id}" data-mp-delta="-1" ${mp <= 1 ? 'disabled' : ''}>−</button>
          <button class="mp-btn mp-plus"  data-mp-sid="${s.id}" data-mp-delta="1"  ${mp >= 10 ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
    }).join('');
    return `<div class="mp-overlay" id="mp-overlay">
      <div class="mp-modal">
        <div class="mp-hdr">
          <span class="mp-title">💙 MP Bulk Edit</span>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="mp-sort-btn${STATE.mpBulkSort!=='name'?' mp-sort-active':''}" id="mp-sort-mp">${STATE.mpBulkSort==='desc'?'↓ MP High→Low':'↑ MP Low→High'}</button>
            <button class="mp-sort-btn${STATE.mpBulkSort==='name'?' mp-sort-active':''}" id="mp-sort-name">A-Z Name</button>
            <button class="mp-close-btn" id="mp-close">✕</button>
          </div>
        </div>
        <div class="mp-period-tabs">${periodTabs}</div>
        <div class="mp-list">${rows}</div>
      </div>
    </div>`;
  })() : ''}
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
        <span class="t-dash-title">Edit: ${getCharName(s)}</span>
      </div>

      <div class="t-section" style="display:flex;align-items:center;gap:16px;padding:16px 20px">
        <div style="border-radius:50%;border:3px solid ${cc};width:60px;height:60px;overflow:hidden;flex-shrink:0"><img src="/avatars/${_m.avatar||'avatar_blankchibi.png'}" style="width:100%;height:100%;object-fit:cover;display:block" alt="" width="60" height="60" loading="lazy"/></div>
        <div>
          <div style="font-family:var(--font-display);font-size:18px;font-weight:900;color:var(--purple-dark)">${getCharName(s)}</div>
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
        <div class="t-stat-row" style="margin-top:6px">
          <span class="t-stat-icon">🪙</span>
          <span class="t-stat-lbl">Gold</span>
          <input class="t-xp-inp" id="gold-inp" type="number" min="0" max="99999" value="${getGold(s)}" style="width:100px"/>
        </div>
      </div>

      <div class="t-section">
        <div class="t-section-title">🎒 Inventory</div>
        <div class="chip-row" id="inv-chips">${invChips || '<span style="color:var(--text-light);font-size:13px;font-style:italic">No items</span>'}</div>
        ${addableItems.length > 0 ? `<select class="t-add-sel" id="add-item-sel"><option value="">+ Add item…</option>${itemOpts}</select>` : ""}
      </div>

      ${(() => {
        const sOvEdit = getOverrides().students[String(s.id)] || {};
        const currentEquipInv = sOvEdit.equipInventory || [];
        const allEquipItems = Object.entries(EQUIP_POOLS).flatMap(([landName, slots]) =>
          Object.entries(slots).flatMap(([slotKey, tiers]) =>
            Object.entries(tiers).flatMap(([tier, val]) =>
              (Array.isArray(val) ? val : [val]).map(id => ({ id, landName }))
            )
          )
        );
        const TIER_ORDER_E = ['legendary','epic','rare','common'];
        allEquipItems.sort((a, b) => {
          const da = getEquipItemDef(a.id), db = getEquipItemDef(b.id);
          return TIER_ORDER_E.indexOf(da.tier) - TIER_ORDER_E.indexOf(db.tier) || da.n.localeCompare(db.n);
        });
        const equipChips = currentEquipInv.map(id => {
          const def = getEquipItemDef(id);
          return `<span class="inv-chip" style="border-color:${def.tierColor}">${def.icon} ${def.n}<button class="chip-x" data-remove-equip="${id}">×</button></span>`;
        }).join("");
        const addableEquip = allEquipItems.filter(({ id }) => !currentEquipInv.includes(id));
        const equipOpts = addableEquip.map(({ id, landName }) => {
          const def = getEquipItemDef(id);
          return `<option value="${id}">${def.icon} ${def.n} (${def.tier}) — ${landName}</option>`;
        }).join("");
        return `<div class="t-section">
          <div class="t-section-title">⚔️ Equipment</div>
          <div class="chip-row">${equipChips || '<span style="color:var(--text-light);font-size:13px;font-style:italic">No equipment</span>'}</div>
          ${addableEquip.length ? `<select class="t-add-sel" id="add-equip-sel"><option value="">+ Add equipment…</option>${equipOpts}</select>` : ""}
        </div>`;
      })()}

      ${(() => {
        const sOvEdit = getOverrides().students[String(s.id)] || {};
        const currentBadges = sOvEdit.seasonalBadges || [];
        const allBadges = SEASONAL_SETS.flatMap(set => set.badges.map(b => ({ ...b, setLabel: set.label })));
        const badgeChips = currentBadges.map(id => {
          const badge = allBadges.find(b => b.id === id);
          if (!badge) return "";
          return `<span class="inv-chip">${badge.name}<button class="chip-x" data-remove-seasonal="${id}">×</button></span>`;
        }).join("");
        const addableBadges = allBadges.filter(b => !currentBadges.includes(b.id));
        const badgeOpts = addableBadges.map(b => `<option value="${b.id}">${b.name} (${b.setLabel})</option>`).join("");
        return `<div class="t-section">
          <div class="t-section-title">🌟 Seasonal Badges</div>
          <div class="chip-row">${badgeChips || '<span style="color:var(--text-light);font-size:13px;font-style:italic">No seasonal badges</span>'}</div>
          ${addableBadges.length ? `<select class="t-add-sel" id="add-seasonal-sel"><option value="">+ Add badge…</option>${badgeOpts}</select>` : ""}
        </div>`;
      })()}

      ${(() => {
        const sOvEdit = getOverrides().students[String(s.id)] || {};
        const currentSpecial = sOvEdit.specialBadges || [];
        const specialChips = currentSpecial.map(id => {
          const badge = SPECIAL_BADGES.find(b => b.id === id);
          if (!badge) return "";
          return `<span class="inv-chip">${badge.emoji} ${badge.name}<button class="chip-x" data-remove-special="${id}">×</button></span>`;
        }).join("");
        const addableSpecial = SPECIAL_BADGES.filter(b => !currentSpecial.includes(b.id));
        const specialOpts = addableSpecial.map(b => `<option value="${b.id}">${b.emoji} ${b.name}</option>`).join("");
        return `<div class="t-section">
          <div class="t-section-title">🏅 Special Badges</div>
          <div class="chip-row">${specialChips || '<span style="color:var(--text-light);font-size:13px;font-style:italic">No special badges</span>'}</div>
          ${addableSpecial.length ? `<select class="t-add-sel" id="add-special-sel"><option value="">+ Award special badge…</option>${specialOpts}</select>` : ""}
        </div>`;
      })()}

      <div class="t-section">
        <div class="t-section-title">🏆 Bosses Defeated</div>
        <div class="chip-row" id="boss-chips">${bossChips || '<span style="color:var(--text-light);font-size:13px;font-style:italic">No bosses defeated</span>'}</div>
        ${addableBosses.length > 0 ? `<select class="t-add-boss-sel" id="add-boss-sel"><option value="">+ Add boss…</option>${bossOpts}</select>` : ""}
      </div>

      ${(() => {
        const sOvComp = getOverrides().students[String(s.id)] || {};
        const ownedCompanions = sOvComp.companions || [];
        const rarityColor = { common:'#6B7280', uncommon:'#10B981', rare:'#8B5CF6' };
        const companionChips = ownedCompanions.map(file => {
          const c = companionByFile(file);
          return `<span class="inv-chip" style="border-color:${rarityColor[c.rarity]||'#6B7280'}">${c.name}<button class="chip-x" data-remove-companion="${file}">×</button></span>`;
        }).join('');
        const addableCompanions = COMPANIONS.filter(c => !ownedCompanions.includes(c.file));
        const compOpts = ['common','uncommon','rare'].map(r => {
          const items = addableCompanions.filter(c => c.rarity === r);
          if (!items.length) return '';
          const lbl = r === 'uncommon' ? 'Uncommon' : r[0].toUpperCase() + r.slice(1);
          return `<optgroup label="${lbl}">${items.map(c => `<option value="${c.file}">${c.name}</option>`).join('')}</optgroup>`;
        }).join('');
        return `<div class="t-section">
          <div class="t-section-title">🐾 Companions</div>
          <div class="chip-row">${companionChips || '<span style="color:var(--text-light);font-size:13px;font-style:italic">No companions</span>'}</div>
          ${addableCompanions.length ? `<select class="t-add-sel" id="add-companion-sel"><option value="">+ Award companion…</option>${compOpts}</select>` : ''}
        </div>`;
      })()}

      ${(() => {
        const sOvCosm = getOverrides().students[String(s.id)] || {};
        const awarded = sOvCosm.unlockedCosmetics || [];
        const allCosmItems = [
          ...COSMETICS_MANIFEST.map(c => ({ id:c.id, label:c.displayName, icon:'🖼', group: 'Frame — ' + c.category[0].toUpperCase() + c.category.slice(1) })),
          ...COSMETIC_AVATARS.map(c => ({ id:c.id, label:c.displayName, icon:'🧑', group:'Avatar — Boss' })),
          ...MYSTERY_POOL.map(p => ({ id:p.id, label:p.displayName, icon: p.type==='frame' ? '🖼' : '🧑', group: p.type==='frame' ? 'Frame — Legendary (Mystery)' : 'Avatar — Mystery' })),
        ];
        const cosmChips = awarded.map(id => {
          const def = allCosmItems.find(x => x.id === id);
          return `<span class="inv-chip inv-chip-cosm">${def ? def.icon : '✨'} ${def ? def.label : id}<button class="chip-x" data-remove-cosm="${id}">×</button></span>`;
        }).join('');
        const addable = allCosmItems.filter(c => !awarded.includes(c.id));
        const groupMap = {};
        addable.forEach(c => { (groupMap[c.group] = groupMap[c.group] || []).push(c); });
        const cosmOpts = Object.entries(groupMap).map(([grp, items]) =>
          `<optgroup label="${grp}">${items.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('')}</optgroup>`
        ).join('');
        return `<div class="t-section">
          <div class="t-section-title">✨ Cosmetics</div>
          <p class="t-cosm-note">Manually grant frames &amp; avatars. Land, guild, boss, level, and seasonal cosmetics also unlock automatically from gameplay.</p>
          <div class="chip-row">${cosmChips || '<span style="color:var(--text-light);font-size:13px;font-style:italic">No manually awarded cosmetics</span>'}</div>
          ${addable.length ? `<select class="t-add-sel" id="add-cosm-sel"><option value="">+ Award cosmetic…</option>${cosmOpts}</select>` : ''}
        </div>`;
      })()}

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
          ? `<div class="t-flag-row">
               <div>
                 <span class="t-flag-time">🚩 Flagged ${formatFlagTime(flgTime.flaggedAt || flgTime)}</span>
                 ${flgTime.message ? `<div class="t-flag-msg">"${flgTime.message}"</div>` : ''}
               </div>
               <button class="btn-clear-flag" id="clear-flag-btn">Clear Flag</button>
             </div>`
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
      <div class="reset-confirm-name">${getCharName(s)}</div>
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

/* ─── BOSS ROSTER ─── */
function renderJudgmentHall() {
  const periods = CLASS_DATA.periods || [];
  // Only Land 1 has boss overlay system
  const land = LANDS[0];
  const stdBosses = land.standardBosses || {};
  const gateBosses = land.gateBosses || {};

  // Collect all students across all periods
  const allStudents = periods.flatMap(p => (p.students || []).map(s => ({ student: s, period: p })));

  // Build boss groups for standard bosses
  const stdBossOrder = ['duskmantle','mirrorkin','seraphine','keystone'];
  const stdGroups = stdBossOrder.filter(bk => stdBosses[bk]).map(bk => {
    const boss = stdBosses[bk];
    const rows = allStudents
      .map(({ student, period }) => {
        const state = getStdBossState(String(student.id), bk);
        if (state.status !== 'awaiting_judgment') return null;
        return { student, period, state };
      })
      .filter(Boolean);
    return { bossKey:bk, boss, rows, type:'standard' };
  });

  // Build boss groups for gate bosses
  const gateBossOrder = ['abysmara','feraxis'];
  const gateGroups = gateBossOrder.filter(bk => gateBosses[bk]).map(bk => {
    const boss = gateBosses[bk];
    const rows = allStudents
      .map(({ student, period }) => {
        const state = getGateBossState(String(student.id), bk);
        if (state.status !== 'active' && state.status !== 'awaiting_judgment') return null;
        return { student, period, state };
      })
      .filter(Boolean);
    return { bossKey:bk, boss, rows, type:'gate' };
  });

  const allGroups = [...stdGroups, ...gateGroups];

  // Summary chips
  const totalMarked = Object.values(STATE.judgmentHallMarks).filter(m => m && m.result).length;
  const totalFailed = Object.values(STATE.judgmentHallMarks).filter(m => m && m.result === 'fail').length;
  const totalDefeated = Object.values(STATE.judgmentHallMarks).filter(m => m && m.result === 'pass').length;
  const totalPending = allGroups.reduce((n, g) => n + g.rows.length, 0) - totalMarked;

  const bossDisplayNames = {
    duskmantle:'Duskmantle', mirrorkin:'Mirrorkin', seraphine:'Seraphine', keystone:'The Keystone',
    abysmara:'Abysmara', feraxis:'Feraxis',
  };
  const stdStandardLabels = {
    duskmantle:'RL.5.1 · Make Inferences', mirrorkin:'RL.5.3 · Compare Characters',
    seraphine:'RL.5.2 · Story Structure',  keystone:'RI.5.2 · Main Idea / Summarize',
  };
  const gateSessionLabels = {
    abysmara:`S${gateBosses.abysmara?.session ?? 7} · Module 1 Assessment`,
    feraxis:`S${gateBosses.feraxis?.session ?? 13} · Module 2 Assessment`,
  };

  const renderBossGroup = (group) => {
    const { bossKey, boss, rows, type } = group;
    const isGate = type === 'gate';
    const displayName = bossDisplayNames[bossKey] || bossKey;
    const subLabel = isGate ? gateSessionLabels[bossKey] : stdStandardLabels[bossKey];
    const totalSessions = !isGate ? boss.sessions.length : 1;

    const rowsHTML = rows.length === 0
      ? `<tr><td colspan="${isGate ? 4 : 5}" style="text-align:center;padding:18px;font-size:13px;color:#6B7280;font-style:italic">No students awaiting judgment</td></tr>`
      : rows.map(({ student, state }) => {
          const markKey = `${bossKey}_${student.id}`;
          const pending = STATE.judgmentHallMarks[markKey] || {};
          const pSel = pending.result === 'pass' ? ' jh-sel-pass' : '';
          const fSel = pending.result === 'fail' ? ' jh-sel-fail' : '';
          const gradeChk = pending.postGrade ? 'checked' : '';
          const encounterTag = !isGate
            ? `<span class="jh-enc-tag">${state.encounterCount} of ${totalSessions}</span>`
            : '';
          const gradeCell = !isGate
            ? `<td><label class="jh-grade-check">
                <input type="checkbox" class="jh-grade-cb" data-jhk="${markKey}" ${gradeChk}> post grade
               </label></td>`
            : '';
          const currentStatus = (() => {
            if (pending.result === 'fail') return '<span class="jh-pill jh-pill-fail">Craft Binder</span>';
            if (pending.result === 'pass') {
              const isLast = isGate || state.encounterCount >= totalSessions;
              if (isLast) return '<span class="jh-pill jh-pill-pass">Defeated</span><span class="jh-mastery-badge">🏆 Mastery Achieved</span>';
              return '<span class="jh-pill jh-pill-wound">Wounded — continues</span>';
            }
            return '<span class="jh-pill jh-pill-pending">Awaiting mark</span>';
          })();
          const excellenceCell = isGate ? `<td>${
            pending.result === 'pass'
              ? (STATE.jhExcellenceAwarded[markKey]
                  ? `<span class="jh-exc-awarded">✓ Awarded</span>`
                  : `<button class="jh-exc-btn" data-jhk-exc="${markKey}" data-exc-sid="${student.id}">⭐ Excellence Bonus</button>`)
              : ''
          }</td>` : '';
          return `<tr>
            <td style="font-size:13px;font-weight:700">${getCharName(student)}</td>
            ${!isGate ? `<td>${encounterTag}</td>` : ''}
            <td>
              <div style="display:flex;gap:6px">
                <button class="jh-tog jh-tog-pass${pSel}" data-jhk="${markKey}" data-jhr="pass">Pass</button>
                <button class="jh-tog jh-tog-fail${fSel}" data-jhk="${markKey}" data-jhr="fail">Fail</button>
              </div>
            </td>
            ${gradeCell}
            <td>${currentStatus}</td>
            ${excellenceCell}
          </tr>`;
        }).join('');

    return `<div class="jh-group">
      <div class="jh-group-head">
        <div>
          <div class="jh-group-name">${displayName}</div>
          <div class="jh-group-sub">${subLabel}</div>
        </div>
        <button class="jh-bulk-pass" data-jh-bulk="${bossKey}">Mark all pass</button>
      </div>
      <table class="jh-table">
        <thead><tr>
          <th>Student</th>
          ${!isGate ? '<th>Encounter</th>' : ''}
          <th style="width:180px">Result</th>
          ${!isGate ? '<th>Post as grade</th>' : ''}
          <th>Status</th>
          ${isGate ? '<th>Excellence</th>' : ''}
        </tr></thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>`;
  };

  const groupsHTML = allGroups.map(renderBossGroup).join('');

  return `<div class="screen boss-roster-screen">
    <div class="boss-roster-wrap">
      <div class="brs-hdr">
        <button class="brs-back-btn" id="jh-back">← Dashboard</button>
        <div>
          <div style="font-size:20px;font-weight:900;color:#F3F4F6;letter-spacing:.5px">⚖️ Judgment Hall</div>
          <div style="font-size:12px;color:#9CA3AF;margin-top:2px">Land 1 · The Verdant Vale — Weekly Check-in</div>
        </div>
        <div style="display:flex;gap:10px">
          <div class="jh-chip"><span class="jh-chip-n">${totalMarked}</span> marked</div>
          <div class="jh-chip"><span class="jh-chip-n">${totalFailed}</span> to Craft Binder</div>
          <div class="jh-chip"><span class="jh-chip-n">${totalDefeated}</span> defeated</div>
          <div class="jh-chip"><span class="jh-chip-n">${totalPending}</span> unreviewed</div>
        </div>
      </div>
      <div class="jh-legend">
        <span><span class="jh-swatch" style="background:#10B981"></span> Pass = defeated or wounded, boss continues</span>
        <span><span class="jh-swatch" style="background:#EF4444"></span> Fail = routes to Craft Binder, retry before next check-in</span>
        <span><span class="jh-swatch" style="background:#D97706"></span> Post as grade = also sends score to PowerSchool (standard bosses only)</span>
      </div>
      <div class="jh-groups">${groupsHTML}</div>
      <div class="jh-footer">
        <div style="font-size:12px;color:#6B7280">Unmarked rows keep their current status — nothing changes until you save.</div>
        <button class="brs-submit" id="jh-save" ${totalMarked === 0 ? 'disabled' : ''}>Save this week's marks</button>
      </div>
    </div>
    <style>
      .jh-group { background:#FFFFFF; border:1px solid #E5E7EB; border-radius:10px; margin-bottom:18px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.06); }
      .jh-group-head { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:#F9FAFB; border-bottom:1px solid #E5E7EB; }
      .jh-group-name { font-size:16px; font-weight:800; color:#111827; }
      .jh-group-sub  { font-size:11px; color:#6B7280; margin-top:3px; }
      .jh-bulk-pass  { font-size:12px; background:#FFFFFF; border:1px solid #D1D5DB; border-radius:6px; padding:6px 10px; cursor:pointer; color:#374151; }
      .jh-bulk-pass:hover { background:#F3F4F6; }
      .jh-table { width:100%; border-collapse:collapse; }
      .jh-table th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#6B7280; font-weight:700; padding:8px 18px; border-bottom:1px solid #E5E7EB; }
      .jh-table td { padding:10px 18px; border-bottom:1px solid #F3F4F6; font-size:13px; vertical-align:middle; color:#111827; }
      .jh-table tr:last-child td { border-bottom:none; }
      .jh-enc-tag { font-size:11px; background:#F3F4F6; border-radius:5px; padding:2px 7px; color:#6B7280; }
      .jh-tog { border:1px solid #D1D5DB; background:#FFFFFF; border-radius:6px; padding:6px 12px; font-size:12px; cursor:pointer; color:#6B7280; }
      .jh-tog-pass.jh-sel-pass { background:#D1FAE5; border-color:#10B981; color:#065F46; font-weight:700; }
      .jh-tog-fail.jh-sel-fail { background:#FEE2E2; border-color:#EF4444; color:#991B1B; font-weight:700; }
      .jh-grade-check { display:flex; align-items:center; gap:6px; font-size:12px; color:#6B7280; cursor:pointer; }
      .jh-pill { font-size:11px; border-radius:999px; padding:3px 10px; display:inline-block; }
      .jh-pill-pending { background:#F3F4F6; color:#6B7280; }
      .jh-pill-pass    { background:#D1FAE5; color:#065F46; }
      .jh-pill-wound   { background:#FEF3C7; color:#92400E; }
      .jh-pill-fail    { background:#FEE2E2; color:#991B1B; }
      .jh-mastery-badge { display:inline-flex; align-items:center; gap:3px; font-size:11px; font-weight:800; color:#92400E; background:rgba(251,191,36,.18); border:1px solid rgba(245,158,11,.5); border-radius:6px; padding:3px 8px; margin-left:6px; letter-spacing:.02em; vertical-align:middle; }
      .jh-chip { background:#FFFFFF; border:1px solid #E5E7EB; border-radius:8px; padding:8px 14px; font-size:12px; color:#6B7280; }
      .jh-chip-n { font-size:18px; font-weight:800; color:#111827; display:block; }
      .jh-legend { display:flex; gap:18px; flex-wrap:wrap; font-size:12px; color:#6B7280; margin:0 0 20px; }
      .jh-legend span { display:flex; align-items:center; gap:5px; }
      .jh-swatch { width:10px; height:10px; border-radius:3px; display:inline-block; }
      .jh-groups { max-height:calc(100vh - 280px); overflow-y:auto; }
      .jh-footer { display:flex; justify-content:space-between; align-items:center; padding:16px 0 0; border-top:1px solid #E5E7EB; margin-top:4px; }
      .jh-exc-btn { font-size:12px; background:#FEF3C7; border:1px solid #D97706; border-radius:6px; padding:6px 12px; cursor:pointer; color:#92400E; font-weight:600; white-space:nowrap; }
      .jh-exc-btn:hover { background:#FDE68A; border-color:#B45309; }
      .jh-exc-awarded { font-size:12px; color:#059669; font-weight:700; white-space:nowrap; }
    </style>
  </div>`;
}

function renderBossRoster() {
  const periods = CLASS_DATA.periods || [];

  // Build boss options from all LANDS
  const bossOptions = LANDS.flatMap(land => [
    ...land.tiles
      .filter(t => t.type === 'boss' || t.type === 'dungeon')
      .map(t => ({
        key: `${land.id}_${t.id}`,
        label: `${land.name} — ${t.name}${t.skill ? ' (' + t.skill + ')' : ''}`,
        landId: land.id, tileId: t.id, bossName: t.name, isWriting: false,
      })),
    ...land.tiles
      .filter(t => t.type === 'event')
      .map(t => ({
        key: `event_${land.id}`,
        label: `${land.name} — ${t.name} (Writing)`,
        landId: land.id, tileId: t.id, bossName: t.name, isWriting: true,
      })),
  ]);

  // Initialize bossRosterKey if null
  if (!STATE.bossRosterKey && bossOptions.length) {
    STATE.bossRosterKey = bossOptions[0].key;
  }
  const currentKey = STATE.bossRosterKey || (bossOptions[0] && bossOptions[0].key) || '';
  const currentOpt = bossOptions.find(o => o.key === currentKey);
  const tileId = currentOpt ? currentOpt.tileId : null;

  // Period tabs: -1 = All, 0..n-1 = specific
  const pidx = STATE.bossRosterPeriodIdx;
  const periodTabsHTML = [
    `<button class="period-tab ${pidx === -1 ? 'active' : ''}" data-brs-pi="-1">All</button>`,
    ...periods.map((p, i) =>
      `<button class="period-tab ${pidx === i ? 'active' : ''}" data-brs-pi="${i}">${p.periodName}</button>`)
  ].join('');

  // Collect students for current period selection
  let studentRows = [];
  const showPeriodCol = pidx === -1 && periods.length > 1;
  const displayPeriods = pidx === -1 ? periods : [periods[pidx]].filter(Boolean);

  displayPeriods.forEach(period => {
    (period.students || []).forEach(student => {
      const m = getMergedStudent(student);
      const pos = getLandPos(student);
      const status = getBossStatus(student, currentKey);
      const confirmed = status === 'confirmed' || (tileId && (pos.completed || []).includes(tileId));
      const pendingMark = STATE.bossRosterMarks[student.id];

      // Avatar snippet
      const savedClass = (() => { const r = student.avatarClass || student.character || ''; return r === 'fairy' ? 'elf' : r; })();
      const savedStyle = student.avatarStyle || student.variant || '';
      const savedTone  = student.avatarSkinTone || student.skinTone || '';
      const savedGender = student.avatarGender || 'female';
      const avatarFile  = student.avatar || 'avatar_blankchibi.png';
      const avatarUrl   = savedClass && savedStyle && savedTone
        ? `/avatars/${buildAvatarFile(savedGender, savedClass, savedStyle, savedTone)}`
        : `/avatars/${avatarFile}`;

      const statusLabel = confirmed ? 'confirmed' : status;
      const statusText  = confirmed ? '✓ Confirmed' : status === 'not_attempted' ? 'Not Attempted' : status.charAt(0).toUpperCase() + status.slice(1);
      const statusCls   = confirmed ? 'confirmed' : status.replace('_', '-');

      let buttonsHTML;
      if (confirmed) {
        buttonsHTML = `<span style="color:#9CA3AF;font-size:12px">—</span>`;
      } else if (currentOpt && currentOpt.isWriting) {
        if (status === 'submitted') {
          const aSel = pendingMark === 'approved'  ? ' brs-selected' : '';
          const vSel = pendingMark === 'revision'  ? ' brs-selected' : '';
          buttonsHTML = `
            <button class="brs-btn brs-btn-defeated${aSel}" data-brs-sid="${student.id}" data-brs-mark="approved">✅ Approve</button>
            <button class="brs-btn brs-btn-retake${vSel}" data-brs-sid="${student.id}" data-brs-mark="revision">📝 Needs Revision</button>`;
        } else {
          buttonsHTML = `<span style="color:#9CA3AF;font-size:12px;font-style:italic">${status === 'not_attempted' ? 'Not submitted' : status}</span>`;
        }
      } else {
        const dSel = pendingMark === 'defeated' ? ' brs-selected' : '';
        const rSel = pendingMark === 'retake'   ? ' brs-selected' : '';
        buttonsHTML = `
          <button class="brs-btn brs-btn-defeated${dSel}" data-brs-sid="${student.id}" data-brs-mark="defeated">✅ Defeated</button>
          <button class="brs-btn brs-btn-retake${rSel}" data-brs-sid="${student.id}" data-brs-mark="retake">↩ Retake</button>`;
      }

      studentRows.push(`
        <tr>
          ${showPeriodCol ? `<td style="font-size:11px;color:#6B7280">${period.periodName}</td>` : ''}
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <img src="${avatarUrl}" width="24" height="24" style="border-radius:50%;object-fit:cover" onerror="this.style.display='none'"/>
              <span style="font-weight:700">${getCharName(student)}</span>
            </div>
          </td>
          <td><span class="brs-status ${statusCls}">${statusText}</span></td>
          <td>
            <div style="display:flex;gap:8px;align-items:center">
              ${buttonsHTML}
            </div>
          </td>
        </tr>`);
    });
  });

  // Build boss dropdown with optgroups per land
  const dropdownHTML = `<select class="boss-roster-sel" id="boss-roster-sel">` +
    LANDS.map(land => {
      const landBosses = bossOptions.filter(o => o.landId === land.id);
      if (!landBosses.length) return '';
      return `<optgroup label="${land.name}">` +
        landBosses.map(o => `<option value="${o.key}" ${o.key === currentKey ? 'selected' : ''}>${o.label}</option>`).join('') +
        `</optgroup>`;
    }).join('') +
    `</select>`;

  const changedCount = Object.values(STATE.bossRosterMarks).filter(v => v !== null && v !== undefined).length;

  return `
  <div class="screen boss-roster-screen">
    <div class="boss-roster-wrap">
      <div class="boss-roster-hdr">
        <button class="btn-back" id="brs-back">← Dashboard</button>
        <span class="boss-roster-title">⚔️ Boss Roster</span>
      </div>
      <div class="period-tabs">${periodTabsHTML}</div>
      ${dropdownHTML}
      <table class="boss-roster-table">
        <thead>
          <tr>
            ${showPeriodCol ? '<th>Period</th>' : ''}
            <th>Student</th>
            <th>Status</th>
            <th>Mark</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows.join('') || '<tr><td colspan="4" style="text-align:center;color:#9CA3AF;padding:20px">No students found.</td></tr>'}
        </tbody>
      </table>
      <button class="boss-roster-submit" id="brs-submit" ${!changedCount ? 'disabled' : ''}>
        💾 Submit Results (${changedCount} change${changedCount !== 1 ? 's' : ''})
      </button>
    </div>
  </div>`;
}

/* ─── MOUNT & EVENTS ─── */
function mount() {
  const root = document.getElementById("root");
  if (STATE.screen === "loading") { root.innerHTML = renderLoading(); return; }
  if (STATE.screen === "error")   { root.innerHTML = renderError(STATE.errorMsg || "Could not load classData.json"); return; }
  if (STATE.screen === "code")           root.innerHTML = renderCode();
  if (STATE.screen === "grid")           root.innerHTML = renderGrid();
  if (STATE.screen === "pin")            root.innerHTML = renderPin();
  if (STATE.screen === "naming")         root.innerHTML = renderNaming();
  if (STATE.screen === "hub")            root.innerHTML = renderHub();
  if (STATE.screen === "teacher-login")  root.innerHTML = renderTeacherLogin();
  if (STATE.screen === "teacher-dash")   root.innerHTML = renderTeacherDashboard();
  if (STATE.screen === "teacher-edit")   root.innerHTML = renderTeacherEdit();
  if (STATE.screen === "quest-map")      root.innerHTML = renderQuestMap();
  if (STATE.screen === "arrival-screen") root.innerHTML = renderArrivalScreen();
  if (STATE.screen === "travel-screen")  root.innerHTML = renderTravelScreen();
  if (STATE.screen === "boss-screen")   root.innerHTML = renderBossScreen();
  if (STATE.screen === "writing-transport") root.innerHTML = renderWritingTransport();
  if (STATE.screen === "sanctum-map")    root.innerHTML = renderSanctumMap();
  if (STATE.screen === "land-travel")    root.innerHTML = renderLandTravelScreen();
  if (STATE.screen === "realm-complete") root.innerHTML = renderRealmComplete();
  if (STATE.screen === "lesson-stop")   root.innerHTML = renderLessonStop();
  if (STATE.screen === "writing-event")  root.innerHTML = renderWritingEvent();
  if (STATE.screen === "teacher-tile")   root.innerHTML = renderTeacherTileView();
  if (STATE.screen === "welcome-splash") root.innerHTML = renderWelcomeSplash();
  if (STATE.screen === "board-view")     root.innerHTML = renderBoardView();
  if (STATE.screen === "teacher-student-map") root.innerHTML = renderTeacherStudentMap();
  if (STATE.screen === "teacher-boss-roster")  root.innerHTML = renderBossRoster();
  if (STATE.screen === "teacher-judgment-hall") root.innerHTML = renderJudgmentHall();

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
              const _inSanctumLand = isInSanctum(STATE.student);
              const _routeAfterPin = () => {
                const _dst = _firstTimer ? "welcome-splash" : (_pos.land === 0 ? "quest-map" : "hub");
                if (!getMergedStudent(STATE.student).characterName) {
                  STATE._namingReturnScreen = _dst;
                  return "naming";
                }
                return _dst;
              };
              if (_inSanctumLand) {
                const _sLand = LANDS.find(l => l.id === _inSanctumLand);
                if (_sLand) {
                  STATE.sanctumLand = _sLand;
                  STATE.lessonLand  = _sLand;
                  STATE.lessonTile  = _sLand.tiles.find(t => t.type === 'event') || null;
                  STATE.writingEventReturnTo = 'sanctum-map';
                  STATE.screen = "sanctum-map";
                } else {
                  STATE.screen = _routeAfterPin();
                }
              } else {
                STATE.screen = _routeAfterPin();
              }
              STATE.pin = ""; STATE.pinError = ""; STATE.helpFlagged = false;
              STATE._sessionResetVersion = (_overrides[String(STATE.student.id)] || {})._resetVersion ?? null;
              mount();
            } else {
              STATE.pinError = "Incorrect secret number! Try again, brave adventurer.";
              STATE.pin = ""; mount();
            }
          }, 200);
        }
      });
    });
  }

  /* CHARACTER NAME GENERATOR */
  /* WELCOME SPLASH */
  if (STATE.screen === "welcome-splash") {
    $("ws-cta") && $("ws-cta").addEventListener("click", () => {
      STATE.screen = "quest-map";
      mount();
    });
  }

  /* NAMING */
  if (STATE.screen === "naming") {
    document.querySelectorAll("[data-pick-name]").forEach(btn => {
      btn.addEventListener("click", () => { STATE.genName = btn.dataset.pickName; mount(); });
    });
    document.querySelectorAll("[data-pick-epithet]").forEach(btn => {
      btn.addEventListener("click", () => { STATE.genEpithet = btn.dataset.pickEpithet; mount(); });
    });
    document.querySelectorAll("[data-pick-skip]").forEach(btn => {
      btn.addEventListener("click", () => { STATE.genEpithet = ""; mount(); });
    });
    $("nm-reroll-name") && $("nm-reroll-name").addEventListener("click", () => {
      const sn = NAMES.slice().sort(() => Math.random() - 0.5);
      STATE.namingOptions = sn.slice(0, 6);
      STATE.genName = null;
      mount();
    });
    $("nm-reroll-epithet") && $("nm-reroll-epithet").addEventListener("click", () => {
      const se = EPITHETS.slice().sort(() => Math.random() - 0.5);
      STATE.epithetOptions = se.slice(0, 6);
      STATE.genEpithet = null;
      mount();
    });
    $("nm-confirm") && $("nm-confirm").addEventListener("click", () => {
      const name    = STATE.genName;
      const epithet = STATE.genEpithet; // "" = skip, non-empty string = chosen
      if (!name) return;
      const charName = (epithet && epithet.length) ? `${name} ${epithet}` : name;
      saveStudentOverride(STATE.student.id, { characterName: charName, claimed: true });
      STATE.namingOptions = null; STATE.epithetOptions = null;
      STATE.genName = null; STATE.genEpithet = null;
      const dest = STATE._namingReturnScreen || "hub";
      STATE._namingReturnScreen = null;
      STATE.screen = dest;
      mount();
    });
  }

  /* HUB */
  if (STATE.screen === "hub") {
    $("hub-logout") && $("hub-logout").addEventListener("click", () => { STATE.screen = "code"; STATE.student = null; STATE.currentPeriod = null; STATE.pin = ""; STATE.pinError = ""; STATE.studentNumEntry = ""; STATE.helpFlagged = false; STATE.avStep = 0; STATE.avClass = null; STATE.avVariant = null; STATE.avTone = null; STATE.customizeOpen = false; STATE.pendingTitle = null; STATE.custTab = "avatar"; STATE.genName = null; STATE.genEpithet = null; STATE.namingOptions = null; STATE.epithetOptions = null; STATE._namingReturnScreen = null; mount(); });
    $("continue-quest-btn") && $("continue-quest-btn").addEventListener("click", () => { STATE.screen = "quest-map"; mount(); });
    $("grade-reminder-banner") && $("grade-reminder-banner").addEventListener("click", () => {
      const reminders = getGradeReminders(STATE.student.id);
      if (!Object.keys(reminders).length) return;
      STATE.catchUpModalOpen = true;
      mount();
    });
    $("sq-invite-badge") && $("sq-invite-badge").addEventListener("click", () => {
      STATE.sqInviteNotifOpen = true; mount();
    });
    // Invite modal handlers
    if (STATE.sqInviteNotifOpen) {
      const invites = getSQInvites(STATE.student.id);
      const pending = Object.values(invites).filter(i => i.status === 'pending');
      const inv = pending[0];
      $("invite-notif-overlay") && $("invite-notif-overlay").addEventListener("click", e => {
        if (e.target === $("invite-notif-overlay")) { STATE.sqInviteNotifOpen = false; mount(); }
      });
      $("invite-decline") && $("invite-decline").addEventListener("click", () => {
        if (inv) {
          clearQuestInvite(STATE.student.id, inv.questKey);
          // Revert sender's quest to available
          const sOv = _overrides[String(inv.fromStudentId)] || {};
          const sq = Object.assign({}, sOv.sideQuests || {});
          delete sq[inv.questKey];
          if (_overrides[String(inv.fromStudentId)]) {
            _overrides[String(inv.fromStudentId)].sideQuests = Object.keys(sq).length ? sq : null;
          }
          set(ref(db, `overrides/${inv.fromStudentId}/sideQuests/${inv.questKey}`), null).catch(console.error);
        }
        STATE.sqInviteNotifOpen = false; mount();
      });
      $("invite-accept") && $("invite-accept").addEventListener("click", () => {
        if (inv) {
          acceptSideQuest(STATE.student.id, inv.tileId, inv.type, inv.idx, inv.landId || null);
          logActivity(STATE.student.id, '🤝', `Accepted collaborative quest with ${inv.fromStudentName}: ${inv.questName || inv.questKey}`);
          clearQuestInvite(STATE.student.id, inv.questKey);
        }
        STATE.sqInviteNotifOpen = false; mount();
      });
    }
    // Catch-up modal handlers
    if (STATE.catchUpModalOpen) {
      $("catchup-close") && $("catchup-close").addEventListener("click", () => {
        STATE.catchUpModalOpen = false; mount();
      });
      $("catchup-modal-overlay") && $("catchup-modal-overlay").addEventListener("click", e => {
        if (e.target === $("catchup-modal-overlay")) { STATE.catchUpModalOpen = false; mount(); }
      });
      document.querySelectorAll(".catchup-log-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          STATE.gradeModalLessonId = Number(btn.dataset.lessonId);
          STATE.gradeModalOpen = true;
          STATE.gradeFromCatchUp = true;
          mount();
        });
      });
    }
    // Grade modal handlers (catch-up flow on hub)
    if (STATE.gradeModalOpen && STATE.gradeFromCatchUp) {
      const gradeInput = $("grade-modal-input");
      const gradeClose = () => {
        STATE.gradeModalOpen = false;
        STATE.gradeFromCatchUp = false;
        STATE.gradeModalLessonId = null;
        STATE.catchUpModalOpen = true;
        mount();
      };
      $("grade-modal-skip") && $("grade-modal-skip").addEventListener("click", () => {
        if (STATE.gradeModalLessonId != null) saveGradeReminder(STATE.student.id, STATE.gradeModalLessonId);
        gradeClose();
      });
      $("grade-modal-submit") && $("grade-modal-submit").addEventListener("click", () => {
        const val = parseInt(gradeInput ? gradeInput.value : "");
        if (isNaN(val) || val < 0 || val > 100) { gradeClose(); return; }
        const hp = gradeToHP(val);
        const lessonId = STATE.gradeModalLessonId;
        saveStudentOverride(STATE.student.id, { hp });
        saveGradeLog(STATE.student.id, lessonId, val, hp);
        if (lessonId != null) clearGradeReminder(STATE.student.id, lessonId);
        gradeClose();
      });
      gradeInput && setTimeout(() => gradeInput.focus(), 50);
    }
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
        STATE.pendingTitle = null; STATE.avGender = null; STATE.avClass = null; STATE.avVariant = null; STATE.avTone = null;
        if (getLandPos(STATE.student).land === 0) {
          STATE.screen = "quest-map";
          if (STATE._sg0ReturnTile) { STATE.sg0Open = true; STATE.sg0Tile = STATE._sg0ReturnTile; STATE._sg0ReturnTile = null; }
        }
        mount();
      });
      // Reroll name parts (first-creation only)
      $("reroll-name") && $("reroll-name").addEventListener("click", () => {
        STATE.genName = randName(); mount();
      });
      $("reroll-epithet") && $("reroll-epithet").addEventListener("click", () => {
        STATE.genEpithet = randEpithet(); mount();
      });
      // Save — commit avatar + title + active companion (+ name on first creation)
      $("cust-save") && $("cust-save").addEventListener("click", () => {
        const isFirstCreation = !getMergedStudent(STATE.student).characterName;
        const overrides = {
          avatarGender: STATE.avGender,
          avatarClass: STATE.avClass,
          avatarStyle: STATE.avVariant,
          avatarSkinTone: STATE.avTone,
          character: STATE.avClass, variant: STATE.avVariant, skinTone: STATE.avTone,
          avatar: buildAvatarFile(STATE.avGender, STATE.avClass, STATE.avVariant, STATE.avTone),
        };
        if (STATE.pendingTitle) overrides.title = STATE.pendingTitle;
        if (STATE.pendingCompanion !== undefined) overrides.activeCompanion = STATE.pendingCompanion;
        if (isFirstCreation && STATE.genName && STATE.genEpithet) {
          const { name, epithet } = uniqueFullName(STATE.genName, STATE.genEpithet);
          overrides.characterName = `${name} ${epithet}`;
          overrides.claimed = true;
        }
        saveStudentOverride(STATE.student.id, overrides);
        STATE.customizeOpen = false; STATE.avStep = 0; STATE.pendingTitle = null; STATE.pendingCompanion = undefined;
        STATE.genName = null; STATE.genEpithet = null;
        if (getLandPos(STATE.student).land === 0) {
          STATE.screen = "quest-map";
          if (STATE._sg0ReturnTile) {
            // Customization complete — auto-advance past this tile instead of requiring a second "Continue" click
            advanceSg0Tile(STATE.student, STATE._sg0ReturnTile.id);
            STATE._sg0ReturnTile = null;
          }
        }
        mount();
      });
      // Avatar step nav — step 1: gender, step 2: class, step 3: style, step 4: tone
      document.querySelectorAll(".av-gender-card").forEach(btn => {
        btn.addEventListener("click", () => { STATE.avGender = btn.dataset.avgender; STATE.avStep = 2; mount(); });
      });
      document.querySelectorAll(".av-class-card").forEach(btn => {
        btn.addEventListener("click", () => { STATE.avClass = btn.dataset.avclass; STATE.avStep = 3; mount(); });
      });
      $("av-back-2") && $("av-back-2").addEventListener("click", () => { STATE.avStep = 1; mount(); });
      document.querySelectorAll(".av-variant-btn").forEach(btn => {
        btn.addEventListener("click", () => { STATE.avVariant = btn.dataset.avvariant; STATE.avStep = 4; mount(); });
      });
      $("av-back-3") && $("av-back-3").addEventListener("click", () => { STATE.avStep = 2; mount(); });
      $("av-back-4") && $("av-back-4").addEventListener("click", () => { STATE.avStep = 3; mount(); });
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
    // Equip / unequip items from inventory (legacy consumable-based)
    document.querySelectorAll("[data-equip-item]").forEach(slot => {
      slot.addEventListener("click", () => {
        const key = slot.dataset.equipItem;
        const eq = getEquipped(STATE.student);
        if (eq[key]) unequipItem(STATE.student, key);
        else equipItem(STATE.student, key);
        mount();
      });
    });
    document.querySelectorAll("[data-unequip-item]").forEach(slot => {
      slot.addEventListener("click", () => {
        unequipItem(STATE.student, slot.dataset.unequipItem);
        mount();
      });
    });
    // New equipment system — equip from inventory card
    // Weapon/shield/collectibles picker openers
    document.querySelector("[data-open-weapon-picker]")?.addEventListener("click", () => { STATE.weaponPickerOpen = true; mount(); });
    document.querySelector("[data-open-shield-picker]")?.addEventListener("click", () => { STATE.shieldPickerOpen = true; mount(); });
    document.querySelector("[data-open-collectibles]")?.addEventListener("click", () => { STATE.collectiblesOpen = true; mount(); });

    // Weapon picker modal handlers
    if (STATE.weaponPickerOpen) {
      const closeWP = () => { STATE.weaponPickerOpen = false; mount(); };
      $("weapon-picker-close") && $("weapon-picker-close").addEventListener("click", closeWP);
      $("weapon-picker-overlay") && $("weapon-picker-overlay").addEventListener("click", e => { if (e.target === $("weapon-picker-overlay")) closeWP(); });
      document.querySelectorAll("[data-pick-weapon]").forEach(item => {
        item.addEventListener("click", () => {
          const id = item.dataset.pickWeapon;
          const isEq = item.dataset.equipUnequip === 'true';
          if (isEq) unequipSlotItem(STATE.student, 'weapon');
          else equipSlotItem(STATE.student, 'weapon', id);
          STATE.weaponPickerOpen = false; mount();
        });
      });
    }

    // Shield picker modal handlers
    if (STATE.shieldPickerOpen) {
      const closeSP = () => { STATE.shieldPickerOpen = false; mount(); };
      $("shield-picker-close") && $("shield-picker-close").addEventListener("click", closeSP);
      $("shield-picker-overlay") && $("shield-picker-overlay").addEventListener("click", e => { if (e.target === $("shield-picker-overlay")) closeSP(); });
      document.querySelectorAll("[data-pick-shield]").forEach(item => {
        item.addEventListener("click", () => {
          const id = item.dataset.pickShield;
          const isEq = item.dataset.equipUnequip === 'true';
          if (isEq) unequipSlotItem(STATE.student, 'shield');
          else equipSlotItem(STATE.student, 'shield', id);
          STATE.shieldPickerOpen = false; mount();
        });
      });
    }

    // Collectibles modal handlers
    if (STATE.collectiblesOpen) {
      const closeCO = () => { STATE.collectiblesOpen = false; mount(); };
      $("collectibles-close") && $("collectibles-close").addEventListener("click", closeCO);
      $("collectibles-overlay") && $("collectibles-overlay").addEventListener("click", e => { if (e.target === $("collectibles-overlay")) closeCO(); });
      document.querySelectorAll(".coll-tab").forEach(btn => {
        btn.addEventListener("click", () => { STATE.collectiblesTab = btn.dataset.colltab; mount(); });
      });
      // Cosmetics sub-tab toggles
      document.querySelectorAll(".cosm-subtab").forEach(btn => {
        btn.addEventListener("click", () => { STATE.cosmTab = btn.dataset.cosmtab; mount(); });
      });
      // Frame equip/unequip
      document.querySelectorAll("[data-equip-frame]").forEach(slot => {
        slot.addEventListener("click", () => {
          const id = slot.dataset.equipFrame;
          if (getEquippedFrame(STATE.student) === id) unequipFrame(STATE.student);
          else equipFrame(STATE.student, id);
          mount();
        });
      });
      // Avatar equip/unequip
      document.querySelectorAll("[data-equip-avatar]").forEach(slot => {
        slot.addEventListener("click", () => {
          const id = slot.dataset.equipAvatar;
          if (getEquippedAvatarOverride(STATE.student) === id) unequipAvatarOverride(STATE.student);
          else equipAvatarOverride(STATE.student, id);
          mount();
        });
      });
      // Revert to custom character
      $("cosm-revert-avatar") && $("cosm-revert-avatar").addEventListener("click", () => {
        unequipAvatarOverride(STATE.student);
        mount();
      });
    }

    // Student companion picker
    $("companion-slot-btn") && $("companion-slot-btn").addEventListener("click", () => { STATE.studentCompanionOpen = true; mount(); });
    if (STATE.studentCompanionOpen) {
      const closeSC = () => { STATE.studentCompanionOpen = false; mount(); };
      $("student-companion-close") && $("student-companion-close").addEventListener("click", closeSC);
      $("student-companion-overlay") && $("student-companion-overlay").addEventListener("click", e => { if (e.target === $("student-companion-overlay")) closeSC(); });
      document.querySelectorAll("[data-student-companion]").forEach(slot => {
        slot.addEventListener("click", () => {
          if (!slot.classList.contains("earned")) return;
          const file = slot.dataset.studentCompanion;
          saveStudentOverride(STATE.student.id, { activeCompanion: file });
          STATE.studentCompanionOpen = false; mount();
        });
      });
    }

    // Quest journal tabs
    document.querySelectorAll(".qj-tab").forEach(tab => {
      tab.addEventListener("click", () => { STATE.questJournalTab = tab.dataset.qjTab; mount(); });
    });
    // Side quest complete buttons
    document.querySelectorAll(".btn-sq-complete").forEach(btn => {
      btn.addEventListener("click", () => {
        completeSideQuest(STATE.student, btn.dataset.sqKey);
      });
    });
    // View Lesson buttons on side quest cards
    document.querySelectorAll(".sq-view-lesson-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tileId = parseInt(btn.dataset.sqTile);
        const sqLandId = btn.dataset.sqLand ? parseInt(btn.dataset.sqLand) : null;
        const land = sqLandId ? LANDS.find(l => l.id === sqLandId) : null;
        const tile = land ? land.tiles.find(t => t.id === tileId) : null;
        const found = (land && tile) ? { tile, land } : LANDS.reduce((acc, l) => acc || (l.tiles.find(t => t.id === tileId) ? { tile: l.tiles.find(t => t.id === tileId), land: l } : null), null);
        if (!found) return;
        STATE.lessonTile = found.tile;
        STATE.lessonLand = found.land;
        STATE.screen = "lesson-stop";
        mount();
      });
    });
    // Side quest accept buttons in quest journal
    document.querySelectorAll(".ls-sq-accept-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key  = btn.dataset.sqKey;
        const idx  = parseInt(btn.dataset.sqIdx, 10);
        const type = btn.dataset.sqType;
        const tileId = parseInt(btn.dataset.sqTile, 10);
        const landId = btn.dataset.sqLand ? parseInt(btn.dataset.sqLand) : null;
        if (type === 'collab') {
          STATE.sqPartnerPickOpen = true;
          STATE.sqPartnerPickKey = key;
          STATE.sqPartnerPickIdx = idx;
          STATE.sqPartnerPickType = type;
          STATE.sqPartnerPickTile = tileId;
          STATE.sqPartnerPickLand = landId;
          STATE.sqPartnerPickSelected = null;
          mount();
        } else {
          const quest = resolveSoloQuest(tileId, idx);
          acceptSideQuest(STATE.student.id, tileId, type, idx, landId);
          logActivity(STATE.student.id, '📜', `Accepted quest: ${quest.title}`);
          mount();
        }
      });
    });
    // Partner picker modal (for collab quests accepted from hub journal)
    if (STATE.sqPartnerPickOpen) {
      $("partner-pick-cancel") && $("partner-pick-cancel").addEventListener("click", () => { STATE.sqPartnerPickOpen = false; STATE.sqPartnerPickSelected = null; mount(); });
      $("partner-pick-overlay") && $("partner-pick-overlay").addEventListener("click", e => {
        if (e.target === $("partner-pick-overlay")) { STATE.sqPartnerPickOpen = false; STATE.sqPartnerPickSelected = null; mount(); }
      });
      document.querySelectorAll(".partner-row").forEach(row => {
        row.addEventListener("click", () => { STATE.sqPartnerPickSelected = parseInt(row.dataset.partnerId, 10); mount(); });
      });
      $("partner-pick-send") && $("partner-pick-send").addEventListener("click", () => {
        const { sqPartnerPickKey: key, sqPartnerPickIdx: idx, sqPartnerPickTile: tileId, sqPartnerPickLand: landId, sqPartnerPickSelected: recipientId } = STATE;
        if (!recipientId) return;
        const quest = COLLAB_QUESTS[idx] || COLLAB_QUESTS[0];
        acceptSideQuest(STATE.student.id, tileId, 'collab', idx, landId);
        logActivity(STATE.student.id, '🤝', `Accepted quest: ${quest.title} — awaiting partner`);
        sendQuestInvite(getMergedStudent(STATE.student), recipientId, key, quest.title, tileId, 'collab', idx, landId);
        STATE.sqPartnerPickOpen = false; STATE.sqPartnerPickSelected = null;
        mount();
      });
    }

    // Crafting station button
    $("brew-crafting-btn") && $("brew-crafting-btn").addEventListener("click", () => {
      STATE.craftingOpen = true; STATE.craftingStep = 1; STATE.craftingSelected = null;
      mount();
    });
    // Crafting modal — close
    $("crafting-close") && $("crafting-close").addEventListener("click", () => {
      STATE.craftingOpen = false; mount();
    });
    $("crafting-overlay") && $("crafting-overlay").addEventListener("click", e => {
      if (e.target === $("crafting-overlay")) { STATE.craftingOpen = false; mount(); }
    });
    // Crafting modal — back to step 1
    $("crafting-back") && $("crafting-back").addEventListener("click", () => {
      STATE.craftingStep = 1; STATE.craftingSelected = null; mount();
    });
    // Crafting modal — pick item (step 1 cards)
    document.querySelectorAll("[data-craft-pick]").forEach(card => {
      card.addEventListener("click", () => {
        STATE.craftingSelected = card.dataset.craftPick;
        STATE.craftingStep = 2;
        mount();
      });
    });
    // Crafting modal — checkbox enables submit (step 2)
    if ($("crafting-confirm-cb")) {
      $("crafting-confirm-cb").addEventListener("change", () => {
        const btn = $("crafting-submit");
        if (btn) btn.disabled = !$("crafting-confirm-cb").checked;
      });
    }
    // Crafting modal — submit (step 2)
    $("crafting-submit") && $("crafting-submit").addEventListener("click", () => {
      if (!STATE.craftingSelected) return;
      requestCraft(STATE.student.id, STATE.craftingSelected);
      STATE.craftingOpen = false;
      mount();
      const itemDef = ITEMS[STATE.craftingSelected] || { i:'⚗️', n: STATE.craftingSelected };
      const t = document.createElement("div");
      t.className = "toast"; t.textContent = `${itemDef.i} ${itemDef.n} request sent! Your teacher will review it soon.`;
      document.body.appendChild(t); setTimeout(() => t.remove(), 4000);
    });

    // Use health potion from inventory
    const POTION_CONFIG = {
      health_potion:   { stat:'hp', amount:3, icon:'❤️', label:'HP', color:'#EF4444' },
      behavior_potion: { stat:'mp', amount:3, icon:'💙', label:'MP', color:'#3B82F6' },
      stamina_potion:  { stat:'sp', amount:3, icon:'💚', label:'SP', color:'#10B981' },
    };
    document.querySelectorAll("[data-use-item]").forEach(slot => {
      const itemKey = slot.dataset.useItem;
      const cfg = POTION_CONFIG[itemKey];
      if (!cfg) return;
      slot.addEventListener("click", () => {
        const used = useStatPotion(STATE.student, itemKey, cfg.stat, cfg.amount);
        if (!used) return;
        logActivity(STATE.student.id, cfg.icon, `Used ${ITEMS[itemKey].n} (+${cfg.amount} ${cfg.label})`);
        const panel = document.querySelector(".char-col-stats") || document.querySelector(".stats-panel-wrap");
        if (panel) panel.classList.add("hp-flash");
        const floater = document.createElement("div");
        floater.className = "hp-floater";
        floater.style.color = cfg.color;
        floater.textContent = `+${cfg.amount} ${cfg.label} ${cfg.icon}`;
        (panel || document.body).appendChild(floater);
        setTimeout(() => { floater.remove(); mount(); }, 900);
      });
    });

    // Gold Pouch — consume to remove from inventory and award 25 gold
    document.querySelectorAll("[data-use-item='gold_pouch']").forEach(slot => {
      slot.addEventListener("click", () => {
        const s = getMergedStudent(STATE.student);
        const items = [...(s.items || [])];
        const idx = items.indexOf('gold_pouch');
        if (idx === -1) return;
        items.splice(idx, 1);
        saveStudentOverride(STATE.student.id, { items });
        awardGold(STATE.student, 25);
        logActivity(STATE.student.id, '🪙', 'Opened Gold Pouch (+25 Gold)');
        showGoldToast(25, () => mount());
      });
    });

    $("help-btn") && $("help-btn").addEventListener("click", () => {
      STATE.helpModalOpen = true;
      mount();
      $("help-modal-input") && $("help-modal-input").focus();
    });
    if ($("help-modal-send") || $("help-modal-skip")) {
      const doFlag = (msg) => {
        STATE.helpFlagged = true;
        STATE.helpModalOpen = false;
        setHelpFlag(STATE.student.id, msg);
        logActivity(STATE.student.id, '🚩', msg ? `Flagged for help: ${msg.slice(0, 60)}` : 'Flagged for help');
        mount();
        const toast = document.createElement("div");
        toast.className = "toast"; toast.textContent = "🙋 Your teacher has been notified! Hang tight, hero.";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
      };
      $("help-modal-send") && $("help-modal-send").addEventListener("click", () => {
        doFlag(($("help-modal-input") || {}).value || '');
      });
      $("help-modal-skip") && $("help-modal-skip").addEventListener("click", () => doFlag(''));
      $("help-modal-overlay") && $("help-modal-overlay").addEventListener("click", (e) => {
        if (e.target === $("help-modal-overlay")) { STATE.helpModalOpen = false; mount(); }
      });
    }
    // Shop open/close
    $("open-shop-btn") && $("open-shop-btn").addEventListener("click", () => {
      STATE.shopOpen = true; STATE.shopConfirmItem = null; STATE.shopSuccess = false; mount();
    });
    if (STATE.shopOpen) {
      const closeShop = () => { STATE.shopOpen = false; STATE.shopConfirmItem = null; STATE.shopSuccess = false; mount(); };
      $("shop-close") && $("shop-close").addEventListener("click", closeShop);
      $("shop-overlay") && $("shop-overlay").addEventListener("click", e => {
        if (e.target === $("shop-overlay")) closeShop();
      });
      // Buy buttons — move to confirm step
      document.querySelectorAll(".shop-buy-btn:not(:disabled)").forEach(btn => {
        btn.addEventListener("click", () => {
          STATE.shopConfirmItem = btn.dataset.shopItem;
          STATE.shopSuccess = false;
          mount();
        });
      });
      // Confirm purchase
      $("shop-confirm-yes") && $("shop-confirm-yes").addEventListener("click", () => {
        const itemId = ($("shop-confirm-yes") || {}).dataset?.confirmId || STATE.shopConfirmItem;
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;
        const gold = getGold(STATE.student);
        if (gold < item.cost) { STATE.shopConfirmItem = null; mount(); return; }
        spendGold(STATE.student, item.cost);
        logActivity(STATE.student.id, '🏪', `Purchased ${item.emoji} ${item.label} for ${item.cost} 🪙 Gold`);
        if (item.id === 'loot_roll') {
          const student = STATE.student;
          const pos = getLandPos(student);
          const land = getLandData(pos.land);
          const poolLand = land && land.name;
          STATE.shopConfirmItem = null; STATE.shopOpen = false;
          if (poolLand && (EQUIP_POOLS[poolLand] || PET_POOLS[poolLand])) {
            const _doShopLoot = () => awardFromPool(student, poolLand, 'rare', () => mount());
            if (!tryMysteryDrop(student, 'shop', _doShopLoot)) _doShopLoot();
          } else {
            mount();
          }
        } else {
          addShopPending(STATE.student, item);
          STATE.shopConfirmItem = null;
          STATE.shopSuccess = true;
          mount();
        }
      });
      $("shop-confirm-no") && $("shop-confirm-no").addEventListener("click", () => {
        STATE.shopConfirmItem = null; mount();
      });
    }
  }

  /* TEACHER LOGIN */
  if (STATE.screen === "teacher-login") {
    const inp = $("pw-inp");
    inp && inp.focus();
    const doLogin = () => {
      const v = inp ? inp.value.trim() : "";
      if (v === TEACHER_PW) {
        migrateCharacterNames();
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
    $("t-gold-shop-btn") && $("t-gold-shop-btn").addEventListener("click", () => { STATE.teacherGoldShopOpen = true; mount(); });
    $("t-boss-roster-btn") && $("t-boss-roster-btn").addEventListener("click", () => {
      STATE.screen = "teacher-boss-roster";
      STATE.bossRosterMarks = {};
      mount();
    });
    $("t-judgment-hall-btn") && $("t-judgment-hall-btn").addEventListener("click", () => {
      STATE.screen = "teacher-judgment-hall";
      STATE.judgmentHallMarks = {};
      mount();
    });
    $("t-boss-backfill-btn") && $("t-boss-backfill-btn").addEventListener("click", () => {
      const n = backfillBossStates();
      const toast = document.createElement("div");
      toast.className = "gold-toast";
      toast.innerHTML = `<div class="gold-pop">🔧 Backfill complete — ${n} boss state${n !== 1 ? 's' : ''} written</div>`;
      document.body.appendChild(toast);
      setTimeout(() => { toast.classList.add("gold-toast-out"); setTimeout(() => toast.remove(), 380); }, 2500);
      mount();
    });
    $("t-class-settings-btn") && $("t-class-settings-btn").addEventListener("click", () => { STATE.classSettingsOpen = true; mount(); });
    if (STATE.classSettingsOpen) {
      const closeCS = () => { STATE.classSettingsOpen = false; mount(); };
      $("cs-close") && $("cs-close").addEventListener("click", closeCS);
      $("cs-overlay") && $("cs-overlay").addEventListener("click", e => { if (e.target === $("cs-overlay")) closeCS(); });
    }
    // Help flag badge — clicking 🤚 on a card clears it
    document.querySelectorAll(".t-flag-badge[data-flag-key='help']").forEach(badge => {
      badge.addEventListener("click", e => {
        e.stopPropagation();
        clearHelpFlag(badge.dataset.flagSid);
        mount();
      });
    });
    if (STATE.teacherGoldShopOpen) {
      const closeTGS = () => { STATE.teacherGoldShopOpen = false; mount(); };
      $("tgs-close") && $("tgs-close").addEventListener("click", closeTGS);
      $("tgs-overlay") && $("tgs-overlay").addEventListener("click", e => { if (e.target === $("tgs-overlay")) closeTGS(); });
    }
    document.querySelectorAll(".period-tab").forEach(btn => {
      btn.addEventListener("click", () => { STATE.teacherPeriodIdx = parseInt(btn.dataset.pi, 10); mount(); });
    });
    document.querySelectorAll(".t-card-menu-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const sid = parseInt(btn.dataset.cardMenu, 10);
        STATE.cardMenuSid = STATE.cardMenuSid === sid ? null : sid;
        mount();
      });
    });
    document.querySelectorAll(".t-s-card").forEach(card => {
      card.addEventListener("click", e => {
        if (e.target.closest("[data-card-menu]") || e.target.closest("[data-card-menu-drop]")) return;
        if (STATE.cardMenuSid !== null) { STATE.cardMenuSid = null; mount(); return; }
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
    // MP Bulk Edit
    $("t-mp-bulk-btn") && $("t-mp-bulk-btn").addEventListener("click", () => { STATE.mpBulkOpen = true; mount(); });
    if (STATE.mpBulkOpen) {
      $("mp-close") && $("mp-close").addEventListener("click", () => { STATE.mpBulkOpen = false; mount(); });
      $("mp-overlay") && $("mp-overlay").addEventListener("click", e => {
        if (e.target === $("mp-overlay")) { STATE.mpBulkOpen = false; mount(); }
      });
      $("mp-sort-mp") && $("mp-sort-mp").addEventListener("click", () => {
        STATE.mpBulkSort = STATE.mpBulkSort === 'asc' ? 'desc' : 'asc'; mount();
      });
      $("mp-sort-name") && $("mp-sort-name").addEventListener("click", () => {
        STATE.mpBulkSort = 'name'; mount();
      });
      document.querySelectorAll(".mp-period-tab").forEach(btn => {
        btn.addEventListener("click", () => { STATE.mpBulkPeriod = btn.dataset.mpPeriod; mount(); });
      });
      document.querySelectorAll(".mp-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const sid = parseInt(btn.dataset.mpSid, 10);
          const delta = parseInt(btn.dataset.mpDelta, 10);
          const allStudents = CLASS_DATA.periods.flatMap(p => p.students);
          const base = allStudents.find(s => s.id === sid);
          if (!base) return;
          const cur = getMergedStudent(base).mp;
          const next = Math.max(1, Math.min(10, cur + delta));
          saveStudentOverride(sid, { mp: next });
          // Optimistic update without full remount — update just the row
          const row = document.querySelector(`[data-mp-sid="${sid}"]`);
          if (row) {
            row.querySelector('.mp-val').textContent = `${next}/10`;
            row.querySelector('.mp-bar-fill').style.width = `${next * 10}%`;
            const minus = row.querySelector('.mp-minus');
            const plus  = row.querySelector('.mp-plus');
            if (minus) minus.disabled = next <= 1;
            if (plus)  plus.disabled  = next >= 10;
          }
        });
      });
    }

    // Exit ticket toggles
    document.querySelectorAll("[data-et-tile]").forEach(btn => {
      btn.addEventListener("click", () => {
        const tileId = btn.dataset.etTile;
        const current = btn.dataset.etVal === '1';
        setExitTicket(tileId, !current);
        mount();
      });
    });

    document.querySelectorAll("[data-boss-tile]").forEach(btn => {
      btn.addEventListener("click", () => {
        const landId = Number(btn.dataset.bossLand);
        const tileId = Number(btn.dataset.bossTile);
        const currentlyOpen = btn.dataset.bossOpen === '1';
        setBossOpen(landId, tileId, !currentlyOpen);
        mount();
      });
    });

    // Pacing settings
    $("pacing-save") && $("pacing-save").addEventListener("click", () => {
      const d = $("pacing-start");
      const td = $("pacing-target-date");
      const tc = $("pacing-target-count");
      if (!d || !d.value || !td || !td.value || !tc || !tc.value) return;
      savePacingSettings(d.value, td.value, Number(tc.value) || 1);
      mount();
    });
    $("pacing-off") && $("pacing-off").addEventListener("click", () => {
      _settings.pacing = null;
      set(ref(db, 'settings/pacing'), null).catch(console.error);
      mount();
    });

    // Progress Lock
    document.querySelectorAll(".pl-cap-select").forEach(sel => {
      sel.addEventListener("change", () => {
        const cohortId = Number(sel.dataset.plCohort);
        const landId   = Number(sel.dataset.plLand);
        const capTileId = sel.value ? Number(sel.value) : null;
        setProgressCap(cohortId, landId, capTileId);
        mount();
      });
    });

    // Crafting approve / deny
    document.querySelectorAll("[data-approve-potion]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        approveCraft(parseInt(btn.dataset.approvePotion, 10));
        mount();
      });
    });
    document.querySelectorAll("[data-deny-potion]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        denyCraft(parseInt(btn.dataset.denyPotion, 10));
        mount();
      });
    });

    // Card menu items
    document.querySelectorAll("[data-reroll-name]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const sid = parseInt(btn.dataset.rerollName, 10);
        const newName = getUniqueName();
        saveStudentOverride(sid, { characterName: newName, claimed: true });
        STATE.cardMenuSid = null;
        mount();
      });
    });
    document.querySelectorAll("[data-view-map]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const sid = parseInt(btn.dataset.viewMap, 10);
        const period = CLASS_DATA.periods[STATE.teacherPeriodIdx];
        const student = (period.students || []).find(s => s.id === sid);
        if (!student) return;
        STATE.teacherViewStudent = student;
        STATE.cardMenuSid = null;
        STATE.screen = "teacher-student-map";
        mount();
      });
    });
    document.querySelectorAll("[data-award-companion]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        STATE.companionPickerStudentId = parseInt(btn.dataset.awardCompanion, 10);
        STATE.companionPickerOpen = true;
        STATE.cardMenuSid = null;
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
    // Gold Shop — Homework Gold per student
    document.querySelectorAll("[data-hw-gold]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const sid = parseInt(btn.dataset.hwGold, 10);
        let stu = null;
        for (const p of CLASS_DATA.periods) { const f = p.students.find(s => s.id === sid); if (f) { stu = f; break; } }
        if (!stu) return;
        awardGold(stu, 15);
        logActivity(sid, '🪙', 'Earned 15 Gold for homework completion!');
        const t = document.createElement("div"); t.className = "toast"; t.textContent = `🪙 +15 Gold awarded to ${getMergedStudent(stu).displayName}`;
        document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
        mount();
      });
    });
    // Gold Shop — Award All +15 Gold
    $("gold-award-all-btn") && $("gold-award-all-btn").addEventListener("click", () => {
      const allStudents = CLASS_DATA.periods.flatMap(p => p.students);
      allStudents.forEach(stu => {
        awardGold(stu, 15);
        logActivity(stu.id, '🪙', 'Earned 15 Gold for homework completion!');
      });
      const t = document.createElement("div"); t.className = "toast"; t.textContent = `🪙 +15 Gold awarded to all ${allStudents.length} students!`;
      document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
      mount();
    });
    // Gold Shop — Mark Fulfilled
    document.querySelectorAll("[data-fulfill-key]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        clearShopPending(btn.dataset.fulfillKey);
        mount();
      });
    });
    // Gold Shop — Item toggles
    document.querySelectorAll("[data-shop-toggle]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const itemId = btn.dataset.shopToggle;
        const currentOn = btn.dataset.shopToggleVal === '1';
        setShopItemEnabled(itemId, !currentOn);
        mount();
      });
    });
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
      const _selLand = getLandData(landId);
      STATE.teacherEdit.currentTile = (_selLand.pathOrder || [])[0] || 1;
      const tileSel = $("tile-sel");
      if (tileSel) {
        const land = getLandData(landId);
        tileSel.innerHTML = land.tiles.map(t => {
          const ico = t.type==="dungeon"?"🏰":t.type==="boss"?"💀":t.type==="event"?"📜":t.type==="loot"?"💰":t.type==="arrival"?"🌟":t.type==="sg"?"🏕️":"📍";
          return `<option value="${t.id}">${ico} ${t.id}: ${t.name}${t.skill?" ("+t.skill+")":""}</option>`;
        }).join("");
      }
    });

    /* Remove equip chips */
    document.querySelectorAll(".chip-x[data-remove-equip]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.removeEquip;
        const ov = getOverrides().students[String(STATE.teacherStudent.id)] || {};
        saveStudentOverride(STATE.teacherStudent.id, { equipInventory: (ov.equipInventory || []).filter(x => x !== id) });
        mount();
      });
    });
    $("add-equip-sel") && $("add-equip-sel").addEventListener("change", e => {
      if (e.target.value) { awardEquipItem(STATE.teacherStudent, e.target.value); mount(); }
    });

    /* Remove seasonal badge chips */
    document.querySelectorAll(".chip-x[data-remove-seasonal]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.removeSeasonal;
        const ov = getOverrides().students[String(STATE.teacherStudent.id)] || {};
        saveStudentOverride(STATE.teacherStudent.id, { seasonalBadges: (ov.seasonalBadges || []).filter(x => x !== id) });
        mount();
      });
    });
    $("add-seasonal-sel") && $("add-seasonal-sel").addEventListener("change", e => {
      const v = e.target.value;
      if (v) {
        const ov = getOverrides().students[String(STATE.teacherStudent.id)] || {};
        saveStudentOverride(STATE.teacherStudent.id, { seasonalBadges: [...new Set([...(ov.seasonalBadges || []), v])] });
        mount();
      }
    });

    /* Remove special badge chips */
    document.querySelectorAll(".chip-x[data-remove-special]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.removeSpecial;
        const ov = getOverrides().students[String(STATE.teacherStudent.id)] || {};
        saveStudentOverride(STATE.teacherStudent.id, { specialBadges: (ov.specialBadges || []).filter(x => x !== id) });
        mount();
      });
    });
    $("add-special-sel") && $("add-special-sel").addEventListener("change", e => {
      const v = e.target.value;
      if (v) {
        const ov = getOverrides().students[String(STATE.teacherStudent.id)] || {};
        saveStudentOverride(STATE.teacherStudent.id, { specialBadges: [...new Set([...(ov.specialBadges || []), v])] });
        mount();
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

    /* Gold input — live save on change */
    $("gold-inp") && $("gold-inp").addEventListener("change", e => {
      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
      saveStudentOverride(STATE.teacherStudent.id, { gold: val });
    });

    /* Remove companion chip */
    document.querySelectorAll(".chip-x[data-remove-companion]").forEach(btn => {
      btn.addEventListener("click", () => {
        const file = btn.dataset.removeCompanion;
        const ov = getOverrides().students[String(STATE.teacherStudent.id)] || {};
        saveStudentOverride(STATE.teacherStudent.id, { companions: (ov.companions || []).filter(f => f !== file) });
        mount();
      });
    });
    /* Add companion */
    $("add-companion-sel") && $("add-companion-sel").addEventListener("change", e => {
      if (e.target.value) { awardCompanion(STATE.teacherStudent, e.target.value); mount(); }
    });

    /* Remove cosmetic chip */
    document.querySelectorAll(".chip-x[data-remove-cosm]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.removeCosm;
        const ov = getOverrides().students[String(STATE.teacherStudent.id)] || {};
        saveStudentOverride(STATE.teacherStudent.id, { unlockedCosmetics: (ov.unlockedCosmetics || []).filter(c => c !== id) });
        mount();
      });
    });
    /* Add cosmetic */
    $("add-cosm-sel") && $("add-cosm-sel").addEventListener("change", e => {
      if (e.target.value) { unlockCosmetic(STATE.teacherStudent, e.target.value); mount(); }
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
      const _prevOv = getOverrides().students[String(STATE.teacherStudent.id)] || {};
      const prevLand = _prevOv.currentLand || 0;
      const prevGuild = _prevOv.guild || null;
      saveStudentOverride(STATE.teacherStudent.id, {
        hp: STATE.teacherEdit.hp,
        mp: STATE.teacherEdit.mp,
        sp: STATE.teacherEdit.sp,
        spOverrideAt: getPacingSettings() ? new Date().toISOString() : null,
        xp: xpVal, xpNext: xpNVal,
        items: STATE.teacherEdit.items,
        bosses: STATE.teacherEdit.bosses,
        currentLand: landVal,
        currentTile: tileVal,
        completedTiles: compTiles,
        ...(guildVal !== undefined ? { guild: guildVal || null } : {}),
        ...extraOverrides,
      });
      // Unlock land frames for any lands the student has now passed
      if (landVal > prevLand) {
        const stub = { id: STATE.teacherStudent.id };
        for (let lid = prevLand; lid < landVal; lid++) {
          if (lid >= 1) unlockCosmeticsForLandComplete(stub, lid);
        }
      }
      // Unlock guild frame if guild was just assigned (changed from previous)
      if (guildVal && guildVal !== prevGuild) {
        unlockCosmeticsForGuild(STATE.teacherStudent.id, guildVal);
      }
      STATE.screen = "teacher-dash";
      const toast = document.createElement("div");
      toast.className = "toast"; toast.textContent = "✅ Changes saved for " + getCharName(STATE.teacherStudent);
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
      const name = getCharName(STATE.teacherStudent);
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
    $("qm-help-btn") && $("qm-help-btn").addEventListener("click", () => {
      if (STATE.helpFlagged) return;
      STATE.helpModalOpen = true; mount();
      $("help-modal-input") && $("help-modal-input").focus();
    });
    // Sanctum return popup close
    $("sanctum-return-close") && $("sanctum-return-close").addEventListener("click", () => {
      STATE.sanctumReturnOpen = false;
      STATE.sanctumReturnLandId = null;
      mount();
    });
    $("sq-board-btn") && $("sq-board-btn").addEventListener("click", () => {
      const pos = getLandPos(STATE.student);
      const land = getLandData(pos.land);
      STATE.sqBoardOpen = true; STATE.sqBoardLandId = land.id; mount();
    });
    $("sq-board-close") && $("sq-board-close").addEventListener("click", () => { STATE.sqBoardOpen = false; mount(); });
    $("sq-board-overlay") && $("sq-board-overlay").addEventListener("click", e => { if (e.target === $("sq-board-overlay")) { STATE.sqBoardOpen = false; mount(); } });
    // View Lesson buttons in sq-board
    document.querySelectorAll(".sq-view-lesson-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tileId = parseInt(btn.dataset.sqTile);
        const sqLandId = btn.dataset.sqLand ? parseInt(btn.dataset.sqLand) : null;
        const land = sqLandId ? LANDS.find(l => l.id === sqLandId) : null;
        const tile = land ? land.tiles.find(t => t.id === tileId) : null;
        const found = (land && tile) ? { tile, land } : LANDS.reduce((acc, l) => acc || (l.tiles.find(t => t.id === tileId) ? { tile: l.tiles.find(t => t.id === tileId), land: l } : null), null);
        if (!found) return;
        STATE.sqBoardOpen = false;
        STATE.lessonTile = found.tile;
        STATE.lessonLand = found.land;
        STATE.screen = "lesson-stop";
        mount();
      });
    });
    document.querySelectorAll(".sq-board-accept").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.sqKey;
        const idx = parseInt(btn.dataset.sqIdx, 10);
        const type = btn.dataset.sqType;
        const tileId = parseInt(btn.dataset.sqTile, 10);
        const landId = btn.dataset.sqLand ? parseInt(btn.dataset.sqLand) : null;
        if (type === 'collab') {
          STATE.sqPartnerPickOpen = true;
          STATE.sqPartnerPickKey = key;
          STATE.sqPartnerPickIdx = idx;
          STATE.sqPartnerPickType = type;
          STATE.sqPartnerPickTile = tileId;
          STATE.sqPartnerPickLand = landId;
          STATE.sqPartnerPickSelected = null;
          mount();
        } else {
          const quest = resolveSoloQuest(tileId, idx);
          acceptSideQuest(STATE.student.id, tileId, type, idx, landId);
          logActivity(STATE.student.id, '📜', `Accepted quest: ${quest.title}`);
          mount();
        }
      });
    });
    // Partner picker (for collab quests from sq-board)
    if (STATE.sqPartnerPickOpen) {
      $("partner-pick-cancel") && $("partner-pick-cancel").addEventListener("click", () => { STATE.sqPartnerPickOpen = false; STATE.sqPartnerPickSelected = null; mount(); });
      $("partner-pick-overlay") && $("partner-pick-overlay").addEventListener("click", e => {
        if (e.target === $("partner-pick-overlay")) { STATE.sqPartnerPickOpen = false; STATE.sqPartnerPickSelected = null; mount(); }
      });
      document.querySelectorAll(".partner-row").forEach(row => {
        row.addEventListener("click", () => { STATE.sqPartnerPickSelected = parseInt(row.dataset.partnerId, 10); mount(); });
      });
      $("partner-pick-send") && $("partner-pick-send").addEventListener("click", () => {
        const { sqPartnerPickKey: key, sqPartnerPickIdx: idx, sqPartnerPickTile: tileId, sqPartnerPickLand: landId, sqPartnerPickSelected: recipientId } = STATE;
        if (!recipientId) return;
        const quest = COLLAB_QUESTS[idx] || COLLAB_QUESTS[0];
        acceptSideQuest(STATE.student.id, tileId, 'collab', idx, landId);
        logActivity(STATE.student.id, '🤝', `Accepted quest: ${quest.title} — awaiting partner`);
        sendQuestInvite(getMergedStudent(STATE.student), recipientId, key, quest.title, tileId, 'collab', idx, landId);
        STATE.sqPartnerPickOpen = false; STATE.sqPartnerPickSelected = null;
        mount();
      });
    }
    const qmSvg = document.querySelector(".lm-svg-wrap svg");
    qmSvg && qmSvg.addEventListener("click", e => {
      const g = e.target.closest("[data-tid]");
      if (!g) return;
      const tid  = parseInt(g.dataset.tid);
      const pos  = getLandPos(STATE.student);
      const land = getLandData(pos.land);
      const tile = land.tiles.find(t => t.id === tid);
      if (!tile) return;
      const _ts = tileState(tile, pos, false, land);
      if (_ts === "capped") { STATE.capMessageOpen = true; mount(); return; }
      if (_ts === "locked") {
        if (tile.type === "boss" || tile.type === "dungeon") { STATE.bossLockedOpen = true; mount(); }
        return;
      }
      if (tile.type === "sg") {
        // Tile 3: Guild Hall — trigger reveal animation for first-timers
        if (tile.id === 3) {
          const _gOv = getOverrides().students[String(STATE.student.id)] || {};
          if (!_gOv.guild) {
            STATE.sg0GuildReveal = "intro";
            STATE.sg0Tile = tile;
            mount();
            return;
          }
        }
        // Reset NPC dialogue state when opening Tile 1 fresh (before completion)
        if (tile.id === 1) {
          const _t1pos = getLandPos(STATE.student);
          if (!(_t1pos.completed || []).includes(1)) {
            STATE.tgDialogueOpen = false;
            STATE.tgContinueReady = false;
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
        const _evPos = getLandPos(STATE.student);
        savePreEventPosition(STATE.student.id, land.id, _evPos.tile);
        STATE.sanctumLand = land;
        STATE.lessonTile = tile;
        STATE.lessonLand = land;
        STATE.lessonOpenedAt = Date.now();
        STATE.scribeIntroOpen = true;
        STATE.sanctumTileOpen = null;
        STATE.writingEventReturnTo = 'sanctum-map';
        STATE.writingTransportDir = 'in';
        STATE.screen = "writing-transport";
        mount();
        setTimeout(() => { if (STATE.screen === "writing-transport") { STATE.screen = "sanctum-map"; mount(); } }, 2600);
      } else if (tile.type === "lesson" || (tile.type === "loot" && tile.parentTileId)) {
        STATE.lessonTile = tile;
        STATE.lessonLand = land;
        STATE.lessonOpenedAt = Date.now();
        STATE.screen = "lesson-stop";
        mount();
      } else if (tile.type === "boss" || tile.type === "dungeon") {
        STATE.bossTile = tile;
        STATE.bossLand = land;
        const _bkIntro = `${land.id}_${tile.id}`;
        STATE.bossIntroOpen = getBossStatus(STATE.student, _bkIntro) === 'not_attempted';
        STATE.screen = "boss-screen";
        mount();
      }
    });
    // Boss locked modal close
    if (STATE.bossLockedOpen) {
      const closeBossLocked = () => { STATE.bossLockedOpen = false; mount(); };
      $("boss-locked-close")     && $("boss-locked-close").addEventListener("click", closeBossLocked);
      $("boss-locked-close-btn") && $("boss-locked-close-btn").addEventListener("click", closeBossLocked);
      $("boss-locked-overlay")   && $("boss-locked-overlay").addEventListener("click", e => { if (e.target === $("boss-locked-overlay")) closeBossLocked(); });
    }
    if (STATE.capMessageOpen) {
      const closeCapMsg = () => { STATE.capMessageOpen = false; mount(); };
      $("cap-msg-close")     && $("cap-msg-close").addEventListener("click", closeCapMsg);
      $("cap-msg-close-btn") && $("cap-msg-close-btn").addEventListener("click", closeCapMsg);
      $("cap-msg-overlay")   && $("cap-msg-overlay").addEventListener("click", e => { if (e.target === $("cap-msg-overlay")) closeCapMsg(); });
    }
    // NPC modal close
    const closeNpc = () => { STATE.npcOpen = false; STATE.currentNpcKey = null; mount(); };
    $("npc-close")     && $("npc-close").addEventListener("click", closeNpc);
    $("npc-close-btn") && $("npc-close-btn").addEventListener("click", closeNpc);
    $("npc-overlay")   && $("npc-overlay").addEventListener("click", e => { if (e.target === $("npc-overlay")) closeNpc(); });
    // Guild intro — "I'm Ready to Join" triggers the sorting animation
    $("guild-intro-btn") && $("guild-intro-btn").addEventListener("click", () => {
      assignGuild(STATE.student.id);
      STATE.sg0GuildReveal = "spinning";
      mount();
      setTimeout(() => {
        if (STATE.sg0GuildReveal === "spinning") {
          STATE.sg0GuildReveal = "watching";
          mount();
          setTimeout(() => {
            if (STATE.sg0GuildReveal === "watching") {
              STATE.sg0GuildReveal = "chosen";
              mount();
            }
          }, 900);
        }
      }, 2500);
    });
    // Guild reveal — continue button advances tile 3
    $("guild-continue-btn") && $("guild-continue-btn").addEventListener("click", () => {
      const tile = STATE.sg0Tile;
      if (tile) advanceSg0Tile(STATE.student, tile.id);
      STATE.sg0GuildReveal = null;
      STATE.sg0Tile = null;
      mount();
    });
    // Land 0 sg modal — Tile 1 NPC dialogue (Lumielle intro)
    $("tg-lumielle") && $("tg-lumielle").addEventListener("click", () => { STATE.tgDialogueOpen = true; mount(); });
    if (STATE.tgDialogueOpen) {
      const closeTg1Dlg = () => { STATE.tgDialogueOpen = false; STATE.tgContinueReady = true; mount(); };
      $("tg-npc-close")     && $("tg-npc-close").addEventListener("click", closeTg1Dlg);
      $("tg-npc-close-btn") && $("tg-npc-close-btn").addEventListener("click", closeTg1Dlg);
      $("tg-npc-overlay")   && $("tg-npc-overlay").addEventListener("click", e => { if (e.target === $("tg-npc-overlay")) closeTg1Dlg(); });
    }
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
      if (!STATE.genName) STATE.genName = randName();
      if (!STATE.genEpithet) STATE.genEpithet = randEpithet();
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
        // Graduate to Land 1 — travel screen then hub
        const nextLand = LANDS[0];
        STATE.travelDestName = nextLand ? nextLand.name : "The Verdant Vale";
        STATE.screen = "travel-screen";
        mount();
        setTimeout(() => { STATE.screen = "quest-map"; mount(); }, 2500);
        return;
      }
      mount();
    });
  }

  if (STATE.screen === "teacher-boss-roster") {
    $("brs-back") && $("brs-back").addEventListener("click", () => { STATE.screen = "teacher-dash"; mount(); });
    // Period tabs
    document.querySelectorAll("[data-brs-pi]").forEach(btn => {
      btn.addEventListener("click", () => {
        STATE.bossRosterPeriodIdx = parseInt(btn.dataset.brsPi, 10);
        STATE.bossRosterMarks = {};
        mount();
      });
    });
    // Boss selector
    const brsSel = $("boss-roster-sel");
    brsSel && brsSel.addEventListener("change", () => {
      STATE.bossRosterKey = brsSel.value;
      STATE.bossRosterMarks = {};
      mount();
    });
    // Defeated / Retake per-student buttons
    document.querySelectorAll("[data-brs-sid]").forEach(btn => {
      btn.addEventListener("click", () => {
        const sid = btn.dataset.brsSid;
        const mark = btn.dataset.brsMark;
        // Toggle off if already selected
        if (STATE.bossRosterMarks[sid] === mark) {
          STATE.bossRosterMarks[sid] = null;
        } else {
          STATE.bossRosterMarks[sid] = mark;
        }
        mount();
      });
    });
    // Submit
    $("brs-submit") && $("brs-submit").addEventListener("click", () => {
      const key = STATE.bossRosterKey;
      if (!key) return;
      const entries = Object.entries(STATE.bossRosterMarks).filter(([, v]) => v !== null && v !== undefined);
      entries.forEach(([sid, mark]) => setBossStatus(sid, key, mark));
      const count = entries.length;
      STATE.bossRosterMarks = {};
      STATE.screen = "teacher-dash";
      mount();
      // Show toast notification
      const toast = document.createElement("div");
      toast.className = "gold-toast";
      toast.innerHTML = `<div class="gold-pop">✅ Boss results saved for ${count} student${count !== 1 ? 's' : ''}!</div>`;
      document.body.appendChild(toast);
      setTimeout(() => { toast.classList.add("gold-toast-out"); setTimeout(() => toast.remove(), 380); }, 2000);
    });
  }

  if (STATE.screen === "teacher-judgment-hall") {
    $("jh-back") && $("jh-back").addEventListener("click", () => { STATE.screen = "teacher-dash"; mount(); });

    // Pass / Fail toggle buttons
    document.querySelectorAll("[data-jhk][data-jhr]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.jhk;
        const result = btn.dataset.jhr;
        const cur = STATE.judgmentHallMarks[key] || {};
        // Toggle off if already selected
        if (cur.result === result) {
          STATE.judgmentHallMarks[key] = { ...cur, result: null };
        } else {
          STATE.judgmentHallMarks[key] = { ...cur, result };
        }
        mount();
      });
    });

    // Post-as-grade checkboxes (standard bosses only)
    document.querySelectorAll(".jh-grade-cb").forEach(cb => {
      cb.addEventListener("change", () => {
        const key = cb.dataset.jhk;
        const cur = STATE.judgmentHallMarks[key] || {};
        STATE.judgmentHallMarks[key] = { ...cur, postGrade: cb.checked };
      });
    });

    // Mark all pass per boss group
    document.querySelectorAll("[data-jh-bulk]").forEach(btn => {
      btn.addEventListener("click", () => {
        const bossKey = btn.dataset.jhBulk;
        const land = LANDS[0];
        const periods = CLASS_DATA.periods || [];
        const allStudents = periods.flatMap(p => (p.students || []));
        allStudents.forEach(student => {
          const markKey = `${bossKey}_${student.id}`;
          const cur = STATE.judgmentHallMarks[markKey] || {};
          const isStd = !!land.standardBosses?.[bossKey];
          const state = isStd
            ? getStdBossState(String(student.id), bossKey)
            : getGateBossState(String(student.id), bossKey);
          const isAwaiting = isStd
            ? state.status === 'awaiting_judgment'
            : (state.status === 'active' || state.status === 'awaiting_judgment');
          if (isAwaiting) {
            STATE.judgmentHallMarks[markKey] = { ...cur, result:'pass' };
          }
        });
        mount();
      });
    });

    // Save
    $("jh-save") && $("jh-save").addEventListener("click", () => {
      const land = LANDS[0];
      const entries = Object.entries(STATE.judgmentHallMarks).filter(([, m]) => m && m.result);
      let count = 0;
      entries.forEach(([key, mark]) => {
        const sep = key.lastIndexOf('_');
        const bossKey = key.slice(0, sep);
        const studentId = key.slice(sep + 1);
        const isStd = !!land.standardBosses?.[bossKey];
        if (isStd) {
          const boss = land.standardBosses[bossKey];
          const cur = getStdBossState(studentId, bossKey);
          const isLast = cur.encounterCount >= boss.sessions.length;
          const newStatus = mark.result === 'pass'
            ? (isLast ? 'defeated' : 'fightable')
            : 'failed';
          setStdBossState(studentId, bossKey, { ...cur, status:newStatus, failedAt: mark.result === 'fail' ? new Date().toISOString() : null });
        } else if (land.gateBosses?.[bossKey]) {
          const cur = getGateBossState(studentId, bossKey);
          const newStatus = mark.result === 'pass' ? 'defeated' : 'failed';
          setGateBossState(studentId, bossKey, { ...cur, status:newStatus });
        }
        count++;
      });
      STATE.judgmentHallMarks = {};
      STATE.screen = "teacher-dash";
      mount();
      const toast = document.createElement("div");
      toast.className = "gold-toast";
      toast.innerHTML = `<div class="gold-pop">⚖️ Judgment Hall saved — ${count} student${count !== 1 ? 's' : ''} updated!</div>`;
      document.body.appendChild(toast);
      setTimeout(() => { toast.classList.add("gold-toast-out"); setTimeout(() => toast.remove(), 380); }, 2400);
    });

    // Gatekeeper Excellence Bonus — awards legendary loot to the student (teacher-triggered, no auto logic)
    document.querySelectorAll("[data-jhk-exc]").forEach(btn => {
      btn.addEventListener("click", () => {
        const markKey = btn.dataset.jhkExc;
        if (STATE.jhExcellenceAwarded[markKey]) return;
        const studentId = btn.dataset.excSid;
        const allPeriods = (CLASS_DATA && CLASS_DATA.periods) || [];
        let foundStudent = null;
        for (const p of allPeriods) {
          foundStudent = (p.students || []).find(s => String(s.id) === studentId);
          if (foundStudent) break;
        }
        if (!foundStudent) return;
        STATE.jhExcellenceAwarded[markKey] = true;
        const land = LANDS[0];
        awardFromPool(foundStudent, land.name, 'legendary');
        logActivity(studentId, '⭐', 'Gatekeeper Excellence Bonus awarded');
        mount();
      });
    });
  }

  if (STATE.screen === "writing-event") {
    $("we-back") && $("we-back").addEventListener("click", () => {
      STATE.screen = STATE.writingEventReturnTo === 'sanctum-map' ? "sanctum-map" : "quest-map";
      mount();
    });

    // Scribe intro overlay close
    $("scribe-intro-close") && $("scribe-intro-close").addEventListener("click", () => { STATE.scribeIntroOpen = false; mount(); });
    $("scribe-intro-overlay") && $("scribe-intro-overlay").addEventListener("click", e => { if (e.target === $("scribe-intro-overlay")) { STATE.scribeIntroOpen = false; mount(); } });

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
          btn.textContent = allDone ? '⚔ My Battle Is Complete' : 'Check off all items to continue';
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
      setWriteStatus(STATE.student.id, land.id, 'submitted');
      mount();
    });

    $("we-confirm-btn") && $("we-confirm-btn").addEventListener("click", () => {
      const tile = STATE.lessonTile;
      const land = STATE.lessonLand || LANDS[0];
      const student = STATE.student;
      if (!tile) return;
      setWriteStatus(student.id, land.id, 'confirmed');
      const timeOnPage = Math.round((Date.now() - (STATE.lessonOpenedAt || Date.now())) / 1000);
      const { levelsGained, newLevel } = awardXP(student, tileXP(tile));
      saveTileCompletion(student.id, tile.id, timeOnPage);
      completeBranchTile(student, tile.id);
      advanceStudentTile(student, land);
      awardGold(student, 15);
      logActivity(student.id, '📜', `Completed The Scribe's Calling on ${land.name}!`);
      STATE.writingTransportDir = 'out';
      STATE.sanctumReturnOpen = true;
      STATE.sanctumReturnLandId = land.id;
      showXPCelebration(tileXP(tile), levelsGained, newLevel, () => {
        STATE.screen = "writing-transport"; mount();
        setTimeout(() => {
          if (STATE.screen === "writing-transport") {
            STATE.writingEventReturnTo = 'quest-map';
            STATE.screen = "quest-map";
            if (LAND1_SOLO_QUESTS[tile.id]) {
              STATE.sideQuestModalOpen = true;
              STATE.sideQuestTileId = tile.id;
              STATE.sideQuestSoloIdx = 0;
              STATE.sideQuestCollabIdx = pickQuestIdx(COLLAB_QUESTS, tile.id, 2);
            }
            mount();
          }
        }, 2600);
      });
    });

    $("we-resubmit-btn") && $("we-resubmit-btn").addEventListener("click", () => {
      const land = STATE.lessonLand || LANDS[0];
      setWriteStatus(STATE.student.id, land.id, 'not_attempted');
      mount();
    });
  }

  if (STATE.screen === "sanctum-map") {
    $("sanctum-back") && $("sanctum-back").addEventListener("click", () => { STATE.screen = "quest-map"; mount(); });

    $("scribe-intro-close") && $("scribe-intro-close").addEventListener("click", () => { STATE.scribeIntroOpen = false; mount(); });
    $("scribe-intro-overlay") && $("scribe-intro-overlay").addEventListener("click", e => {
      if (e.target === $("scribe-intro-overlay")) { STATE.scribeIntroOpen = false; mount(); }
    });

    // Station tile clicks
    document.querySelectorAll(".st-tile-click[data-st]").forEach(el => {
      el.addEventListener("click", () => {
        const stId = parseInt(el.dataset.st, 10);
        const land = STATE.sanctumLand || STATE.lessonLand || LANDS[0];
        if (stId === 5) {
          const ws = getWriteStatus(STATE.student, land.id);
          if (ws === 'submitted' || ws === 'approved' || ws === 'revision') {
            // Teacher has responded — go to writing-event to see status
            STATE.writingEventReturnTo = 'sanctum-map';
            STATE.screen = "writing-event";
            mount();
            return;
          }
        }
        STATE.sanctumTileOpen = stId;
        mount();
      });
    });

    // Checklist checkbox toggles — persist bit and re-render
    document.querySelectorAll(".st-checkbox").forEach(cb => {
      cb.addEventListener("change", () => {
        const land = STATE.sanctumLand || STATE.lessonLand || LANDS[0];
        const stId = STATE.sanctumTileOpen;
        if (!stId) return;
        let bits = getSanctumChecklist(STATE.student, land.id, stId);
        const idx = parseInt(cb.dataset.idx, 10);
        if (cb.checked) bits |= (1 << idx);
        else bits &= ~(1 << idx);
        setSanctumChecklist(STATE.student.id, land.id, stId, bits);
        mount();
      });
    });

    // Station continue button
    $("st-continue-btn") && $("st-continue-btn").addEventListener("click", () => {
      const land = STATE.sanctumLand || STATE.lessonLand || LANDS[0];
      const stId = STATE.sanctumTileOpen;
      if (!stId) return;
      const bits = getSanctumChecklist(STATE.student, land.id, stId);
      if (bits !== 31) return;
      if (stId === 5) {
        // Tile 5 complete — submit to scribe (triggers holding state)
        setWriteStatus(STATE.student.id, land.id, 'submitted');
        const cur = getSanctumProgress(STATE.student, land.id);
        if (5 > cur) setSanctumProgress(STATE.student.id, land.id, 5);
        STATE.sanctumTileOpen = null;
        mount();
      } else {
        const cur = getSanctumProgress(STATE.student, land.id);
        if (stId > cur) setSanctumProgress(STATE.student.id, land.id, stId);
        STATE.sanctumTileOpen = null;
        mount();
      }
    });

    $("st-modal-overlay") && $("st-modal-overlay").addEventListener("click", e => {
      if (e.target === $("st-modal-overlay")) { STATE.sanctumTileOpen = null; mount(); }
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

  if (STATE.screen === "realm-complete") {
    $("rc-return-btn") && $("rc-return-btn").addEventListener("click", () => { STATE.screen = "quest-map"; mount(); });
  }

  if (STATE.screen === "boss-screen") {
    $("boss-back") && $("boss-back").addEventListener("click", () => { STATE.screen = "quest-map"; mount(); });
    // Boss intro overlay close
    $("boss-intro-close") && $("boss-intro-close").addEventListener("click", () => { STATE.bossIntroOpen = false; mount(); });
    $("boss-intro-overlay") && $("boss-intro-overlay").addEventListener("click", e => { if (e.target === $("boss-intro-overlay")) { STATE.bossIntroOpen = false; mount(); } });
    // "My Battle Is Complete" — submit for teacher review
    $("boss-complete-btn") && $("boss-complete-btn").addEventListener("click", () => {
      const tile = STATE.bossTile;
      const land = STATE.bossLand || LANDS[0];
      if (!tile) return;
      setBossStatus(STATE.student.id, `${land.id}_${tile.id}`, 'submitted');
      mount();
    });
    $("boss-fight-btn") && $("boss-fight-btn").addEventListener("click", () => {
      const url = STATE.bossTile?.pearUrl || "https://app.peardeck.com";
      window.open(url, "_blank", "noopener");
    });
    $("boss-confirm-btn") && $("boss-confirm-btn").addEventListener("click", () => {
      const tile = STATE.bossTile;
      const land = STATE.bossLand || LANDS[0];
      const student = STATE.student;
      const bossKey = `${land.id}_${tile.id}`;
      const isDungeon = tile.type === "dungeon";
      const isFirstBoss = !hasCompletedAnyBoss(student);
      // Mark confirmed
      setBossStatus(student.id, bossKey, 'confirmed');
      // Advance the student past this tile
      const pos = getLandPos(student);
      const completed = [...(pos.completed||[])];
      if (!completed.includes(tile.id)) completed.push(tile.id);
      saveStudentOverride(student.id, { completedTiles: completed });
      logActivity(student.id, isDungeon ? '🏰' : '⚔️', `Defeated ${tile.name}!`);
      // Detect final land boss (last tile in pathOrder)
      const _pathOrder = land.pathOrder || [];
      const _isFinalBoss = _pathOrder.length > 0 && tile.id === _pathOrder[_pathOrder.length - 1];
      advanceStudentTile(student, land);
      // Cosmetics unlock for boss/dungeon defeat
      unlockCosmeticsForBoss(student, tile.name);
      // Loot drops
      const _bossLandName = land && land.name;
      awardGold(student, 20);
      logActivity(student.id, '🪙', `Earned 20 Gold for defeating ${tile.name}!`);
      const _afterBossGold = _isFinalBoss
        ? () => triggerLandTravel(student, land)
        : () => {
            STATE.screen = "quest-map";
            if (isDungeon && LAND1_SOLO_QUESTS[tile.id]) {
              STATE.sideQuestModalOpen = true;
              STATE.sideQuestTileId = tile.id;
              STATE.sideQuestSoloIdx = 0;
              STATE.sideQuestCollabIdx = pickQuestIdx(COLLAB_QUESTS, tile.id, 2);
            }
            mount();
          };
      let companionFile = null;
      if (isDungeon) {
        companionFile = randFrom(companionsByRarity("rare")).file;
      } else if (isFirstBoss) {
        companionFile = randFrom(companionsByRarity("common")).file;
      }
      const _doBossLoot = () => {
        if (_bossLandName) {
          if (isDungeon) awardFromPool(student, _bossLandName, 'legendary');
          else awardFromPool(student, _bossLandName, 'epic');
          awardSeasonalBadge(student);
          checkAndAwardSpecialBadges(student);
        }
        if (companionFile) {
          awardCompanion(student, companionFile);
          showCompanionReveal(companionFile, () => showGoldToast(20, _afterBossGold));
        } else {
          showGoldToast(20, _afterBossGold);
        }
      };
      if (!tryMysteryDrop(student, 'boss', _doBossLoot)) _doBossLoot();
    });
  }

  if (STATE.screen === "lesson-stop") {
    document.querySelectorAll(".ls-back-btn").forEach(btn => btn.addEventListener("click", () => { STATE.sqPartnerPickOpen = false; STATE.screen = "quest-map"; mount(); }));
    // Training Grounds NPC tutorial
    $("tg-lumielle") && $("tg-lumielle").addEventListener("click", () => { STATE.tgDialogueOpen = true; mount(); });
    if (STATE.tgDialogueOpen) {
      const closeTgDlg = () => { STATE.tgDialogueOpen = false; STATE.tgContinueReady = true; mount(); };
      $("tg-npc-close")     && $("tg-npc-close").addEventListener("click", closeTgDlg);
      $("tg-npc-close-btn") && $("tg-npc-close-btn").addEventListener("click", closeTgDlg);
      $("tg-npc-overlay")   && $("tg-npc-overlay").addEventListener("click", e => { if (e.target === $("tg-npc-overlay")) closeTgDlg(); });
    }
    // Partner picker modal
    if (STATE.sqPartnerPickOpen) {
      $("partner-pick-cancel") && $("partner-pick-cancel").addEventListener("click", () => { STATE.sqPartnerPickOpen = false; STATE.sqPartnerPickSelected = null; mount(); });
      $("partner-pick-overlay") && $("partner-pick-overlay").addEventListener("click", e => {
        if (e.target === $("partner-pick-overlay")) { STATE.sqPartnerPickOpen = false; STATE.sqPartnerPickSelected = null; mount(); }
      });
      document.querySelectorAll(".partner-row").forEach(row => {
        row.addEventListener("click", () => {
          STATE.sqPartnerPickSelected = parseInt(row.dataset.partnerId, 10);
          mount();
        });
      });
      $("partner-pick-send") && $("partner-pick-send").addEventListener("click", () => {
        const { sqPartnerPickKey: key, sqPartnerPickIdx: idx, sqPartnerPickTile: tileId, sqPartnerPickLand: landId, sqPartnerPickSelected: recipientId } = STATE;
        if (!recipientId) return;
        const quest = COLLAB_QUESTS[idx] || COLLAB_QUESTS[0];
        // Sender's quest becomes Active
        acceptSideQuest(STATE.student.id, tileId, 'collab', idx, landId);
        logActivity(STATE.student.id, '🤝', `Accepted quest: ${quest.title} — awaiting partner`);
        // Send invite to recipient
        sendQuestInvite(getMergedStudent(STATE.student), recipientId, key, quest.title, tileId, 'collab', idx, landId);
        STATE.sqPartnerPickOpen = false; STATE.sqPartnerPickSelected = null;
        mount();
      });
    }
    $("ls-video-btn") && $("ls-video-btn").addEventListener("click", () => {
      const url = STATE.lessonTile?.video || "https://edpuzzle.com";
      window.open(url, "_blank", "noopener");
      if (STATE.lessonTile && STATE.student) {
        saveVideoOpened(STATE.student.id, STATE.lessonTile.id);
        mount();
      }
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
      // Immediately lock: disable the button and pre-write completedTiles into the local cache.
      // advanceStudentTile fires much later (after toast callbacks); without this pre-write the
      // alreadyDone guard stays false for the entire toast duration, allowing re-entry.
      if (btn) btn.disabled = true;
      saveStudentOverride(STATE.student.id, { completedTiles: [...new Set([...(pos.completed || []), tile.id])] });
      const prog = getTaskProgress(STATE.student.id, tile.id);
      const _rlSubmit = tile.type === 'lesson' && !isBranchTile && !BOSS_SCHEDULE[String(tile.id)];
      const _shouldDone = (tile.shouldDo||[]).length > 0 && (tile.shouldDo||[]).every((_,i) => (prog.shouldDo||[])[i]);
      const _aspireDone = (tile.aspireTo||[]).length > 0 && (tile.aspireTo||[]).every((_,i) => (prog.aspireTo||[])[i]);
      const _nearpodDone = _rlSubmit && !!(prog.nearpod||[])[0];
      const _wbDone = _rlSubmit && !!(prog.workbook||[])[0];
      const xpAmount = _rlSubmit
        ? (_nearpodDone ? 10 : 0) + (_wbDone ? 5 : 0)
        : tile.type === 'lesson' ? (10 + (_shouldDone?5:0) + (_aspireDone?5:0)) : tileXP(tile);
      const goldAmount = _rlSubmit
        ? (_nearpodDone ? 5 : 0) + (_wbDone ? 3 : 0)
        : tile.type === 'loot' ? 10 : (5 + (_shouldDone?3:0) + (_aspireDone?3:0));
      const timeOnPage = STATE.lessonOpenedAt ? Math.round((Date.now() - STATE.lessonOpenedAt) / 1000) : null;
      saveTileCompletion(STATE.student.id, tile.id, timeOnPage);
      updateBossStateOnTileComplete(STATE.student, tile.id, land);
      let levelsGained = 0, newLevel = 0;
      if (xpAmount > 0 || goldAmount > 0) {
        const _lvl = awardXP(STATE.student, xpAmount);
        levelsGained = _lvl.levelsGained; newLevel = _lvl.newLevel;
        awardGold(STATE.student, goldAmount);
      }
      const _amtLabel = (xpAmount > 0 || goldAmount > 0) ? ` (+${xpAmount} XP, +${goldAmount} 🪙)` : '';
      logActivity(STATE.student.id, '📖', `Completed ${tile.name}${tile.sessionTitle ? ': ' + tile.sessionTitle : ''}${_amtLabel}`);
      if (levelsGained > 0) logActivity(STATE.student.id, '⬆️', `Reached Level ${newLevel}!`);
      if (_rlSubmit && !STATE.helpFlagged) {
        const _assessLevel = (prog.selfAssessLevel || [])[0] || 0;
        if (_assessLevel === 1) {
          STATE.helpFlagged = true;
          setHelpFlag(STATE.student.id, `Self-assessment: "I don't get it. I need help." (${tile.sessionTitle || tile.name || 'lesson'})`);
          logActivity(STATE.student.id, '🚩', `Flagged for help via self-assessment on ${tile.sessionTitle || tile.name || 'lesson'}`);
        }
      }
      const hasExitTicket = getExitTicketEnabled(tile.id);

      // Increment per-student lesson counter and decide whether to show the collab popup.
      // Counter persists across sessions via saveStudentOverride.
      // Art-deliverable tiles (LAND1_SOLO_QUESTS) always show the popup regardless.
      let _sqGate = false;
      if (tile.type === 'lesson') {
        const _ov = _overrides[String(STATE.student.id)] || {};
        const _newLessonCount = ((_ov.lessonCompletionCount || 0) + 1);
        saveStudentOverride(STATE.student.id, { lessonCompletionCount: _newLessonCount });
        const _hasActiveCollab = Object.values(getActiveSideQuests(STATE.student)).some(q => q.type === 'collab');
        _sqGate = (_newLessonCount % 3 === 0) && !_hasActiveCollab;
      }

      const openSQPopup = (tileId) => {
        const _hasArtDeliverable = !!LAND1_SOLO_QUESTS[tileId];
        if (!_hasArtDeliverable && !_sqGate) {
          STATE.screen = "quest-map";
          return;
        }
        STATE.sideQuestModalOpen = true;
        STATE.sideQuestTileId = tileId;
        STATE.sideQuestSoloIdx = 0;
        STATE.sideQuestCollabIdx = pickQuestIdx(COLLAB_QUESTS, tileId, 2);
      };
      const doAdvance = () => {
        if (isBranchTile) completeBranchTile(STATE.student, tile.id);
        else advanceStudentTile(STATE.student, land);
        if (tile.type === 'lesson') {
          openSQPopup(tile.id);
          mount();
        } else {
          STATE.screen = "quest-map"; mount();
        }
      };
      const doAdvanceWithGrade = () => {
        if (isBranchTile) completeBranchTile(STATE.student, tile.id);
        else advanceStudentTile(STATE.student, land);
        if (tile.type === 'lesson') {
          STATE.pendingSQAfterGrade = {
            tileId: tile.id,
            soloIdx: 0,
            collabIdx: pickQuestIdx(COLLAB_QUESTS, tile.id, 2),
            sqGate: _sqGate
          };
        }
        STATE.gradeModalOpen = true;
        STATE.gradeModalLessonId = tile.id;
        mount();
      };
      const finalCallback = hasExitTicket ? doAdvanceWithGrade : doAdvance;

      // XP toast fires after loot popup is dismissed (or after 2500ms), Gold toast follows XP
      const _showMainXP = (xpAmount > 0 || goldAmount > 0)
        ? () => showXPCelebration(xpAmount, levelsGained, newLevel, () => showGoldToast(goldAmount, finalCallback))
        : () => finalCallback();

      // Tiered loot: determined by tile type + skill, not by which checkboxes were ticked
      const _poolLand = (land && land.name) || (LANDS[0] && LANDS[0].name);
      const _isAspireTile = tile.type === 'loot' && tile.skill === 'Aspire To';
      const _isShouldTile = tile.type === 'loot' && tile.skill === 'Should Do';
      // Aspire To → Rare; Should Do → Common with 15% upgrade to Rare; regular lesson → Common
      const _dropTier = _isAspireTile ? 'rare'
                      : (_isShouldTile && Math.random() < 0.15) ? 'rare'
                      : 'common';
      const _hasPool = _poolLand && (EQUIP_POOLS[_poolLand] || PET_POOLS[_poolLand]);
      const _doNormalLoot = () => {
        if (_hasPool) {
          if (Math.random() < 0.2) awardSeasonalBadge(STATE.student);
          checkAndAwardSpecialBadges(STATE.student);
          // Show loot popup first, then XP — with 2500ms fallback
          let _xpFired = false;
          const _showXPOnce = () => { if (!_xpFired) { _xpFired = true; _showMainXP(); } };
          setTimeout(_showXPOnce, 2500);
          awardFromPool(STATE.student, _poolLand, _dropTier, _showXPOnce);
        } else {
          _showMainXP();
        }
      };
      if (!tryMysteryDrop(STATE.student, 'lesson', _doNormalLoot)) _doNormalLoot();
    });
    document.querySelectorAll(".ls-check").forEach(cb => {
      cb.addEventListener("change", () => {
        const tile = STATE.lessonTile;
        saveTaskCheck(STATE.student.id, STATE.lessonTile.id, cb.dataset.tier, parseInt(cb.dataset.idx), cb.checked);
        if (cb.checked) saveTaskTimestamp(STATE.student.id, STATE.lessonTile.id, cb.dataset.tier, parseInt(cb.dataset.idx));
        cb.closest(".ls-task").classList.toggle("ls-task-done", cb.checked);

        const prog = getTaskProgress(STATE.student.id, tile.id);
        const allMust = (tile.mustDo || []).length === 0 || (tile.mustDo || []).every((_, i) => (prog.mustDo || [])[i]);
        const btn = $("ls-submit");
        if (btn && btn.dataset.completed !== "true") {
          btn.disabled = !allMust;
          btn.textContent = allMust ? "✅ I'm Ready!" : "🔒 Complete Must Do tasks to continue";
        }
        // Sync Should Do / Aspire To interactivity independently of the button
        document.querySelectorAll(".ls-tier-should .ls-check, .ls-tier-aspire .ls-check").forEach(inp => {
          inp.disabled = !allMust;
          inp.closest(".ls-task").classList.toggle("ls-task-locked", !allMust);
        });
        document.querySelector(".ls-tier-should")?.classList.toggle("ls-tier-dimmed", !allMust);
        document.querySelector(".ls-tier-aspire")?.classList.toggle("ls-tier-dimmed", !allMust);

      });
    });

    // New lesson checklist checkboxes (regular reading tiles only)
    document.querySelectorAll(".ls-check-new").forEach(cb => {
      cb.addEventListener("change", () => {
        const kind    = cb.dataset.lsKind;
        const tile    = STATE.lessonTile;
        const student = STATE.student;
        if (!student || !tile) return;
        if (kind === 'nearpod') {
          saveTaskCheck(student.id, tile.id, 'nearpod', 0, cb.checked);
          if (cb.checked) saveTaskTimestamp(student.id, tile.id, 'nearpod', 0);
          document.querySelectorAll(".ls-check-new[data-ls-kind='workbook']").forEach(w => {
            w.disabled = !cb.checked;
            w.closest('.sg-check-item, .ls-check-item')?.classList.toggle('sg-check-locked', !cb.checked);
            w.closest('.sg-check-item, .ls-check-item')?.classList.toggle('ls-task-locked', !cb.checked);
          });
          const assessSection = document.getElementById('ls-assess-section');
          if (assessSection) {
            assessSection.classList.toggle('ls-section-locked', !cb.checked);
            assessSection.querySelectorAll('.ls-assess-radio').forEach(r => { r.disabled = !cb.checked; });
          }
          const btn = $('ls-submit');
          if (btn && btn.dataset.completed !== 'true') {
            btn.disabled = !cb.checked;
            btn.textContent = cb.checked ? "✅ I'm Ready!" : "Complete Lesson";
          }
          cb.closest('.ls-check-item')?.classList.toggle('ls-check-item-done', cb.checked);
        } else if (kind === 'workbook') {
          saveTaskCheck(student.id, tile.id, 'workbook', 0, cb.checked);
          if (cb.checked) saveTaskTimestamp(student.id, tile.id, 'workbook', 0);
          cb.closest('.ls-check-item')?.classList.toggle('ls-check-item-done', cb.checked);
        }
      });
    });

    // Self-assessment radio buttons
    document.querySelectorAll(".ls-assess-radio").forEach(radio => {
      radio.addEventListener("change", () => {
        const level   = parseInt(radio.dataset.level);
        const student = STATE.student;
        const tile    = STATE.lessonTile;
        if (!student || !tile) return;
        saveTaskCheck(student.id, tile.id, 'selfAssessLevel', 0, level);
        document.querySelectorAll(".ls-assess-item, .sg-assess-demo").forEach(el => el.classList.remove('ls-assess-selected'));
        (radio.closest('.ls-assess-item') || radio.closest('.sg-assess-demo'))?.classList.add('ls-assess-selected');
      });
    });

    // Inline side quest accept buttons (in lesson modal or sq-board)
    document.querySelectorAll(".ls-sq-accept-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const key  = btn.dataset.sqKey;
        const idx  = parseInt(btn.dataset.sqIdx, 10);
        const type = btn.dataset.sqType;
        const tileId = parseInt(btn.dataset.sqTile, 10);
        const landId = btn.dataset.sqLand ? parseInt(btn.dataset.sqLand) : (STATE.lessonLand?.id || null);
        if (type === 'collab') {
          // Show partner picker instead of immediately accepting
          STATE.sqPartnerPickOpen = true;
          STATE.sqPartnerPickKey = key;
          STATE.sqPartnerPickIdx = idx;
          STATE.sqPartnerPickType = type;
          STATE.sqPartnerPickTile = tileId;
          STATE.sqPartnerPickLand = landId;
          STATE.sqPartnerPickSelected = null;
          mount();
        } else {
          const quest = resolveSoloQuest(tileId, idx);
          acceptSideQuest(STATE.student.id, tileId, type, idx, landId);
          logActivity(STATE.student.id, '📜', `Accepted quest: ${quest.title}`);
          mount();
        }
      });
    });

    // Side quest popup (shown after completing a lesson tile)
    if (STATE.sideQuestModalOpen) {
      $("sq-close") && $("sq-close").addEventListener("click", () => {
        STATE.sideQuestModalOpen = false; STATE.screen = "quest-map"; mount();
      });
      $("sq-overlay") && $("sq-overlay").addEventListener("click", e => {
        if (e.target === $("sq-overlay")) { STATE.sideQuestModalOpen = false; STATE.screen = "quest-map"; mount(); }
      });
      document.querySelectorAll(".btn-sq-accept").forEach(btn => {
        btn.addEventListener("click", () => {
          const key  = btn.dataset.sqKey;
          const idx  = parseInt(btn.dataset.sqIdx, 10);
          const type = btn.dataset.sqType;
          const tid  = STATE.sideQuestTileId;
          const landId = STATE.lessonLand?.id || null;
          if (type === 'collab') {
            STATE.sqPartnerPickOpen = true;
            STATE.sqPartnerPickKey = key;
            STATE.sqPartnerPickIdx = idx;
            STATE.sqPartnerPickType = type;
            STATE.sqPartnerPickTile = tid;
            STATE.sqPartnerPickLand = landId;
            STATE.sqPartnerPickSelected = null;
            mount();
          } else {
            const quest = resolveSoloQuest(tid, idx);
            acceptSideQuest(STATE.student.id, tid, type, idx, landId);
            logActivity(STATE.student.id, '📜', `Accepted quest: ${quest.title}`);
            mount();
          }
        });
      });
    }

    // Grade modal handlers (shown after S6 completion)
    if (STATE.gradeModalOpen) {
      const gradeInput = $("grade-modal-input");
      const gradeClose = () => {
        STATE.gradeModalOpen = false;
        STATE.gradeModalLessonId = null;
        if (STATE.pendingSQAfterGrade) {
          const { tileId, soloIdx, collabIdx, sqGate } = STATE.pendingSQAfterGrade;
          STATE.pendingSQAfterGrade = null;
          const _hasArtDeliverable = !!LAND1_SOLO_QUESTS[tileId];
          if (_hasArtDeliverable || sqGate) {
            STATE.sideQuestModalOpen = true;
            STATE.sideQuestTileId = tileId;
            STATE.sideQuestSoloIdx = soloIdx;
            STATE.sideQuestCollabIdx = collabIdx;
          } else {
            STATE.screen = "quest-map";
          }
        } else {
          STATE.screen = "quest-map";
        }
        mount();
      };
      $("grade-modal-skip") && $("grade-modal-skip").addEventListener("click", () => {
        const lessonId = STATE.gradeModalLessonId;
        if (lessonId != null) saveGradeReminder(STATE.student.id, lessonId);
        gradeClose();
      });
      $("grade-modal-submit") && $("grade-modal-submit").addEventListener("click", () => {
        const val = parseInt(gradeInput ? gradeInput.value : "");
        if (isNaN(val) || val < 0 || val > 100) { gradeClose(); return; }
        const hp = gradeToHP(val);
        const lessonId = STATE.gradeModalLessonId;
        saveStudentOverride(STATE.student.id, { hp });
        saveGradeLog(STATE.student.id, lessonId, val, hp);
        if (lessonId != null) clearGradeReminder(STATE.student.id, lessonId);
        gradeClose();
      });
      gradeInput && setTimeout(() => gradeInput.focus(), 50);
    }
  }

  /* TEACHER STUDENT MAP */
  if (STATE.screen === "teacher-student-map") {
    $("tsm-back") && $("tsm-back").addEventListener("click", () => { STATE.screen = "teacher-dash"; STATE.teacherViewStudent = null; mount(); });
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
    let ovReady = false, hfReady = false, crReady = false, stReady = false;
    function checkReady() { if (ovReady && hfReady && crReady && stReady) resolve(); }

    onValue(ref(db, 'students'), (snap) => {
      const newOverrides = snap.exists() ? snap.val() : {};
      // Force-logout: if a logged-in student's _resetVersion changed, their session is stale.
      if (STATE.student) {
        const sid = String(STATE.student.id);
        const incoming = (newOverrides[sid] || {})._resetVersion ?? null;
        if (incoming !== null && incoming !== STATE._sessionResetVersion) {
          window.location.reload();
          return;
        }
      }
      _overrides = newOverrides;
      if (!ovReady) { ovReady = true; checkReady(); }
      else liveMount();
    }, reject);

    onValue(ref(db, 'helpflags'), (snap) => {
      _helpflags = snap.exists() ? snap.val() : {};
      if (!hfReady) { hfReady = true; checkReady(); }
      else liveMount();
    }, reject);

    onValue(ref(db, 'craftRequests'), (snap) => {
      _craftRequests = snap.exists() ? snap.val() : {};
      if (!crReady) { crReady = true; checkReady(); }
      else liveMount();
    }, reject);

    onValue(ref(db, 'settings'), (snap) => {
      _settings = snap.exists() ? snap.val() : {};
      if (!stReady) { stReady = true; checkReady(); }
      else liveMount();
    }, reject);

    onValue(ref(db, 'activityLog'), (snap) => {
      _activityLog = snap.exists() ? snap.val() : {};
      liveMount();
    });
    onValue(ref(db, 'sideQuestInvites'), (snap) => {
      _sqInvites = snap.exists() ? snap.val() : {};
      liveMount();
    });
    onValue(ref(db, 'shopPending'), (snap) => {
      _shopPending = snap.exists() ? snap.val() : {};
      liveMount();
    });
  });
}

function liveMount() {
  // Only auto-remount on screens that benefit from real-time updates.
  // Avoids wiping in-progress student lesson forms on foreign writes.
  if (['teacher-dash', 'hub', 'grid', 'quest-map'].includes(STATE.screen)) mount();
}

async function seedAndMigrate() {
  // Seed 120 empty slots if students/101 doesn't exist yet
  const snap = await get(ref(db, 'students/101'));
  if (!snap.exists()) {
    const writes = {};
    getAllStudents().forEach(s => { writes[`students/${s.id}`] = { ...STUDENT_DEFAULTS }; });
    await update(ref(db), writes);
  }

  // One-time guild reset: clear all guild assignments if any retired key is present
  const guildSnap = await get(ref(db, 'students'));
  if (guildSnap.exists()) {
    const _allStudents = guildSnap.val();
    const _retiredGuilds = new Set(['crimson', 'shadow']);
    const _hasRetired = Object.values(_allStudents).some(s => s && _retiredGuilds.has(s.guild));
    if (_hasRetired) {
      const _guildWrites = {};
      for (const [_id, _s] of Object.entries(_allStudents)) {
        if (_s && _s.guild) _guildWrites[`students/${_id}/guild`] = null;
      }
      if (Object.keys(_guildWrites).length) await update(ref(db), _guildWrites);
    }
  }

  // Migrate legacy overrides/ records to students/{number}
  const oldSnap = await get(ref(db, 'overrides'));
  if (oldSnap.exists()) {
    const old = oldSnap.val();
    const writes = {};
    const unmapped = [];
    for (const [idStr, ov] of Object.entries(old)) {
      const id = parseInt(idStr, 10);
      if (id >= 1 && id <= 100) {
        const cohort = Math.ceil(id / 25);
        const offset = ((id - 1) % 25) + 1;
        const number = cohort * 100 + offset;
        writes[`students/${number}`] = { ...STUDENT_DEFAULTS, ...ov, claimed: true };
      } else {
        unmapped.push(idStr);
      }
    }
    if (Object.keys(writes).length > 0) await update(ref(db), writes);
    if (unmapped.length > 0) console.warn('Migration: unmapped legacy IDs', unmapped);
    // Uncomment after verifying migration: await set(ref(db, 'overrides'), null);
  }
}

/* ─── BOOT — fetch classData.json + init Firebase, then start ─── */
mount(); // show loading spinner immediately
Promise.all([
  fetch('/classData.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
  signInAnonymously(auth).catch(() => null).then(() => initFirebaseCache()),
]).then(([data]) => {
  CLASS_DATA = data;
  CLASS_DATA.periods.forEach(p => { p.students = getPeriodStudents(p.id); });
  fetch('/roster.local.json').then(r => r.ok ? r.json() : {}).then(r => { _roster = r; }).catch(() => {});
  fetch('/bossSchedule.json').then(r => r.ok ? r.json() : {}).then(d => { BOSS_SCHEDULE = d; }).catch(() => {});
  seedAndMigrate().catch(console.error);
  STATE.screen = 'code';
  mount();
}).catch(err => {
  STATE.screen = 'error';
  STATE.errorMsg = 'Failed to load. Check that classData.json is present and the page is served over HTTP (not file://).';
  mount();
});
