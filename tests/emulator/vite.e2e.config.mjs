// Test-only Vite config: exposes app state to the browser test. Never used for real builds.
const EXPOSE = `
window.__STATE = STATE; window.__mount = mount; window.__CLASS = () => CLASS_DATA; window.__ov = () => _overrides;
window.__db = db; window.__ref = ref; window.__set = set;
`;
export default ({
  root: new URL('../..', import.meta.url).pathname,
  cacheDir: new URL('../../node_modules/.vite-e2e', import.meta.url).pathname,
  server: { port: 5299, strictPort: true, host: '127.0.0.1' },
  plugins: [{ name: 'expose', enforce: 'pre', transform(code, id) { if (id.endsWith('/src/main.js')) return code + EXPOSE; } }],
});
