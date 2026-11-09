// Regression suite — Phase 3: Hero's Journey, level-up celebration, reward claims.
// In-memory test database and fictional students only (no live data).
// Run all regression suites: npm run test:regression   (tests/browser/regression/run-all.cjs starts the test server)
const { chromium } = require('playwright');
const OUT = process.env.REG_OUT || require('os').tmpdir();   // screenshots go here
const st = x => Object.assign({ claimed:true, characterName:'Hero', avatar:'avatar_elf_01_tan_female.png', avatarClass:'elf', completedLand0:true, currentLand:2, land2Entry:{seen:true}, currentTile:2, completedTiles:[1], pinSet:true, customPin:'1111', house:'isibindi', houseConfirmed:true, xpNext:50 }, x);
const SEED = { settings:{ currentSession:{ 1:{ landId:2, tileId:2 } } }, students: {
  101: st({ characterName:'Newbie', level:1, xp:0, gold:0 }),                                   // brand new, no marker
  102: st({ characterName:'Veteran', level:7, xp:20, gold:100, companions:['051-bee.png'],     // existing Lv7, no marker
            standardBossState:{ duskmantle:{ status:'mastery_available', medalAwarded:true } } }),
  103: st({ characterName:'Collector', level:4, xp:0, gold:10, equipInventory:['accessory_valecharm_common'], levelCelebratedThrough:4 }),
  104: st({ characterName:'Ten', level:9, xp:40, gold:0, levelCelebratedThrough:9 }),
  105: st({ characterName:'NoInv', level:3, xp:0, levelCelebratedThrough:3 }),                 // missing gold/inventory fields
} };
const R = []; const ok = (n, c, x='') => R.push(`${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
(async () => {
  const b = await chromium.launch();
  const mk = async (claims, vp = { width:1366, height:768 }, seed = SEED) => {
    const ctx = await b.newContext({ viewport: vp }); const page = await ctx.newPage();
    page.__errs = []; page.on('pageerror', e => page.__errs.push(e.message));
    await page.addInitScript(([s, c]) => { window.__SEED = s; if (c) window.__REALM_TEST_CLAIMS = true; }, [seed, claims]); await page.addInitScript(() => { const S = window.__SEED; if (!S) return; S.settings = S.settings || {}; S.settings.questChests = { launchAt: '2999-01-01T00:00:00' }; Object.values(S.students || {}).forEach(st => { st.potionsUpgradedAt = st.potionsUpgradedAt || 'test'; st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {}); }); });
    await page.goto(process.env.REG_BASE); await page.waitForTimeout(2500); return page;
  };
  const go = (page, sid, screen='hub') => page.evaluate(([sid, screen]) => { const S = window.__STATE; S.sg0GuildReveal = null; S.hjReveal = null; S.student = { id:sid, number:sid, cohort:1, pin:'x' }; S.screen = screen; window.__mount(); }, [sid, screen]).then(() => page.waitForTimeout(500));
  const stu = (page, sid) => page.evaluate(s => JSON.parse(JSON.stringify(window.__tree.students[String(s)])), sid);
  const has = (page, sel) => page.$(sel).then(Boolean);
  try {
  // ───── Claims OFF (production default) ─────
  let page = await mk(false);
  await go(page, 101);
  ok('L1 new character: no celebration on first visit', !(await has(page, '#lu-overlay')));
  ok('L1: marker saved at current level', (await stu(page, 101)).levelCelebratedThrough === 1);
  ok('hub shows compact panel: Level 1, next reward at Lv 2 (25 Gold), Hero\'s Journey button', /Level 1/.test(await page.$eval('.hj-hub', e => e.innerText)) && /Next at Lv 2: 🪙 25 Gold/.test(await page.$eval('.hj-hub', e => e.innerText)) && await has(page, '#open-hj-btn'));
  await page.click('#open-hj-btn'); await page.waitForTimeout(400);
  ok('Hero\'s Journey opens', (await page.evaluate(() => window.__STATE.screen)) === 'heros-journey');
  ok('L1: every reward locked, no claim buttons', (await page.$$('.hj-card.hj-locked')).length === 9 && !(await has(page, '[data-claim-level]')));
  await page.screenshot({ path: OUT + '/hj-level1.png', fullPage:true });
  // Level 1 → 2 via the real XP function
  await page.evaluate(() => window.__awardXP({ id:101 }, 50)); await go(page, 101);
  ok('1→2: LEVEL UP! celebration appears with the Lv 2 reward', await has(page, '#lu-overlay') && /LEVEL UP!/.test(await page.$eval('#lu-overlay', e => e.innerText)) && /25 Gold/.test(await page.$eval('#lu-overlay', e => e.innerText)));
  await page.screenshot({ path: OUT + '/levelup-2.png' });
  await page.click('#lu-continue'); await page.waitForTimeout(300);
  ok('Continue closes it and records it', !(await has(page, '#lu-overlay')) && (await stu(page, 101)).levelCelebratedThrough === 2);
  await go(page, 101); ok('does not replay on the next visit', !(await has(page, '#lu-overlay')));
  // Multi-level 2 → 5
  await page.evaluate(() => window.__awardXP({ id:101 }, 150)); await go(page, 101, 'quest-map');
  let t = await page.$eval('#lu-overlay', e => e.innerText).catch(() => '');
  ok('2→5 in one go: one celebration lists Lv 3, 4 and 5 (nothing skipped)', /Level 2 → Level 5/.test(t) && /Lv 3/.test(t) && /Lv 4/.test(t) && /Lv 5/.test(t), t.replace(/\n/g,' | ').slice(0,200));
  ok('Lv 5 gets milestone emphasis (new ability)', /NEW ABILITY/.test(t) && /Adventurer's Guard/.test(t));
  await page.screenshot({ path: OUT + '/levelup-5.png' });
  await page.click('#lu-journey'); await page.waitForTimeout(400);
  ok('"Hero\'s Journey" button from the celebration opens the screen', (await page.evaluate(() => window.__STATE.screen)) === 'heros-journey');
  // Claims are closed
  ok('claims OFF: no claim buttons, rewards marked "Earned — claiming opens soon"', !(await has(page, '[data-claim-level]')) && (await page.$$('.hj-chip-earned')).length === 3);
  ok('claims OFF: notice explains rewards are saved', /claiming opens soon/.test(await page.$eval('.hj-notice', e => e.innerText)));
  const w0 = await page.evaluate(() => window.__writes.length);
  const r0 = await page.evaluate(() => window.__claim({ id:101 }, 2));
  ok('claims OFF: calling the claim function directly is refused and writes nothing', r0.reason === 'closed' && (await page.evaluate(n => window.__writes.length - n, w0)) === 0);
  // Reaching 10
  await page.evaluate(() => window.__awardXP({ id:104 }, 10)); await go(page, 104);
  t = await page.$eval('#lu-overlay', e => e.innerText).catch(() => '');
  ok('9→10: MAJOR MILESTONE celebration with legendary frame, title and Treasure Sense', /MAJOR MILESTONE/.test(t) && /Starfall Frame/.test(t) && /Legend of the Realm/.test(t) && /Treasure Sense/.test(t));
  await page.screenshot({ path: OUT + '/levelup-10.png' });
  // Existing Lv 7 character
  await go(page, 102);
  ok('existing Lv 7: no surprise celebration of old levels', !(await has(page, '#lu-overlay')));
  await go(page, 102, 'heros-journey');
  const states = await page.$$eval('.hj-card', cs => cs.map(c => c.dataset.level + ':' + [...c.classList].find(k => /^hj-(locked|ready|claimed|auto)$/.test(k))).join(' '));
  ok('existing Lv 7: retroactively eligible for 2,3,4,6,7; Lv 5 frame already theirs; 8–10 locked', states.startsWith('2:hj-ready 3:hj-ready 4:hj-ready 5:hj-auto 6:hj-ready 7:hj-ready 8:hj-locked 9:hj-locked 10:hj-locked'), states);
  const abil = await page.$eval('.hj-abilities', e => e.innerText);
  ok('abilities: Adventurer\'s Guard unlocked + Coming soon; Treasure Sense locked', /Adventurer's Guard[\s\S]*Unlocked · ⏳ Coming soon/.test(abil) && /Treasure Sense[\s\S]*Reach Level 10/.test(abil));
  await page.screenshot({ path: OUT + '/hj-level7-closed.png', fullPage:true });
  ok('no page errors (claims OFF run)', page.__errs.length === 0, page.__errs.join(' | '));
  await page.context().close();

  // ───── Claims ON (test-only switch, dev server) ─────
  page = await mk(true);
  await go(page, 102, 'heros-journey');
  ok('claims ON: claim buttons appear for 2,3,4,6,7', (await page.$$eval('[data-claim-level]', bs => bs.map(x => x.dataset.claimLevel).join(','))) === '2,3,4,6,7');
  await page.screenshot({ path: OUT + '/hj-level7-ready.png', fullPage:true });
  let before = await stu(page, 102);
  await page.click('[data-claim-level="2"]'); await page.waitForTimeout(500);
  let after = await stu(page, 102);
  ok('claim Lv 2: +25 Gold exactly', after.gold - before.gold === 25, `${before.gold}→${after.gold}`);
  ok('claim Lv 2: record saved in Firebase', after.levelRewards && after.levelRewards['2'] && after.levelRewards['2'].claimedAt);
  ok('claim Lv 2: XP, level and boss/mastery progress untouched', after.xp === before.xp && after.level === before.level && JSON.stringify(after.standardBossState) === JSON.stringify(before.standardBossState));
  ok('reward reveal shows what was won', /25 Gold/.test(await page.$eval('#hj-reveal-overlay', e => e.innerText)));
  await page.click('#hj-reveal-ok'); await page.waitForTimeout(200);
  ok('Lv 2 now Claimed; other rewards still available', (await page.$eval('.hj-card[data-level="2"]', e => e.className)).includes('hj-claimed') && (await page.$$('[data-claim-level]')).length === 4);
  // Repeat + simultaneous attempts
  const rep = await page.evaluate(() => window.__claim({ id:102 }, 2));
  ok('repeat claim of Lv 2 refused', rep.ok === false && rep.reason === 'already');
  before = await stu(page, 102);
  const both = await page.evaluate(() => Promise.all([window.__claim({ id:102 }, 6), window.__claim({ id:102 }, 6)]));
  after = await stu(page, 102);
  ok('two simultaneous claims of Lv 6 → only one succeeds, +40 Gold once', both.filter(r => r.ok).length === 1 && after.gold - before.gold === 40, JSON.stringify(both.map(r => r.ok || r.reason)));
  // Another device already claimed Lv 3 (record in the database, not in this browser's cache)
  await page.evaluate(() => { window.__tree.students['102'].levelRewards['3'] = { claimedAt:'2026-11-04T00:00:00Z', level:3 }; });
  before = await stu(page, 102);
  const other = await page.evaluate(() => window.__claim({ id:102 }, 3));
  after = await stu(page, 102);
  ok('Lv 3 already claimed on another device → refused, nothing granted', other.reason === 'already' && JSON.stringify(after.equipInventory || []) === JSON.stringify(before.equipInventory || []) && after.gold === before.gold);
  // Loot (Lv 4) + title (Lv 7)
  await go(page, 102, 'heros-journey');
  before = await stu(page, 102);
  await page.click('[data-claim-level="4"]'); await page.waitForTimeout(500);
  after = await stu(page, 102);
  ok('Lv 4 loot roll: a new companion joins, no XP added', after.companions.length === before.companions.length + 1 && after.xp === before.xp, JSON.stringify(after.companions));
  await page.click('#hj-reveal-ok'); await page.waitForTimeout(200);
  await page.click('[data-claim-level="7"]'); await page.waitForTimeout(500);
  ok('Lv 7 title revealed', /Trailblazer/.test(await page.$eval('#hj-reveal-overlay', e => e.innerText)));
  await page.evaluate(() => { const S = window.__STATE; S.hjReveal = null; S.screen = 'hub'; S.customizeOpen = true; S.custTab = 'title'; window.__mount(); }); await page.waitForTimeout(400);
  ok('claimed title appears in the title picker', await page.$$eval('.title-card', cs => cs.some(c => c.dataset.title === 'Trailblazer')));
  await page.evaluate(() => { window.__STATE.customizeOpen = false; window.__mount(); });
  // Refresh after claims → nothing re-granted, claims persist
  const tree = await page.evaluate(() => JSON.parse(JSON.stringify(window.__tree)));
  const goldBeforeReload = tree.students['102'].gold;
  const page2 = await mk(true, { width:1366, height:768 }, tree);
  await go(page2, 102, 'heros-journey');
  ok('after refresh: claims persist, buttons gone for claimed levels, Gold unchanged', (await page2.$$eval('[data-claim-level]', bs => bs.map(x => x.dataset.claimLevel).join(','))) === '' && (await stu(page2, 102)).gold === goldBeforeReload);
  await page2.context().close();
  // Collectible: missing inventory data / already owned
  await go(page, 105, 'heros-journey');
  await page.click('[data-claim-level="3"]'); await page.waitForTimeout(500);
  let s105 = await stu(page, 105);
  ok('missing inventory/gold fields: collectible lands in a new inventory', JSON.stringify(s105.equipInventory) === '["accessory_valecharm_common"]');
  await page.click('#hj-reveal-ok');
  await go(page, 103, 'heros-journey');
  ok('already owns the collectible: told up front it becomes 15 Gold', /you own it already → 15 Gold/.test(await page.$eval('.hj-card[data-level="3"]', e => e.innerText)));
  before = await stu(page, 103);
  await page.click('[data-claim-level="3"]'); await page.waitForTimeout(500);
  after = await stu(page, 103);
  ok('...and gets exactly 15 Gold, no duplicate item', after.gold - before.gold === 15 && after.equipInventory.length === 1);
  await page.click('#hj-reveal-ok');
  // Lv 10 frame
  await page.evaluate(() => { window.__awardXP({ id:104 }, 10); });
  await go(page, 104); if (await has(page, '#lu-continue')) await page.click('#lu-continue');
  await go(page, 104, 'heros-journey');
  await page.click('[data-claim-level="10"]'); await page.waitForTimeout(500);
  const frameOn = await page.evaluate(() => window.__isCosmeticUnlocked({ id:104 }, window.__COSMETICS.find(c => c.id === 'frame_level_10_starfall')));
  ok('Lv 10: legendary Starfall frame unlocked for customization', frameOn === true);
  // Unauthorized attempts via the app
  const lockedTry = await page.evaluate(() => window.__claim({ id:101 }, 9));
  ok('claiming a level not yet reached is refused', lockedTry.reason === 'locked');
  // House + achievements still work
  await go(page, 102);
  ok('house banner still shows the student\'s crest', await page.evaluate(() => [...document.querySelectorAll('img')].some(i => /house_isibindi_v2/.test(i.getAttribute('src')))));
  await page.click('#open-achievements-btn'); await page.waitForTimeout(300);
  await page.click('[data-ach-tab="trophies"]'); await page.waitForTimeout(300);
  ok('Achievements (mastery medals) still opens and switches tabs', (await page.evaluate(() => window.__STATE.achievementsTab)) === 'trophies');
  ok('no page errors (claims ON run)', page.__errs.length === 0, page.__errs.join(' | '));
  await page.context().close();

  // ───── Layouts: Chromebook / tablet / phone ─────
  for (const [w, h, tag] of [[1366, 768, 'chromebook'], [820, 1180, 'tablet'], [390, 844, 'phone']]) {
    page = await mk(true, { width:w, height:h });
    await go(page, 102, 'heros-journey');
    ok(`${tag}: Hero's Journey has no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${OUT}/hj-${tag}.png` });
    await go(page, 102);
    ok(`${tag}: hub has no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.evaluate(() => document.querySelector('.hj-hub')?.scrollIntoView({ block:'center' })); await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/hub-${tag}.png` });
    await page.context().close();
  }
  } catch (e) { R.push('ERROR ' + e.message.split('\n')[0]); }
  console.log(R.join('\n')); await b.close();
})();
