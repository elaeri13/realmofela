/* ─── PHASE 3: LEVEL REWARD TRACK & CHARACTER ABILITIES ───
   Pure data + logic (no Firebase, no DOM) so it can be unit-tested with `npm test`.

   A level's reward is a list of "parts". Part types:
     gold         { amount }                 → existing Gold balance (awardGold)
     collectible  { tier }                   → existing Collectibles bag (accessory items, awardEquipItem)
     loot         { tier }                   → existing loot pools (companions → equipment), no XP
     title        { title }                  → added to the title picker
     frame        { cosmeticId }             → cosmetic frame unlocked by this claim
     autoFrame    { cosmeticId }             → frame the EXISTING level system already grants; shown, never re-granted
     ability      { abilityId }              → passive ability unlocked by level (no claim needed)
     future       { label }                  → a planned slot whose system doesn't exist yet; shown, never claimable

   Claim records: students/{id}/levelRewards/{level} = { claimedAt, results:[…] }  (one per level). */

export const XP_PER_LEVEL = 50; // existing value (STUDENT_DEFAULTS.xpNext); unchanged

export const CHARACTER_ABILITIES = [
  { id: 'adventurers_guard', level: 5, icon: '🛡️', name: "Adventurer's Guard",
    desc: 'Blocks the first 2 HP of damage from an optional adventure each week.',
    active: false, inactiveNote: 'Coming soon — arrives with the new HP system.' },
  { id: 'treasure_sense', level: 10, icon: '🗝️', name: 'Treasure Sense',
    desc: 'One extra common collectible from your first loot path each week.',
    active: false, inactiveNote: 'Coming soon — arrives with collectible loot paths.' },
];

export const LEVEL10_FRAME_ID = 'frame_level_10_starfall';
export const LEVEL10_TITLE = 'Legend of the Realm';
export const LEVEL7_TITLE = 'Trailblazer';

// Hand-designed track for levels 2–10.
const BASE_TRACK = {
  2:  [{ type: 'gold', amount: 25 }],
  3:  [{ type: 'collectible', tier: 'common' }],
  4:  [{ type: 'loot', tier: 'common' }],
  5:  [{ type: 'autoFrame', cosmeticId: 'frame_rank_5' }, { type: 'ability', abilityId: 'adventurers_guard' }],
  6:  [{ type: 'gold', amount: 40 }],
  7:  [{ type: 'title', title: LEVEL7_TITLE }],
  8:  [{ type: 'loot', tier: 'rare' }],
  9:  [{ type: 'gold', amount: 50 }],
  10: [{ type: 'frame', cosmeticId: LEVEL10_FRAME_ID }, { type: 'title', title: LEVEL10_TITLE },
       { type: 'autoFrame', cosmeticId: 'frame_rank_10' }, { type: 'ability', abilityId: 'treasure_sense' }],
};
// Rank frames the existing level system already unlocks automatically (COSMETICS_MANIFEST, unlockType 'level').
const AUTO_RANK_FRAMES = { 5: 'frame_rank_5', 10: 'frame_rank_10', 15: 'frame_rank_15', 20: 'frame_rank_20' };

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const roman = n => ROMAN[n] || String(n);

/* Rewards for any level ≥ 2. Beyond 10 the track keeps going (no ceiling):
   every 10 → milestone (100 Gold + rare loot + a "Realm Legend N" title)
   every 5  → 60 Gold + rare loot + a future-ability slot
   even     → Gold that grows slowly (capped)
   odd      → standard loot roll                                                   */
export function rewardsForLevel(level) {
  const L = Number(level);
  if (!Number.isInteger(L) || L < 2) return [];
  if (BASE_TRACK[L]) return BASE_TRACK[L];
  const parts = [];
  if (L % 10 === 0) {
    parts.push({ type: 'gold', amount: 100 }, { type: 'loot', tier: 'rare' },
               { type: 'title', title: `Realm Legend ${roman(L / 10)}` });
  } else if (L % 5 === 0) {
    parts.push({ type: 'gold', amount: 60 }, { type: 'loot', tier: 'rare' },
               { type: 'future', label: 'New ability (future phase)' });
  } else if (L % 2 === 0) {
    parts.push({ type: 'gold', amount: Math.min(80, 30 + 2 * L) });
  } else {
    parts.push({ type: 'loot', tier: 'common' });
  }
  if (AUTO_RANK_FRAMES[L]) parts.push({ type: 'autoFrame', cosmeticId: AUTO_RANK_FRAMES[L] });
  return parts;
}

