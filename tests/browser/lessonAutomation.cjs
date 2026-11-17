// Lesson dates in the real app: release by date, Today's Lesson by date, teacher pick, midnight rollover,
// the map moving students forward, and the Catch-Up Needed list collapsing.
// Fictional students and an in-memory database only; never connects to Firebase.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { withoutChestPopups } = require('./harness/seedHelpers.cjs');
const ROOT = path.join(__dirname, '../..');
const PORT = 5297;
const OUT = process.env.REG_OUT || os.tmpdir();
const base = { claimed: true, avatarClass: 'wizard', completedLand0: true, currentLand: 2, land2Entry: { seen: true }, level: 2, xp: 10, xpNext: 50, gold: 20, pinSet: true, customPin: '1111', house: 'amistad', houseConfirmed: true };
const students = {
  101: { ...base, characterName: 'Preview Hero', currentTile: 2, completedTiles: [1] },
  102: { ...base, characterName: 'Preview Sage', currentTile: 5, completedTiles: [1] },   // skipped 2-4 → missed
  103: { ...base, characterName: 'Preview Bard', currentTile: 5, completedTiles: [1, 2] },
};
const seed = withoutChestPopups({
  settings: {
    // An old manual pick (before the dates) — the dates should take over.
    currentSession: { 1: { landId: 2, tileId: 2, setAt: '2026-11-10T15:00:00Z' } },
    lessonRelease: { 2: { enabled: true } },   // release mode on, nothing released by hand
    lessonSchedule: { 2: { 2: { releaseDate: '2026-11-13' }, 3: { releaseDate: '2026-11-14' }, 4: { releaseDate: '2026-11-15' } } },
  },
  students,
});
(async () => {
  const server = spawn(path.join(ROOT, 'node_modules/.bin/vite'), ['--config', path.join(__dirname, 'harness/vite.config.mjs')], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  let browser; let checks = 0;
  const check = (label, value) => { assert.ok(value, label); checks++; console.log('PASS ' + label); };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}`)).ok) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({ time: new Date('2026-11-15T18:00:00Z') });   // Sun Nov 15, noon in Chicago
    await page.addInitScript(s => { window.__SEED = s; }, seed);
    await page.goto(`http://127.0.0.1:${PORT}`);
    await page.waitForFunction(() => window.__STATE && window.__LANDS?.length && window.__STATE.screen === 'code');
    const screen = async (name, sid = 101) => { await page.evaluate(([name, sid]) => { const s = window.__STATE; s.student = ['hub', 'quest-map'].includes(name) ? { id: sid, number: sid, cohort: 1, pin: 'x' } : null; s.lessonPreview = false; s.teacherPeriodIdx = 0; s.tlsLandId = 2; s.screen = name; window.__mount(); }, [name, sid]); };
    const tree = p => page.evaluate(p => p.split('/').reduce((o, k) => o && o[k], window.__tree), p);

    // ── Lesson Schedule: no separate switch; dates open sessions in release mode ──
    await screen('teacher-lesson-schedule');
    check('no separate automatic-scheduling checkbox', (await page.locator('#tls-auto-today').count()) === 0);
    check('date instructions are shown', (await page.locator('#tls-date-hint').innerText()).includes('Today\'s Lesson for every period'));
    const relRow = id => page.locator(`[data-rel-row="${id}"]`).innerText();
    check('dated session that has arrived shows "Opened by date"', (await relRow(4)).includes('Opened by date'));
    await page.locator('tr[data-tid="5"] [data-field="releaseDate"]').fill('2026-11-17');
    await page.locator('[data-save-tid="5"]').click();
    await page.waitForFunction(() => window.__tree.settings.lessonSchedule[2][5].releaseDate === '2026-11-17');
    await screen('teacher-lesson-schedule');
    check('future-dated session shows its opening day (Nov 17, not a day early)', (await relRow(5)).includes('Opens Nov 17'));
    check('nothing was written to lessonRelease by dates', JSON.stringify(await tree('settings/lessonRelease/2')) === '{"enabled":true}');

    // ── Dashboard: Today's Lesson follows the latest date ──
    await screen('teacher-dash');
    check("Today's Lesson = Session 4 (latest date that has arrived)", (await page.inputValue('#t-today-sel')) === '2:4');
    check('labelled "Set by date"', (await page.locator('#t-today-src').innerText()).includes('Set by date (Nov 15)'));
    check('teacher controls stay usable', !(await page.isDisabled('#t-today-sel')) && !(await page.isDisabled('#t-today-save-all')));
    check('same lesson for all periods', (await page.locator('#t-today-sum').innerText()).includes('Same for all periods'));

    // ── Catch-Up Needed list starts collapsed, expands, and stays as chosen through live updates ──
    check('Catch-Up Needed starts collapsed', (await page.locator('#t-cu-needed-list').count()) === 0
      && (await page.locator('#t-cu-needed-toggle').getAttribute('aria-expanded')) === 'false');
    check('collapsed header still shows the counts', /Catch-Up Needed \(\d+ students? · \d+ missed sessions?\)/.test(await page.locator('#t-cu-needed-toggle').innerText()));
    await page.locator('#t-cu-needed-toggle').click();
    check('tap shows the list', (await page.locator('#t-cu-needed-list').count()) === 1 && (await page.locator('#t-cu-needed-list').innerText()).includes('missed'));
    // A write from "another device": same in-memory database module the app uses.
    check('outside write uses the app\'s database', await page.evaluate(async () => { const t = window.__tree; const m = await import('/tests/browser/harness/fbstub.js'); await m.update(m.ref(null, ''), { 'helpflags/999': { ts: 1 } }); return window.__tree === t; }));
    await page.waitForTimeout(100);
    check('stays open after a live dashboard refresh', (await page.locator('#t-cu-needed-list').count()) === 1);
    await page.locator('#t-cu-needed-toggle').click();
    check('tap again hides it', (await page.locator('#t-cu-needed-list').count()) === 0);
    check('choice remembered on this device', await page.evaluate(() => localStorage.getItem('realm-cu-needed-open') === '0'));
    await page.screenshot({ path: path.join(OUT, 'lesson-dates-dashboard.png') });

    // ── Student: map moves them to the dated session; future one stays locked ──
    await screen('quest-map', 101);
    await page.waitForFunction(() => window.__tree.students[101].currentTile === 4);
    check('opening the map moved the student to Session 4 (no teacher jump needed)', true);
    check('skipped sessions were not marked complete', JSON.stringify(await tree('students/101/completedTiles')) === '[1]');
    await screen('hub', 101);
    await page.locator('#today-lesson-btn').click();
    check("Today's Lesson button opens Session 4", await page.evaluate(() => window.__STATE.lessonTile?.id === 4));
    check('Session 4 is open', (await page.locator('#ls-locked').count()) === 0);
    const lessonScreen = await page.evaluate(() => window.__STATE.screen);
    await page.evaluate(sc => { const s = window.__STATE; s.lessonTile = s.lessonLand.tiles.find(t => t.id === 5); s.screen = sc; window.__mount(); }, lessonScreen);
    check('Session 5 (dated Nov 17) is locked today', (await page.locator('#ls-locked').count()) === 1);

    // ── Teacher picks a lesson: it wins until the next dated lesson arrives ──
    await screen('teacher-dash');
    await page.selectOption('#t-today-sel', '2:3');
    await page.locator('#t-today-save-all').click();
    await screen('teacher-dash');
    check("teacher's pick wins today", (await page.inputValue('#t-today-sel')) === '2:3'
      && (await page.locator('#t-today-src').innerText()).includes('Picked by you'));
    await page.clock.setSystemTime(new Date('2026-11-17T05:59:59Z'));   // 11:59:59 pm Nov 16 in Chicago
    await screen('teacher-dash');
    check('pick still current the next day (no new date yet)', (await page.inputValue('#t-today-sel')) === '2:3');
    await page.clock.setSystemTime(new Date('2026-11-17T06:00:00Z'));   // midnight Nov 17 in Chicago
    await page.clock.runFor(30100);
    check('open dashboard rolls over at midnight to Session 5 (dated Nov 17)', (await page.inputValue('#t-today-sel')) === '2:5'
      && (await page.locator('#t-today-src').innerText()).includes('Set by date (Nov 17)'));
    await screen('hub', 101);
    await page.locator('#today-lesson-btn').click();
    check('Session 5 opened on its date', await page.evaluate(() => window.__STATE.lessonTile?.id === 5) && (await page.locator('#ls-locked').count()) === 0);

    // ── Teacher holds Period 1 back on Session 5 → locked for that period only ──
    await screen('teacher-lesson-schedule');
    await page.locator('[data-rel-period="5|1"]').click();
    await page.waitForFunction(() => window.__tree.settings.lessonRelease[2].classes?.[1]?.[5] === false);
    await page.evaluate(sc => { const s = window.__STATE; s.student = { id: 101, number: 101, cohort: 1, pin: 'x' }; s.lessonLand = window.__LANDS.find(l => l.id === 2); s.lessonTile = s.lessonLand.tiles.find(t => t.id === 5); s.screen = sc; window.__mount(); }, lessonScreen);
    check('period hold still wins over the date', (await page.locator('#ls-locked').count()) === 1);

    await page.setViewportSize({ width: 390, height: 844 });
    await screen('teacher-dash');
    check('Catch-Up toggle fits on a phone', await page.locator('#t-cu-needed-toggle').isVisible());
    check('no browser JavaScript errors', errors.length === 0);
    if (errors.length) console.log(errors);
    console.log(`${checks} browser checks passed`);
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
