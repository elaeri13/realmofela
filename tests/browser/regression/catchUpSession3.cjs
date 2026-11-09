// Regression suite — Session 3 catch-up (Packing for Mars): reviews, practice, retries, Pear link, Send Back/Verify, missing link, layouts.
// In-memory test database and fictional students only (no live data).
// Run all regression suites: npm run test:regression   (tests/browser/regression/run-all.cjs starts the test server)
// Session 3 (Packing for Mars, Part 1) catch-up — browser suite. Fictional students, in-memory database.
const { chromium } = require('playwright');
const OUT = process.env.REG_OUT || require('os').tmpdir();   // screenshots go here
let pass = 0, fail = 0;
let THREE = true;   // set from the page: three-step layout (PR #23) or one-page (PR #22)
const check3 = (n, ok, extra = '') => THREE ? check(n, ok, extra) : console.log(`SKIP  ${n}  (three-step layout only)`);
const check = (n, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  — ' + extra}`); };
const L2 = x => Object.assign({ claimed: true, characterName: 'Hero', avatar: 'avatar_elf_01_tan_female.png', avatarClass: 'elf', completedLand0: true, currentLand: 2, land2Entry: { seen: true }, currentTile: 4, completedTiles: [1, 2], pinSet: true, customPin: '1111', house: 'isibindi', houseConfirmed: true, xpNext: 50, xp: 10, level: 3, gold: 50, levelCelebratedThrough: 3 }, x);
const past = '2026-10-01';
const PEAR2 = 'https://app.peardeck.com/student/session-2-exit-ticket';
const PEAR3 = 'https://app.peardeck.com/student/session-3-exit-ticket';
const seed = withPear3 => ({
  settings: {
    lessonSchedule: { 2: { 2: { releaseDate: past }, 3: { releaseDate: past }, 4: { releaseDate: past } } },
    tileLinks: { 2: { 2: { pear: PEAR2 }, 3: withPear3 ? { wayground: 'https://wayground.com/join?gc=333', pear: PEAR3 } : { wayground: 'https://wayground.com/join?gc=333' } } },
  },
  students: {
    101: L2({ currentLand: 1 }),                                               // keeps the app from re-seeding empty slots
    301: L2({ absences: { [past]: true } }),                                   // missed Session 3
    302: L2({ completedTiles: [1, 2, 3], completionMode: { 3: 'catchUp' }, gold: 53, currentTile: 4 }),  // finished S3 with the OLD panel
    303: L2({ completedTiles: [1, 3], catchUp: { '2_2': { history: [{ at: 'x', event: 'autoFail', note: '1/4' }] } } }), // Session 2 catch-up in progress
    304: L2({}),
    305: L2({ completedTiles: [1, 2], currentTile: 3 }),                         // Session 3 is today's lesson (not missed)
  },
});
const RIGHT = { q1: 2, q2: 1, q3: 3, q4: 0 };
const TWO_WRONG = { q1: 0, q2: 0, q3: 3, q4: 0 };
const ONE_WRONG = { q1: 0, q2: 1, q3: 3, q4: 0 };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.route('https://app.peardeck.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'pear stub' }));
  const page = await ctx.newPage();
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
  const reopen = async id => { await as(id, 'hub'); await page.evaluate(() => { window.__STATE.cu3 = null; }); await as(id); await openTile(3); };
  const st = id => page.evaluate(id => JSON.parse(JSON.stringify(window.__tree.students[id])), id);
  const rec = async (id, k = '2_3') => ((await st(id)).catchUp || {})[k] || {};
  const body = () => page.textContent('body');
  const cu = () => page.textContent('#cu2');
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

  const click = async sel => { await page.click(sel); await page.waitForTimeout(200); };
  const answer = async a => { for (const [k, v] of Object.entries(a)) await pickOn(page, k, v); };
  const teacherDash = async () => { await page.evaluate(() => { const S = window.__STATE; S.student = null; S.teacherPeriodIdx = 2; S.screen = 'teacher-dash'; window.__mount(); }); await page.waitForTimeout(300); };
  const disabled = sel => page.$eval(sel, b => b.disabled);
  const row = async (sid, sess = 'Session 3') => page.evaluate(([sid, sess]) => { const b = [...document.querySelectorAll('.t-cu-auto .t-cu-row')].find(r => r.textContent.includes('#' + sid) && r.textContent.includes(sess)); return b ? b.textContent.replace(/\s+/g, ' ') : ''; }, [sid, sess]);

  // ── Session 3 page: two reviews ──
  await as(301); await openTile(3);
  THREE = !!(await page.$('.cu6-steps'));
  const t = await cu();
  check('Session 3 opens the new catch-up page (not the old panel)', !!(await page.$('#cu2')) && !(await page.$('#cu-panel')));
  check('header: both skills and standards', /Explain Main Ideas · Use Context Clues/.test(t) && /RI\.5\.2 · L\.5\.4a/.test(t));
  check('Stage 1 "Review the Skills" with Review A and Review B', /Review the Skills/.test(t) && /Review A: Explaining Main Ideas/.test(t) && /Review B: Using Context Clues/.test(t));
  check('Review A models main idea + details; Review B models context clues', /Main idea/.test(t) && /Key details/.test(t) && /disoriented/.test(t) && /Clues nearby/.test(t));
  check('lesson vocabulary named: fundamental and technique', /fundamental and technique/.test(t));
  check3('three-step bar: Step 1 Review is current, Step 3 locked; the page opens on the review only', !!(await page.$('#cu6-review')) && !!(await page.$('.cu6-step.cu6-now')) && /Step 1\s*Review/.test(await text('.cu6-step.cu6-now')) && (await page.$$('.cu6-step.cu6-locked')).length === 1 && !(await page.$('.cu3-q')));
  check('Step 3 locked before passing (no Pear link shown)', !(await page.$('[data-cu4-open]')));
  if (await page.$('[data-cu6-go="practice"]')) await click('[data-cu6-go="practice"]');
  check3('Step 2 shows ONE question at a time, with its own reading, and 4 question buttons', (await page.$$('.cu3-q')).length === 1 && (await page.$$('.cu3-q .cu3-read')).length === 1 && (await page.$$('.cu6-qdot')).length === 4 && /Question 1 of 4/.test(await cu()));
  if (await page.$('[data-cu6-q="3"]')) await click('[data-cu6-q="3"]');
  check3('submit (on the last question) disabled until all four are answered', await disabled('[data-cu2="grade"]') && /Answer all 4 questions/.test(await cu()));
  if (await page.$('[data-cu6-q="0"]')) await click('[data-cu6-q="0"]');
  await page.screenshot({ path: OUT + '/s3-1-review.png', fullPage: true });

  // ── Incorrect → retry ──
  const g0 = (await st(301)).gold, x0 = (await st(301)).xp;
  await answer(TWO_WRONG); await submitOn(page);
  const f = await cu();
  check('2 of 4: score, "need 3", hints for the two missed questions', /You got 2 of 4 correct\. You need 3 to pass/.test(f) && (await page.$$('.cu3-results .cu3-no')).length === 2);
  check('hint does not reveal the answer', !/a special way of doing something/.test(await page.textContent('.cu2-status-ret')));
  check3('result screen: the 2 missed questions are marked on the question buttons', (await page.$$('.cu6-qdot-wrong')).length === 2 && !!(await page.$('#cu6-result')));
  if (await page.$('#cu6-result .cu6-next')) await click('#cu6-result .cu6-next');
  check3('"Fix my answers" opens the first missed question, marked, with the answer kept', /Question 1 of 4/.test(await cu()) && (await page.$$('.cu3-part-wrong')).length === 1 && !!(await page.$('[data-cu3-part="q1"][aria-pressed="true"]')));
  if (await page.$('[data-cu6-q="2"]')) await click('[data-cu6-q="2"]');
  check3('answers on other questions are kept for fixing', !!(await page.$('[data-cu3-part="q3"][aria-pressed="true"]')));
  check('fail: no completion, no XP/Gold', !(await st(301)).completedTiles.includes(3) && (await st(301)).gold === g0 && (await st(301)).xp === x0);
  await page.screenshot({ path: OUT + '/s3-2-retry.png' });
  await reopen(301);
  check('refresh during practice: reopens on Step 2 with the last score shown, can retry', /Last try: 2 of 4\. You need 3 of 4/.test(await cu()) && !!(await page.$('#cu6-practice, [data-cu2="grade"]')));

  // ── Correct (3 of 4) ──
  await answer(ONE_WRONG); await submitOn(page);
  check('3 of 4 passes; feedback; Stage 3 unlocked', /3 of 4 correct — you passed/.test(await cu()) && !!(await page.$('[data-cu4-open]')));
  check('passing alone: tile not complete, nothing paid', !(await st(301)).completedTiles.includes(3) && (await st(301)).gold === g0 && !(await rec(301)).status);
  check('attempt history: 2/4 then 3/4', (await rec(301)).history.map(h => h.event + ':' + h.note).join(',') === 'autoFail:2/4,autoPass:3/4');
  check('Session 2 record untouched', !(await st(301)).catchUp['2_2']);
  await reopen(301);
  check('refresh after passing: straight to Stage 3', !!(await page.$('[data-cu4-open]')) && !(await page.$('[data-cu2="grade"]')));

  // ── Pear link ──
  check('Pear button = the saved Session 3 link (not Session 2’s), new tab',
    await page.$eval('[data-cu4-open]', a => a.getAttribute('href') + '|' + a.target + '|' + a.textContent) === PEAR3 + '|_blank|📝 Open my Session 3 Pear exit ticket');
  check('report disabled until the exit ticket is opened', await disabled('[data-cu2="reportPear"]'));
  await click('[data-cu4-open]'); await page.waitForTimeout(600);
  check('the Session 3 Pear exit ticket opened', opened.includes(PEAR3), opened.join(','));
  await reopen(301);
  check('refresh after opening: report enabled', !(await disabled('[data-cu2="reportPear"]')));

  // ── Report (double click) ──
  await page.evaluate(() => { const b = document.querySelector('[data-cu2="reportPear"]'); b.click(); b.click(); });
  await page.waitForTimeout(3800);
  const ar = await st(301);
  check('report: tile 3 complete (catch-up mode)', ar.completedTiles.includes(3) && ar.completionMode['3'] === 'catchUp');
  check('report: +3 XP and +3 Gold once, despite a double click', ar.gold === g0 + 3 && ar.xp === x0 + 3, `${g0}→${ar.gold}, ${x0}→${ar.xp}`);
  check('Chronicler only "sighted" — no medal, no seal', (ar.standardBossState || {}).chronicler && ar.standardBossState.chronicler.status === 'sighted' && !ar.standardBossState.chronicler.medalAwarded && !ar.standardBossState.chronicler.sealAwarded, JSON.stringify(ar.standardBossState));
  check('student sees "complete — exit ticket reported"', /exit ticket reported/.test(await cu()));
  await reopen(301);
  check('refresh after reporting: still complete, nothing to redo', /exit ticket reported/.test(await cu()) && !(await page.$('[data-cu2]')));

  // ── Teacher dashboard ──
  await teacherDash();
  const r1 = await row(301);
  check('row: name+number, Session 3, practice ✓ 3/4, 2 tries, reported/not verified, tile complete',
    /#301/.test(r1) && /Session 3/.test(r1) && /Practice ✓ 3\/4/.test(r1) && /2 tries/.test(r1) && /Pear: reported .* not verified/.test(r1) && /Tile complete/.test(r1), r1);
  check('badge: Completed (Student Reported)', /✅ Completed \(Student Reported\)/.test(r1));
  check('Session 2 student also listed (in progress)', /Practice ✗ 1\/4/.test(await row(303, 'Session 2')));
  check('filter buttons: All, Session 2, Session 3', (await page.$$eval('[data-cu-filter]', b => b.map(x => x.textContent))).join('|') === 'All sessions (2)|Session 2 (1)|Session 3 (1)');
  await click('[data-cu-filter="2_3"]');
  check('Session 3 filter shows only Session 3 rows', !!(await row(301)) && !(await row(303, 'Session 2')));
  await page.screenshot({ path: OUT + '/s3-3-teacher.png' });
  await click('[data-cu-filter="2_2"]');
  check('Session 2 filter shows only Session 2 rows', !(await row(301)) && !!(await row(303, 'Session 2')));
  await click('[data-cu-filter="all"]');

  await click('[data-cu-sendback^="301|2_3"]'); await page.fill('#t-cu-sb-note', 'Your Session 3 exit ticket is not in Pear yet.'); await click('[data-cu-sb-confirm]');
  const r2 = await row(301);
  check('Send Back: badge, practice score and tries kept; tile + reward kept', /Sent back/.test(r2) && /Practice ✓ 3\/4/.test(r2) && /2 tries/.test(r2) && (await st(301)).completedTiles.includes(3) && (await st(301)).gold === g0 + 3, r2);
  await reopen(301);
  check('student sees note; reports again without redoing practice', /not in Pear yet/.test(await cu()) && !(await page.$('[data-cu2="grade"]')) && !!(await page.$('[data-cu2="reportPear"]')));
  await click('[data-cu2="reportPear"]'); await page.waitForTimeout(1500);
  check('re-report pays nothing', (await st(301)).gold === g0 + 3 && (await st(301)).xp === x0 + 3 && (await rec(301)).submitCount === 2);
  await teacherDash(); await click('[data-cu-accept^="301|2_3"]');
  check('Verify: 🛡️ Verified badge; nothing extra paid', /🛡️ Verified/.test(await row(301)) && !/Student Reported/.test(await row(301)) && (await st(301)).gold === g0 + 3);
  check('Verify on Session 3 gives no medal', !((await st(301)).standardBossState.chronicler.medalAwarded));
  await reopen(301);
  check('student sees "All done"', /All done/.test(await cu()));

  // ── Existing progress preserved ──
  await as(302); await openTile(3);
  check('finished S3 with the old panel: no new catch-up page, tile still done', !(await page.$('#cu2')) && (await st(302)).completedTiles.includes(3) && (await st(302)).gold === 53 && !(await st(302)).catchUp);
  await as(304); await openTile(4);
  check('other sessions (Session 4) keep the old panel', !(await page.$('#cu2')));

  // ── Layout ──
  for (const [n, vp] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 820, height: 1180 }]]) {
    await page.setViewportSize(vp); await as(304); await page.evaluate(() => { window.__STATE.cu3 = null; }); await openTile(3); await page.waitForTimeout(300);
    check(`${n}: Session 3 page has no sideways scroll`, !!(await page.$('#cu2')) && await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await page.screenshot({ path: OUT + `/s3-4-${n}.png` });
    await teacherDash();
    check(`${n}: catch-up list fits the screen`, await page.evaluate(() => [...document.querySelectorAll('.t-cu-auto, .t-cu-auto *')].every(e => e.getBoundingClientRect().right <= window.innerWidth + 1)));
  }
  await page.setViewportSize({ width: 1366, height: 768 });

  // ── Missing Session 3 Pear link ──
  catchPopups = false;
  const p2 = await ctx.newPage();
  await p2.addInitScript(s => { window.__SEED = s; }, seed(false)); await p2.addInitScript(() => { const S = window.__SEED; if (!S) return; S.settings = S.settings || {}; S.settings.questChests = { launchAt: '2999-01-01T00:00:00' }; Object.values(S.students || {}).forEach(st => { st.potionsUpgradedAt = st.potionsUpgradedAt || 'test'; st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {}); }); });
  await p2.goto(process.env.REG_BASE); await p2.waitForTimeout(2500);
  await p2.evaluate(() => { const S = window.__STATE, p = window.__CLASS().periods.find(p => p.students.some(s => s.id === 304)); S.currentPeriod = p; S.student = p.students.find(s => s.id === 304); S.screen = 'quest-map'; window.__mount(); });
  await p2.evaluate(() => { document.querySelector('.lm-svg-wrap svg [data-tid="3"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await p2.waitForTimeout(300);
  for (const [k, v] of Object.entries(RIGHT)) await pickOn(p2, k, v);
  await submitOn(p2);
  const t2 = await p2.textContent('#cu2');
  check('missing link: 4/4 passed, clear message to tell the teacher', /4 of 4 correct/.test(t2) && /exit ticket link isn’t ready yet/.test(t2) && /Session 3 exit ticket link is missing/.test(t2));
  check('missing link: Session 2’s link is NOT used; cannot report; not complete',
    !(await p2.$('[data-cu4-open]')) && !(await p2.$('[data-cu2="reportPear"]')) && !(await p2.evaluate(() => window.__tree.students['304'].completedTiles.includes(3))) && !t2.includes('session-2'));
  await p2.screenshot({ path: OUT + '/s3-5-missing.png' });
  await p2.close();

  // ── Session 3 is today's lesson (released today, Session 4 not yet) ──
  const today = new Date(); const iso = d => d.toISOString().slice(0, 10);
  const later = new Date(Date.now() + 7 * 864e5);
  const s3today = seed(true); s3today.settings.lessonSchedule[2][3] = { releaseDate: iso(today) }; s3today.settings.lessonSchedule[2][4] = { releaseDate: iso(later) };
  const p3 = await ctx.newPage();
  await p3.addInitScript(s => { window.__SEED = s; }, s3today); await p3.addInitScript(() => { const S = window.__SEED; if (!S) return; S.settings = S.settings || {}; S.settings.questChests = { launchAt: '2999-01-01T00:00:00' }; Object.values(S.students || {}).forEach(st => { st.potionsUpgradedAt = st.potionsUpgradedAt || 'test'; st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {}); }); });
  await p3.goto(process.env.REG_BASE); await p3.waitForTimeout(2500);
  await p3.evaluate(() => { const S = window.__STATE, p = window.__CLASS().periods.find(p => p.students.some(s => s.id === 305)); S.currentPeriod = p; S.student = p.students.find(s => s.id === 305); S.screen = 'quest-map'; window.__mount(); });
  await p3.evaluate(() => { document.querySelector('.lm-svg-wrap svg [data-tid="3"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await p3.waitForTimeout(300);
  check('Session 3 as today’s lesson (not missed): regular lesson page, no catch-up', !(await p3.$('#cu2')) && !!(await p3.$('#st-et-btn')) && /Session 3: Exit Ticket/.test(await p3.textContent('.ls-card')));
  await p3.close();

  check('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