export const isMilestone = level => Number(level) % 10 === 0;
export const isAbilityLevel = level => Number(level) % 5 === 0;

// Parts that need a claim (everything else is granted by an existing system or not built yet).
const CLAIMABLE = new Set(['gold', 'collectible', 'loot', 'title', 'frame']);
export const isClaimablePart = p => CLAIMABLE.has(p.type);
export const levelHasClaim = level => rewardsForLevel(level).some(isClaimablePart);

/* Status of one level for a student:
   'locked'  – level not reached
   'claimed' – claim record exists
   'ready'   – reached, has claimable parts, not yet claimed
   'auto'    – reached, nothing to claim (granted by an existing system / ability unlock)   */
export function levelStatus(level, studentLevel, claims) {
  if (Number(studentLevel) < Number(level)) return 'locked';
  if (!levelHasClaim(level)) return 'auto';
  return (claims || {})[String(level)] ? 'claimed' : 'ready';
}

// Every reached level (2..current) with an unclaimed reward — this is the retroactive list.
export function claimableLevels(studentLevel, claims) {
  const out = [];
  for (let L = 2; L <= Number(studentLevel); L++) {
    if (levelStatus(L, studentLevel, claims) === 'ready') out.push(L);
  }
  return out;
}

// Levels to show on the track: always 2–10, then up to 5 beyond the student's level.
export function trackLevels(studentLevel) {
  const top = Math.max(10, Number(studentLevel || 1) + 5);
  return Array.from({ length: top - 1 }, (_, i) => i + 2);
}

export const nextRewardLevel = studentLevel => Number(studentLevel || 1) + 1;
export function nextMilestoneLevel(studentLevel) {
  const L = Number(studentLevel || 1);
  return (Math.floor(L / 5) + 1) * 5;
}

export function abilityStatus(ability, studentLevel) {
  if (Number(studentLevel) < ability.level) return 'locked';
  return ability.active ? 'active' : 'unlocked_inactive';
}

/* Celebration: which levels still need a "LEVEL UP!" screen.
   celebratedThrough is stored per student. Existing characters (no record yet) are treated as
   already celebrated up to their current level, so old level-ups don't replay. */
export function levelsToCelebrate(studentLevel, celebratedThrough) {
  const L = Number(studentLevel || 1);
  if (celebratedThrough == null) return [];
  const from = Number(celebratedThrough);
  const out = [];
  for (let x = Math.max(2, from + 1); x <= L; x++) out.push(x);
  return out;
}

export function partLabel(p) {
  switch (p.type) {
    case 'gold':        return `${p.amount} Gold`;
    case 'collectible': return `${p.tier === 'common' ? 'Common' : p.tier} collectible`;
    case 'loot':        return p.tier === 'rare' ? 'Rare loot roll' : 'Standard loot roll';
    case 'title':       return `Title: “${p.title}”`;
    case 'frame':       return p.cosmeticId === LEVEL10_FRAME_ID ? 'Legendary Starfall Frame' : 'Character frame';
    case 'autoFrame':   return { frame_rank_5: 'Bronze Adventurer Frame', frame_rank_10: 'Silver Knight Frame',
                                 frame_rank_15: 'Gold Champion Frame', frame_rank_20: 'Mythic Hero Frame' }[p.cosmeticId] || 'Rank frame';
    case 'ability': {   const a = CHARACTER_ABILITIES.find(x => x.id === p.abilityId); return a ? `Ability: ${a.name}` : 'Ability'; }
    case 'future':      return p.label;
    default:            return '';
  }
}
export function partIcon(p) {
  return { gold: '🪙', collectible: '💎', loot: '🎁', title: '👑', frame: '🖼️', autoFrame: '🖼️', ability: '✨', future: '🔮' }[p.type] || '⭐';
}
