#!/usr/bin/env node
/**
 * Realm of ELA — Student Data Reset Script
 *
 * Usage (run from project root):
 *   node scripts/reset-students.mjs --test 301
 *   node scripts/reset-students.mjs --full
 *
 * Preserves: roster numbers, login pins (derived from ID, not in Firebase), class codes.
 * Clears: everything else — level, xp, gold, avatar, name, guild, progress, flags,
 *         boss states, craft requests, side quest invites, activity log, grade log.
 */

import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

const COHORT_SIZE = 30;

// _resetVersion is set fresh each run so active browser sessions detect the change
// and force-reload rather than writing stale local state back to Firebase.
const RUN_RESET_VERSION = Date.now();

function makeResetState() {
  return {
    _isReset: true,
    _resetVersion: RUN_RESET_VERSION,
    claimed: false,
    completedTiles: [],
    completedLand0: false,
    hp: 10, mp: 10, sp: 10,
    xp: 0, xpNext: 50, level: 1,
    gold: 0,
    taskProgress: {},
    taskTimestamps: {},
    bosses: [],
    items: [],
    companions: [],
  };
}

// Top-level Firebase paths keyed by student ID to delete on reset.
// standardBossState and gateBossState live under students/{sid} and are
// wiped implicitly by the PUT that writes makeResetState().
const SIDE_PATHS = [
  'helpflags',
  'activityLog',
  'overrides',
  'gradeLog',
  'craftRequests',
  'sideQuestInvites',
];

// Paths wiped as whole nodes on --full only (not per-student-keyed).
const FULL_WIPE_PATHS = ['shopPending'];

function parseEnv(path) {
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
  );
}

function allStudentIds() {
  return [1, 2, 3, 4].flatMap(c =>
    Array.from({ length: COHORT_SIZE }, (_, i) => c * 100 + i + 1)
  );
}

function derivedPin(id) {
  const s = String(id);
  return s[0] + '0' + s.slice(1);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1);
}

async function dbGet(baseUrl, path) {
  const r = await fetch(`${baseUrl}/${path}.json`);
  if (!r.ok) throw new Error(`GET ${path} failed: ${await r.text()}`);
  return r.json();
}

async function dbSet(baseUrl, path, value) {
  const r = await fetch(`${baseUrl}/${path}.json`, {
    method: value === null ? 'DELETE' : 'PUT',
    ...(value !== null && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }),
  });
  if (!r.ok) throw new Error(`SET ${path} failed: ${await r.text()}`);
}

async function backup(baseUrl) {
  const file = `backup_${timestamp()}.json`;
  console.log('📦 Reading Firebase data for backup…');

  const allPaths = ['students', ...SIDE_PATHS, ...FULL_WIPE_PATHS];
  const results = await Promise.all(allPaths.map(p => dbGet(baseUrl, p).then(v => v || {})));
  const snapshot = { exportedAt: new Date().toISOString() };
  allPaths.forEach((p, i) => { snapshot[p] = results[i]; });

  writeFileSync(file, JSON.stringify(snapshot, null, 2));

  const studentCount = Object.keys(snapshot.students).length;
  const kb = (JSON.stringify(snapshot).length / 1024).toFixed(1);
  console.log(`✅ Backup → ${file} (${studentCount} student records, ${kb} KB)`);

  return { file, students: snapshot.students, overrides: snapshot.overrides || {} };
}

async function resetOne(baseUrl, sid) {
  const s = String(sid);
  await Promise.all([
    dbSet(baseUrl, `students/${s}`, makeResetState()),
    ...SIDE_PATHS.map(p => dbSet(baseUrl, `${p}/${s}`, null)),
  ]);
}

function promptConfirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const isFull = args.includes('--full');

  if (!isTest && !isFull) {
    console.log('Usage:\n  node scripts/reset-students.mjs --test <id>\n  node scripts/reset-students.mjs --full');
    process.exit(0);
  }

  const env = parseEnv('.env.local');
  const baseUrl = env.VITE_FIREBASE_DATABASE_URL;

  const { students, overrides } = await backup(baseUrl);
  console.log('');

  if (isTest) {
    const rawId = args[args.indexOf('--test') + 1];
    if (!rawId || isNaN(Number(rawId))) {
      console.error('❌  --test requires a numeric student ID, e.g. --test 301');
      process.exit(1);
    }
    const sid = Number(rawId);

    console.log(`── BEFORE (student ${sid}) ──────────────────────────`);
    console.log(JSON.stringify(students[String(sid)] || '(no record)', null, 2));

    console.log(`\n⚙️  Resetting student ${sid}…`);
    await resetOne(baseUrl, sid);
    const after = await dbGet(baseUrl, `students/${sid}`);

    console.log(`\n── AFTER (student ${sid}) ───────────────────────────`);
    console.log(JSON.stringify(after, null, 2));

    console.log('\n── Verification ─────────────────────────────────────');
    console.log(`  Roster number      : ${sid}  (unchanged — not stored in Firebase)`);
    console.log(`  Login pin          : ${derivedPin(sid)}  (derived from ID, never in Firebase)`);
    console.log(`  claimed            : ${after?.claimed}  (expected: false)`);
    console.log(`  level              : ${after?.level}  (expected: 1)`);
    console.log(`  xp                 : ${after?.xp}  (expected: 0)`);
    console.log(`  gold               : ${after?.gold}  (expected: 0)`);
    console.log(`  hp/mp/sp           : ${after?.hp}/${after?.mp}/${after?.sp}  (expected: 10/10/10)`);
    console.log(`  characterName      : ${after?.characterName ?? '(absent)'}  (expected: absent)`);
    console.log(`  avatarClass        : ${after?.avatarClass ?? '(absent)'}  (expected: absent)`);
    console.log(`  guild              : ${after?.guild ?? '(absent)'}  (expected: absent)`);
    console.log(`  standardBossState  : ${after?.standardBossState ?? '(absent)'}  (expected: absent)`);
    console.log(`  gateBossState      : ${after?.gateBossState ?? '(absent)'}  (expected: absent)`);
    const tiles = after?.completedTiles;
    console.log(`  completedTiles     : ${tiles !== undefined ? JSON.stringify(tiles) : '(absent — Firebase strips empty arrays, handled by _isReset flag)'}`);
    console.log(`  _resetVersion      : ${after?._resetVersion ?? '(absent)'}  (expected: ${RUN_RESET_VERSION})`);
    console.log(`  → Any open browser tab for this student will force-reload on next Firebase sync.`);
    console.log('');
    console.log('If all checks look correct, run: node scripts/reset-students.mjs --full');
    process.exit(0);
  }

  if (isFull) {
    const allIds = allStudentIds();
    const idsWithData = allIds.filter(id => students[String(id)] || overrides[String(id)]);

    console.log(`⚠️  Full reset summary:`);
    console.log(`   Total roster slots      : ${allIds.length}`);
    console.log(`   Slots with data         : ${idsWithData.length}`);
    console.log(`   Already empty slots     : ${allIds.length - idsWithData.length}`);
    console.log(`   Per-student paths wiped : students/{id}, ${SIDE_PATHS.map(p => p + '/{id}').join(', ')}`);
    console.log(`   Whole-node paths wiped  : ${FULL_WIPE_PATHS.join(', ')}`);
    console.log(`   Session invalidation    : _resetVersion=${RUN_RESET_VERSION} (open tabs will force-reload)`);
    console.log('');
    console.log('  Type  RESET ALL STUDENTS  exactly to proceed:');

    const answer = await promptConfirm('> ');
    if (answer !== 'RESET ALL STUDENTS') {
      console.log('Aborted — no changes made (backup still written).');
      process.exit(0);
    }

    console.log('\n⚙️  Resetting student records…');
    let done = 0;
    for (const id of idsWithData) {
      await resetOne(baseUrl, id);
      done++;
      if (done % 10 === 0 || done === idsWithData.length) {
        process.stdout.write(`\r   ${done}/${idsWithData.length} student records reset`);
      }
    }

    console.log('\n\n⚙️  Wiping shared paths…');
    await Promise.all(FULL_WIPE_PATHS.map(p => dbSet(baseUrl, p, null)));
    console.log(`   Wiped: ${FULL_WIPE_PATHS.join(', ')}`);

    console.log(`\n✅ Full reset complete.`);
    console.log(`   Student records reset : ${done}`);
    console.log(`   Shared paths wiped    : ${FULL_WIPE_PATHS.length}`);
    console.log(`   Session tokens set    : _resetVersion=${RUN_RESET_VERSION}`);
    console.log(`   Any open browser tabs will detect the version change and reload automatically.`);
    process.exit(0);
  }
}

main().catch(e => {
  console.error('❌ Fatal error:', e.message || e);
  process.exit(1);
});
