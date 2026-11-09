// Regression suite — House selection.
// In-memory test database and fictional students only (no live data).
// Run all regression suites: npm run test:regression   (tests/browser/regression/run-all.cjs starts the test server)
const { chromium } = require('playwright');
const OUT = process.env.REG_OUT || require('os').tmpdir();   // screenshots go here
const st = x => Object.assign({ claimed:true, characterName:'Ferrin', completedLand0:true, currentLand:2, land2Entry:{seen:true}, currentTile:2, completedTiles:[1], level:2, xp:10, gold:5, pinSet:true, customPin:'1111', guild:'thorn' }, x);
const SEED = { students: {
  101: st({}),                                                   // no house yet (old guild only)
  102: st({ house:'amistad', houseConfirmed:true }),             // already has a house
  103: { claimed:true, characterName:'Newbie', pinSet:true, customPin:'1111', currentLand:0, currentTile:3, completedTiles:[1,2] }, // Starting Grounds
} };
const R = []; const ok = (n, c, x='') => R.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport:{ width:1366, height:768 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  try {
  await page.addInitScript(s => { window.__SEED = s; }, SEED); await page.addInitScript(() => { const S = window.__SEED; if (!S) return; S.settings = S.settings || {}; S.settings.questChests = { launchAt: '2999-01-01T00:00:00' }; Object.values(S.students || {}).forEach(st => { st.potionsUpgradedAt = st.potionsUpgradedAt || 'test'; st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {}); }); });
  await page.goto(process.env.REG_BASE); await page.waitForTimeout(2500);
  const hub = async sid => { await page.evaluate(sid => { const S = window.__STATE; S.sg0GuildReveal = null; S.student = { id:sid, number:sid, cohort:1, pin:'x' }; S.screen='hub'; window.__mount(); }, sid); await page.waitForTimeout(700); };
  await hub(101);
  ok('student with no house sees "Choose Your House" on the hub', !!(await page.$('#guild-intro-btn')) && /Choose Your House/.test(await page.evaluate(() => document.body.innerText)));
  await page.screenshot({ path: OUT + '/1-intro.png' });
  await page.click('#guild-intro-btn'); await page.waitForTimeout(400);
  const cards = await page.$$eval('[data-house-pick]', cs => cs.map(c => c.dataset.housePick));
  ok('house cards shown (4 houses)', cards.length === 4, cards.join(','));
  await page.screenshot({ path: OUT + '/2-select.png' });
  await page.click('[data-house-pick="altruismo"]'); await page.waitForTimeout(400);
  ok('confirm step for Altruismo', !!(await page.$('#guild-confirm-btn')));
  await page.click('#guild-confirm-btn'); await page.waitForTimeout(500);
  const s101 = await page.evaluate(() => window.__tree.students['101']);
  ok('saved house + houseConfirmed', s101.house === 'altruismo' && s101.houseConfirmed === true, JSON.stringify({ h:s101.house, c:s101.houseConfirmed }));
  ok('progress untouched', s101.currentTile === 2 && JSON.stringify(s101.completedTiles) === '[1]' && s101.gold === 5 && s101.xp === 10);
  await page.screenshot({ path: OUT + '/3-chosen.png' });
  await page.click('#guild-continue-btn'); await page.waitForTimeout(600);
  ok('celebration closes back to the hub', (await page.evaluate(() => window.__STATE.screen)) === 'hub' && !(await page.$('.guild-reveal-overlay')));
  await hub(101);
  ok('does not show again after choosing', !(await page.$('.guild-reveal-overlay')));
  await hub(102);
  ok('student who already has a house sees nothing new', !(await page.$('.guild-reveal-overlay')));
  // Starting Grounds tile 3 still works
  await page.evaluate(() => { const S = window.__STATE; S.sg0GuildReveal = null; S.student = { id:103, number:103, cohort:1, pin:'x' }; S.screen='quest-map'; window.__mount(); }); await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('.lm-svg-wrap svg [data-tid="3"]')?.dispatchEvent(new MouseEvent('click', { bubbles:true }))); await page.waitForTimeout(400);
  ok('Starting Grounds tile 3 still opens the house flow', !!(await page.$('#guild-intro-btn')));
  await page.click('#guild-intro-btn'); await page.waitForTimeout(300);
  ok('...and its buttons still work', (await page.$$('[data-house-pick]')).length === 4);
  ok('no page errors', errs.length === 0, errs.join(' | '));
  } catch (e) { R.push('ERROR ' + e.message.split('\n')[0]); }
  console.log(R.join('\n')); await b.close();
})();
