// Today's Lesson browser checks (in-memory database; no live data).   Run: npm run test:browser
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const OUT = process.argv[2] || require('os').tmpdir();
const st = x => Object.assign({ claimed:true, characterName:'Hero', avatarClass:'wizard', completedLand0:true, currentLand:2, land2Entry:{seen:true}, level:2, xp:10, xpNext:50, gold:20, pinSet:true, customPin:'1111', house:'amistad', houseConfirmed:true }, x);
const past = '2026-01-01', future = '2099-01-01';
const sched = {}; [2,3,4,5,50,6,7].forEach(t => sched[t] = { releaseDate: past }); sched[8] = { releaseDate: future };
const SEED = {
  settings: { lessonSchedule: { 2: sched }, currentSession: {
    1: { landId:2, tileId:4 },          // class 1 → Session 4
    2: { landId:2, tileId:7 },          // class 2 → Camp Day (after gate S6)
    4: { landId:2, tileId:31 },         // class 4 → invalid (loot tile)
  } },
  students: {
    101: st({ currentTile:4, completedTiles:[1,2,3] }),                                   // caught up
    102: st({ currentTile:4, completedTiles:[1,2] }),                                     // missed S3
    103: st({ currentTile:4, completedTiles:[1,2,3], taskProgress:{ 4:{ wayground:[true] } } }), // returning
    104: st({ currentTile:2, completedTiles:[1] }),                                       // marker behind today
    201: st({ currentTile:4, completedTiles:[1,2,3] }),                                   // class 2, gate S6 not done
    301: st({ currentTile:4, completedTiles:[1,2,3] }),                                   // class 3: not set
    401: st({ currentTile:4, completedTiles:[1,2,3] }),                                   // class 4: invalid setting
  } };
