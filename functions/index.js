// Realm of ELA — Cloud Functions (trusted server code).
// NOT DEPLOYED. Deploy only after approval — see docs/security/03-rollout-and-console-steps.md.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onValueWritten } from 'firebase-functions/v2/database';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase, ServerValue } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import {
  isValidStudentNumber, defaultPinFor, hashPin, verifyPin, validateNewPin, hashIp,
  checkLock, recordFailure, applyLevelClaim, directoryEntry,
} from './lib/security.js';

const catalog = JSON.parse(readFileSync(new URL('./lib/rewardCatalog.json', import.meta.url), 'utf8'));
initializeApp();
setGlobalOptions({ maxInstances: 10 });
const db = () => getDatabase();

const studentIdOf = req => {
  const t = req.auth && req.auth.token;
  if (!t || t.role !== 'student' || !isValidStudentNumber(t.sid)) throw new HttpsError('unauthenticated', 'Please log in again.');
  return String(t.sid);
};
async function requireTeacher(req) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Please sign in.');
  const snap = await db().ref(`admins/${req.auth.uid}`).get();
  if (snap.val() !== true) throw new HttpsError('permission-denied', 'Teachers only.');
  return req.auth.uid;
}
const log = (sid, icon, message) => db().ref(`activityLog/${sid}`).push({ icon, message, ts: new Date().toISOString() });

/* Student login: number + 4-digit PIN → short-lived custom token for uid "student_<number>". */
export const studentSignIn = onCall(async (req) => {
  const sid = String((req.data && req.data.studentNumber) || '');
  const pin = String((req.data && req.data.pin) || '');
  if (!isValidStudentNumber(sid) || !/^\d{4}$/.test(pin)) throw new HttpsError('invalid-argument', 'Enter your student number and 4-digit PIN.');
  const now = Date.now();
  const ipKey = hashIp(req.rawRequest && req.rawRequest.ip);
  const [aSnap, iSnap] = await Promise.all([db().ref(`secure/loginAttempts/${sid}`).get(), db().ref(`secure/ipAttempts/${ipKey}`).get()]);
  const lock = checkLock(aSnap.val(), iSnap.val(), now);
  if (lock.locked) throw new HttpsError('resource-exhausted', `Too many tries. Wait ${Math.ceil(lock.retryAfterMs / 60000)} minute(s) or ask your teacher.`);

  const [pinSnap, stSnap] = await Promise.all([db().ref(`secure/pins/${sid}`).get(), db().ref(`students/${sid}`).get()]);
  const st = stSnap.val() || {};
  let ok = false, mustSetPin = false;
  if (pinSnap.exists()) ok = verifyPin(pin, pinSnap.val());
  else if (st.customPin) {                       // legacy plain-text PIN (before migration): verify, then store a hash
    ok = pin === String(st.customPin);
    if (ok) await db().ref(`secure/pins/${sid}`).set({ ...hashPin(pin), migratedAt: now });
  } else { ok = pin === defaultPinFor(sid); mustSetPin = ok; }

  if (!ok) {
    const f = recordFailure(aSnap.val(), iSnap.val(), now);
    await Promise.all([db().ref(`secure/loginAttempts/${sid}`).set(f.student), db().ref(`secure/ipAttempts/${ipKey}`).set(f.ip)]);
    throw new HttpsError('permission-denied', 'That secret number didn\'t work. Try again, brave adventurer.');
  }
  await db().ref(`secure/loginAttempts/${sid}`).remove();
  const token = await getAuth().createCustomToken(`student_${sid}`, { role: 'student', sid });
  return { token, mustSetPin };
});

/* Student sets (or changes) their own PIN. */
export const setStudentPin = onCall(async (req) => {
  const sid = studentIdOf(req);
  const pin = String((req.data && req.data.pin) || '');
  const problem = validateNewPin(pin, sid);
  if (problem) throw new HttpsError('invalid-argument', problem);
  await db().ref(`secure/pins/${sid}`).set({ ...hashPin(pin), setAt: Date.now() });
  await db().ref(`students/${sid}`).update({ pinSet: true, customPin: null });
  return { ok: true };
});

