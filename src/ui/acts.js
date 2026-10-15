// ============================================================
// ACTS — the panels that appear as the game deepens:
//   Ritual tab: madness questions, Awakening, Trials, Seals, after-the-end
//   Rites tab:  Sigils, Ichor Mutations, Automation
// Sections repaint only when their HTML changes; fast-moving numbers are
// written into [data-live] spans so buttons aren't rebuilt under a finger.
// ============================================================
import { AWAKEN_FAVOR } from '../core/constants.js';
import { CHOICES } from '../core/content.js';
import { SIGILS, MUTATIONS, TRIALS, SEALS, ENDINGS } from '../core/content-acts.js';
import { state, hasSigil, fx } from '../core/state.js';
import { answerChoice, ichorRate } from '../core/economy.js';
import {
  act, awakeningVisible, canAwaken, signsGain, awaken, buySigil, mutationCost, mutationLevel, mutationMaxed, buyMutation,
  trialsUnlocked, startTrial, abandonTrial, sealsUnlocked, canBreakSeal, breakSeal,
  newGamePlus, keepDreaming, depthCost, dreamDeeper,
} from '../core/prestige.js';
import { on } from '../core/events.js';
import { fmt } from '../core/format.js';
import { $, haptic, dl } from './dom.js';
import { rowHtml } from './render.js';
import { registerTip, registerAction } from './inspect.js';

const painted = new Map();
function paint(el, html) {
  if (painted.get(el) === html) return;
  painted.set(el, html);
  el.innerHTML = html;
}
on('state-replaced', () => painted.clear());

const followers = () => Object.values(state.owned).reduce((a, b) => a + b, 0);

// live progress text for seals, keyed by seal id
const SEAL_PROGRESS = {
  flesh: () => `${followers()} / 1,000`,
  mind: () => `${Math.floor(state.abyssTime)}s / 60s`,
  voice: () => `${state.runChants} / 2,000`,
  stars: () => `${state.owned.choir} / 50`,
  sea: () => `${state.owned.moon} / 100`,
  blood: () => `${state.runLost} / 50`,
  name: () => `${state.seals.length} / 6`,
};

// ---------- Ritual tab ----------

function choiceHtml() {
  const c = CHOICES.find(c => c.id === state.pendingChoice);
  if (!c) return '';
  return `<div class="card-title">Your madness asks</div>
    <p class="choice-text">${c.text}</p>
    <div class="choice-options">${c.options.map((o, i) => `<button data-answer="${i}">${o.label}</button>`).join('')}</div>`;
}

function awakeningHtml() {
  if (!awakeningVisible() || state.challenge) return '';
  const gain = signsGain(), ok = canAwaken();
  return `<div class="card act2" data-tip="awaken">
    <div class="card-title">Awakening</div>
    <p class="sub">Favor earned since you last woke: <b data-live="favorEarned"></b> / ${AWAKEN_FAVOR}.
    Awakening forgets your Favor, Pacts and Ichor, and grants Elder Signs.</p>
    <button id="awaken-btn" class="wide act2-btn" ${ok ? '' : 'disabled'}>${ok ? `Awaken · +${gain} Elder Sign${gain > 1 ? 's' : ''}` : 'Not yet'}</button>
  </div>`;
}

function trialsHtml() {
  if (!trialsUnlocked()) return '';
  if (state.challenge) {
    const t = TRIALS.find(t => t.id === state.challenge);
    return `<div class="card trial-on">
      <div class="card-title">${t.name}</div>
      <p>${t.rule}</p><p class="sub">Earn ${fmt(t.goal)} whispers this run to pass (<span data-live="trialPct"></span>). Then the rule lifts. Reward: ${t.reward}</p>
      <button id="abandon-trial" class="small danger">Abandon the trial</button></div>`;
  }
  return `<h2>Trials <span class="sub">${state.challengesDone.length} / ${TRIALS.length} passed</span></h2>
    ${TRIALS.map(t => {
      const done = state.challengesDone.includes(t.id);
      return rowHtml({ attr: `data-trial="${t.id}"`, tip: `trial:${t.id}`, cls: done ? 'done cant' : '',
        name: `${t.name}${done ? ' ✓' : ''}`, desc: `${t.rule}<br><span class="reward">${t.reward}</span>`,
        price: done ? 'Passed' : 'Begin' });
    }).join('')}`;
}

