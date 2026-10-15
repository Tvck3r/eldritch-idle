// ============================================================
// ADMIN — dev cheats. Toggle with the ` (backtick) key, or open
// the page with ?admin in the URL. Delete this file to remove it.
// ============================================================

(() => {
  const panel = document.createElement('div');
  panel.id = 'admin';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="title"><span>ADMIN</span><span class="sub">\` to toggle</span></div>
    <label>Whispers</label>
    <div class="grid">
      <button data-a="w3">+1K</button><button data-a="w6">+1M</button><button data-a="w9">+1B</button>
    </div>
    <label>Unlock</label>
    <div class="grid">
      <button data-a="gens">+10 all followers</button><button data-a="rites">All rites</button><button data-a="veil">Tear veil</button>
      <button data-a="favor">+10 Favor</button><button data-a="pacts">All pacts</button><button data-a="max">EVERYTHING</button>
    </div>
    <label>Watch</label>
    <div class="grid">
      <button data-a="preview">Summon anim</button><button data-a="event">Madness event</button><button data-a="blank">Fresh run</button>
      <button data-a="cosmetics">All vestments</button><button data-a="intro">Title screen</button><button data-a="wipe">Wipe save</button>
    </div>
    <label>Speed</label>
    <div class="grid">
      <button data-speed="1" class="on">1×</button><button data-speed="10">10×</button><button data-speed="100">100×</button>
    </div>
    <label>Sanity <span id="admin-san"></span></label>
    <input id="admin-sanity" type="range" min="0" max="100">
  `;
  document.body.appendChild(panel);

  const toggle = () => { panel.style.display = panel.style.display === 'none' ? '' : 'none'; };
  if (new URLSearchParams(location.search).has('admin')) toggle();
  window.addEventListener('keydown', e => { if (e.key === '`') toggle(); });

  const actions = {
    w3: () => earn(1e3),
    w6: () => earn(1e6),
    w9: () => earn(1e9),
    gens: () => GENERATORS.forEach(g => state.owned[g.id] += 10),
    rites: () => { state.upgrades = UPGRADES.map(u => u.id); },
    veil: () => earn(Math.max(0, VEIL_GOAL - state.totalEarned)),
    favor: () => { state.favor += 10; },
    pacts: () => { state.pacts = PACTS.map(p => p.id); },
    max: () => {
      GENERATORS.forEach(g => state.owned[g.id] = Math.max(state.owned[g.id], 30));
      state.upgrades = UPGRADES.map(u => u.id);
      state.pacts = PACTS.map(p => p.id);
      state.summonings = Math.max(state.summonings, 6);  // biggest Watcher
      state.favor += 20;
      earn(Math.max(0, VEIL_GOAL * 4 - state.totalEarned));
    },
    preview: () => startSummon(true),
    event: () => madnessEvent(),
    blank: () => { state = { ...freshState(), ...pick(state, PERSIST) }; },
    cosmetics: () => {
      for (const slot in COSMETICS) for (const o of COSMETICS[slot])
        if (!o.free && !isUnlocked(slot, o.id)) state.cosmetics.unlocked.push(`${slot}:${o.id}`);
      state.cosmetics.unseen = true;
    },
    intro: () => showIntro(),
    wipe: () => { localStorage.removeItem(SAVE_KEY); state = freshState(); location.reload(); },
  };

  panel.addEventListener('click', e => {
    const a = e.target.closest('[data-a]');
    if (a) { actions[a.dataset.a](); rebuildLists(); }
    const s = e.target.closest('[data-speed]');
    if (s) {
      timeScale = Number(s.dataset.speed);
      panel.querySelectorAll('[data-speed]').forEach(b => b.classList.toggle('on', b === s));
    }
  });

  const slider = panel.querySelector('#admin-sanity');
  slider.addEventListener('input', () => { state.sanity = Number(slider.value); });
  setInterval(() => {
    if (document.activeElement !== slider) slider.value = state.sanity;
    panel.querySelector('#admin-san').textContent = Math.floor(state.sanity);
  }, 200);
})();
