// Test-data helper for browser suites that are NOT about Quest Chests: mark every fictional student as
// already welcomed (Welcome Chest opened, potions already upgraded) and set the chest launch time in the
// future, so the one-time chest pop-ups don't cover the screens those suites click through.
function withoutChestPopups(seed) {
  const s = JSON.parse(JSON.stringify(seed));
  s.settings = Object.assign({}, s.settings, { questChests: { launchAt: '2999-01-01T00:00:00' } });
  Object.values(s.students || {}).forEach(st => {
    st.potionsUpgradedAt = st.potionsUpgradedAt || 'test';
    st.questChests = Object.assign({ welcome: { tier: 'silver', source: 'welcome', earnedAt: 'test', openedAt: 'test', results: [] } }, st.questChests || {});
  });
  return s;
}
module.exports = { withoutChestPopups };