function sealsHtml() {
  if (!sealsUnlocked() || state.ending) return '';
  return `<h2>The Seven Seals <span class="sub">${state.seals.length} / ${SEALS.length} broken</span></h2>
    ${SEALS.map(s => {
      const broken = state.seals.includes(s.id), feat = s.check(state);
      return rowHtml({ attr: `data-seal="${s.id}"`, tip: `seal:${s.id}`,
        cls: `seal ${broken ? 'done' : canBreakSeal(s.id) ? '' : 'cant'}`,
        name: `${s.name}${broken ? ' — broken' : ''}`,
        desc: broken ? 'Everything is doubled.' : `${feat ? '✓' : '✗'} ${s.req} <span data-live="seal:${s.id}"></span>`,
        price: broken ? '✦' : fmt(s.cost) });
    }).join('')}`;
}

function afterHtml() {
  if (!state.ending || fx.ending) return '';
  const e = ENDINGS.find(e => e.id === state.ending);
  const deeper = state.endless ? `
    <p class="sub">Depth ${state.depth}. Each depth triples everything.</p>
    <button id="dream-deeper" class="wide">Dream deeper · ${fmt(depthCost())}</button>` : `
    <div class="choice-options"><button id="ng-plus">Begin again (New Game+)</button><button id="keep-dreaming">Keep dreaming</button></div>
    <p class="sub">New Game+ starts over from nothing with everything ×${state.ngPlus + 2} and the mark of this ending (${e.ngDesc})
    You keep your revelations and vestments. Keep dreaming stays here and goes ever deeper.</p>`;
  return `<div class="card ending-card"><div class="card-title">It is awake</div>
    <p>You became <b>${e.name}</b>. Endings seen: ${state.endings.length} / ${ENDINGS.length}.</p>${deeper}</div>`;
}

// ---------- Rites tab ----------

function sigilsHtml() {
  if (act() < 2) return '';
  return `<h2>Sigils <span class="sub">${state.elderSigns} Elder Sign${state.elderSigns === 1 ? '' : 's'} to carve</span></h2>
    ${SIGILS.filter(g => !hasSigil(g.id)).map(g => rowHtml({ attr: `data-sigil="${g.id}"`, tip: `sigil:${g.id}`,
      cls: `sigil ${state.elderSigns >= g.cost ? '' : 'cant'}`, name: g.name, desc: g.desc, price: `${g.cost} Sign${g.cost > 1 ? 's' : ''}` })).join('')
    || '<div class="sub">Every sigil is carved.</div>'}`;
}

function mutationsHtml() {
  if (act() < 2) return '';
  return `<h2>Mutations <span class="sub">Ichor weeps from you below 50% sanity</span></h2>
    ${MUTATIONS.map(mu => {
      const l = mutationLevel(mu.id), maxed = mutationMaxed(mu.id), cost = mutationCost(mu.id);
      return rowHtml({ attr: `data-mut="${mu.id}"`, tip: `mut:${mu.id}`,
        cls: `mutation ${!maxed && state.ichor >= cost ? '' : 'cant'}`,
        name: `${mu.name}${l ? ` <span class="count">· ${l}</span>` : ''}`, desc: mu.desc(l),
        price: maxed ? 'Complete' : `${fmt(cost)} Ichor` });
    }).join('')}`;
}

