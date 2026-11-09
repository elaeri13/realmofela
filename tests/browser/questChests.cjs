// Quest Chests & potions — browser checks (in-memory database; fictional students; no live data).
// Run: npm run test:browser
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const PORT = Number(process.env.QC_PORT || 5293);
let pass = 0, fail = 0;
const check = (n, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : '  — ' + extra}`); };
const st = x => Object.assign({ claimed: true, characterName: 'Hero', avatarClass: 'wizard', avatar: 'avatar_elf_01_tan_female.png', completedLand0: true, currentLand: 2, land2Entry: { seen: true }, level: 2, xp: 10, xpNext: 50, gold: 20, pinSet: true, customPin: '1111', house: 'amistad', houseConfirmed: true, levelCelebratedThrough: 2 }, x);
const past = '2026-01-01';
const OLD = '2026-01-02T10:00:00', FUTURE = '2099-01-01T10:00:00';
const ready4 = { 4: { wayground: [true], exitTicketOpened: [true] } };
const SEED = {
  settings: { lessonSchedule: { 2: { 2: { releaseDate: past }, 3: { releaseDate: past }, 4: { releaseDate: past } } },
    tileLinks: { 2: { 3: { pear: 'https://app.peardeck.com/student/s3' }, 4: { wayground: 'https://wayground.com/join?gc=4', pear: 'https://app.peardeck.com/student/s4' } } } },
  students: {
    101: st({ currentTile: 4, completedTiles: [1, 2, 3] }),
    // main student: finished S2/S3 BEFORE launch; owns retired potions, a pet, a collectible, materials
    201: st({ currentTile: 4, completedTiles: [1, 2, 3], taskProgress: ready4, taskTimestamps: { 2: { completedAt: OLD }, 3: { completedAt: OLD } },
      items: ['health_potion', 'health_potion', 'behavior_potion', 'stamina_potion', 'gold_pouch'], companions: ['001-cat.png'], equipInventory: ['old_acc'], materials: 2, materialSlots: { gem: 2 } }),
    202: st({ currentTile: 4, completedTiles: [1, 2, 3], taskProgress: ready4 }),                 // will choose "Needs More Practice"
    203: st({ currentTile: 4, completedTiles: [1, 2] }),                                          // missed S3 → catch-up
    // self-repair cases (completed after launch): S4 pass recorded but chest missing; S3 failed; S2 completed with no outcome
    204: st({ currentTile: 5, completedTiles: [1, 2, 3, 4], taskTimestamps: { 2: { completedAt: FUTURE }, 3: { completedAt: FUTURE }, 4: { completedAt: FUTURE } },
      taskProgress: { 3: { outcomeRecorded: [true], outcomeFail: [true] }, 4: { outcomeRecorded: [true], outcomeFail: [false], exitTicketOpened: [true] } } }),
    205: st({ currentTile: 5, completedTiles: [1, 2, 3, 4] }),                                    // Writer's Craft
    206: st({ currentTile: 50, completedTiles: [1, 2, 3, 4, 5] }),                                // Study Hall
    207: st({ currentTile: 4, completedTiles: [1, 2, 3], taskProgress: ready4 }),                 // chest write interrupted
  },
};
(async () => {
  const vite = spawn(path.join(ROOT, 'node_modules/.bin/vite'), ['--config', path.join(__dirname, 'harness/vite.config.mjs')], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.route('https://app.peardeck.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: 'stub' }));
    const page = await ctx.newPage();
    ctx.on('page', p => { if (p !== page) p.close().catch(() => {}); });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(s => { window.__SEED = s; try { localStorage.setItem('realm-reduce-motion', '0'); } catch (e) {} }, SEED);
    await page.goto(`http://127.0.0.1:${PORT}/`); await page.waitForTimeout(2500);
    const stu = id => page.evaluate(id => JSON.parse(JSON.stringify(window.__tree.students[id])), id);
    const chests = async id => Object.keys((await stu(id)).questChests || {}).sort();
    const as = async (id, screen = 'hub') => { await page.evaluate(([id, screen]) => { const S = window.__STATE; S.lessonPreview = false; S.student = { id, number: id, cohort: Math.floor(id / 100), pin: 'x' }; S.cu3 = null; S.screen = screen; window.__mount(); }, [id, screen]); await page.waitForTimeout(400); };
    const openTile = async tid => { await as(Number(await page.evaluate(() => window.__STATE.student.id)), 'quest-map'); await page.evaluate(t => document.querySelector(`.lm-svg-wrap svg [data-tid="${t}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), tid); await page.waitForTimeout(400); };
    const waitFor = async (fn, ms = 8000) => { for (let i = 0; i < ms / 100; i++) { if (await fn()) return true; await page.waitForTimeout(100); } return false; };
    const clearOverlays = () => page.evaluate(() => document.querySelectorAll('.qc-overlay, .xp-celebrate, .gold-toast, .companion-reveal-overlay, .mystery-reveal-overlay').forEach(e => e.remove()));
    const resetInit = () => page.evaluate(() => { window.__STATE.qcInitFor = null; });
    const land2 = 'window.__LANDS.find(l => l.id === 2)';
    // first hub visit: wait for the Welcome Chest (and its card), then put it aside like "Save for later"
    const firstVisit = async id => { await as(id); await waitFor(async () => !!((await stu(id)).questChests || {}).welcome); await waitFor(async () => !!(await page.$('#qc-earned')), 3000); await page.waitForTimeout(300); await clearOverlays(); await page.waitForTimeout(500); };

    // ── Launch, potion upgrade, Welcome Chest (student 201) ──
    await as(201); await waitFor(async () => !!(await page.$('#qc-upgrade')));
    let s = await stu(201);
    check('launch time saved once for the Realm', !!(await page.evaluate(() => window.__tree.settings.questChests && window.__tree.settings.questChests.launchAt)));
    check('retired potions upgraded (Health→Fortune, Mana→Insight, Focus→Luck), quantities and order kept',
      JSON.stringify(s.items) === JSON.stringify(['potion_fortune', 'potion_fortune', 'potion_insight', 'potion_luck', 'gold_pouch']), JSON.stringify(s.items));
    check('students see a short "potions upgraded" message', /4 old potions were upgraded/.test(await page.textContent('#qc-upgrade')));
    await page.click('#qc-upgrade [data-qc="ok"]');
    check('Silver Welcome Chest offered', await waitFor(async () => !!(await page.$('#qc-earned'))) && /Silver Quest Chest/.test(await page.textContent('#qc-earned')));
    check('welcome chest only — no retroactive chests for lessons finished before launch', JSON.stringify(await chests(201)) === '["welcome"]' && (await stu(201)).questChests.welcome.tier === 'silver');
    await page.click('#qc-earned [data-qc="later"]'); await page.waitForTimeout(300);
    check('"Save for later": the chest waits in the existing Inventory panel', /1 to open/.test(await page.textContent('#qc-shelf')));
    await resetInit(); await as(201); await page.waitForTimeout(1200);
    s = await stu(201);
    check('visiting again: no second upgrade, no second Welcome Chest', JSON.stringify(await chests(201)) === '["welcome"]' && s.items.length === 5 && !(await page.$('#qc-upgrade')));

    // ── Open with three taps ──
    const before = await stu(201);
    await page.click('[data-open-chest="welcome"]'); await page.waitForTimeout(300);
    check('opening screen: tap the chest 3 times, or Quick Open', !!(await page.$('#qc-tap')) && !!(await page.$('[data-qc="quick"]')) && /Tap the chest 3 times/.test(await page.textContent('#qc-hint')));
    await page.click('#qc-tap'); await page.waitForTimeout(150);
    check('tap 1: wiggle, nothing opened yet', /wiggling/.test(await page.textContent('#qc-hint')) && !(await stu(201)).questChests.welcome.openedAt);
    await page.click('#qc-tap'); await page.waitForTimeout(150); await page.click('#qc-tap');
    await waitFor(async () => !!(await page.$('#qc-prizes, .companion-reveal-overlay, .mystery-reveal-overlay')));
    if (await page.$('.companion-reveal-overlay')) await page.click('.companion-reveal-btn');
    if (await page.$('.mystery-reveal-overlay')) await page.evaluate(() => document.querySelector('.mystery-reveal-overlay button').click());
    await waitFor(async () => !!(await page.$('#qc-prizes')));
    s = await stu(201);
    const wres = s.questChests.welcome.results || [];
    check('tap 3 opens it: chest marked opened together with its contents', !!s.questChests.welcome.openedAt && wres.length >= 1);
    check('every chest contains something (prize listed)', (await page.$$('#qc-prizes li')).length === wres.length && wres.length >= 1);
    const goldGain = wres.filter(x => x.kind === 'gold').reduce((a, x) => a + x.amount, 0);
    check('contents added exactly once to the existing inventory fields', s.gold === before.gold + goldGain
      && s.items.length === before.items.length + wres.filter(x => x.kind === 'potion').length
      && (s.materials || 0) === (before.materials || 0) + wres.filter(x => x.kind === 'material').reduce((a, x) => a + x.n, 0));
    check('previously owned companions, collectibles and materials untouched', s.companions.includes('001-cat.png') && s.equipInventory.includes('old_acc') && s.materialSlots.gem >= 2);
    await page.click('[data-qc="done"]');
    const again = await page.evaluate(() => window.__qc.openQuestChest(window.__STATE.student, 'welcome'));
    check('opening the same chest again gives nothing more', again.already === true && (await stu(201)).gold === s.gold);

    // ── Potions: one active of each type ──
    await as(201);
    const n0 = (await stu(201)).items.filter(i => i === 'potion_insight').length;
    await page.click('[data-use-item="potion_insight"]'); await page.waitForTimeout(500);
    s = await stu(201);
    check('Insight Potion: tap to use → active, one taken from the bag', !!(s.activeBoosts || {}).xp && s.items.filter(i => i === 'potion_insight').length === n0 - 1 && /Insight/.test(await page.textContent('#qc-active')));
    const okSecond = await page.evaluate(() => window.__qc.armPotion(window.__STATE.student, 'potion_fortune'));
    s = await stu(201);
    if (!s.items.includes('potion_insight')) {
      const extra = await page.evaluate(() => window.__qc.armPotion(window.__STATE.student, 'potion_insight'));
      check('a second Insight cannot be armed while one is active', extra === false);
    } else {
      const extra = await page.evaluate(() => window.__qc.armPotion(window.__STATE.student, 'potion_insight'));
      check('a second Insight cannot be armed while one is active', extra === false && (await stu(201)).items.filter(i => i === 'potion_insight').length === s.items.filter(i => i === 'potion_insight').length);
    }
    check('Fortune armed too (different type)', okSecond === true && !!(await stu(201)).activeBoosts.gold);

    // ── Lesson pass: base XP/Gold kept, potions double the BASE once, chest earned, old drops gone ──
    await clearOverlays();
    const b4 = await stu(201);
    await openTile(4);
    await page.click('#ls-outcome-pass'); await page.waitForTimeout(400);
    await waitFor(async () => !!((await stu(201)).questChests || {})['2_4']);
    s = await stu(201);
    const ch4 = s.questChests['2_4'];
    check('successful lesson earns exactly one chest for that session', !!ch4 && ch4.source === 'lesson');
    check('base +5 XP / +5 Gold kept; Insight & Fortune add 2× BASE once (+5/+5)', s.xp === b4.xp + 10 && s.gold === b4.gold + 10 && ch4.boosts.xp === 5 && ch4.boosts.gold === 5, `xp ${b4.xp}→${s.xp}, gold ${b4.gold}→${s.gold}`);
    check('potions used up', !s.activeBoosts || (!s.activeBoosts.xp && !s.activeBoosts.gold));
    check('old after-lesson drops removed: no companion, material or Mystery Drop outside the chest', JSON.stringify(s.companions) === JSON.stringify(b4.companions) && (s.materials || 0) === (b4.materials || 0) && JSON.stringify(s.equipInventory) === JSON.stringify(b4.equipInventory));
    check('chest card appears after the XP/Gold celebration', await waitFor(async () => !!(await page.$('#qc-earned')), 9000));
    await clearOverlays();
    const dup = await page.evaluate(`window.__qc.earnQuestChest(window.__STATE.student, ${land2}, ${land2}.tiles.find(t => t.id === 4), { source: 'lesson', base: { xp: 5, gold: 5 } })`);
    check('repeat / double click / refresh cannot create a second chest for the session', dup === null && (await chests(201)).filter(k => k === '2_4').length === 1);

    // ── Quick Open, multiple devices, interrupted writes ──
    await as(201);
    await page.click('[data-open-chest="2_4"]'); await page.waitForTimeout(200);
    await page.click('[data-qc="quick"]');
    check('⚡ Quick Open skips the animation and shows the prize list', await waitFor(async () => !!(await page.$('#qc-prizes'))) && !(await page.$('.companion-reveal-overlay')));
    await page.click('[data-qc="done"]');
    // two devices / double click at the same moment
    await page.evaluate(`window.__qc.earnQuestChest(window.__STATE.student, null, null, { key: 'race', source: 'test', useBoosts: false })`);
    const g0 = (await stu(201)).gold, i0 = (await stu(201)).items.length, m0 = (await stu(201)).materials || 0, c0 = (await stu(201)).companions.length;
    const both = await page.evaluate(() => Promise.all([window.__qc.openQuestChest(window.__STATE.student, 'race'), window.__qc.openQuestChest(window.__STATE.student, 'race')]));
    s = await stu(201);
    const rr = s.questChests.race.results;
    check('two opens at the same moment: exactly one pays', both.filter(x => x.ok).length === 1 && both.filter(x => x.already).length === 1);
    check('…and it pays exactly once', s.gold === g0 + rr.filter(x => x.kind === 'gold').reduce((a, x) => a + x.amount, 0)
      && s.items.length === i0 + rr.filter(x => x.kind === 'potion').length && (s.materials || 0) === m0 + rr.filter(x => x.kind === 'material').reduce((a, x) => a + x.n, 0)
      && s.companions.length === c0 + rr.filter(x => x.kind === 'companion').length);
    // another device already opened it, this device still shows it as unopened
    await page.evaluate(`window.__qc.earnQuestChest(window.__STATE.student, null, null, { key: 'stale', source: 'test', useBoosts: false })`);
    await page.evaluate(() => { window.__tree.students['201'].questChests.stale.openedAt = 'other-device'; window.__tree.students['201'].questChests.stale.results = []; });
    const gs = (await stu(201)).gold;
    const stale = await page.evaluate(() => window.__qc.openQuestChest(window.__STATE.student, 'stale'));
    check('a device with an out-of-date screen cannot open a chest twice', stale.already === true && (await stu(201)).gold === gs);
    // interrupted open → nothing written; retry pays once
    await page.evaluate(`window.__qc.earnQuestChest(window.__STATE.student, null, null, { key: 'flaky', source: 'test', useBoosts: false })`);
    await as(201);
    const pre = JSON.stringify(await stu(201));
    await page.evaluate(() => { window.__failTx = 1; });
    await page.click('[data-open-chest="flaky"]'); await page.waitForTimeout(200); await page.click('[data-qc="quick"]'); await page.waitForTimeout(600);
    check('interrupted open: friendly message, nothing saved, chest still unopened', /Couldn't open it/.test(await page.textContent('#qc-hint')) && JSON.stringify(await stu(201)) === pre);
    await page.click('[data-qc="quick"]');
    await waitFor(async () => !!(await page.$('#qc-prizes')));
    s = await stu(201);
    check('retry after the interruption opens it once', !!s.questChests.flaky.openedAt && (await page.$$('#qc-prizes li')).length === s.questChests.flaky.results.length);
    await page.click('[data-qc="done"]');
    // interrupted earn → the lesson's base reward is saved; the missing chest is restored by self-repair
    await clearOverlays();
    const b7 = await stu(207);
    await firstVisit(207);   // first visit: welcome chest
    await page.evaluate(() => { window.__failTx = 1; });
    await openTile(4); await page.click('#ls-outcome-pass'); await page.waitForTimeout(1500);
    s = await stu(207);
    check('interrupted chest write: base XP/Gold still saved, chest not created yet', !s.questChests['2_4'] && s.xp >= b7.xp + 5 && s.completedTiles.includes(4));
    await clearOverlays(); await resetInit(); await as(207); await waitFor(async () => !!((await stu(207)).questChests || {})['2_4']);
    s = await stu(207);
    check('self-repair restores the missing chest (once, no potion effects)', !!s.questChests['2_4'] && s.questChests['2_4'].source === 'repair' && !s.questChests['2_4'].boosts);
    await clearOverlays();

    // ── No chest for failed attempts ──
    await firstVisit(202);
    await openTile(4); await page.click('#ls-outcome-fail'); await page.waitForTimeout(1200);
    await clearOverlays(); await resetInit(); await as(202); await page.waitForTimeout(1200);
    check('"Needs More Practice": no chest, not even from self-repair', !((await stu(202)).questChests || {})['2_4'] && (await stu(202)).completedTiles.includes(4));
    await clearOverlays();

    // ── Self-repair only with a clearly established success after launch ──
    await as(204); await waitFor(async () => !!((await stu(204)).questChests || {})['2_4']);
    const c204 = await chests(204);
    check('self-repair: recorded pass after launch → chest restored', c204.includes('2_4'));
    check('self-repair: failed attempt (S3) and completed-tile-only (S2) → no chest', !c204.includes('2_3') && !c204.includes('2_2'));
    await clearOverlays();

    // ── Catch-up earns the session chest once (Pear report, not just opening the link) ──
    await firstVisit(203);
    await openTile(3);
    // works with the one-page layout (#22) and the three-step layout (#23)
    if (await page.$('[data-cu6-go="practice"]')) { await page.click('[data-cu6-go="practice"]'); await page.waitForTimeout(150); }
    for (const [k, v] of Object.entries({ q1: 2, q2: 1, q3: 3, q4: 0 })) {
      const sel = `[data-cu3-part="${k}"][data-cu3-choice="${v}"]`;
      for (let i = 0; i < 4 && !(await page.$(sel)); i++) { await page.click(`[data-cu6-q="${i}"]`); await page.waitForTimeout(120); }
      await page.click(sel); await page.waitForTimeout(80);
    }
    if (!(await page.$('[data-cu2="grade"]')) && await page.$('[data-cu6-q="3"]')) { await page.click('[data-cu6-q="3"]'); await page.waitForTimeout(120); }
    await page.click('[data-cu2="grade"]'); await page.waitForTimeout(400);
    await page.click('[data-cu4-open]'); await page.waitForTimeout(700);
    check('opening the Pear link does NOT earn a chest', !((await stu(203)).questChests || {})['2_3']);
    await page.click('[data-cu2="reportPear"]');
    await waitFor(async () => !!((await stu(203)).questChests || {})['2_3']);
    check('catch-up completion (Pear reported) earns the session chest', ((await stu(203)).questChests['2_3'] || {}).source === 'catchUp');
    const dupCu = await page.evaluate(`window.__qc.earnQuestChest(window.__STATE.student, ${land2}, ${land2}.tiles.find(t => t.id === 3), { source: 'lesson' })`);
    check('the same session can never earn a second chest (lesson after catch-up)', dupCu === null);
    await clearOverlays();

    // ── Writer's Craft yes, Study Hall no ──
    await firstVisit(205);
    const b5 = await stu(205);
    await openTile(5); await page.click('#ls-submit'); await waitFor(async () => !!((await stu(205)).questChests || {})['2_5']);
    s = await stu(205);
    check("Writer's Craft earns a chest and records a clear success marker", !!s.questChests['2_5'] && ((s.taskProgress || {})[5] || {}).submitted[0] === true);
    check("Writer's Craft: base XP kept, no separate random drops", s.xp >= b5.xp + 5 && JSON.stringify(s.companions || []) === JSON.stringify(b5.companions || []) && (s.materials || 0) === (b5.materials || 0));
    await clearOverlays();
    await firstVisit(206);
    const b6 = await stu(206);
    await openTile(50); await page.click('#sh-complete-btn'); await page.waitForTimeout(1200);
    s = await stu(206);
    check('Study Hall: no chest (its own XP reward unchanged)', !(s.questChests || {})['2_50'] && s.xp !== b6.xp);
    await clearOverlays();

    // ── Special pet moments use the existing reveals (fixed prizes so this always runs) ──
    for (const [key, kind, sel] of [['petcheck', 'companion', '.companion-reveal-overlay'], ['mysterycheck', 'mystery', '.mystery-reveal-overlay']]) {
      await as(201); await page.waitForTimeout(200);
      await page.evaluate(key => window.__qc.earnQuestChest(window.__STATE.student, null, null, { key, source: 'test', useBoosts: false }), key);
      await page.evaluate(([key, kind]) => {      // fix the prize so the reveal always happens
        const p = window.__qc.pools('The Stone Kingdoms'); const own = window.__tree.students['201'].companions || [];
        const cands = (kind === 'mystery' ? p.mystery : p.companions.common).filter(f => !own.includes(f));
        window.__tree.students['201'].questChests[key] = { tier: kind === 'mystery' ? 'legendary' : 'wooden', source: 'test', earnedAt: 'x',
          prize: { kind, pool: 'common', candidates: cands }, fallback: { kind: 'potion', id: 'potion_luck' } };
      }, [key, kind]);
      await as(201); await page.waitForTimeout(300); await clearOverlays();
      await page.evaluate(() => localStorage.setItem('realm-reduce-motion', '0'));
      await page.click(`[data-open-chest="${key}"]`); await page.waitForTimeout(200);
      await page.click('#qc-tap'); await page.click('#qc-tap'); await page.click('#qc-tap');
      const shown = await waitFor(async () => !!(await page.$(sel)));
      check(`${kind === 'mystery' ? 'Legendary Mystery pet' : 'pet'} prize: the existing ${kind === 'mystery' ? 'Mystery' : 'companion'} reveal plays`, shown);
      if (await page.$('.companion-reveal-btn')) await page.click('.companion-reveal-btn');
      if (await page.$('.mystery-reveal-overlay')) await page.evaluate(() => document.querySelector('.mystery-reveal-overlay button').click());
      check(`…then the prize list, and the pet is in the existing companions list`, await waitFor(async () => !!(await page.$('#qc-prizes')))
        && (await stu(201)).companions.includes((await stu(201)).questChests[key].results[0].file));
      await page.click('[data-qc="done"]');
    }

    // ── Shared device: a chest card never stays up for the next person ──
    await as(205); await page.waitForTimeout(400); await clearOverlays();
    await page.click('[data-open-chest="2_5"]'); await page.waitForTimeout(300);
    check('chest screen open for student 205', !!(await page.$('#qc-opener')));
    await as(206); await page.waitForTimeout(400);
    check('another student signs in → 205’s chest screen closes; the chest stays unopened in 205’s inventory', !(await page.$('#qc-opener')) && !(await stu(205)).questChests['2_5'].openedAt);
    await clearOverlays();

    // ── Reduced motion + phone layout ──
    await page.setViewportSize({ width: 390, height: 844 });
    await as(206); await page.waitForTimeout(800); await clearOverlays();
    await page.click('[data-open-chest="welcome"]'); await page.waitForTimeout(300);
    await page.check('#qc-rm');
    check('Reduce motion switch remembered and applied', await page.evaluate(() => localStorage.getItem('realm-reduce-motion')) === '1' && !!(await page.$('.qc-overlay.qc-rm')));
    check('phone: chest screen fits (no sideways scroll)', await page.evaluate(() => [...document.querySelectorAll('.qc-overlay *')].every(e => e.getBoundingClientRect().right <= window.innerWidth + 1)));
    await page.screenshot({ path: path.join(require('os').tmpdir(), 'qc-phone-open.png') });
    await page.click('#qc-tap'); await page.click('#qc-tap'); await page.click('#qc-tap');
    check('reduced motion: goes straight to the prize list (no reveal animation)', await waitFor(async () => !!(await page.$('#qc-prizes'))) && !(await page.$('.companion-reveal-overlay')));
    await page.screenshot({ path: path.join(require('os').tmpdir(), 'qc-phone-prizes.png') });
    check('no page errors', errs.length === 0, errs.join(' | '));
  } finally { await browser.close(); vite.kill(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