/* Teacher resets PINs back to each student's default; the student picks a new one at next login. */
export const resetStudentPins = onCall(async (req) => {
  await requireTeacher(req);
  const ids = ((req.data && req.data.studentIds) || []).map(String).filter(isValidStudentNumber);
  const updates = {};
  for (const sid of ids) {
    updates[`secure/pins/${sid}`] = null; updates[`secure/loginAttempts/${sid}`] = null;
    updates[`students/${sid}/customPin`] = null; updates[`students/${sid}/pinSet`] = false;
  }
  if (ids.length) await db().ref().update(updates);
  await Promise.all(ids.map(sid => log(sid, '🔑', 'PIN reset by teacher')));
  return { count: ids.length };
});

/* Level reward claim. One transaction on the student's record writes the claim record AND every
   granted item/Gold together — all or nothing. Duplicate or simultaneous claims can't both commit. */
export const claimLevelReward = onCall(async (req) => {
  const sid = studentIdOf(req);
  const level = Number(req.data && req.data.level);
  let outcome = { ok: false, reason: 'error' };
  const tx = await db().ref(`students/${sid}`).transaction(cur => {
    // The first pass runs on the (empty) local cache. Returning null lets the database answer with
    // the real record and re-run this function; if the record truly is missing, null changes nothing.
    if (cur === null) { outcome = { ok: false, reason: 'no-student' }; return null; }
    const r = applyLevelClaim(cur, level, catalog);
    outcome = r;
    return r.ok ? r.next : undefined;   // undefined = abort, nothing written
  });
  if (!tx.committed || !outcome.ok) {
    const reason = outcome.reason || 'error';
    const msg = { already: 'You already claimed this reward.', locked: 'Reach this level first!', nothing: 'There is nothing to claim at this level.' }[reason] || 'Could not claim right now.';
    throw new HttpsError(reason === 'already' ? 'already-exists' : 'failed-precondition', msg, { reason });
  }
  await log(sid, '🎁', `Claimed Level ${level} reward: ${outcome.results.map(r => r.label).join(', ')}`).catch(() => {});
  return { ok: true, level, results: outcome.results };
});

/* Keeps the public directory (names/avatars/house only) in sync with student records. */
export const syncDirectory = onValueWritten('/students/{sid}', async (event) => {
  const sid = event.params.sid;
  if (!isValidStudentNumber(sid)) return;
  const after = event.data.after.val();
  const entry = directoryEntry(after);
  await db().ref(`directory/${sid}`).set(entry && Object.keys(entry).length ? entry : null);
});

/* One-time migration, teacher-triggered from the dashboard. Idempotent and non-destructive:
   hashes legacy plain-text PINs into secure/pins (plain text is kept until `finalize`), and builds
   the directory. finalize:true removes the plain-text customPin fields once everything is verified. */
export const adminSecurityMigration = onCall(async (req) => {
  await requireTeacher(req);
  const finalize = !!(req.data && req.data.finalize);
  const [stSnap, pinSnap] = await Promise.all([db().ref('students').get(), db().ref('secure/pins').get()]);
  const students = stSnap.val() || {}, pins = pinSnap.val() || {};
  const updates = {}; let hashed = 0, cleared = 0, directory = 0;
  for (const [sid, st] of Object.entries(students)) {
    if (!isValidStudentNumber(sid) || !st) continue;
    if (st.customPin && !pins[sid]) { updates[`secure/pins/${sid}`] = { ...hashPin(String(st.customPin)), migratedAt: Date.now() }; hashed++; }
    if (finalize && st.customPin && (pins[sid] || updates[`secure/pins/${sid}`])) { updates[`students/${sid}/customPin`] = null; cleared++; }
    updates[`directory/${sid}`] = directoryEntry(st); directory++;
  }
  if (Object.keys(updates).length) await db().ref().update(updates);
  await db().ref('secure/migrations').push({ at: ServerValue.TIMESTAMP, finalize, hashed, cleared, directory });
  return { hashed, cleared, directory, finalize };
});