function automationHtml() {
  const has = id => hasSigil(id);
  if (!['rote', 'stillness', 'multitude', 'return'].some(has)) return '';
  const a = state.auto, chk = (k, label) => `<label class="setting"><input type="checkbox" data-auto="${k}" ${a[k] ? 'checked' : ''}><span><b>${label}</b></span></label>`;
  return `<h2>Automation</h2><div class="card automation">
    ${has('rote') ? chk('rites', 'Perform rites on their own') : ''}
    ${has('multitude') ? chk('buy', 'Followers recruit themselves') : ''}
    ${has('stillness') ? `${chk('steady', 'Steady Mind when sanity falls below')}<label class="setting inline">
      <input type="number" min="1" max="99" data-auto-num="steadyAt" value="${a.steadyAt}"><span class="sub">% sanity</span></label>` : ''}
    ${has('return') ? `${chk('summon', 'Summon It when the Favor on offer reaches')}<label class="setting inline">
      <input type="number" min="1" data-auto-num="summonAt" value="${a.summonAt}"><span class="sub">Favor</span></label>` : ''}
  </div>`;
}

// ---------- every tick ----------

const LIVE = {
  favorEarned: () => fmt(state.favorEarned),
  trialPct: () => { const t = TRIALS.find(t => t.id === state.challenge); return t ? `${Math.min(100, state.totalEarned / t.goal * 100).toFixed(1)}%` : ''; },
  ichor: () => fmt(state.ichor),
};

export function renderActs() {
  $('choice-card').hidden = !state.pendingChoice;
  paint($('choice-card'), choiceHtml());
  paint($('ritual-extra'), afterHtml() + awakeningHtml() + trialsHtml() + sealsHtml());
  paint($('rites-extra'), sigilsHtml() + mutationsHtml() + automationHtml());

  for (const el of document.querySelectorAll('[data-live]')) {
    const [k, arg] = el.dataset.live.split(':');
    el.textContent = k === 'seal' ? (state.seals.includes(arg) ? '' : `(${SEAL_PROGRESS[arg]()})`) : LIVE[k]();
  }

  // HUD chips for Act II currencies
  $('signs').hidden = act() < 2;
  $('signs').textContent = `◈ ${state.elderSigns}  ·  ${fmt(state.ichor)} ichor`;
  document.body.dataset.act = state.ending ? 'end' : act();
}

// ---------- tips (inspect sheet / tooltip) ----------

