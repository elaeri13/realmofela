// Regression suite — Session 2 catch-up (Unit 2): practice, Pear exit ticket, report, teacher Verify/Send Back, rewards once, boss safeguard.
// In-memory test database and fictional students only (no live data).
// Run all regression suites: npm run test:regression   (tests/browser/regression/run-all.cjs starts the test server)
const { chromium } = require('playwright');
const OUT = process.env.REG_OUT || require('os').tmpdir();   // screenshots go here
let pass = 0, fail = 0;
let THREE = true;   // set from the page: three-step layout (PR #23) or one-page (PR #22)
const check3 = (n, ok, extra = '') => THREE ? check(n, ok, extra) : console.log(`SKIP  ${n}  (three-step layout only)`);
const check = (n, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  — ' + extra}`); };
const L2 = x => Object.assign({ claimed: true, characterName: 'Hero', avatar: 'avatar_elf_01_tan_female.png', avatarClass: 'elf', completedLand0: true, currentLand: 2, land2Entry: { seen: true }, currentTile: 4, completedTiles: [1, 3], pinSet: true, customPin: '1111', house: 'isibindi', houseConfirmed: true, xpNext: 50, xp: 10, level: 3, gold: 50, levelCelebratedThrough: 3 }, x);
const past = '2026-10-01';
const PEAR = 'https://app.peardeck.com/student/session-2-exit-ticket';
const seed = withPear => ({
  settings: {
    lessonSchedule: { 2: { 2: { releaseDate: past }, 3: { releaseDate: past }, 4: { releaseDate: past } } },
    tileLinks: { 2: { 2: withPear ? { wayground: 'https://wayground.com/join?gc=111', pear: PEAR } : { wayground: 'https://wayground.com/join?gc=111' }, 3: { wayground: 'https://wayground.com/join?gc=222', pear: 'https://app.peardeck.com/student/def' } } },
  },
  students: {
    101: L2({ currentLand: 1 }),
    201: L2({}),
    202: L2({ taskProgress: { 2: { wayground: [true], exitTicketOpened: [true] } } }),
    203: L2({ completedTiles: [1, 2, 3], currentTile: 5 }),
    204: L2({ currentTile: 14, completedTiles: [1,2,3,4,5,50,6,7,8,9,10,11,13,51], standardBossState: { chronicler: { status: 'sighted', encounterCount: 2, demonstrationCount: 1 } } }),
    205: L2({}),
    // completed under the earlier pilot version (before this update)
    209: L2({ completedTiles: [1, 2, 3], completionMode: { 2: 'catchUp' }, gold: 53, catchUp: { '2_2': { recapAt: 'a', etOpenedAt: 'b', etConfirmedAt: 'c', status: 'submitted', submittedAt: '2026-11-03T10:00:00Z', submitCount: 1, rewardGrantedAt: 'x' } } }),
    211: L2({ completedTiles: [1, 2, 3], completionMode: { 2: 'catchUp' }, gold: 53, catchUp: { '2_2': { recapAt: 'a', etConfirmedAt: 'c', status: 'accepted', acceptedAt: 'd', submitCount: 1, rewardGrantedAt: 'x' } } }),
  },
});
const RIGHT = { q1: 1, q2a: 2, q2b: 0, q3: 3 };
const TWO_WRONG = { q1: 0, q2a: 0, q2b: 0, q3: 3 };
const ONE_WRONG = { q1: 1, q2a: 0, q2b: 0, q3: 3 };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await ctx.route('https://app.peardeck.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'pear stub' }));
  const opened = []; let catchPopups = true;
  ctx.on('page', async p => { if (p === page || !catchPopups) return; await p.waitForLoadState().catch(() => {}); opened.push(p.url()); p.close().catch(() => {}); });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(s => { window.__SEED = s; }, seed(true)); await page.addInitScript(() => { const S = window.__SEED; if (!S) return; S.settings = S.settings || {}; S.settings.questChests = { launchAt: '2999-01-01T00:00:00' }; Object.values(S.students || {}).forEach(st => { st.potionsUpgradedAt = st.potionsUpgradedAt || 'test'; st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {}); }); });
  await page.goto(process.env.REG_BASE); await page.waitForTimeout(2500);
  const as = async (id, screen = 'quest-map') => page.evaluate(([id, screen]) => {
    const S = window.__STATE, p = window.__CLASS().periods.find(p => p.students.some(s => s.id === id));
    S.currentPeriod = p; S.student = p.students.find(s => s.id === id); S.screen = screen; window.__mount();
  }, [id, screen]);
  const openTile = async tid => { await page.evaluate(tid => { const g = document.querySelector(`.lm-svg-wrap svg [data-tid="${tid}"]`); g && g.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, tid); await page.waitForTimeout(250); };
  const reopen = async id => { await as(id, 'hub'); await page.evaluate(() => { window.__STATE.cu3 = null; }); await as(id); await openTile(2); };  // "refresh"
  const st = id => page.evaluate(id => JSON.parse(JSON.stringify(window.__tree.students[id])), id);
  const rec = async id => ((await st(id)).catchUp || {})['2_2'] || {};
  const body = () => page.textContent('body');
  const cu = () => page.textContent('#cu2');
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

  const click = async sel => { await page.click(sel); await page.waitForTimeout(200); };
  const answer = async a => { for (const [k, v] of Object.entries(a)) await pickOn(page, k, v); };
  const teacherDash = async () => { await page.evaluate(() => { const S = window.__STATE; S.student = null; S.teacherPeriodIdx = 1; S.screen = 'teacher-dash'; window.__mount(); }); await page.waitForTimeout(300); };
  const disabled = sel => page.$eval(sel, b => b.disabled);
  const row = async sid => page.evaluate(sid => { const b = [...document.querySelectorAll('.t-cu-auto .t-cu-row')].find(r => r.textContent.includes('#' + sid)); return b ? b.textContent.replace(/\s+/g, ' ') : ''; }, sid);

  // ── Three stages ──
  await as(201); await openTile(2);
  THREE = !!(await page.$('.cu6-steps'));
  const t = await cu();
  check3('three labeled steps (Review · Practice · Exit Ticket); opens on the review', /Review/.test(t) && /Practice/.test(t) && /Exit Ticket/.test(t) && /Review the Skill/.test(t) && !!(await page.$('#cu6-review')));
  check3('Step 3 locked before passing practice', (await page.$$('.cu6-step.cu6-locked')).length === 1 && !(await page.$('[data-cu4-open]')));
  if (await page.$('[data-cu6-go="practice"]')) await click('[data-cu6-go="practice"]');
  check3('Session 2 practice: one question at a time; Part A and Part B together on question 2', (await page.$$('.cu3-q')).length === 1 && (await page.$$('.cu6-qdot')).length === 3);
  if (await page.$('[data-cu6-q="1"]')) await click('[data-cu6-q="1"]');
  check('question 2 shows Part A and Part B', !!(await page.$('[data-cu3-part="q2a"]')) && !!(await page.$('[data-cu3-part="q2b"]')) && /Part A and Part B/.test(await cu()));
  await page.screenshot({ path: OUT + '/pe-1-start.png' });

  // ── Fail and retry ──
  const g0 = (await st(201)).gold;
  await answer(TWO_WRONG); await submitOn(page);
  check3('fail: score + hints, Step 3 still locked', /You got 2 of 4 correct\. You need 3 to pass/.test(await cu()) && (await page.$$('.cu6-step.cu6-locked')).length === 1 && !(await page.$('[data-cu4-open]')));
  check('fail: no completion, no reward', !(await st(201)).completedTiles.includes(2) && (await st(201)).gold === g0);
  await reopen(201);
  check('refresh during practice: last score shown, can retry', /Last try: 2 of 4/.test(await cu()) && !!(await page.$('#cu6-practice, [data-cu2="grade"]')));

  // ── Pass ──
  await answer(ONE_WRONG); await submitOn(page);
  const ap = await st(201);
  check('pass 3/4: feedback shown, Stage 3 unlocked', /you passed/.test(await cu()) && !!(await page.$('[data-cu4-open]')));
  check('passing practice alone does NOT complete the tile or pay', !ap.completedTiles.includes(2) && ap.gold === g0 && (await rec(201)).status === undefined);
  check('attempt history kept (fail then pass)', (await rec(201)).history.map(h => h.event + ':' + h.note).join(',') === 'autoFail:2/4,autoPass:3/4');
  check('required-exit-ticket instructions shown', /This exit ticket is required/.test(await cu()) && /same Pear exit ticket as your class/.test(await cu()));
  check('report button disabled until the exit ticket is opened', await disabled('[data-cu2="reportPear"]'));
  await page.screenshot({ path: OUT + '/pe-2-pear.png' });
  await reopen(201);
  check('refresh after passing: still at Stage 3 (practice not repeated)', !!(await page.$('[data-cu4-open]')) && !(await page.$('[data-cu2="grade"]')));

  // ── Pear link opens ──
  check('Pear button uses the stored session link in a new tab', await page.$eval('[data-cu4-open]', a => a.getAttribute('href') + '|' + a.target) === PEAR + '|_blank');
  await click('[data-cu4-open]'); await page.waitForTimeout(600);
  check('the Pear exit ticket opened', opened.some(u => u.startsWith('https://app.peardeck.com/student/session-2-exit-ticket')), opened.join(','));
  check('opening is recorded as "opened", not complete', !!(await rec(201)).etOpenedAt && !(await rec(201)).etConfirmedAt && !(await st(201)).completedTiles.includes(2));
  await reopen(201);
  check('refresh after opening: report button ready', !(await disabled('[data-cu2="reportPear"]')));

  // ── Report (double click) ──
  await page.evaluate(() => { const b = document.querySelector('[data-cu2="reportPear"]'); b.click(); b.click(); });
  await page.waitForTimeout(3800);
  const ar = await st(201);
  check('report: tile completed now', ar.completedTiles.includes(2) && ar.completionMode['2'] === 'catchUp');
  check('report: reward once, even with a double click', ar.gold === g0 + 3, `${g0}→${ar.gold}`);
  check('recorded as student-reported (submitted), not verified', (await rec(201)).status === 'submitted' && !!(await rec(201)).etConfirmedAt);
  check('student sees "complete — exit ticket reported"', /Catch-up complete — exit ticket reported/.test(await cu()));
  await reopen(201);
  check('refresh after reporting: still complete, nothing to redo', /exit ticket reported/.test(await cu()) && !(await page.$('[data-cu2="reportPear"]')));

  // ── Teacher ──
  await teacherDash();
  const r201 = await row(201);
  check('teacher row: name + number, session, score, tries, Pear reported, not verified, tile complete',
    /#201/.test(r201) && /Session 2/.test(r201) && /Practice ✓ 3\/4/.test(r201) && /2 tries/.test(r201) && /Pear: reported .* not verified/.test(r201) && /Tile complete/.test(r201), r201);
  check('status badge: Completed (Student Reported), not Verified', /✅ Completed \(Student Reported\)/.test(r201) && !/🛡️ Verified/.test(r201), r201);
  check('header counts completed vs verified', /Catch-Up Sessions — \d+ completed · \d+ verified/.test(await body()));
  check('Session 2 work is not duplicated in the shared review list', !(await page.$('.t-cu-review [data-cu-accept^="201|"]')));
  await page.screenshot({ path: OUT + '/pe-3-teacher.png' });
  await click('[data-cu-sendback^="201|"]'); await page.fill('#t-cu-sb-note', 'I could not find your exit ticket in Pear.'); await click('[data-cu-sb-confirm]');
  check('Send Back keeps practice score and tries on the dashboard', /Practice ✓ 3\/4/.test(await row(201)) && /2 tries/.test(await row(201)) && /Sent back/.test(await row(201)), await row(201));
  check('Send Back keeps every practice attempt in history', (await rec(201)).history.filter(h => /^auto/.test(h.event)).map(h => h.note).join(',') === '2/4,3/4');
  check('Send Back: row shows sent back; tile and reward kept', /Pear: sent back/.test(await row(201)) && (await st(201)).completedTiles.includes(2) && (await st(201)).gold === g0 + 3);
  await reopen(201);
  check('sent-back student is not asked to redo practice', !(await page.$('[data-cu2="grade"]')));
  check('student sees the note and reports again', /could not find your exit ticket/.test(await cu()) && !!(await page.$('[data-cu2="reportPear"]')));
  await click('[data-cu2="reportPear"]'); await page.waitForTimeout(1500);
  check('second report pays nothing', (await st(201)).gold === g0 + 3 && (await rec(201)).submitCount === 2);
  await teacherDash(); await click('[data-cu-accept^="201|"]');
  check('Verify: Pear verified ✓', /Pear: verified ✓/.test(await row(201)));
  check('status badge: Verified, no longer "Student Reported"', /🛡️ Verified/.test(await row(201)) && !/Student Reported/.test(await row(201)));
  check('Verify paid nothing extra', (await st(201)).gold === g0 + 3);
  await reopen(201);
  check('student sees "All done" after verification', /All done/.test(await cu()) && /checked your Pear exit ticket/.test(await cu()));

  // ── Absent student, completing days later, gets the saved link ──
  await page.evaluate(() => { window.__tree.students['205'].absences = { '2026-10-01': true }; });
  await as(205); await openTile(2); await answer(RIGHT); await submitOn(page);
  check('absent student (weeks after the lesson) gets the saved Session 2 Pear link', await page.$eval('[data-cu4-open]', a => a.getAttribute('href')) === PEAR);
  await page.evaluate(() => { window.__tree.students['205'] && delete window.__tree.students['205'].catchUp; });

  // ── Exit ticket opened in class ──
  await as(202); await openTile(2); await answer(RIGHT); await submitOn(page);
  check('exit ticket opened on the lesson day counts as opened', !(await disabled('[data-cu2="reportPear"]')));

  // ── Records completed before the update ──
  await as(209); await openTile(2);
  check('earlier submitted record: still complete, no practice forced', /exit ticket reported/.test(await cu()) && !(await page.$('[data-cu2="grade"]')));
  await as(211); await openTile(2);
  check('earlier accepted record: still complete and verified', /All done/.test(await cu()));
  check('earlier records keep tiles and Gold', (await st(209)).completedTiles.includes(2) && (await st(209)).gold === 53 && (await st(211)).gold === 53);
  await teacherDash();
  check('teacher sees earlier records ("before update")', /Practice: before update/.test(await row(209)) && /Pear: reported/.test(await row(209)) && /verified ✓/.test(await row(211)));

  // ── Boss safeguard / other sessions unchanged ──
  const boss = await page.evaluate(() => {
    const land = window.__LANDSX.find(l => l.id === 2); const all = window.__CLASS().periods.flatMap(p => p.students);
    window.__upd(all.find(s => s.id === 204), 12, land, { awaitingReview: true });
    const a = JSON.parse(JSON.stringify(window.__tree.students['204'].standardBossState.chronicler));
    window.__acc(all.find(s => s.id === 204), land, 12);
    return { a, b: window.__tree.students['204'].standardBossState.chronicler };
  });
  check('boss/medal safeguard unchanged', !boss.a.medalAwarded && boss.b.medalAwarded && boss.b.demonstrationCount === 1 && !boss.b.sealAwarded);
  await as(203); await openTile(4);
  check('other missed sessions (Session 4) keep the existing panel', !!(await page.$('#cu-panel')) && !(await page.$('#cu2')));
  await as(205);
  const gg = (await st(205)).gold;
  await page.evaluate(async () => { const S = window.__STATE; const land = window.__LANDSX.find(l => l.id === 2); const tile = land.tiles.find(t => t.id === 2); await Promise.all([window.__grant(S.student, land, tile), window.__grant(S.student, land, tile)]); });
  await page.waitForTimeout(3500);
  check('two simultaneous reward grants pay once', (await st(205)).gold === gg + 3);

  // ── Missing Pear link (separate page with no stored Pear link) ──
  catchPopups = false;
  const p2 = await ctx.newPage();
  await p2.addInitScript(s => { window.__SEED = s; }, seed(false)); await p2.addInitScript(() => { const S = window.__SEED; if (!S) return; S.settings = S.settings || {}; S.settings.questChests = { launchAt: '2999-01-01T00:00:00' }; Object.values(S.students || {}).forEach(st => { st.potionsUpgradedAt = st.potionsUpgradedAt || 'test'; st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {}); }); });
  await p2.goto(process.env.REG_BASE); await p2.waitForTimeout(2500);
  await p2.evaluate(() => { const S = window.__STATE, p = window.__CLASS().periods.find(p => p.students.some(s => s.id === 205)); S.currentPeriod = p; S.student = p.students.find(s => s.id === 205); S.screen = 'quest-map'; window.__mount(); });
  await p2.evaluate(() => { const g = document.querySelector('.lm-svg-wrap svg [data-tid="2"]'); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await p2.waitForTimeout(300);
  for (const [k, v] of Object.entries(RIGHT)) await pickOn(p2, k, v);
  await submitOn(p2);
  const t2 = await p2.textContent('#cu2');
  check('missing Pear link: clear message to tell the teacher', /exit ticket link isn’t ready yet/.test(t2) && /Tell Ms\. Odom/.test(t2));
  check('missing Pear link: no link, cannot report, not complete', !(await p2.$('[data-cu4-open]')) && !(await p2.$('[data-cu2="reportPear"]')) && !(await p2.evaluate(() => window.__tree.students['205'].completedTiles.includes(2))));
  await p2.screenshot({ path: OUT + '/pe-4-missing.png' });
  await p2.close();

  for (const [n, vp] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }]]) {
    await page.setViewportSize(vp); await reopen(202); await page.waitForTimeout(300);
    check(`${n}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  check('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
