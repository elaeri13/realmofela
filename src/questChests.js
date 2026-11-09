/* ─── QUEST CHESTS & POTIONS ───
   Pure logic (no Firebase, no DOM) — unit-tested in tests/questChests.test.js.

   One chest per successfully completed instructional session (lessons incl. boss sessions, Writer's
   Craft, successful catch-up), plus one guaranteed Silver Welcome Chest per student.
   The chest's contents are ROLLED WHEN EARNED and saved in the chest record, so refreshing can never
   reroll. Companion/collectible prizes store a shuffled list of every item of that rarity: on opening,
   the first one the student still doesn't own is given; if they own them all, the pre-rolled fallback
   (a potion or a material) is given instead — never a higher rarity, so rare odds can't inflate.

   Stored at students/{id}/questChests/{key}   key = `${landId}_${tileId}` | 'welcome'
     { tier, source, landName, earnedAt, prize, fallback, bonus?, boosts?, openedAt?, results? }
   Active potions: students/{id}/activeBoosts = { xp?, gold?, luck? }   (at most one of each)

   Earning and opening are applied by ONE transaction on the whole student record in main.js using
   earnInto() / openInto() below, so a reward is either fully saved or not saved at all. */

export const TIERS = ['wooden', 'silver', 'golden', 'legendary'];
export const TIER_ODDS = { wooden: 74, silver: 20, golden: 5, legendary: 1 };
export const LUCK_ODDS = { silver: 70, golden: 25, legendary: 5 };       // Luck Potion: never Wooden
export const TIER_INFO = {
  wooden:    { name: 'Wooden',    emoji: '🪵', color: '#B45309' },
  silver:    { name: 'Silver',    emoji: '🥈', color: '#64748B' },
  golden:    { name: 'Golden',    emoji: '🥇', color: '#D97706' },
  legendary: { name: 'Legendary', emoji: '🌟', color: '#7C3AED' },
};
// Main prize per chest (weights sum to 100). Pools: companions use the existing PET_POOLS tiers
// (common / rare = "uncommon" pets / epic = "rare" pets); collectibles use EQUIP_POOLS accessory tiers;
// 'mystery' uses the existing Mystery Drop companions.
export const PRIZE_TABLE = {
  wooden:    [{ kind: 'companion', w: 35, pool: 'common' }, { kind: 'potion', w: 30 }, { kind: 'gold', w: 20, amount: 5 }, { kind: 'material', w: 15, n: 1 }],
  silver:    [{ kind: 'companion', w: 35, pool: 'rare' }, { kind: 'potion', w: 25 }, { kind: 'collectible', w: 25, pool: 'common' }, { kind: 'material', w: 15, n: 2 }],
  golden:    [{ kind: 'companion', w: 40, pool: 'epic' }, { kind: 'collectible', w: 30, pool: 'rare' }, { kind: 'gold', w: 30, amount: 25 }],
  legendary: [{ kind: 'mystery', w: 70 }, { kind: 'collectible', w: 30, pool: 'legendary' }],
};
export const SEASONAL_BONUS_CHANCE = 0.2;   // same rate as the old after-lesson seasonal roll

// ── Potions (single use; one active of each type) ──
export const POTIONS = {
  potion_insight: { boost: 'xp',   name: 'Insight Potion', icon: '✨', desc: '2× base XP on your next completed lesson' },
  potion_fortune: { boost: 'gold', name: 'Fortune Potion', icon: '🪙', desc: '2× base Gold on your next completed lesson' },
  potion_luck:    { boost: 'luck', name: 'Luck Potion',    icon: '🍀', desc: 'Your next Quest Chest is Silver or better' },
};
export const POTION_WEIGHTS = { potion_insight: 40, potion_fortune: 40, potion_luck: 20 };
// Retired stat potions → upgraded once (quantities kept)
export const RETIRED_POTIONS = { health_potion: 'potion_fortune', behavior_potion: 'potion_insight', stamina_potion: 'potion_luck' };
export const MATERIAL_VARIANTS = ['feather', 'gem', 'leaf', 'rune'];

