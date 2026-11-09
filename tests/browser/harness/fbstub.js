// In-memory Firebase stand-in for browser tests only: no network, no real database.
// Seed data comes from window.__SEED; every write is recorded in window.__writes.
const tree = JSON.parse(JSON.stringify(window.__SEED || {}));
const listeners = [];
window.__writes = [];
window.__tree = tree;
const parts = p => String(p || '').split('/').filter(Boolean);
const getAt = p => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), tree);
const setAt = (p, v) => { const ks = parts(p); let o = tree; ks.slice(0, -1).forEach(k => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }); if (v === null || v === undefined) delete o[ks[ks.length-1]]; else o[ks[ks.length-1]] = JSON.parse(JSON.stringify(v)); };
const snap = p => { const v = getAt(p); return { exists: () => v !== undefined && v !== null, val: () => (v === undefined ? null : JSON.parse(JSON.stringify(v))) }; };
const notify = () => listeners.forEach(l => l.cb(snap(l.path)));
export const db = {}; export const auth = {};
export const ref = (_db, path) => ({ path: path || '' });
export const query = r => r; export const limitToLast = () => null;
export const signInAnonymously = async () => ({});
export const get = async r => snap(r.path);
export const set = async (r, v) => { window.__writes.push(['set', r.path, v]); setAt(r.path, v); setTimeout(notify, 0); };
export const update = async (r, obj) => { window.__writes.push(['update', r.path, obj]); Object.entries(obj).forEach(([k, v]) => setAt((r.path ? r.path + '/' : '') + k, v)); setTimeout(notify, 0); };
export const push = (r, v) => { const k = 'k' + Date.now() + Math.random().toString(36).slice(2, 6); if (v !== undefined) setAt(r.path + '/' + k, v); return { key: k, path: r.path + '/' + k }; };
export const onValue = (r, cb) => { listeners.push({ path: r.path, cb }); setTimeout(() => cb(snap(r.path)), 0); return () => {}; };
export const off = () => {};
// Atomic like Firebase: reads the stored value, applies fn, commits unless fn returns undefined.
export const runTransaction = async (r, fn) => {
  // test hook: make the next N transactions fail like a dropped connection (nothing is written)
  if (window.__failTx > 0) { window.__failTx--; throw new Error('injected network failure'); }
  const cur = getAt(r.path);
  const nv = fn(cur === undefined ? null : JSON.parse(JSON.stringify(cur)));
  if (nv === undefined) return { committed: false, snapshot: snap(r.path) };
  window.__writes.push(['tx', r.path, nv]); setAt(r.path, nv); setTimeout(notify, 0);
  return { committed: true, snapshot: snap(r.path) };
};
