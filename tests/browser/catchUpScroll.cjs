// Catch-up: choosing an answer must not jump the page to the top (every catch-up session).
// Measures the real scroller (.ls-screen) before and after each tap on desktop, tablet and phone.
// In-memory database; no live data.   Run: npm run test:browser
const { chromium } = require('playwright');
const { withoutChestPopups } = require('./harness/seedHelpers.cjs');   // chest pop-ups are tested in questChests.cjs
const { spawn } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const PORT = Number(process.env.CU_PORT || 5289);
let pass = 0, fail = 0;
const check = (n, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  — ' + extra}`); };
const L2 = x => Object.assign({ claimed: true, characterName: 'Hero', avatar: 'avatar_elf_01_tan_female.png', avatarClass: 'elf', completedLand0: true, currentLand: 2, land2Entry: { seen: true }, currentTile: 4, completedTiles: [1], pinSet: true, customPin: '1111', house: 'isibindi', houseConfirmed: true, xpNext: 50, xp: 10, level: 3, gold: 50, levelCelebratedThrough: 3 }, x);
const past = '2026-10-01';
const seed = { settings: { lessonSchedule: { 2: { 2: { releaseDate: past }, 3: { releaseDate: past }, 4: { releaseDate: past } } },
  tileLinks: { 2: { 2: { pear: 'https://app.peardeck.com/student/s2' }, 3: { pear: 'https://app.peardeck.com/student/s3' } } } },
  students: { 101: L2({ currentLand: 1 }), 201: L2({}), 202: L2({}), 203: L2({}) } };
const KEYS = { 2: { right: { q1: 1, q2a: 2, q2b: 0, q3: 3 }, wrong: { q1: 0, q2a: 0, q2b: 1, q3: 3 } },
               3: { right: { q1: 2, q2: 1, q3: 3, q4: 0 }, wrong: { q1: 0, q2: 0, q3: 3, q4: 1 } } };
(async () => {
  const vite = spawn(path.join(ROOT, 'node_modules/.bin/vite'), ['--config', path.join(__dirname, 'harness/vite.config.mjs')], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const browser = await chromium.launch();
  try {
  for (const [dev, vp] of [['desktop', { width: 1366, height: 768 }], ['tablet', { width: 820, height: 1180 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp });
    await ctx.route('https://app.peardeck.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'stub' }));
    const page = await ctx.newPage();
    ctx.on('page', p => { if (p !== page) p.close().catch(() => {}); });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    let navs = 0; page.on('framenavigated', f => { if (f === page.mainFrame()) navs++; });
    await page.addInitScript(s => { window.__SEED = s; }, withoutChestPopups(seed));
    await page.goto(`http://127.0.0.1:${PORT}/`); await page.waitForTimeout(2500);
    const navs0 = navs;
    for (const [sid, tid] of [[201, 2], [202, 3]]) {
      const tag = `${dev} S${tid}`;
      await page.evaluate(id => { const S = window.__STATE; S.student = { id, number: id, cohort: Math.floor(id / 100), pin: 'x' }; S.screen = 'quest-map'; S.cu3 = null; window.__mount(); }, sid);
      await page.waitForTimeout(300);
      await page.evaluate(t => document.querySelector(`.lm-svg-wrap svg [data-tid="${t}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), tid);
      await page.waitForTimeout(700);
      const scrollTop = () => page.evaluate(() => document.querySelector('.ls-screen').scrollTop);
      const g0 = (await page.evaluate(id => window.__tree.students[id].gold, sid));
      // Three-step catch-up: go to Practice and to the question that holds the part (moving between
      // questions may scroll on purpose), then measure the scroll position around the answer tap itself.
      const toPractice = async () => {
        if (await page.$('#cu6-result')) { await page.click('#cu6-result .cu6-next'); await page.waitForTimeout(200); }
        if (!(await page.$('#cu6-practice')) && await page.$('[data-cu6-go="practice"]')) { await page.click('[data-cu6-go="practice"]'); await page.waitForTimeout(200); }
      };
      const submit = async () => {
        await toPractice();
        const n = (await page.$$('.cu6-qdot')).length;
        if (!(await page.$('[data-cu2="grade"]'))) { await page.click(`[data-cu6-q="${n - 1}"]`); await page.waitForTimeout(200); }
        await page.click('[data-cu2="grade"]'); await page.waitForTimeout(400);
      };
      let jumps = [], lost = 0, sameNode = true;
      const pick = async (part, choice) => {
        const sel = `[data-cu3-part="${part}"][data-cu3-choice="${choice}"]`;
        await toPractice();
        const n = (await page.$$('.cu6-qdot')).length;
        for (let i = 0; i < n && !(await page.$(sel)); i++) { await page.click(`[data-cu6-q="${i}"]`); await page.waitForTimeout(200); }
        await page.locator(sel).scrollIntoViewIfNeeded();
        const before = await scrollTop();
        const handle = await page.$(sel);
        await page.click(sel); await page.waitForTimeout(150);
        const after = await scrollTop();
        if (Math.abs(after - before) > 2) jumps.push(`${part}: ${before}→${after}`);
        if (!(await handle.evaluate(e => e.isConnected))) sameNode = false;
        if (!(await page.$(`${sel}[aria-pressed="true"].cu3-opt-picked`))) lost++;
      };
      const { right, wrong } = KEYS[tid];
      for (const [k, v] of Object.entries(wrong)) await pick(k, v);
      check(`${tag}: scroll position stays put on every selection`, jumps.length === 0, jumps.join(', '));
      check(`${tag}: one question per screen (Step 2 of 3)`, (await page.$$('.cu3-q')).length === 1 && /Practice/.test(await page.textContent('.cu6-step.cu6-now')));
      check(`${tag}: each selection shows immediately`, lost === 0);
      check(`${tag}: buttons are updated in place (not rebuilt)`, sameNode);
      // change an answer before submitting
      const firstPart = Object.keys(wrong)[0];
      await pick(firstPart, right[firstPart]);
      const pressed = await page.$$eval(`[data-cu3-part="${firstPart}"][aria-pressed="true"]`, b => b.map(x => x.dataset.cu3Choice));
      check(`${tag}: changing an answer leaves exactly one choice selected`, pressed.join() === String(right[firstPart]), pressed.join());
      const allPicked = await page.evaluate(() => Object.keys(window.__STATE.cu3.answers).length);
      check(`${tag}: all answers still selected and saved in page state (every question button marked answered)`, allPicked === Object.keys(right).length && (await page.$$('.cu6-qdot')).length === (await page.$$('.cu6-qdot.cu6-qdot-done')).length);
      { const n = (await page.$$('.cu6-qdot')).length; await page.click(`[data-cu6-q="${n - 1}"]`); await page.waitForTimeout(200); }
      check(`${tag}: submit enabled once all are answered; note says "All answered"`, !(await page.$eval('[data-cu2="grade"]', b => b.disabled)) && /All answered/.test(await page.textContent('.cu3-need-all')));
      check(`${tag}: no animation replay / no full re-render flash`, await page.evaluate(() => !document.querySelector('.ls-card.enter') || getComputedStyle(document.querySelector('.ls-card')).opacity === '1'));
      check(`${tag}: nothing written to the database by selecting`, !(await page.evaluate(id => (window.__tree.students[id].catchUp || {}), sid))[`2_${tid}`]);
      // submit (2 wrong except the one changed) → still fails, grading unchanged
      await submit();
      const failMsg = await page.textContent('#cu2');
      check(`${tag}: submitting still grades (not passed yet)`, /You need 3 to pass/.test(failMsg));
      // retry: fix the rest, submit → pass; Pear opens; report → reward once
      for (const [k, v] of Object.entries(right)) await pick(k, v);
      check(`${tag}: retry selections also keep their place`, jumps.length === 0, jumps.join(', '));
      await submit();
      check(`${tag}: retry passes`, /you passed/.test(await page.textContent('#cu2')));
      await page.locator('[data-cu4-open]').scrollIntoViewIfNeeded();
      const b4 = await scrollTop();
      await page.click('[data-cu4-open]'); await page.waitForTimeout(500);
      check(`${tag}: opening Pear keeps the scroll position (report button stays in view)`, Math.abs((await scrollTop()) - b4) <= 2 && await page.locator('[data-cu2="reportPear"]').isVisible(), `${b4}→${await scrollTop()}`);
      await page.evaluate(() => { const b = document.querySelector('[data-cu2="reportPear"]'); b.click(); b.click(); });
      await page.waitForTimeout(3500);
      const st = await page.evaluate(id => window.__tree.students[id], sid);
      check(`${tag}: report completes once, reward paid once`, st.completedTiles.includes(tid) && st.gold === g0 + 3 && st.catchUp[`2_${tid}`].submitCount === 1, `${g0}→${st.gold}`);
      check(`${tag}: attempt history fail then pass`, st.catchUp[`2_${tid}`].history.filter(h => /^auto/.test(h.event)).map(h => h.event).join() === 'autoFail,autoPass');
      // the catch-up just earned a Quest Chest: put its card aside ("Save for later") before the next student
      await page.evaluate(() => document.querySelectorAll('.qc-overlay').forEach(e => e.remove()));
      // refresh rule: answers are page-only; a reopened page starts with nothing selected unless passed
      await page.evaluate(id => { const S = window.__STATE; S.cu3 = null; S.screen = 'quest-map'; window.__mount(); }, sid);
    }
    // Refresh during practice (existing rule: unsent answers are not saved; the last graded score is)
    await page.evaluate(() => { const S = window.__STATE; S.student = { id: 203, number: 203, cohort: 2, pin: 'x' }; S.screen = 'quest-map'; S.cu3 = null; window.__mount(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('.lm-svg-wrap svg [data-tid="3"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForTimeout(500);
    await page.click('[data-cu6-go="practice"]'); await page.waitForTimeout(200);
    await page.click('[data-cu3-part="q1"][data-cu3-choice="2"]');
    await page.reload(); await page.waitForTimeout(2500);
    check(`${dev}: real page reload only happened when the test asked for it`, navs - navs0 === 1, String(navs - navs0));
    check(`${dev}: no page errors`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  } finally { await browser.close(); vite.kill(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
