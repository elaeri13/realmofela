// Test-only Vite config for tests/browser/regression/*: the same in-memory Firebase stand-in as
// vite.config.mjs, plus the extra app hooks those suites use. Never used for real builds.
const here = new URL('.', import.meta.url).pathname;
const EXPOSE = `
window.__STATE = STATE; window.__mount = mount; window.__LANDS = LANDS; window.__LANDSX = LANDS;
window.__CLASS = () => CLASS_DATA;
window.__upd = updateBossStateOnTileComplete; window.__acc = applyAcceptedCatchUpBoss;
window.__grant = grantCatchUpRewardOnce; window.__runCU = runCatchUpAction;
window.__awardXP = (typeof awardXP !== "undefined") ? awardXP : undefined;
window.__claim = (typeof claimLevelReward !== "undefined") ? claimLevelReward : undefined;
window.__isCosmeticUnlocked = (typeof isCosmeticUnlocked !== "undefined") ? isCosmeticUnlocked : undefined;
window.__COSMETICS = (typeof COSMETICS_MANIFEST !== "undefined") ? COSMETICS_MANIFEST : undefined;
`;
export default ({
  root: new URL('../../..', import.meta.url).pathname,
  cacheDir: new URL('../../../node_modules/.vite-regression-tests', import.meta.url).pathname,
  server: { port: Number(process.env.PORT || 5294), strictPort: true, host: '127.0.0.1' },
  plugins: [{
    name: 'regression-test-harness', enforce: 'pre',
    resolveId(id) { if (id.endsWith('firebaseClient.js')) return here + 'fbstub.js'; },
    transform(code, id) { if (id.endsWith('/src/main.js')) return code + EXPOSE; },
  }],
});
