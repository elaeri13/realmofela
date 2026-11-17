// Secret-number screen must not reload when other records change (teacher edits, other students' saves),
// while the reset force-logout still works once a student is signed in.
// Fictional students and an in-memory database only; never connects to Firebase.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const { withoutChestPopups } = require('./harness/seedHelpers.cjs');
const ROOT = path.join(__dirname, '../..');
const PORT = 5298;
const CODE = require(path.join(ROOT, 'public/classData.json')).periods.find(p => p.id === 1).classCode;
const base = { claimed: true, avatarClass: 'wizard', completedLand0: true, currentLand: 2, currentTile: 2, completedTiles: [1], land2Entry: { seen: true }, level: 2, xp: 10, xpNext: 50, gold: 20, pinSet: true, customPin: '1111', house: 'amistad', houseConfirmed: true };
const seed = withoutChestPopups({
  settings: {},
  students: {
    101: { ...base, characterName: 'Preview Hero', _resetVersion: 111 },   // was reset by the teacher once
    102: { ...base, characterName: 'Preview Sage' },
  },
});
(async () => {
  const server = spawn(path.join(ROOT, 'node_modules/.bin/vite'), ['--config', path.join(__dirname, 'harness/vite.config.mjs')], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  let browser; let checks = 0;
  const check = (label, value) => { assert.ok(value, label); checks++; console.log('PASS ' + label); };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}`)).ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(s => { window.__SEED = s; }, seed);
    await page.goto(`http://127.0.0.1:${PORT}`);
    await page.waitForFunction(() => window.__STATE && window.__STATE.screen === 'code');
    // Write from "another device" (the teacher, or another student) through the app's own database module.
    const outsideWrite = obj => page.evaluate(async obj => { const m = await import('/tests/browser/harness/fbstub.js'); await m.update(m.ref(null, ''), obj); }, obj);
    const marker = () => page.evaluate(() => window.__notReloaded === true);
    const signInTo = async sid => {
      await page.fill('#code-inp', CODE); await page.click('#code-btn');
      await page.waitForSelector(`.student-tile[data-id="${sid}"]`);
      await page.click(`.student-tile[data-id="${sid}"]`);
      await page.waitForFunction(() => window.__STATE.screen === 'pin');
    };
    const digit = d => page.click(`[data-digit="${d}"]`);

    await page.evaluate(() => { window.__notReloaded = true; });
    await signInTo(101);
    await digit('1'); await digit('1');
    await outsideWrite({ 'students/102/xp': 25 });                         // another student saves
    await outsideWrite({ 'students/101/gold': 30 });                       // teacher edits this student
    await page.waitForTimeout(400);
    check('secret-number page did not reload during outside saves', await marker());
    check('still on the secret-number screen with 2 digits kept', await page.evaluate(() => window.__STATE.screen === 'pin' && window.__STATE.pin.length === 2));
    await digit('1'); await digit('1');
    await page.waitForFunction(() => !['pin', 'code', 'grid'].includes(window.__STATE.screen));
    check('student signs in normally', await marker());

    await outsideWrite({ 'students/102/xp': 30 });
    await page.waitForTimeout(300);
    check('signed-in student is not logged out by other saves', await marker());

    // The reset protection still works for a signed-in student.
    const nav = page.waitForEvent('framenavigated');
    await outsideWrite({ 'students/101/_resetVersion': 222 });
    await nav;
    await page.waitForFunction(() => window.__STATE && window.__STATE.screen === 'code');
    check('a teacher reset still signs the student out', !(await marker()));

    // Shared device: one student logs out, the next one types their number while saves happen.
    await page.evaluate(() => { window.__notReloaded = true; });
    await signInTo(102);
    await digit('1');
    await outsideWrite({ 'students/101/xp': 40 });
    await page.waitForTimeout(300);
    check('next student on the same device is not kicked off the secret-number page', await marker() && await page.evaluate(() => window.__STATE.screen === 'pin'));
    check('no browser JavaScript errors', errors.length === 0);
    if (errors.length) console.log(errors);
    console.log(`${checks} browser checks passed`);
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
