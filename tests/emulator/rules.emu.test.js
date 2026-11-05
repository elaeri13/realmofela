// Database rules tests — run against the local Firebase emulator only (never production):
//   npm run test:rules
import { test, before, after } from 'node:test';
import { readFileSync } from 'fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, get, set, update, query, orderByChild, equalTo } from 'firebase/database';

let env;
const rules = readFileSync(new URL('../../firebase/database.rules.secure.json', import.meta.url), 'utf8');
const student = sid => env.authenticatedContext(`student_${sid}`, { role: 'student', sid: String(sid) }).database();
const teacher = () => env.authenticatedContext('teacherUid').database();
const anon = () => env.authenticatedContext('anonUid', { firebase: { sign_in_provider: 'anonymous' } }).database();
const nobody = () => env.unauthenticatedContext().database();

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-realm', database: { host: '127.0.0.1', port: 9000, rules } });
});
after(async () => { await env.cleanup(); });

async function seed() {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async ctx => {
    await set(ref(ctx.database()), {
      admins: { teacherUid: true },
      secure: { pins: { 101: { alg: 'scrypt', salt: 's', hash: 'h' } } },
      settings: { currentSession: { 1: 5 } },
      directory: { 101: { characterName: 'Kai' }, 102: { characterName: 'Mira' } },
      students: {
        101: { claimed: true, gold: 100, xp: 40, level: 3, house: 'altruismo', houseConfirmed: true, _resetVersion: 5,
               bossStatus: { '1_27': 'submitted', '1_9': 'not_attempted', event_1: 'submitted' },
               standardBossState: { b1: { status: 'sighted', encounterCount: 1, demonstrationCount: 1 }, b2: { status: 'defeated', sealAwarded: true } },
               gateBossState: { g1: { status: 'locked' } }, levelRewards: { 2: { claimedAt: 'x' } } },
        102: { claimed: true, gold: 50, xp: 0, level: 1 },
        103: { claimed: false },
      },
      shopPending: { '102_1': { studentId: '102', itemId: 'x' } },
      sideQuestInvites: { 102: { q1: { fromStudentId: 101, status: 'pending' } } },
      gradeLog: { a: { rawGrade: 99 } },
    });
  });
}

test('no access without signing in', async () => {
  await seed();
  await assertFails(get(ref(nobody(), 'students')));
  await assertFails(get(ref(nobody(), 'settings')));
  await assertFails(set(ref(nobody(), 'students/101/gold'), 9999));
});

test('anonymous visitors see settings + directory only', async () => {
  await seed();
  await assertSucceeds(get(ref(anon(), 'settings')));
  await assertSucceeds(get(ref(anon(), 'directory')));
  await assertFails(get(ref(anon(), 'students/101')));
  await assertFails(set(ref(anon(), 'settings/currentSession/1'), 9));
  await assertFails(set(ref(anon(), 'students/101/characterName'), 'x'));
});

test('a student reads only their own record — no impersonation', async () => {
  await seed();
  await assertSucceeds(get(ref(student(101), 'students/101')));
  await assertFails(get(ref(student(101), 'students/102')));
  await assertFails(get(ref(student(101), 'students')));
  await assertFails(set(ref(student(101), 'students/102/characterName'), 'hacked'));
  await assertFails(set(ref(student(101), 'students/102/gold'), 0));
  await assertFails(get(ref(student(101), 'helpflags/102')));
});

test('nobody but the server reads PIN hashes or teacher list', async () => {
  await seed();
  await assertFails(get(ref(student(101), 'secure/pins/101')));
  await assertFails(get(ref(teacher(), 'secure/pins')));
  await assertFails(set(ref(student(101), 'admins/student_101'), true));
  await assertFails(get(ref(student(101), 'admins/teacherUid')));
  await assertSucceeds(get(ref(teacher(), 'admins/teacherUid')));
});

test('students can play: own gameplay fields save normally', async () => {
  await seed();
  const db = student(101);
  await assertSucceeds(update(ref(db, 'students/101'), { characterName: 'Kai the Bold', currentTile: 6, completedTiles: [1, 2, 3], equipped: { pet: 'a' }, gold: 140, xp: 90, level: 4, levelCelebratedThrough: 4 }));
  await assertSucceeds(set(ref(db, 'students/101/gold'), 10)); // spending
  await assertSucceeds(set(ref(db, 'helpflags/101'), { message: 'help', ts: 1 }));
  await assertSucceeds(set(ref(db, 'craftRequests/101'), { item: 'x' }));
  await assertSucceeds(set(ref(db, 'overrides/101/sanctumProgress/1'), { a: 1 }));
});

test('economy: Gold/XP/Level jumps are blocked', async () => {
  await seed();
  const db = student(101);
  await assertFails(set(ref(db, 'students/101/gold'), 100000));
  await assertFails(set(ref(db, 'students/101/gold'), -5));
  await assertFails(set(ref(db, 'students/101/gold'), '999'));
  await assertFails(set(ref(db, 'students/101/xp'), 50000));
  await assertFails(set(ref(db, 'students/101/level'), 50));
  await assertFails(set(ref(db, 'students/101/level'), 1));
  // a bad field in a combined save rejects the whole save
  await assertFails(update(ref(db, 'students/101'), { characterName: 'ok', gold: 999999 }));
  await assertSucceeds(set(ref(teacher(), 'students/101/gold'), 5000)); // teacher can adjust
});

test('House is chosen once', async () => {
  await seed();
  await assertFails(set(ref(student(101), 'students/101/house'), 'amistad'));
  await assertFails(set(ref(student(101), 'students/101/houseConfirmed'), false));
  await assertSucceeds(update(ref(student(102), 'students/102'), { house: 'reveur', houseConfirmed: true }));
  await assertFails(set(ref(student(102), 'students/102/house'), 'isibindi'));
  await assertSucceeds(set(ref(teacher(), 'students/102/house'), 'isibindi'));
});

