// Regression suite — Achievements screen.
// In-memory test database and fictional students only (no live data).
// Run all regression suites: npm run test:regression   (tests/browser/regression/run-all.cjs starts the test server)
const { chromium } = require('playwright');
const OUT = process.env.REG_OUT || require('os').tmpdir();   // screenshots go here
const SEED = { students: { 101: { claimed:true, characterName:'Ferrin', completedLand0:true, currentLand:2, land2Entry:{seen:true}, currentTile:2, completedTiles:[1], level:2, xp:10, gold:5, pinSet:true, customPin:'1111', house:'altruismo', houseConfirmed:true,
  standardBossState:{ duskmantle:{ status:'mastery_available', medalAwarded:true } } } } };
const R = []; const ok = (n, c, x='') => R.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport:{ width:390, height:844 }, hasTouch:true });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  try {
  await page.addInitScript(s => { window.__SEED = s; }, SEED); await page.addInitScript(() => { const S = window.__SEED; if (!S) return; S.settings = S.settings || {}; S.settings.questChests = { launchAt: '2999-01-01T00:00:00' }; Object.values(S.students || {}).forEach(st => { st.potionsUpgradedAt = st.potionsUpgradedAt || 'test'; st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {}); }); });
  await page.goto(process.env.REG_BASE); await page.waitForTimeout(2500);
  await page.evaluate(() => { const S = window.__STATE; S.student = { id:101, number:101, cohort:1, pin:'x' }; S.screen='hub'; window.__mount(); }); await page.waitForTimeout(800);
  const hasOpen = !!(await page.$('#open-achievements-btn'));
  if (hasOpen) { await page.tap('#open-achievements-btn'); await page.waitForTimeout(400); }
  else { await page.evaluate(() => { window.__STATE.screen = 'achievements'; window.__STATE.achievementsTab = 'medals'; window.__mount(); }); await page.waitForTimeout(400); }
  ok('Achievements screen opens' + (hasOpen ? ' from hub button' : ' (set directly)'), (await page.evaluate(() => window.__STATE.screen)) === 'achievements');
  await page.tap('[data-ach-tab="trophies"]'); await page.waitForTimeout(900);
  ok('Gatekeeper Trophies tab works', (await page.evaluate(() => window.__STATE.achievementsTab)) === 'trophies' && await page.$eval('[data-ach-tab="trophies"]', e => e.classList.contains('ach-tab-active')));
  await page.screenshot({ path: OUT + '/trophies.png' });
  await page.tap('[data-ach-tab="medals"]'); await page.waitForTimeout(900); await page.screenshot({ path: OUT + '/medals.png' });
  ok('Mastery Medals tab works', (await page.evaluate(() => window.__STATE.achievementsTab)) === 'medals' && await page.$eval('[data-ach-tab="medals"]', e => e.classList.contains('ach-tab-active')));
  await page.tap('#ach-back-btn'); await page.waitForTimeout(400);
  ok('Back to Hub works', (await page.evaluate(() => window.__STATE.screen)) === 'hub');
  ok('no page errors', errs.length === 0, errs.join(' | '));
  } catch (e) { R.push('ERROR ' + e.message.split('\n')[0]); }
  console.log(R.join('\n')); await b.close();
})();