const R = []; const ok = (n, c, x='') => R.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
const PORT = Number(process.env.PORT || 5288);
(async () => {
  // Start the test server (Vite + in-memory Firebase stand-in)
  const vite = spawn(path.join(ROOT, 'node_modules/.bin/vite'), ['--config', path.join(__dirname, 'harness/vite.config.mjs')], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const b = await chromium.launch();
  try {
  const page = await b.newPage({ viewport:{ width:1280, height:900 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(s => { window.__SEED = s; }, SEED);
  await page.goto(`http://127.0.0.1:${PORT}/`); await page.waitForTimeout(2500);
  const hub = async sid => { await page.evaluate(sid => { const S = window.__STATE; S.student = { id:sid, number:sid, cohort:Math.floor(sid/100), pin:'x' }; S.helpFlagged = false; S.screen = 'hub'; window.__mount(); }, sid); await page.waitForTimeout(400); };
  const hubText = () => page.evaluate(() => document.querySelector('.hub-actions')?.innerText || '');
  const screen = () => page.evaluate(() => window.__STATE.screen);
  const lessonTileId = () => page.evaluate(() => window.__STATE.lessonTile && window.__STATE.lessonTile.id);
  const stu = sid => page.evaluate(s => JSON.parse(JSON.stringify(window.__tree.students[s])), sid);
  const card = () => page.evaluate(() => document.querySelector('.ls-card')?.innerText || '');
  const writesSince = n => page.evaluate(n => window.__writes.slice(n).map(w => w[1]), n);
  const wCount = () => page.evaluate(() => window.__writes.length);

  // 1. Caught up
  await hub(101); let t = await hubText();
  ok('1 caught up: label "Today: Session 4" + "Begin today\'s lesson"', /Today: Session 4/.test(t) && /Begin today's lesson/.test(t), t.replace(/\n/g,' | '));
  ok('1 hub: "View overworld map" present, no "Flag for Help"/"Continue Quest"', !!(await page.$('#view-map-btn')) && !/Flag for Help|Continue Quest/.test(await page.evaluate(() => document.body.innerText)));
  await page.screenshot({ path: OUT + '/hub-desktop.png' });
  let w0 = await wCount();
  await page.click('#today-lesson-btn'); await page.waitForTimeout(400);
  ok('1 opens session page directly (lesson-stop, tile 4)', (await screen()) === 'lesson-stop' && (await lessonTileId()) === 4);
  ok('1 Read and Learn enabled on today\'s lesson', await page.evaluate(() => !document.getElementById('st-rl-btn')?.disabled));
  ok('1 opening wrote nothing', (await writesSince(w0)).length === 0, (await writesSince(w0)).join(','));
  ok('1 "Need help?" control on session page', /Need help\?/.test(await page.evaluate(() => document.getElementById('ls-help-btn')?.innerText || '')));
  await page.click('#ls-help-btn'); await page.waitForTimeout(250);
  ok('1 Need help? opens the existing flag modal', !!(await page.$('#help-modal-send')));
  await page.fill('#help-modal-input', 'stuck on question 2'); await page.click('#help-modal-send'); await page.waitForTimeout(300);
  ok('1 flag sent → helpflags/101 written', await page.evaluate(() => !!(window.__tree.helpflags && window.__tree.helpflags['101'])));
  await page.screenshot({ path: OUT + '/lesson-desktop.png', fullPage:true });

  // 2. Missed earlier lesson (S3 missed; today S4)
  await hub(102); t = await hubText();
  ok('2 missed-earlier student still gets "Begin today\'s lesson" (no lock)', /Begin today's lesson/.test(t));
  await page.click('#today-lesson-btn'); await page.waitForTimeout(400);
  let c = await card();
  ok('2 today\'s page shows guidance + missed lesson link', /Finish today's lesson first, unless Ms\. Odom directs you otherwise/.test(c) && !!(await page.$('[data-open-missed="3"]')), c.slice(-200).replace(/\n/g,' | '));
  ok('2 today\'s lesson itself is usable', await page.evaluate(() => !document.getElementById('st-rl-btn')?.disabled));
  await page.screenshot({ path: OUT + '/lesson-missed.png', fullPage:true });
  await page.click('[data-open-missed="3"]'); await page.waitForTimeout(300);
  ok('2 missed link opens Session 3 with catch-up as main content', (await lessonTileId()) === 3 && /Catch up — Session 3/.test(await card()));

  // 3. Returning
  await hub(103); t = await hubText();
  ok('3 returning: "Return to today\'s lesson"', /Return to today's lesson/.test(t));

  // Marker behind today, skipped sessions released → marker moves (nothing marked complete)
  await hub(104); t = await hubText();
  ok('3b marker-behind student sees "Begin today\'s lesson"', /Today: Session 4/.test(t) && /Begin/.test(t));
  await page.click('#today-lesson-btn'); await page.waitForTimeout(400);
  let s104 = await stu(104);
  ok('3b moves marker to today (S4) without completing skipped sessions', s104.currentTile === 4 && JSON.stringify(s104.completedTiles) === '[1]', JSON.stringify({ cur:s104.currentTile, done:s104.completedTiles }));
  ok('3b opened today\'s page and it is actionable', (await lessonTileId()) === 4 && await page.evaluate(() => !document.getElementById('st-rl-btn')?.disabled));
  ok('3b skipped S2/S3 offered as missed lessons', !!(await page.$('[data-open-missed="2"]')) && !!(await page.$('[data-open-missed="3"]')));

  // 4. Two classes, different sessions; class 2's today is past an unbeaten gate → explained, not bypassed
  await hub(201); t = await hubText();
  ok('4 class 2 sees its own session (Camp Day), not class 1\'s', /Today: Camp Day/.test(t) && !/Session 4 ·|Today: Session 4/.test(t), t.replace(/\n/g,' | '));
  ok('4 gate between → explains, offers current session', /Finish Session 4 first/.test(t) && /Go to Session 4/.test(t));
  w0 = await wCount();
  await page.click('#today-lesson-btn'); await page.waitForTimeout(400);
  const s201 = await stu(201);
  ok('4 fallback opens S4, marker NOT moved past the gate', (await lessonTileId()) === 4 && s201.currentTile === 4);
  // Map for class 2 shows TODAY'S LESSON on Camp Day and YOU ARE HERE on S4
  await page.evaluate(() => { window.__STATE.screen = 'quest-map'; window.__mount(); }); await page.waitForTimeout(800);
  ok('4 map: TODAY\'S LESSON marker separate from YOU ARE HERE', await page.evaluate(() => { const svg = document.querySelector('.lm-svg-wrap svg'); return !!svg && /TODAY'S LESSON/.test(svg.textContent) && /YOU ARE HERE/.test(svg.textContent); }));
  ok('4 map: missed/locked/done states still render', await page.evaluate(() => document.querySelectorAll('.lm-svg-wrap svg [data-tid]').length > 20));
  await page.screenshot({ path: OUT + '/map-class2.png', clip:{ x:780, y:320, width:240, height:240 } });
  ok('4 map: Need Help now opens the flag modal', await (async () => { await page.evaluate(() => { window.__STATE.helpFlagged = false; window.__mount(); }); await page.click('#qm-help-btn'); await page.waitForTimeout(250); const r = !!(await page.$('#help-modal-send')); await page.evaluate(() => { window.__STATE.helpModalOpen = false; window.__mount(); }); return r; })());

  // 5. Class without valid session
  await hub(301); t = await hubText();
  ok('5 class 3 (not set): friendly message + map button, no lesson button', /isn't available yet/.test(t) && !(await page.$('#today-lesson-btn')) && !!(await page.$('#view-map-btn')));
  await hub(401); t = await hubText();
  ok('5 class 4 (invalid saved tile): same safe message', /isn't available yet/.test(t) && !(await page.$('#today-lesson-btn')));
  await page.click('#view-map-btn'); await page.waitForTimeout(500);
  ok('5 map still opens', (await screen()) === 'quest-map');
  // not released: set class 3 to S8 (future release date)
  await page.evaluate(() => { window.__tree.settings.currentSession['3'] = { landId:2, tileId:8 }; });
  await page.waitForTimeout(100);
  // settings listener fires on next write; force via a no-op teacher-free reload of settings:
  await page.evaluate(() => { window.__STATE.screen='hub'; });

  // 7. Student cannot change teacher-only settings
  for (const sid of [101, 201]) {
    await hub(sid);
    ok(`7 student ${sid}: no current-session control anywhere on hub`, !(await page.$('#t-today-sel')) && !(await page.$('#t-today-save')));
  }
  const settingsWritesByStudents = await page.evaluate(() => window.__writes.filter(w => /^settings\/currentSession/.test(w[1])).length);
  ok('7 no student action wrote settings/currentSession', settingsWritesByStudents === 0);

  // Teacher sets/changes the session → only settings written, no student moved
  await page.evaluate(() => { const S = window.__STATE; S.student = null; S.teacherPeriodIdx = 2; S.screen = 'teacher-dash'; window.__mount(); });
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => JSON.stringify(window.__tree.students));
  w0 = await wCount();
  await page.selectOption('#t-today-sel', '2:8'); await page.click('#t-today-save'); await page.waitForTimeout(400);
  const paths = await writesSince(w0);
  ok('teacher save writes only settings/currentSession/3', paths.length === 1 && paths[0] === 'settings/currentSession/3', paths.join(','));
  ok('teacher save moved/changed no student', before === await page.evaluate(() => JSON.stringify(window.__tree.students)));
  ok('teacher row shows what students see', /Students see: The Stone Kingdoms — Session 8/.test(await page.evaluate(() => document.querySelector('.t-today-row')?.innerText || '')));
  await page.screenshot({ path: OUT + '/teacher.png' });
  await hub(301); t = await hubText();
  ok('5b class 3 now S8 with future release date → "isn\'t available yet", no button', /Session 8\) isn't available yet/.test(t) && !(await page.$('#today-lesson-btn')), t.replace(/\n/g,' | '));

  // 6. Mobile layout
  await page.setViewportSize({ width:390, height:844 });
  await hub(101);
  ok('6 mobile hub: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  // Current design (gold/lavender buttons, same height): on a phone they stack full-width, lesson button first.
  { const d = await page.evaluate(() => { const a = document.getElementById('today-lesson-btn').getBoundingClientRect(), m = document.getElementById('view-map-btn').getBoundingClientRect(); return { lesson: [a.width, a.height, a.top].map(Math.round), map: [m.width, m.height, m.top].map(Math.round) }; });
    ok('6 mobile: lesson and map buttons stack, same size, lesson button on top', Math.abs(d.lesson[1] - d.map[1]) <= 1 && Math.abs(d.lesson[0] - d.map[0]) <= 1 && d.lesson[0] >= 300 && d.lesson[1] >= 44 && d.lesson[2] < d.map[2], JSON.stringify(d)); }
  await page.evaluate(() => document.querySelector('.hub-actions').scrollIntoView());
  await page.screenshot({ path: OUT + '/hub-mobile.png' });
  await page.click('#today-lesson-btn'); await page.waitForTimeout(400);
  ok('6 mobile lesson page: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.screenshot({ path: OUT + '/lesson-mobile.png', fullPage:true });

  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) { R.push('ERROR ' + e.message.split('\n')[0]); }
  console.log(R.join('\n'));
  const failed = R.filter(r => !r.startsWith('PASS')).length;
  console.log(`\n${R.length - failed} passed, ${failed} failed`);
  await b.close(); vite.kill();
  process.exit(failed ? 1 : 0);
})();
