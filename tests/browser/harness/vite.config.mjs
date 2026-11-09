// Test-only Vite config: swaps the real Firebase client for an in-memory stand-in and exposes app
// state to the browser tests. Never used for real builds.
const here = new URL('.', import.meta.url).pathname;
const EXPOSE = `
window.__STATE = STATE; window.__mount = mount; window.__LANDS = LANDS;
window.__bind = bindEvents; window.__pageHtml = renderLessonStopPage;   // lesson-release bypass test
`;
export default ({
  root: new URL('../../..', import.meta.url).pathname,
  cacheDir: new URL('../../../node_modules/.vite-browser-tests', import.meta.url).pathname,
  server: { port: Number(process.env.PORT || 5199), strictPort: true, host: '127.0.0.1' },
  plugins: [{
    name: 'browser-test-harness', enforce: 'pre',
    resolveId(id) { if (id.endsWith('firebaseClient.js')) return here + 'fbstub.js'; },
    transform(code, id) { if (id.endsWith('/src/main.js')) return code + EXPOSE; },
  }],
});
