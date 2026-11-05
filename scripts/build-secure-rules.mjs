#!/usr/bin/env node
// Generates firebase/database.rules.secure.json (the identity-based rules) from readable pieces.
// Run: node scripts/build-secure-rules.mjs   — tests: npm run test:rules (Firebase emulator)
import { writeFileSync } from 'fs';

const ADMIN = "root.child('admins').child(auth.uid).val() === true";
const SIGNED_IN = 'auth != null';
const SELF = "(auth != null && auth.token.role === 'student' && auth.token.sid === $sid)";
const STUDENT = "(auth != null && auth.token.role === 'student')";
const RESET_VERSION = "!data.child('_resetVersion').exists() || (newData.child('_resetVersion').exists() && newData.child('_resetVersion').val() >= data.child('_resetVersion').val())";
const num = (field, maxGain) => `newData.isNumber() && newData.val() >= 0 && (${ADMIN} || newData.val() <= (data.isNumber() ? data.val() : 0) + ${maxGain})`;
const own = { '.read': `${ADMIN} || ${SELF}`, '.write': `${ADMIN} || ${SELF}` };
const teacherOnly = {}; // no grant here → only the parent's admin .write applies
const houseOnce = { '.write': `${SELF} && root.child('students').child($sid).child('houseConfirmed').val() !== true` };

const rules = {
  rules: {
    // Teachers: listed by uid. Added by hand in the Firebase console; nobody can write this from the app.
    admins: { $uid: { '.read': 'auth != null && auth.uid === $uid' } },
    // Hashed PINs, login attempt counters, migration log: server (Cloud Functions) only.
    secure: { '.read': false, '.write': false },
    // Display-only info (character names, avatars, House) kept in sync by the server, for partners & leaderboards.
    directory: { '.read': SIGNED_IN, '.write': false },
    settings: { '.read': SIGNED_IN, '.write': ADMIN },
    students: {
      '.read': ADMIN,
      $sid: {
        '.read': `${ADMIN} || ${SELF}`,
        '.write': ADMIN,
        '.validate': RESET_VERSION,
        // ── server / teacher only ──
        levelRewards: teacherOnly, pinSet: teacherOnly, absences: teacherOnly,
        _isReset: teacherOnly, _resetVersion: teacherOnly,
        customPin: { '.validate': '!newData.exists()' }, // plain-text PINs can only be removed, never written
        // ── House: student chooses once ──
        house: houseOnce, houseConfirmed: houseOnce,
        // ── economy: students' own writes are bounded per save ──
        gold: { '.write': SELF, '.validate': num('gold', 250) },
        xp: { '.write': SELF, '.validate': num('xp', 400) },
        level: { '.write': SELF, '.validate': `newData.isNumber() && newData.val() >= 1 && (${ADMIN} || (newData.val() >= (data.isNumber() ? data.val() : 1) && newData.val() <= (data.isNumber() ? data.val() : 1) + 3))` },
        // ── teacher judgments ──
        bossStatus: { $bk: {
          '.write': SELF,
          '.validate': `newData.isString() && (${ADMIN} || newData.val() === 'submitted' || newData.val() === 'not_attempted' || (newData.val() === 'confirmed' && (!($bk.beginsWith('event_') || $bk.endsWith('_27')) || data.val() === 'defeated' || data.val() === 'confirmed')))`,
        } },
        standardBossState: { $bk: {
          '.write': SELF,
          '.validate': `${ADMIN} || (data.child('status').val() !== 'defeated' && newData.child('sealAwarded').val() !== true && newData.child('demonstrationCount').val() === data.child('demonstrationCount').val() && (newData.child('status').val() === 'not_started' || newData.child('status').val() === 'sighted' || newData.child('status').val() === 'mastery_available' || newData.child('status').val() === 'mastery_requested'))`,
        } },
        gateBossState: { $bk: {
          '.write': SELF,
          '.validate': `${ADMIN} || ((!data.exists() || data.child('status').val() === 'locked') && newData.child('status').val() === 'active' && newData.child('attemptCount').val() === 1 && !newData.child('trophyEarned').exists())`,
        } },
        // ── everything else is the student's own gameplay state ──
        $other: { '.write': SELF },
      },
    },
    helpflags: { '.read': ADMIN, $sid: own },
    craftRequests: { '.read': ADMIN, $sid: own },
    activityLog: { '.read': ADMIN, $sid: own },
    overrides: {
      '.read': ADMIN, '.write': ADMIN,
      $sid: Object.assign({}, own, {
        // A partner who accepts a side-quest invite clears the sender's pending quest.
        sideQuests: { $k: { '.write': `${STUDENT} && !newData.exists()` } },
      }),
    },
    sideQuestInvites: {
      '.read': ADMIN,
      $sid: {
        '.read': `${ADMIN} || ${SELF}`,
        $qk: { '.write': `${ADMIN} || ${SELF} || (${STUDENT} && (newData.exists() ? (newData.child('fromStudentId').val() + '') === auth.token.sid : (data.child('fromStudentId').val() + '') === auth.token.sid))` },
      },
    },
    shopPending: {
      '.read': `${ADMIN} || (${STUDENT} && query.orderByChild === 'studentId' && query.equalTo === auth.token.sid)`,
      '.indexOn': ['studentId'],
      $key: { '.write': `${ADMIN} || (${STUDENT} && (newData.exists() ? (!data.exists() && newData.child('studentId').val() === auth.token.sid && $key.beginsWith(auth.token.sid + '_')) : data.child('studentId').val() === auth.token.sid))` },
    },
    gradeLog: { '.read': ADMIN, '.write': ADMIN },
  },
};
const root = new URL('..', import.meta.url).pathname;
writeFileSync(root + 'firebase/database.rules.secure.json', JSON.stringify(rules, null, 2) + '\n');
console.log('Wrote firebase/database.rules.secure.json');
