// ============================================================
// BOOT — loaded last, after every other script has defined itself.
// ============================================================

buildGenerators();
$('chant').addEventListener('click', chant);
$('summon').addEventListener('click', () => startSummon());
$('steady').addEventListener('click', steadyMind);
$('buy-mode').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]'); if (!b) return;
  state.buyMode = b.dataset.buy === 'max' ? 'max' : Number(b.dataset.buy);
});
$('generators').addEventListener('click', e => {
  const b = e.target.closest('[data-gen]'); if (b) buyGenerator(b.dataset.gen);
});
$('upgrades').addEventListener('click', e => {
  const b = e.target.closest('[data-upg]'); if (b) buyUpgrade(b.dataset.upg);
});
$('pacts').addEventListener('click', e => {
  const b = e.target.closest('[data-pact]'); if (b) buyPact(b.dataset.pact);
});
$('save-btn').addEventListener('click', () => { save(); log('Your progress is etched into memory.'); });
$('reset-btn').addEventListener('click', reset);

// Offline progress is handled automatically: first tick uses the saved lastTick.
const away = (Date.now() - state.lastTick) / 1000;
if (away > 10 && wps() > 0) log(`While you slept, your followers whispered ${fmt(wps() * away)} times.`);

setInterval(tick, 50);
setInterval(save, 10000);
window.addEventListener('beforeunload', save);
tick();
