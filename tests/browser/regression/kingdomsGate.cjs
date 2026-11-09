// Regression suite — The Kingdoms' Gate (Land 2 arrival).
// In-memory test database and fictional students only (no live data).
// Run all regression suites: npm run test:regression   (tests/browser/regression/run-all.cjs starts the test server)
const { chromium } = require('playwright');
const OUT = process.env.REG_OUT || require('os').tmpdir();   // screenshots go here
const st = x => Object.assign({ claimed:true, characterName:'Ferrin', completedLand0:true, level:2, xp:10, xpNext:50, gold:43, pinSet:true, customPin:'1111' }, x);
const SEED = { settings:{ currentSession:{ 1:{ landId:2, tileId:2 } } }, students: {
  101: st({ currentLand:2, land2Entry:{seen:true}, currentTile:1, completedTiles:[] }),
  102: st({ currentLand:2, land2Entry:{seen:true}, currentTile:3, completedTiles:[1,2] }),
  103: st({ currentLand:1, currentTile:1, completedTiles:[] }),
} };
const R = []; const ok = (n, c, x='') => R.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
(async () => {
  const b = await chromium.launch();
  try {
  const page = await b.newPage({ viewport:{ width:1366, height:768 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(s => { window.__SEED = s; }, SEED); await page.addInitScript(() => { const S = window.__SEED; if (!S) return; S.settings = S.settings || {}; S.settings.questChests = { launchAt: '2999-01-01T00:00:00' }; Object.values(S.students || {}).forEach(st => { st.potionsUpgradedAt = st.potionsUpgradedAt || 'test'; st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {}); }); });
  await page.goto(process.env.REG_BASE); await page.waitForTimeout(2500);
  const map = async sid => { await page.evaluate(sid => { const S = window.__STATE; S.student = { id:sid, number:sid, cohort:1, pin:'x' }; S.screen='quest-map'; window.__mount(); }, sid); await page.waitForTimeout(600); };
  const clickTile = tid => page.evaluate(t => document.querySelector(`.lm-svg-wrap svg [data-tid="${t}"]`).dispatchEvent(new MouseEvent('click', { bubbles:true })), tid);
  await map(101); await clickTile(1); await page.waitForTimeout(500);
  let txt = await page.evaluate(() => document.body.innerText);
  ok('Kingdoms\' Gate opens the new story', /Enter the Stone Kingdoms/i.test(txt) && /enormous stone gate/.test(txt) && /What do we gain from exploring space\?/.test(txt));
  ok('Vale text no longer shown on the gate', !/Thornkin|Verdant Vale/.test(txt));
  ok('guardian art loads', await page.$eval('.gate-guardian', e => e.complete && e.naturalWidth === 600));
  ok('button hidden until a carving is chosen', !(await page.$('#arrival-begin')) && /Choose a carving to open the gate/.test(txt));
  await page.screenshot({ path: OUT + '/gate-top.png' });
  const w0 = await page.evaluate(() => window.__writes.length);
  await page.click('[data-gate-carving="rocket"]'); await page.waitForTimeout(500);
  txt = await page.evaluate(() => document.body.innerText);
  ok('choosing the rocket shows the partner prompt + closing + button', /You chose the rocket/.test(txt) && /Share your idea with a partner/.test(txt) && /Careful thinking will carry you further/.test(txt) && /Begin today’s lesson/.test(txt));
  ok('carving choice saved nothing', (await page.evaluate(n => window.__writes.length - n, w0)) === 0);
  await page.screenshot({ path: OUT + '/gate-full.png', fullPage:true });
  await page.click('#arrival-begin'); await page.waitForTimeout(4500);
  const s101 = await page.evaluate(() => window.__tree.students['101']);
  ok('arrival completed, +5 XP, marker on Session 2 (unchanged reward)', s101.completedTiles.includes(1) && s101.xp === 15 && s101.currentTile === 2, JSON.stringify({ xp:s101.xp, c:s101.currentTile, d:s101.completedTiles }));
  ok('button leads into today\'s lesson (Session 2)', await page.evaluate(() => window.__STATE.screen === 'lesson-stop' && window.__STATE.lessonTile.id === 2));
  // Revisit after completing: button visible immediately, no extra XP
  await map(102); await clickTile(1); await page.waitForTimeout(500);
  ok('revisit: button available without choosing; no XP on click', !!(await page.$('#arrival-begin')));
  await page.click('#arrival-begin'); await page.waitForTimeout(600);
  ok('revisit adds no XP', (await page.evaluate(() => window.__tree.students['102'].xp)) === 10);
  // Vale arrival unchanged
  await map(103); await clickTile(1); await page.waitForTimeout(500);
  txt = await page.evaluate(() => document.body.innerText);
  ok('Vale arrival keeps its original text', /Thornkin/.test(txt) && /Begin Your Quest/.test(txt) && !/Enter the Stone Kingdoms/.test(txt));
  ok('no page errors', errs.length === 0, errs.join(' | '));
  for (const [w, h, tag] of [[1366, 768, 'chromebook'], [390, 844, 'phone']]) {
    await page.setViewportSize({ width:w, height:h });
    await page.evaluate(() => { const S = window.__STATE; S.student = { id:101, number:101, cohort:1, pin:'x' }; S.arrivalLand = window.__LANDS.find(l => l.id === 2); S.arrivalTile = S.arrivalLand.tiles.find(t => t.id === 1); S.gateCarving = 'moon'; S.screen = 'arrival-screen'; window.__mount(); });
    await page.waitForTimeout(500);
    ok(`${tag}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${OUT}/gate-${tag}.png`, fullPage:true });
  }
  } catch (e) { R.push('ERROR ' + e.message.split('\n')[0]); }
  console.log(R.join('\n')); await b.close();
})();
