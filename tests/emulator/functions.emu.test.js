// End-to-end tests of the Cloud Functions against the local emulators only (never production):
//   npm run test:functions
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithCustomToken, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const PROJECT = 'demo-realm', DB = `http://127.0.0.1:9000`, NS = `?ns=${PROJECT}`;
const app = initializeApp({ projectId: PROJECT, apiKey: 'demo-key', databaseURL: `${DB}/${NS}` });
const auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
const fns = getFunctions(app); connectFunctionsEmulator(fns, '127.0.0.1', 5001);
const call = name => httpsCallable(fns, name);

// Admin access to the emulator database through REST ("owner" bypasses rules — emulator only).
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const dbGet = async p => (await fetch(`${DB}/${p}.json${NS}`, { headers: H })).json();
const dbPut = (p, v) => fetch(`${DB}/${p}.json${NS}`, { method: 'PUT', headers: H, body: JSON.stringify(v) });
const dbPatch = (p, v) => fetch(`${DB}/${p}.json${NS}`, { method: 'PATCH', headers: H, body: JSON.stringify(v) });
const code = async p => { try { await p; return 'ok'; } catch (e) { return e.code; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loginAs(sid, pin) {
  const { data } = await call('studentSignIn')({ studentNumber: sid, pin });
  await signInWithCustomToken(auth, data.token);
  return data;
}

before(async () => {
  await dbPut('', {
    students: {
      101: { claimed: true, characterName: 'Kai', level: 10, gold: 100, xp: 20, currentLand: 1, house: 'altruismo', houseConfirmed: true, companions: ['keep.png'], equipInventory: [] },
      102: { claimed: true, characterName: 'Mira', level: 1, gold: 0 },
      103: { claimed: true, characterName: 'Juno', level: 2, gold: 0, customPin: '7777', pinSet: true },
      104: { claimed: true, characterName: 'Rex', level: 1 },
    },
  });
});

test('wrong PINs lock the student after 5 tries, even with the right PIN', async () => {
  for (let i = 0; i < 4; i++) assert.equal(await code(call('studentSignIn')({ studentNumber: '104', pin: '9999' })), 'functions/permission-denied');
  assert.equal(await code(call('studentSignIn')({ studentNumber: '104', pin: '9999' })), 'functions/permission-denied');
  assert.equal(await code(call('studentSignIn')({ studentNumber: '104', pin: '1004' })), 'functions/resource-exhausted');
  const att = await dbGet('secure/loginAttempts/104');
  assert.ok(att.lockedUntil > Date.now());
});

test('bad input is rejected without revealing anything', async () => {
  assert.equal(await code(call('studentSignIn')({ studentNumber: '999', pin: '1234' })), 'functions/invalid-argument');
  assert.equal(await code(call('studentSignIn')({ studentNumber: '101', pin: '12' })), 'functions/invalid-argument');
});

test('default PIN → must set a new PIN; new PIN is stored only as a hash', async () => {
  const r = await loginAs('102', '1002');
  assert.equal(r.mustSetPin, true);
  assert.equal(auth.currentUser.uid, 'student_102');
  assert.equal(await code(call('setStudentPin')({ pin: '1002' })), 'functions/invalid-argument');
  assert.equal(await code(call('setStudentPin')({ pin: '4821' })), 'ok');
  const rec = await dbGet('secure/pins/102');
  assert.equal(rec.alg, 'scrypt'); assert.ok(!JSON.stringify(rec).includes('4821'));
  assert.equal((await dbGet('students/102/pinSet')), true);
  await signOut(auth);
  assert.equal(await code(call('studentSignIn')({ studentNumber: '102', pin: '1002' })), 'functions/permission-denied');
  assert.equal((await loginAs('102', '4821')).mustSetPin, false);
  await signOut(auth);
});

test('existing custom PINs keep working and are converted to a hash on first login', async () => {
  await loginAs('103', '7777');
  assert.equal((await dbGet('secure/pins/103')).alg, 'scrypt');
  await signOut(auth);
});

test('functions refuse callers without the right identity', async () => {
  assert.equal(await code(call('claimLevelReward')({ level: 2 })), 'functions/unauthenticated');
  await loginAs('103', '7777');
  assert.equal(await code(call('resetStudentPins')({ studentIds: ['102'] })), 'functions/permission-denied');
  assert.equal(await code(call('adminSecurityMigration')({})), 'functions/permission-denied');
  await signOut(auth);
});

test('10 simultaneous claims of the same reward → exactly one succeeds, Gold granted once', async () => {
  await loginAs('101', '1001');
  const results = await Promise.all(Array.from({ length: 10 }, () => code(call('claimLevelReward')({ level: 2 }))));
  assert.equal(results.filter(r => r === 'ok').length, 1, results.join(','));
  assert.equal(results.filter(r => r === 'functions/already-exists').length, 9);
  const st = await dbGet('students/101');
  assert.equal(st.gold, 125);
  assert.equal(st.levelRewards['2'].by, 'server');
});

test('claims racing with other saves to the same record lose nothing', async () => {
  // While the server claims Levels 3–9 at once, the student's game keeps saving progress to the same record.
  const before = await dbGet('students/101');
  const noise = (async () => { for (let i = 0; i < 15; i++) { await dbPatch('students/101', { currentTile: i }); await sleep(5); } })();
  const claims = await Promise.all([3, 4, 6, 7, 8, 9].map(L => call('claimLevelReward')({ level: L }).then(r => r.data)));
  await noise;
  const st = await dbGet('students/101');
  const goldFromClaims = claims.flatMap(c => c.results).filter(r => r.type === 'gold').reduce((a, r) => a + r.amount, 0);
  assert.equal(st.gold, before.gold + goldFromClaims);
  for (const L of [3, 4, 6, 7, 8, 9]) assert.ok(st.levelRewards[String(L)], `level ${L} recorded`);
  // every recorded result was actually delivered
  for (const c of claims) for (const r of c.results) {
    if (r.type === 'companion') assert.ok(st.companions.includes(r.file));
    if (r.type === 'collectible') assert.ok(st.equipInventory.includes(r.id));
  }
  // nothing else was lost
  assert.ok(st.companions.includes('keep.png'));
  assert.equal(st.house, 'altruismo'); assert.equal(st.xp, 20); assert.equal(st.currentTile, 14);
});

test('locked or empty levels cannot be claimed', async () => {
  assert.equal(await code(call('claimLevelReward')({ level: 12 })), 'functions/failed-precondition');
  assert.equal(await code(call('claimLevelReward')({ level: 5 })), 'functions/failed-precondition'); // Lv 5 rewards are automatic
  assert.equal(await code(call('claimLevelReward')({ level: 'abc' })), 'functions/failed-precondition');
  await signOut(auth);
});

test('directory holds display fields only and follows student changes', async () => {
  await sleep(1500);
  const d = await dbGet('directory/101');
  assert.equal(d.characterName, 'Kai');
  assert.equal(d.gold, undefined); assert.equal(d.levelRewards, undefined); assert.equal(d.customPin, undefined);
  assert.equal((await dbGet('directory/103')).customPin, undefined);
});

test('teacher account: reset PINs and run the migration', async () => {
  const cred = await createUserWithEmailAndPassword(auth, 'teacher@example.test', 'correct-horse-battery');
  await dbPut(`admins/${cred.user.uid}`, true);
  await dbPatch('students/104', { customPin: '5555' }); // a legacy plain-text PIN not yet migrated
  const m1 = (await call('adminSecurityMigration')({})).data;
  assert.ok(m1.hashed >= 1);
  assert.equal(await dbGet('students/104/customPin'), '5555'); // kept until finalize (rollback safety)
  const m2 = (await call('adminSecurityMigration')({ finalize: true })).data;
  assert.ok(m2.cleared >= 1);
  assert.equal(await dbGet('students/104/customPin'), null);
  assert.equal((await dbGet('secure/pins/104')).alg, 'scrypt');
  const r = (await call('resetStudentPins')({ studentIds: ['102', '104'] })).data;
  assert.equal(r.count, 2);
  assert.equal(await dbGet('secure/pins/102'), null);
  assert.equal(await dbGet('secure/loginAttempts/104'), null);
  await signOut(auth);
  assert.equal((await loginAs('104', '1004')).mustSetPin, true); // back to default PIN, lock cleared
  await signOut(auth);
});