test('teacher judgments: students cannot award themselves wins, seals, medals or trophies', async () => {
  await seed();
  const db = student(101);
  await assertFails(set(ref(db, 'students/101/bossStatus/1_27'), 'defeated'));
  await assertFails(set(ref(db, 'students/101/bossStatus/1_27'), 'confirmed'));       // dungeon needs teacher win first
  await assertFails(set(ref(db, 'students/101/bossStatus/event_1'), 'confirmed'));    // writing event too
  await assertSucceeds(set(ref(db, 'students/101/bossStatus/1_9'), 'confirmed'));     // standard boss: self-confirm by design
  await assertSucceeds(set(ref(db, 'students/101/bossStatus/1_27'), 'submitted'));
  await assertFails(set(ref(db, 'students/101/standardBossState/b1'), { status: 'defeated', encounterCount: 1, demonstrationCount: 1 }));
  await assertFails(set(ref(db, 'students/101/standardBossState/b1'), { status: 'sighted', encounterCount: 2, demonstrationCount: 3 }));
  await assertFails(set(ref(db, 'students/101/standardBossState/b1'), { status: 'mastery_available', sealAwarded: true, demonstrationCount: 1 }));
  await assertFails(set(ref(db, 'students/101/standardBossState/b2'), { status: 'sighted' }));  // can't undo a seal
  await assertSucceeds(set(ref(db, 'students/101/standardBossState/b1'), { status: 'mastery_requested', encounterCount: 2, demonstrationCount: 1, medalAwarded: true }));
  await assertFails(set(ref(db, 'students/101/gateBossState/g1'), { status: 'defeated', trophyEarned: true }));
  await assertSucceeds(set(ref(db, 'students/101/gateBossState/g1'), { status: 'active', attemptCount: 1 }));
  await assertFails(set(ref(db, 'students/101/gateBossState/g1'), { status: 'active', attemptCount: 1 })); // only from locked
  // teacher can judge
  const t = teacher();
  await assertSucceeds(set(ref(t, 'students/101/bossStatus/1_27'), 'defeated'));
  await assertSucceeds(set(ref(t, 'students/101/standardBossState/b1'), { status: 'defeated', sealAwarded: true, demonstrationCount: 3 }));
  await assertSucceeds(set(ref(db, 'students/101/bossStatus/1_27'), 'confirmed'));   // now the student may claim
});

test('reward claims, PIN status, absences and reset markers are server/teacher only', async () => {
  await seed();
  const db = student(101);
  await assertFails(set(ref(db, 'students/101/levelRewards/3'), { claimedAt: 'now' }));
  await assertFails(set(ref(db, 'students/101/levelRewards/2'), null));
  await assertFails(set(ref(db, 'students/101/pinSet'), true));
  await assertFails(set(ref(db, 'students/101/customPin'), '1234'));
  await assertFails(set(ref(teacher(), 'students/101/customPin'), '1234'));   // plain-text PINs can never be written again
  await assertFails(set(ref(db, 'students/101/absences/2026-11-04'), null));
  await assertFails(set(ref(db, 'students/101/_resetVersion'), 1));
  await assertFails(update(ref(db, 'students/101'), { _isReset: false }));
});

test('teacher-only areas', async () => {
  await seed();
  await assertFails(set(ref(student(101), 'settings/currentSession/1'), 9));
  await assertSucceeds(set(ref(teacher(), 'settings/currentSession/1'), 9));
  await assertFails(get(ref(student(101), 'gradeLog')));
  await assertSucceeds(get(ref(teacher(), 'students')));
  await assertSucceeds(get(ref(teacher(), 'helpflags')));
  await assertSucceeds(set(ref(teacher(), 'helpflags/101'), null));
  await assertFails(set(ref(teacher(), 'directory/101'), { characterName: 'x' }));     // server keeps the directory
});

test('side quest invites: sender creates, recipient answers, others cannot', async () => {
  await seed();
  await assertSucceeds(set(ref(student(101), 'sideQuestInvites/103/q2'), { fromStudentId: 101, status: 'pending' }));
  await assertFails(set(ref(student(101), 'sideQuestInvites/103/q3'), { fromStudentId: 104, status: 'pending' })); // forged sender
  await assertFails(get(ref(student(101), 'sideQuestInvites/102')));
  await assertSucceeds(get(ref(student(102), 'sideQuestInvites/102')));
  await assertSucceeds(set(ref(student(102), 'sideQuestInvites/102/q1'), null));
  await assertFails(set(ref(student(104), 'sideQuestInvites/103/q2'), null));
  await assertSucceeds(set(ref(student(102), 'overrides/101/sideQuests/q1'), null));
  await assertFails(set(ref(student(102), 'overrides/101/sideQuests/q1'), { x: 1 }));
});

test('shop requests: create and see only your own', async () => {
  await seed();
  await assertSucceeds(set(ref(student(101), 'shopPending/101_5'), { studentId: '101', itemId: 'potion' }));
  await assertFails(set(ref(student(101), 'shopPending/102_6'), { studentId: '102', itemId: 'potion' }));
  await assertFails(set(ref(student(101), 'shopPending/102_1'), null));
  await assertSucceeds(get(query(ref(student(102), 'shopPending'), orderByChild('studentId'), equalTo('102'))));
  await assertFails(get(ref(student(102), 'shopPending')));
  await assertSucceeds(set(ref(teacher(), 'shopPending/102_1'), null));
});
