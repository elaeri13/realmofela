// Browser test of the whole app in secure mode, against local emulators only:  npm run test:e2e
const ROOT = require('path').join(__dirname, '../..');
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const NS = '?ns=demo-realm', DB = 'http://127.0.0.1:9000', H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const dbGet = async p => (await fetch(`${DB}/${p}.json${NS}`, { headers: H })).json();
const dbPut = (p, v) => fetch(`${DB}/${p}.json${NS}`, { method: 'PUT', headers: H, body: JSON.stringify(v) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`); };
const base = x => Object.assign({ claimed: true, characterName: 'Hero', avatar: 'avatar_elf_01_tan_female.png', avatarClass: 'elf', completedLand0: true, currentLand: 1, currentTile: 3, completedTiles: [1, 2], house: 'isibindi', houseConfirmed: true, xpNext: 50, levelCelebratedThrough: 6 }, x);

(async () => {
  await dbPut('', {
    settings: { collabQuestsEnabled: false },
    students: {
      101: base({ characterName: 'Kai', level: 6, xp: 10, gold: 100, pinSet: true, customPin: '1111', companions: [], equipInventory: [] }),
      102: base({ characterName: 'Mira', level: 2, gold: 7 }),
      103: base({ characterName: 'Juno', level: 1, gold: 999 }),
    },
  });
  const su = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'odom@example.test', password: 'teacher-pass-123', returnSecureToken: true }) })).json();
  await dbPut(`admins/${su.localId}`, true);
  await sleep(1500); // directory trigger

  const vite = spawn(require('path').join(ROOT, 'node_modules/.bin/vite'), ['--config', __dirname + '/vite.e2e.config.mjs'], {
    cwd: ROOT, env: Object.assign({}, process.env, {
      VITE_SECURITY_MODE: 'secure', VITE_USE_EMULATORS: 'true', VITE_LEVEL_REWARD_CLAIMS: 'on',
      VITE_FIREBASE_API_KEY: 'demo-key', VITE_FIREBASE_PROJECT_ID: 'demo-realm', VITE_FIREBASE_AUTH_DOMAIN: 'demo-realm.firebaseapp.com',
      VITE_FIREBASE_DATABASE_URL: 'http://127.0.0.1:9000/?ns=demo-realm', VITE_FIREBASE_APP_ID: '1:1:web:1' }) });
  vite.stderr.on('data', d => process.stderr.write(d));
  for (let i = 0; i < 40; i++) { try { await fetch('http://127.0.0.1:5299/'); break; } catch { await sleep(500); } }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  const open = async () => { await page.goto('http://127.0.0.1:5299/'); await page.waitForFunction(() => window.__STATE && window.__STATE.screen === 'code', null, { timeout: 30000 }); };
  const pickStudent = async sid => page.evaluate(sid => { const S = window.__STATE; const p = window.__CLASS().periods.find(p => p.students.some(s => s.id === sid)); S.currentPeriod = p; S.student = p.students.find(s => s.id === sid); S.pin = ''; S.pinError = ''; S.screen = 'pin'; window.__mount(); }, sid);
  const typePin = async pin => { for (const d of pin) { await page.click(`[data-digit="${d}"]`); await sleep(60); } await sleep(2500); };
  const screen = () => page.evaluate(() => window.__STATE.screen);

  await open();
  const pre = await page.evaluate(() => ({ keys: Object.keys(window.__ov()), gold103: (window.__ov()['103'] || {}).gold, name103: (window.__ov()['103'] || {}).characterName }));
  check('before login: sees the directory (names) only', pre.name103 === 'Juno' && pre.gold103 === undefined, JSON.stringify(pre));

  await pickStudent(102); await typePin('9999');
  check('wrong PIN is rejected with the usual message', /Incorrect secret number/.test(await page.textContent('body')));
  await typePin('1002');
  check('default PIN → asked to choose a new PIN', (await screen()) === 'set-pin', await screen());
  for (const d of '4821') { await page.click(`[data-sp-digit="${d}"]`); await sleep(60); } await sleep(500);
  for (const d of '4821') { await page.click(`[data-sp-digit="${d}"]`); await sleep(60); } await sleep(2500);
  const pinRec = await dbGet('secure/pins/102');
  check('new PIN saved by the server as a hash', pinRec && pinRec.alg === 'scrypt' && !JSON.stringify(pinRec).includes('4821'));
  check('student enters the game after setting PIN', !['set-pin', 'pin', 'code'].includes(await screen()), await screen());
  const ownView = await page.evaluate(() => ({ own: window.__ov()['102'].gold, other: (window.__ov()['103'] || {}).gold }));
  check('student sees own Gold but not classmates’ Gold', ownView.own === 7 && ownView.other === undefined, JSON.stringify(ownView));
  const hack = await page.evaluate(async () => { try { await window.__set(window.__ref(window.__db, 'students/103/gold'), 0); return 'wrote'; } catch (e) { return 'denied'; } });
  check('student cannot change a classmate’s Gold from the browser console', hack === 'denied');
  const selfHack = await page.evaluate(async () => { try { await window.__set(window.__ref(window.__db, 'students/102/gold'), 99999); return 'wrote'; } catch (e) { return 'denied'; } });
  check('student cannot give themselves 99,999 Gold', selfHack === 'denied');
  const pinRead = await page.evaluate(async () => { try { const { get } = await import('/src/firebaseClient.js'); await get(window.__ref(window.__db, 'secure/pins/102')); return 'read'; } catch (e) { return 'denied'; } });
  check('student cannot read PIN hashes', pinRead === 'denied');

  // Fresh tab = signed out (session persistence); legacy custom PIN still works
  await ctx.clearCookies(); await open();
  await pickStudent(101); await typePin('1111');
  check('existing custom PIN still logs in', ['hub','land-travel'].includes(await screen()), await screen());
  check('legacy PIN converted to a hash on first login', ((await dbGet('secure/pins/101')) || {}).alg === 'scrypt');
  await page.evaluate(() => { window.__STATE.screen = 'heros-journey'; window.__mount(); }); await sleep(500);
  const claimBtn = await page.$('[data-claim-level="2"]');
  check('Hero’s Journey shows a Claim button for Level 2', !!claimBtn);
  if (claimBtn) { await claimBtn.click(); await sleep(3000); }
  const st101 = await dbGet('students/101');
  check('server claim: +25 Gold and record written', st101.gold === 125 && st101.levelRewards && st101.levelRewards['2'] && st101.levelRewards['2'].by === 'server', JSON.stringify({ g: st101.gold, lr: st101.levelRewards }));
  check('claim reveal shown to the student', /25 Gold/.test(await page.textContent('body')));
  const again = await page.evaluate(async () => { const { callFn } = await import('/src/firebaseClient.js'); try { await callFn('claimLevelReward', { level: 2 }); return 'claimed'; } catch (e) { return e.code; } });
  check('claiming the same level again is refused', again === 'functions/already-exists', again);
  await page.screenshot({ path: require('os').tmpdir() + '/realm-hj-secure.png' });

  // Teacher
  await ctx.clearCookies(); await open();
  await page.evaluate(() => { window.__STATE.screen = 'teacher-login'; window.__mount(); }); await sleep(300);
  check('teacher login asks for email + password', !!(await page.$('#email-inp')) && !!(await page.$('#pw-inp')));
  await page.fill('#email-inp', 'odom@example.test'); await page.fill('#pw-inp', 'TEACHER2026'); await page.click('#pw-btn'); await sleep(2000);
  check('old shared password no longer works', (await screen()) === 'teacher-login' && /Incorrect email or password/.test(await page.textContent('body')));
  await page.fill('#email-inp', 'odom@example.test'); await page.fill('#pw-inp', 'teacher-pass-123'); await page.click('#pw-btn'); await sleep(3500);
  check('teacher account opens the dashboard', (await screen()) === 'teacher-dash', await screen());
  const tview = await page.evaluate(() => ({ g103: (window.__ov()['103'] || {}).gold }));
  check('teacher sees full student records', tview.g103 === 999, JSON.stringify(tview));
  await page.screenshot({ path: require('os').tmpdir() + '/realm-teacher-secure.png' });
  await dbPut('students/103/customPin', '3333');
  const msgs = []; const onDlg = d => { msgs.push(d.message()); d.type() === 'prompt' ? d.accept('1') : d.accept(); };
  page.on('dialog', onDlg);
  await page.click('#t-security-btn'); await sleep(3000);
  page.off('dialog', onDlg);
  check('Security Setup "Prepare" secures legacy PINs and keeps the old copy', /PINs secured: 1/.test(msgs.join(' ')) && ((await dbGet('secure/pins/103')) || {}).alg === 'scrypt' && (await dbGet('students/103/customPin')) === '3333', msgs.join(' | '));
  const reset = await page.evaluate(async () => { const { callFn } = await import('/src/firebaseClient.js'); return callFn('resetStudentPins', { studentIds: ['102'] }); });
  check('teacher can reset a PIN', reset.count === 1 && (await dbGet('secure/pins/102')) === null);

  check('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); vite.kill();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