function initTips() {
  registerTip('signs', () => `<b>Elder Signs &amp; Ichor</b>
    <p>Elder Signs come from Awakening. Carve them into Sigils (Rites tab). Every sign you have ever earned also raises the Favor you gain by 25%.</p>
    <p>Ichor weeps from you while your sanity is below 50%, faster the deeper you go. Spend it on Mutations (Rites tab). It is lost when you Awaken.</p>` +
    dl([['Elder Signs', `${state.elderSigns} (${state.elderSignsTotal} ever)`], ['Ichor', fmt(state.ichor)], ['Ichor / sec', ichorRate().toFixed(3)]]));
  registerTip('awaken', () => `<b>Awakening</b><p>The second, deeper reset. You lose whispers, followers, rites, Favor, Pacts, Ichor and Mutations.
    You keep Elder Signs, Sigils, revelations, vestments and the choices you have made.</p>` +
    dl([['Favor earned since waking', `${fmt(state.favorEarned)} / ${AWAKEN_FAVOR}`], ['Elder Signs on waking', signsGain() || '—'], ['Awakenings', state.awakenings]]));
  registerTip('sigil', id => { const g = SIGILS.find(g => g.id === id); return `<b>${g.name}</b><p>${g.desc}</p>` + dl([['Cost', `${g.cost} Elder Sign${g.cost > 1 ? 's' : ''}`], ['You have', state.elderSigns]]) + '<p class="sub">Sigils are permanent.</p>'; });
  registerTip('mut', id => { const mu = MUTATIONS.find(x => x.id === id), l = mutationLevel(id); return `<b>${mu.name}</b><p>${mu.desc(l)}</p>` + dl([['Level', l + (mu.max ? ` / ${mu.max}` : '')], ['Next level', mutationMaxed(id) ? '—' : `${fmt(mutationCost(id))} Ichor`], ['Ichor', fmt(state.ichor)]]) + '<p class="sub">Mutations are lost when you Awaken.</p>'; });
  registerTip('trial', id => { const t = TRIALS.find(t => t.id === id); return `<b>${t.name}</b><p>${t.rule}</p><p>Reward: ${t.reward}</p><p class="sub">Beginning a trial abandons your current run (you keep Favor and Pacts). Earn ${fmt(t.goal)} whispers in the trial run to pass; then the rule lifts and the run goes on.</p>`; });
  registerTip('seal', id => { const s = SEALS.find(s => s.id === id); return `<b>${s.name}</b><p>${s.req}</p>` + dl([['Feat', s.check(state) ? 'done' : SEAL_PROGRESS[id]()], ['Offering', `${fmt(s.cost)} whispers`]]) + '<p class="sub">Broken seals stay broken and double everything.</p>'; });

  registerAction('sigil', id => { const g = SIGILS.find(g => g.id === id); return hasSigil(id) ? null : { label: `Carve · ${g.cost} Sign${g.cost > 1 ? 's' : ''}`, enabled: state.elderSigns >= g.cost, run: () => buySigil(id) }; });
  registerAction('mut', id => mutationMaxed(id) ? null : { label: `Mutate · ${fmt(mutationCost(id))} Ichor`, enabled: state.ichor >= mutationCost(id), run: () => buyMutation(id) });
  registerAction('seal', id => state.seals.includes(id) ? null : { label: `Break · ${fmt(SEALS.find(s => s.id === id).cost)}`, enabled: canBreakSeal(id), run: () => breakSeal(id) });
}

// ---------- input ----------

function confirmTrial(id) {
  const t = TRIALS.find(t => t.id === id);
  if (confirm(`Begin ${t.name}?\n\n${t.rule}\n\nYour current run will be abandoned (Favor and Pacts are kept). Earn ${fmt(t.goal)} whispers this run to pass.\nReward: ${t.reward}`))
    startTrial(id);
}

export function initActs() {
  initTips();
  const bought = ok => { if (ok) haptic(12); };

  $('choice-card').addEventListener('click', e => {
    const b = e.target.closest('[data-answer]'); if (b) bought(answerChoice(Number(b.dataset.answer)));
  });
  $('ritual-extra').addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#awaken-btn')) {
      if (confirm(`Awaken? You will lose your whispers, followers, rites, Favor, Pacts, Ichor and Mutations.\nYou will gain ${signsGain()} Elder Signs.`)) bought(awaken());
    }
    else if (t.closest('#abandon-trial')) { if (confirm('Abandon the trial? This run will be lost.')) abandonTrial(); }
    else if (t.closest('#ng-plus')) { if (confirm('Begin again from nothing? You keep your revelations, vestments and endings.')) newGamePlus(); }
    else if (t.closest('#keep-dreaming')) keepDreaming();
    else if (t.closest('#dream-deeper')) bought(dreamDeeper());
    else if (t.closest('[data-trial]:not(.done)')) confirmTrial(t.closest('[data-trial]').dataset.trial);
    else if (t.closest('[data-seal]')) bought(breakSeal(t.closest('[data-seal]').dataset.seal));
  });
  $('rites-extra').addEventListener('click', e => {
    const s = e.target.closest('[data-sigil]'); if (s) return bought(buySigil(s.dataset.sigil));
    const mu = e.target.closest('[data-mut]'); if (mu) return bought(buyMutation(mu.dataset.mut));
  });
  $('rites-extra').addEventListener('change', e => {
    const c = e.target.closest('[data-auto]');
    if (c) state.auto[c.dataset.auto] = c.checked;
    const n = e.target.closest('[data-auto-num]');
    if (n) state.auto[n.dataset.autoNum] = Math.max(1, Number(n.value) || 1);
  });
}
