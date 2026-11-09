// Today's Lesson for all periods + teacher lesson release (in-memory database; no live data).
// Run: npm run test:browser
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const PORT = Number(process.env.REL_PORT || 5290);
let pass = 0, fail = 0;
const check = (n, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  — ' + extra}`); };
const st = x => Object.assign({ claimed: true, characterName: 'Hero', avatarClass: 'wizard', avatar: 'avatar_elf_01_tan_female.png', completedLand0: true, currentLand: 2, land2Entry: { seen: true }, level: 2, xp: 10, xpNext: 50, gold: 20, pinSet: true, customPin: '1111', house: 'amistad', houseConfirmed: true, levelCelebratedThrough: 2 }, x);
const past = '2026-01-01', future = '2099-01-01';
const SEED = {
  settings: {
    lessonSchedule: { 2: { 2: { releaseDate: past }, 3: { releaseDate: past }, 4: { releaseDate: past }, 7: { releaseDate: future } } },
    tileLinks: { 2: { 3: { pear: 'https://app.peardeck.com/student/s3' }, 4: { wayground: 'https://wayground.com/join?gc=4', pear: 'https://app.peardeck.com/student/s4' } } },
    homeworkQuest: { enabled: true, text: 'Read 20 minutes' },     // an unrelated setting that must survive
  },
  students: {
    101: st({ currentTile: 4, completedTiles: [1, 2, 3], taskProgress: { 4: { wayground: [true], exitTicketOpened: [true] } } }), // on S4, ready to record outcome
    102: st({ currentTile: 4, completedTiles: [1, 2] }),              // missed S3 → catch-up
    103: st({ currentTile: 5, completedTiles: [1, 2, 3, 4] }),        // on S5 (no release date) → could work ahead
    104: st({ currentTile: 50, completedTiles: [1, 2, 3, 4, 5] }),    // already finished S5
    201: st({ currentTile: 5, completedTiles: [1, 2, 3, 4] }),        // Period 2, on S5
  },
};
(async () => {
  const vite = spawn(path.join(ROOT, 'node_modules/.bin/vite'), ['--config', path.join(__dirname, 'harness/vite.config.mjs')], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(s => { window.__SEED = s; }, SEED);
    await page.goto(`http://127.0.0.1:${PORT}/`); await page.waitForTimeout(2500);
    const tree = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__tree)));
    const stu = async id => (await tree()).students[id];
    const teacher = async (screen, periodIdx = 0) => { await page.evaluate(([screen, pi]) => { const S = window.__STATE; S.student = null; S.lessonPreview = false; S.teacherPeriodIdx = pi; S.tlsLandId = 2; S.screen = screen; window.__mount(); }, [screen, periodIdx]); await page.waitForTimeout(300); };
    const asStudent = async id => { await page.evaluate(id => { const S = window.__STATE; S.lessonPreview = false; S.student = { id, number: id, cohort: Math.floor(id / 100), pin: 'x' }; S.cu3 = null; S.screen = 'quest-map'; window.__mount(); }, id); await page.waitForTimeout(300); };
    const openTile = async tid => { await page.evaluate(t => document.querySelector(`.lm-svg-wrap svg [data-tid="${t}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), tid); await page.waitForTimeout(400); };
    const click = async sel => { await page.click(sel); await page.waitForTimeout(250); };
    const text = sel => page.textContent(sel);
  // three-step catch-up: go to the question that holds a part, then pick (like a student)
  const _toPractice = async pg => {
    if (await pg.$('#cu6-result')) { await pg.click('#cu6-result .cu6-next'); await pg.waitForTimeout(200); }
    if (!(await pg.$('#cu6-practice')) && await pg.$('[data-cu6-go="practice"]')) { await pg.click('[data-cu6-go="practice"]'); await pg.waitForTimeout(200); }
  };
  const pickOn = async (pg, part, choice) => {
    await _toPractice(pg);
    const sel = `[data-cu3-part="${part}"][data-cu3-choice="${choice}"]`;
    const n = (await pg.$$('.cu6-qdot')).length;
    for (let i = 0; i < n && !(await pg.$(sel)); i++) { await pg.click(`[data-cu6-q="${i}"]`); await pg.waitForTimeout(150); }
    await pg.click(sel); await pg.waitForTimeout(150);
  };
  const submitOn = async pg => {
    await _toPractice(pg);
    const n = (await pg.$$('.cu6-qdot')).length;
    if (!(await pg.$('[data-cu2="grade"]'))) { await pg.click(`[data-cu6-q="${n - 1}"]`); await pg.waitForTimeout(150); }
    await pg.click('[data-cu2="grade"]'); await pg.waitForTimeout(250);
  };


    // ── Feature 1: Today's Lesson for all periods ──
    await teacher('teacher-dash', 0);
    check('Today\'s Lesson row has period-only and all-periods buttons', /Save for Period 1 only/.test(await text('#t-today-save')) && /Save for all 4 periods/.test(await text('#t-today-save-all')));
    await page.selectOption('#t-today-sel', '2:4'); await click('#t-today-save-all');
    let t = await tree();
    check('one save sets Session 4 for all four periods', [1, 2, 3, 4].every(c => t.settings.currentSession[c] && t.settings.currentSession[c].tileId === 4 && t.settings.currentSession[c].landId === 2));
    check('other teacher settings untouched', t.settings.homeworkQuest.text === 'Read 20 minutes' && t.settings.lessonSchedule[2][4].releaseDate === past && !!t.settings.tileLinks[2][4].pear);
    check('summary: "Same for all periods"', /Same for all periods: Session 4/.test(await text('#t-today-sum')));
    await teacher('teacher-dash', 1);
    await page.selectOption('#t-today-sel', '2:5'); await click('#t-today-save');
    t = await tree();
    check('period-only save changes only Period 2', t.settings.currentSession[2].tileId === 5 && [1, 3, 4].every(c => t.settings.currentSession[c].tileId === 4));
    const sum = await text('#t-today-sum');
    check('summary shows the periods differ (P2 highlighted)', /Periods differ/.test(sum) && /P1: Session 4/.test(sum) && /P2: Session 5|P2: Writer/.test(sum) && !!(await page.$('.t-today-p-on')), sum);
    check('changing Today\'s Lesson moved no student and released/locked nothing', (await stu(101)).currentTile === 4 && (await stu(103)).currentTile === 5 && !t.settings.lessonRelease);

    // ── Release mode off (default) = old behaviour ──
    await asStudent(103); await openTile(5);
    check('release mode off: S5 (no date) opens as before', !(await page.$('#ls-locked')) && (await page.$$('.ls-screen')).length === 1);

    // ── Turn on release mode ──
    await teacher('teacher-lesson-schedule');
    check('Lesson Release panel is off by default', /Lesson Release\s*Off/.test(await text('#trl-panel')));
    await click('#trl-enable');
    check('step 1 saves nothing — it only shows the confirmation', !(await tree()).settings.lessonRelease && !!(await page.$('#trl-confirm')));
    const cfOpen = await text('#trl-cf-open'), cfFuture = await text('#trl-cf-future'), cfNoDate = await text('#trl-cf-nodate');
    check('confirmation: "Open right away" lists only sessions whose date has passed (S2–S4)', /Open right away \(3\)/.test(cfOpen) && /Session 2/.test(cfOpen) && /Session 4/.test(cfOpen) && !/Session 5|Session 6/.test(cfOpen), cfOpen);
    check('confirmation: future-dated session listed as staying locked, with its date', /Stay locked \(1\)/.test(cfFuture) && /Camp Day|Session 7/.test(cfFuture) && /2099/.test(cfFuture), cfFuture);
    check('confirmation: sessions with NO release date listed separately as staying locked', /no release date/.test(cfNoDate) && /Session 5|Writer/.test(cfNoDate) && /Study Hall/.test(cfNoDate) && /Session 6/.test(cfNoDate), cfNoDate);
    check('confirmation: progress is kept, and it says how many students sit on a session that will lock', /keeps everything they've finished/.test(await text('#trl-confirm')) && /3 students are/.test(await text('#trl-confirm')), await text('#trl-confirm'));
    await click('#trl-enable-cancel');
    check('Cancel saves nothing and closes the confirmation', !(await tree()).settings.lessonRelease && !(await page.$('#trl-confirm')) && !!(await page.$('#trl-enable')));
    await click('#trl-enable'); await click('#trl-enable-confirm');
    t = await tree();
    const rel = t.settings.lessonRelease[2];
    check('confirm saves exactly the listed "open" sessions; no-date sessions are not released', JSON.stringify(Object.keys(rel.all).sort()) === '["2","3","4"]', JSON.stringify(rel.all));
    check('turning on changed no student progress', (await stu(104)).completedTiles.join() === '1,2,3,4,5' && (await stu(103)).currentTile === 5 && (await stu(101)).xp === 10);
    check('turning on keeps sessions with past release dates open for all periods (S2–S4), nothing else', rel.enabled === true && rel.all[2] && rel.all[3] && rel.all[4] && !rel.all[5] && !rel.all[7]);
    check('turning on wrote only settings/lessonRelease (other settings intact)', t.settings.homeworkQuest.text === 'Read 20 minutes' && t.settings.currentSession[2].tileId === 5);
    check('"Release next" offers the first locked session', /Release next: (Session 5|Writer)/.test(await text('#trl-next')), await text('#trl-next'));

    // ── Locked lesson for students ──
    await asStudent(103); await openTile(5);
    check('unreleased session: student sees a clear locked card', !!(await page.$('#ls-locked')) && /isn’t open yet/.test(await text('#ls-locked')));
    check('locked: no way to start or submit (no tasks, links or submit buttons)', !(await page.$('#ls-submit, .ls-check, .ls-check-new, #st-rl-btn, #st-et-btn, #ls-outcome-pass')));
    await asStudent(201);
    const hubLocked = await page.evaluate(() => { const S = window.__STATE; S.screen = 'hub'; window.__mount(); return document.body.innerText; });
    check('Period 2 Today\'s Lesson (S5) shows "isn\'t available yet" on the hub — not unlocked by Today\'s Lesson', /isn't available yet/.test(hubLocked));
    await teacher('teacher-dash', 1);
    check('teacher sees a warning that today\'s lesson is locked for Period 2 (no auto-unlock)', /isn't released for Period 2 yet/.test(await text('#t-today-warn')) && !(await tree()).settings.lessonRelease[2].all[5]);

    // ── Bypass attempts: the handlers themselves refuse ──
    await teacher('teacher-lesson-schedule');
    await click('[data-rel-period="4|1"]');                         // hold S4 back for Period 1
    check('period override: S4 held back for Period 1 only', (await tree()).settings.lessonRelease[2].classes[1][4] === false && !!(await page.$('[data-rel-period="4|1"].trl-p-ovr')));
    await asStudent(101);
    const before101 = await stu(101);
    await page.evaluate(() => {      // force the normal lesson page onto the screen and click its buttons
      const S = window.__STATE; const land = window.__LANDS.find(l => l.id === 2);
      S.lessonLand = land; S.lessonTile = land.tiles.find(t => t.id === 4); S.screen = 'lesson-stop';
      document.getElementById('root').innerHTML = window.__pageHtml(); window.__bind();
    });
    check('bypass setup: the normal S4 page with "Training Complete" was forced on screen', !!(await page.$('#ls-outcome-pass')));
    await page.click('#ls-outcome-pass'); await page.waitForTimeout(800);
    const after101 = await stu(101);
    check('bypass: clicking Training Complete on a locked lesson saves nothing (no completion, XP or Gold)',
      !after101.completedTiles.includes(4) && after101.xp === before101.xp && after101.gold === before101.gold && !((after101.taskProgress || {})[4] || {}).outcomeRecorded, JSON.stringify(after101.completedTiles));
    check('bypass: the student is shown the locked card', !!(await page.$('#ls-locked')));
    await asStudent(201); await openTile(5);
    // Period 2 S5 still locked; release-all needed
    check('Period 2 still locked on S5', !!(await page.$('#ls-locked')));

    // ── Release for all periods in one action ──
    await teacher('teacher-lesson-schedule');
    await click('#trl-next');
    t = await tree();
    check('"Release next" releases S5 for all periods in one action', t.settings.lessonRelease[2].all[5] === true);
    await asStudent(201); await openTile(5);
    check('released: Period 2 student can now open S5', !(await page.$('#ls-locked')));
    await asStudent(103); await openTile(5);
    check('released: Period 1 student can now open S5', !(await page.$('#ls-locked')));
    await asStudent(101); await openTile(4);
    check('S4 still held back for Period 1 (override kept)', !!(await page.$('#ls-locked')));
    check('releasing S5 did not auto-advance Period 1 past the held-back S4', (await stu(101)).currentTile === 4);
    await teacher('teacher-lesson-schedule');
    await click('[data-rel-period="4|1"]');
    check('clicking P1 again removes the override (follows all periods)', !(((await tree()).settings.lessonRelease[2].classes || {})[1] || {})[4]);

    // ── Completed work is never locked ──
    await click('[data-rel-all="5|0"]');                           // lock S5 for everyone
    await asStudent(104); await openTile(5);
    check('finished S5 stays open for the student who completed it, even when S5 is locked', !(await page.$('#ls-locked')));
    check('completed tiles and rewards preserved', (await stu(104)).completedTiles.includes(5) && (await stu(104)).gold === 20);

    // ── Catch-up for a released session ──
    await asStudent(102); await openTile(3);
    check('missed S3 (released) → catch-up page still opens', !!(await page.$('#cu2')));
    for (const [k, v] of Object.entries({ q1: 2, q2: 1, q3: 3, q4: 0 })) await pickOn(page, k, v);
    await submitOn(page);
    const r102 = ((await stu(102)).catchUp || {})['2_3'] || {};
    check('catch-up grading unchanged (4/4 pass recorded, no completion/reward until Pear)', (r102.history || []).map(h => h.event + ':' + h.note).join() === 'autoPass:4/4' && !(await stu(102)).completedTiles.includes(3) && (await stu(102)).gold === 20);
    await teacher('teacher-lesson-schedule');
    await click('[data-rel-period="3|1"]');                         // hold S3 back for Period 1 (teacher choice)
    await asStudent(102); await openTile(3);
    check('if the teacher locks a session again, its catch-up can\'t be opened', !(await page.$('#cu2')));
    await teacher('teacher-lesson-schedule'); await click('[data-rel-period="3|1"]');   // undo

    // ── Teacher preview ──
    check('long list is trimmed: released sessions + next 3 locked, with "Show all"', /Show all \d+ sessions/.test(await text('#trl-more')) && (await page.$$('.trl-row')).length < 10);
    await click('#trl-more');
    check('"Show all" lists every session', (await page.$$('.trl-row')).length > 20);
    await click('[data-rel-preview="7"]');
    const snap = JSON.stringify((await tree()).students);
    check('teacher can preview a locked session (student page + banner)', /Teacher preview/.test(await text('.ls-preview-banner')) && /Locked for all periods/.test(await text('.ls-preview-banner')) && !(await page.$('#ls-locked')));
    await click('.ls-back-btn');
    check('preview back button returns to Lesson Schedule', await page.evaluate(() => window.__STATE.screen) === 'teacher-lesson-schedule');
    await click('[data-rel-preview="3"]');
    await click('[data-preview-cu="1"]');
    check('preview shows the missed-day catch-up page too', !!(await page.$('#cu2')) && /Review the Skills/.test(await text('#cu2')));
    for (const [k, v] of Object.entries({ q1: 2, q2: 1, q3: 3, q4: 1 })) await pickOn(page, k, v);
    await submitOn(page);
    check('preview can try the questions (graded on the page)', /Preview: 3 of 4 correct — this would pass/.test(await text('#cu2')));
    check('preview saved nothing to any student', JSON.stringify((await tree()).students) === snap);
    await click('.ls-back-btn');

    // ── Turn off ──
    await click('#trl-disable');
    t = await tree();
    check('turning off restores date rules but keeps the release list for next time', !t.settings.lessonRelease[2].enabled && t.settings.lessonRelease[2].all[4] === true);
    await asStudent(103); await openTile(5);
    check('release mode off again: S5 opens', !(await page.$('#ls-locked')));

    // ── Phone layout ──
    await page.setViewportSize({ width: 390, height: 844 });
    await teacher('teacher-lesson-schedule'); await click('#trl-enable');
    check('turning back on: the confirmation lists sessions kept from last time as open', /you released it before/.test(await text('#trl-cf-open')));
    check('phone: confirmation fits the screen', await page.evaluate(() => [...document.querySelectorAll('#trl-panel, #trl-panel *')].every(e => e.getBoundingClientRect().right <= window.innerWidth + 1)));
    await click('#trl-enable-confirm');
    check('phone: release panel fits the screen', await page.evaluate(() => [...document.querySelectorAll('#trl-panel, #trl-panel *')].every(e => e.getBoundingClientRect().right <= window.innerWidth + 1)));
    await page.screenshot({ path: path.join(require('os').tmpdir(), 'release-phone.png') });
    check('no page errors', errs.length === 0, errs.join(' | '));
  } finally { await browser.close(); vite.kill(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
