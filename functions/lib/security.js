// Pure helpers for the Cloud Functions (no Firebase imports) — unit-tested in tests/serverSecurity.test.js.
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'crypto';
import { rewardsForLevel, isClaimablePart } from './levelRewards.js';

/* ── Students ─────────────────────────────────────────────────────────────── */
export const COHORT_SIZE = 30;
export function isValidStudentNumber(n) {
  const x = Number(n);
  if (!Number.isInteger(x)) return false;
  const c = Math.floor(x / 100), o = x % 100;
  return c >= 1 && c <= 4 && o >= 1 && o <= COHORT_SIZE;
}
// Same rule as the app: 101 → 1001, 215 → 2015.
export function defaultPinFor(sid) { const s = String(sid); return s[0] + '0' + s.slice(1); }

/* ── PINs: salted scrypt hashes, never stored in plain text ──────────────── */
const SCRYPT = { N: 16384, r: 8, p: 1 };
export function hashPin(pin) {
  const salt = randomBytes(16).toString('base64');
  const hash = scryptSync(String(pin), salt, 32, SCRYPT).toString('base64');
  return { alg: 'scrypt', salt, hash };
}
export function verifyPin(pin, rec) {
  if (!rec || rec.alg !== 'scrypt' || !rec.salt || !rec.hash) return false;
  const want = Buffer.from(rec.hash, 'base64');
  const got = scryptSync(String(pin), rec.salt, want.length, SCRYPT);
  return want.length === got.length && timingSafeEqual(want, got);
}
export function validateNewPin(pin, sid) {
  if (!/^\d{4}$/.test(String(pin))) return 'Your PIN must be exactly 4 numbers.';
  if (pin === '0000') return 'Choose a different PIN.';
  if (pin === defaultPinFor(sid)) return "Don't use your default PIN — pick something new.";
  return null;
}
export const hashIp = ip => createHash('sha256').update('realm-ip:' + String(ip || 'unknown')).digest('hex').slice(0, 32);

/* ── Rate limiting ───────────────────────────────────────────────────────────
   Per student: 5 wrong PINs → locked for 5 minutes (then counter resets).
   Per device/network (hashed IP): 30 wrong PINs in 10 minutes → blocked for the rest of the window.
   A classroom shares one network, so the per-IP limit is deliberately generous.            */
export const LIMITS = { studentFails: 5, studentLockMs: 5 * 60 * 1000, ipFails: 30, ipWindowMs: 10 * 60 * 1000 };
export function checkLock(studentRec, ipRec, now) {
  if (studentRec && studentRec.lockedUntil && studentRec.lockedUntil > now) return { locked: true, retryAfterMs: studentRec.lockedUntil - now, scope: 'student' };
  if (ipRec && ipRec.windowStart && now - ipRec.windowStart < LIMITS.ipWindowMs && (ipRec.fails || 0) >= LIMITS.ipFails)
    return { locked: true, retryAfterMs: LIMITS.ipWindowMs - (now - ipRec.windowStart), scope: 'network' };
  return { locked: false };
}
export function recordFailure(studentRec, ipRec, now) {
  const s = Object.assign({ fails: 0 }, studentRec || {});
  if (s.lockedUntil && s.lockedUntil <= now) { s.fails = 0; delete s.lockedUntil; }
  s.fails += 1; s.lastFailAt = now;
  if (s.fails >= LIMITS.studentFails) { s.lockedUntil = now + LIMITS.studentLockMs; s.fails = 0; }
  const i = (ipRec && ipRec.windowStart && now - ipRec.windowStart < LIMITS.ipWindowMs) ? Object.assign({}, ipRec) : { windowStart: now, fails: 0 };
  i.fails = (i.fails || 0) + 1;
  return { student: s, ip: i };
}

/* ── Level reward claim (runs inside a database transaction on students/{sid}) ──
   Returns the WHOLE updated student record: the claim record and every granted item are written
   in one atomic update, so a reward can never be marked claimed without being delivered.      */
const asList = v => Array.isArray(v) ? v.filter(x => x != null) : (v && typeof v === 'object' ? Object.values(v) : []);
export function applyLevelClaim(student, level, catalog, rand = Math.random, now = Date.now()) {
  const L = Number(level);
  if (!student || typeof student !== 'object') return { ok: false, reason: 'no-student' };
  if (!Number.isInteger(L) || L < 2) return { ok: false, reason: 'bad-level' };
  const parts = rewardsForLevel(L);
  if (!parts.some(isClaimablePart)) return { ok: false, reason: 'nothing' };
  if ((Number(student.level) || 1) < L) return { ok: false, reason: 'locked' };
  if (student.levelRewards && student.levelRewards[String(L)]) return { ok: false, reason: 'already' };

  const next = JSON.parse(JSON.stringify(student));
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const land = catalog.lands[catalog.landNames[String(next.currentLand)]] ? catalog.landNames[String(next.currentLand)] : catalog.defaultLand;
  const pools = catalog.lands[land];
  const addGold = n => { next.gold = (Number(next.gold) || 0) + n; };
  const results = [];
  const grantItem = (tier, fallbackGold, fallbackLabel) => {
    const inv = asList(next.equipInventory);
    const free = (pools.accessory[tier] || []).filter(id => !inv.includes(id));
    if (free.length) { const id = pick(free); next.equipInventory = [...inv, id]; return { type: 'collectible', id, label: catalog.itemNames[id] || id }; }
    addGold(fallbackGold); return { type: 'gold', amount: fallbackGold, label: `${fallbackGold} Gold (${fallbackLabel})` };
  };
  for (const p of parts) {
    if (p.type === 'gold') { addGold(p.amount); results.push({ type: 'gold', amount: p.amount, label: `${p.amount} Gold` }); }
    else if (p.type === 'collectible') results.push(grantItem(p.tier, 15, 'collectible already owned'));
    else if (p.type === 'loot') {
      const owned = asList(next.companions);
      const freePets = (pools.pets[p.tier] || []).filter(f => !owned.includes(f));
      if (freePets.length) { const f = pick(freePets); next.companions = [...owned, f]; results.push({ type: 'companion', file: f, label: `Companion: ${catalog.companionNames[f] || f}` }); }
      else results.push(grantItem(p.tier, p.tier === 'rare' ? 30 : 15, 'you already own everything in this loot pool'));
    }
    else if (p.type === 'title') results.push({ type: 'title', title: p.title, label: `Title: “${p.title}”` });
    else if (p.type === 'frame') results.push({ type: 'frame', id: p.cosmeticId, label: 'Legendary Starfall Frame' });
  }
  next.levelRewards = Object.assign({}, next.levelRewards || {}, { [String(L)]: { claimedAt: new Date(now).toISOString(), level: L, results, by: 'server' } });
  return { ok: true, next, results };
}

/* ── Public directory (what other students may see: names/avatars/house for login and partners) ── */
export const DIRECTORY_FIELDS = ['claimed', 'characterName', 'title', 'avatar', 'avatarClass', 'avatarGender', 'avatarStyle', 'avatarSkinTone', 'character', 'variant', 'skinTone', 'house', 'houseConfirmed', 'guild', 'level', 'currentLand', 'currentTile', 'completedLand0', 'completedTiles', 'activeCompanion'];
export function directoryEntry(student) {
  if (!student || typeof student !== 'object') return null;
  const out = {};
  for (const k of DIRECTORY_FIELDS) if (student[k] !== undefined && student[k] !== null) out[k] = student[k];
  return out;
}
