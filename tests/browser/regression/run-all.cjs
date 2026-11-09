// Runs every regression suite in this folder against one test server (Vite + in-memory database).
// Fictional students only — no live data.   Run: npm run test:regression
// Optional: node tests/browser/regression/run-all.cjs catchUpSession2   (run only matching suites)
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '../../..');
const PORT = Number(process.env.REG_PORT || 5294);
const only = process.argv.slice(2);
const suites = fs.readdirSync(__dirname).filter(f => f.endsWith('.cjs') && f !== 'run-all.cjs')
  .filter(f => !only.length || only.some(o => f.includes(o))).sort();
(async () => {
  const vite = spawn(path.join(ROOT, 'node_modules/.bin/vite'), ['--config', path.join(__dirname, '../harness/vite.regression.config.mjs')],
    { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { try { await fetch(`http://127.0.0.1:${PORT}/`); up = true; } catch { await new Promise(r => setTimeout(r, 500)); } }
  if (!up) { console.error('Test server did not start'); vite.kill(); process.exit(1); }
  let bad = 0;
  const rows = [];
  try {
    for (const f of suites) {
      const r = spawnSync(process.execPath, [path.join(__dirname, f)], {
        cwd: ROOT, encoding: 'utf8', timeout: 10 * 60 * 1000,
        env: { ...process.env, REG_BASE: `http://127.0.0.1:${PORT}/`, REG_OUT: process.env.REG_OUT || require('os').tmpdir() } });
      const out = (r.stdout || '') + (r.stderr || '');
      const pass = (out.match(/^PASS/gm) || []).length, fail = (out.match(/^FAIL/gm) || []).length, skip = (out.match(/^SKIP/gm) || []).length;
      const crashed = r.status !== 0 && !fail && /Error/.test(out);
      if (fail || crashed) { bad++; out.split('\n').filter(l => /^FAIL|Error/.test(l)).slice(0, 6).forEach(l => console.log(`   ${f}: ${l}`)); }
      rows.push(`${fail || crashed ? 'FAIL' : 'ok  '}  ${f.padEnd(22)} ${pass} passed, ${fail} failed${skip ? `, ${skip} skipped` : ''}${crashed ? ' (crashed)' : ''}`);
    }
  } finally { vite.kill(); }
  console.log('\n' + rows.join('\n'));
  console.log(`\n${suites.length - bad}/${suites.length} regression suites passed`);
  process.exit(bad ? 1 : 0);
})();