// ── Random helpers (rng = () => [0,1)) ──
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function weighted(entries, rng) {         // entries: [[value, weight], ...]
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of entries) { if ((r -= w) < 0) return v; }
  return entries[entries.length - 1][0];
}
export function shuffled(list, rng) {
  const a = [...(list || [])];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const asList = v => (Array.isArray(v) ? v : v ? [v] : []);
const rollPotion = rng => weighted(Object.entries(POTION_WEIGHTS), rng);
const rollMaterial = (rng, n) => ({ kind: 'material', variant: MATERIAL_VARIANTS[Math.floor(rng() * MATERIAL_VARIANTS.length)], n });

export function rollTier(rng, { luck = false } = {}) {
  return weighted(Object.entries(luck ? LUCK_ODDS : TIER_ODDS), rng);
}

// pools = { companions: { common:[…], rare:[…], epic:[…] }, collectibles: { common:[…], rare:[…], epic:[…], legendary:[…] },
//           mystery: [companion files], seasonal: [badge ids of the active season] | null }
export function rollChest({ tier = null, luck = false, pools, rng, source, landName, now }) {
  const t = tier || rollTier(rng, { luck });
  const row = weighted(PRIZE_TABLE[t].map(p => [p, p.w]), rng);
  let prize;
  if (row.kind === 'gold') prize = { kind: 'gold', amount: row.amount };
  else if (row.kind === 'potion') prize = { kind: 'potion', id: rollPotion(rng) };
  else if (row.kind === 'material') prize = rollMaterial(rng, row.n);
  else if (row.kind === 'companion') prize = { kind: 'companion', pool: row.pool, candidates: shuffled(asList((pools.companions || {})[row.pool]), rng) };
  else if (row.kind === 'collectible') prize = { kind: 'collectible', pool: row.pool, candidates: shuffled(asList((pools.collectibles || {})[row.pool]), rng) };
  else prize = { kind: 'mystery', candidates: shuffled(asList(pools.mystery), rng) };
  // Fallback is rolled now too (used only if every candidate is already owned).
  const fallback = rng() < 0.5 ? { kind: 'potion', id: rollPotion(rng) } : rollMaterial(rng, 1);
  const bonus = pools.seasonal && pools.seasonal.length && rng() < SEASONAL_BONUS_CHANCE
    ? { kind: 'seasonal', candidates: shuffled(pools.seasonal, rng) } : null;
  return { tier: t, source, landName: landName || null, earnedAt: now, prize, fallback, bonus };
}

// What the chest gives, given what the student owns RIGHT NOW (deterministic: no randomness).
export function resolveChest(chest, owned = {}) {
  const has = (set, x) => (set || []).includes(x);
  const out = [];
  const p = chest.prize || {};
  const pickFrom = (cands, ownedList) => asList(cands).find(c => !has(ownedList, c));
  if (p.kind === 'gold') out.push({ kind: 'gold', amount: p.amount });
  else if (p.kind === 'potion') out.push({ kind: 'potion', id: p.id });
  else if (p.kind === 'material') out.push({ kind: 'material', variant: p.variant, n: p.n });
  else {
    const isPet = p.kind === 'companion' || p.kind === 'mystery';
    const pick = pickFrom(p.candidates, isPet ? owned.companions : owned.collectibles);
    if (pick) out.push(isPet ? { kind: 'companion', file: pick, rarity: p.kind === 'mystery' ? 'mystery' : p.pool } : { kind: 'collectible', id: pick, pool: p.pool });
    else out.push({ ...chest.fallback, fallback: true });
  }
  if (chest.bonus && chest.bonus.kind === 'seasonal') {
    const b = pickFrom(chest.bonus.candidates, owned.seasonalBadges);
    if (b) out.push({ kind: 'seasonal', id: b });
  }
  return out;
}

// Apply results to a copy of the student record (the fields the existing inventory already uses).
export function applyResults(rec, results) {
  const r = JSON.parse(JSON.stringify(rec || {}));
  results.forEach(x => {
    if (x.kind === 'gold') r.gold = (Number(r.gold) || 0) + x.amount;
    else if (x.kind === 'potion') r.items = [...asList(r.items), x.id];
    else if (x.kind === 'material') {
      r.materials = (Number(r.materials) || 0) + x.n;
      r.materialSlots = Object.assign({}, r.materialSlots || {}); r.materialSlots[x.variant] = (r.materialSlots[x.variant] || 0) + x.n;
    }
    else if (x.kind === 'companion') r.companions = [...new Set([...asList(r.companions), x.file])];
    else if (x.kind === 'collectible') r.equipInventory = [...new Set([...asList(r.equipInventory), x.id])];
    else if (x.kind === 'seasonal') r.seasonalBadges = [...new Set([...asList(r.seasonalBadges), x.id])];
  });
  return r;
}

// XP the same way the existing awardXP does (carry over, level up per threshold).
export function addXp(rec, amount, defaults = { xp: 0, level: 1, xpNext: 50 }) {
  const threshold = Number(rec.xpNext) || defaults.xpNext || 1000;
  let xp = (rec.xp == null ? defaults.xp : Number(rec.xp)) + amount;
  let level = rec.level == null ? defaults.level : Number(rec.level);
  let levelsGained = 0;
  while (xp >= threshold) { xp -= threshold; level++; levelsGained++; }
  return { xp, level, levelsGained, startLevel: level - levelsGained };
}

// ── Transaction bodies (pure). Return null to abort (nothing written). ──
// Earn: create the chest only if this session has none. Luck is used here; XP/Gold potions double the
// session's BASE reward once (only on a real completion, never on self-repair or the welcome chest).
export function earnInto(rec, key, { pools, rng, now, source, landName, base = null, tier = null, useBoosts = true, defaults }) {
  if (!rec) return null;
  if ((rec.questChests || {})[key]) return null;                       // already earned → nothing
  const r = JSON.parse(JSON.stringify(rec));
  const boosts = Object.assign({}, r.activeBoosts || {});
  const luck = useBoosts && !tier && !!boosts.luck;
  const chest = rollChest({ tier, luck, pools, rng, source, landName, now });
  const applied = {};
  if (luck) { applied.luck = true; delete boosts.luck; }
  let levelsGained = 0, startLevel = null;
  if (useBoosts && base) {
    if (boosts.xp && base.xp > 0) { const x = addXp(r, base.xp, defaults); r.xp = x.xp; r.level = x.level; levelsGained = x.levelsGained; startLevel = x.startLevel; applied.xp = base.xp; delete boosts.xp; }
    if (boosts.gold && base.gold > 0) { r.gold = (Number(r.gold) || 0) + base.gold; applied.gold = base.gold; delete boosts.gold; }
  }
  if (Object.keys(applied).length) chest.boosts = applied;
  r.activeBoosts = Object.keys(boosts).length ? boosts : null;
  r.questChests = Object.assign({}, r.questChests || {}, { [key]: chest });
  return { rec: r, chest, levelsGained, startLevel };
}
// Open: only if earned and not yet opened. Contents resolved against what the student owns now.
export function openInto(rec, key, now) {
  if (!rec) return null;
  const chest = (rec.questChests || {})[key];
  if (!chest || chest.openedAt) return null;
  const results = resolveChest(chest, {
    companions: asList(rec.companions), collectibles: asList(rec.equipInventory), seasonalBadges: asList(rec.seasonalBadges) });
  const r = applyResults(rec, results);
  r.questChests = Object.assign({}, r.questChests, { [key]: Object.assign({}, chest, { openedAt: now, results }) });
  return { rec: r, results };
}
// Arm a potion: remove one from items and switch its boost on (refused if that boost is already on).
export function armInto(rec, potionId) {
  const def = POTIONS[potionId];
  if (!rec || !def) return null;
  const items = asList(rec.items);
  const i = items.indexOf(potionId);
  if (i < 0) return null;
  if ((rec.activeBoosts || {})[def.boost]) return null;
  const r = JSON.parse(JSON.stringify(rec));
  r.items = items.filter((_, j) => j !== i);
  r.activeBoosts = Object.assign({}, r.activeBoosts || {}, { [def.boost]: { potion: potionId } });
  return { rec: r };
}
// Once per student: upgrade retired stat potions (keep quantities and order) + flag it.
export function migratePotionsInto(rec, now) {
  if (!rec || rec.potionsUpgradedAt) return null;
  const r = JSON.parse(JSON.stringify(rec));
  let converted = 0;
  r.items = asList(r.items).map(it => { if (RETIRED_POTIONS[it]) { converted++; return RETIRED_POTIONS[it]; } return it; });
  r.potionsUpgradedAt = now;
  r.potionsUpgradedCount = converted;
  return { rec: r, converted };
}

// ── Self-repair: is a successful completion clearly established for this session? ──
// Lessons (incl. boss sessions and catch-up, which records a pass the same way): outcome recorded as
// a pass (outcomeRecorded true AND outcomeFail false). Writer's Craft: the submit marker. Both must be
// completed after launch — a completed tile alone never counts (failures and teacher moves advance too).
export function successfulAfterLaunch({ tile, taskProgress, completedAt, completed, launchAt }) {
  if (!tile || !launchAt || !completedAt || completedAt < launchAt) return false;
  if (!(completed || []).includes(tile.id)) return false;
  const tp = taskProgress || {};
  if (tile.type === 'lesson') return (tp.outcomeRecorded || [])[0] === true && (tp.outcomeFail || [])[0] === false;
  if (tile.type === 'forge') return (tp.submitted || [])[0] === true;
  return false;
}
export const isChestSession = (land, tile) => !!(land && tile && land.id > 0 && ['lesson', 'forge'].includes(tile.type)
  && tile.pathType !== 'loot' && !tile.parentTileId && (land.pathOrder || []).includes(tile.id));
export const chestKey = (landId, tileId) => `${landId}_${tileId}`;
