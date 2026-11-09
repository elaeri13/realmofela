// Regression suite — Lesson links (Read and Learn / Exit Ticket) and pop-up blockers.
// In-memory test database and fictional students only (no live data).
// Run all regression suites: npm run test:regression   (tests/browser/regression/run-all.cjs starts the test server)
const { chromium } = require('playwright');
const OUT = process.env.REG_OUT || require('os').tmpdir();   // screenshots go here
const st = x => Object.assign({ claimed:true, characterName:'Ferrin', completedLand0:true, currentLand:2, land2Entry:{seen:true}, level:2, xp:10, gold:5, pinSet:true, customPin:'1111', house:'altruismo', houseConfirmed:true }, x);
const SEED = {
  settings: {
    currentSession: { 1:{ landId:2, tileId:2 } },
    tileLinks: { '2': { '2': { wayground:'https://wayground.com/join?gc=111', pear:'https://app.peardeck.com/student/xyz' }, '5': { wayground:'https://wayground.com/join?gc=555' } } },
  },
  students: {
    101: st({ currentTile:2, completedTiles:[1] }),
    102: st({ currentTile:5, completedTiles:[1,2,3,4] }),
    103: st({ currentTile:3, completedTiles:[1,2] }),
  } };
const R = []; const ok = (n, c, x='') => R.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
(async () => {
  const b = await chromium.launch();
  for (const blocked of [true, false]) {
    const ctx = await b.newContext({ viewport:{ width:1366, height:768 } });
    // Abort real navigation to external sites (sandbox has no internet) but still record the URL
    await ctx.route(/wayground\.com|peardeck\.com/, r => r.fulfill({ status:200, contentType:'text/html', body:'<h1>ok</h1>' }));
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    const opened = []; ctx.on('page', p => opened.push(p));
    await page.addInitScript(([s, blocked]) => { window.__SEED = s; if (blocked) window.open = () => null; }, [SEED, blocked]); await page.addInitScript(() => { const S = window.__SEED; if (!S) return; S.settings = S.settings || {}; S.settings.questChests = { launchAt: '2999-01-01T00:00:00' }; Object.values(S.students || {}).forEach(st => { st.potionsUpgradedAt = st.potionsUpgradedAt || 'test'; st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {}); }); });
    await page.goto(process.env.REG_BASE); await page.waitForTimeout(2500);
    const tag = blocked ? '[pop-ups BLOCKED]' : '[normal browser]';
    const lesson = async (sid, tid) => { await page.evaluate(([sid, tid]) => { const S = window.__STATE; S.student = { id:sid, number:sid, cohort:1, pin:'x' }; const L = window.__LANDS.find(l => l.id === 2); S.lessonLand = L; S.lessonTile = L.tiles.find(t => t.id === tid); S.screen='lesson-stop'; window.__mount(); }, [sid, tid]); await page.waitForTimeout(400); };
    const waitUrl = async (n) => { for (let i = 0; i < 30 && opened.length < n; i++) await page.waitForTimeout(100); await page.waitForTimeout(400); return opened[n-1] ? opened[n-1].url() : null; };
    await lesson(101, 2);
    ok(`${tag} Read and Learn is a real link`, await page.$eval('#st-rl-btn', e => e.tagName === 'A' && e.target === '_blank'));
    ok(`${tag} Exit Ticket locked until Read and Learn`, await page.$eval('#st-et-btn', e => e.tagName === 'BUTTON' && e.disabled));
    await page.click('#st-rl-btn');
    let u = await waitUrl(1);
    ok(`${tag} Read and Learn opens Wayground in a new tab`, /wayground\.com\/join\?gc=111/.test(u || ''), u);
    await page.waitForTimeout(300);
    ok(`${tag} progress saved (Read and Learn done)`, await page.evaluate(() => !!((((window.__tree.students['101'] || {}).taskProgress || {})['2'] || {}).wayground || [])[0]));
    ok(`${tag} Exit Ticket now unlocked as a link`, await page.$eval('#st-et-btn', e => e.tagName === 'A'));
    await page.click('#st-et-btn');
    u = await waitUrl(2);
    ok(`${tag} Exit Ticket opens Pear Deck in a new tab`, /peardeck\.com\/student\/xyz/.test(u || ''), u);
    ok(`${tag} exactly one tab per tap (2 total)`, opened.length === 2, String(opened.length));
    // Writer's Craft "Open Lesson" (forge tile 5)
    await lesson(102, 5);
    if (await page.$('#ls-video-btn')) {
      await page.click('#ls-video-btn');
      u = await waitUrl(3);
      ok(`${tag} Writer's Craft "Open Lesson" opens its link`, /gc=555/.test(u || ''), u);
    }
    // Missing link: stays a button, no tab, message shown
    const before = opened.length;
    await lesson(103, 3);
    ok(`${tag} no link → stays a button with the message`, await page.$eval('#st-rl-btn', e => e.tagName === 'BUTTON') && /hasn't been added yet/.test(await page.$eval('.ls-card', e => e.innerText)));
    await page.click('#st-rl-btn'); await page.waitForTimeout(600);
    ok(`${tag} no link → no tab opened`, opened.length === before);
    ok(`${tag} no page errors`, errs.length === 0, errs.join(' | '));
    if (blocked) await page.screenshot({ path: OUT + '/links-blocked.png' });
    await ctx.close();
  }
  console.log(R.join('\n')); await b.close();
})();
