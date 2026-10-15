// ============================================================
// THE GRIMOIRE — the in-game guide. Sections with an unlock stay
// sealed until the player has encountered that mechanic.
// Numbers come from constants, so the guide stays true after rebalancing.
// ============================================================
import {
  VEIL_GOAL, FAVOR_BONUS, COST_GROWTH, SANITY_REGEN, MADNESS_MAX_BONUS, MADNESS_THRESHOLD, STEADY_COST, STEADY_AMOUNT,
  REVELATION_BONUS, AWAKEN_FAVOR, SIGN_FAVOR_BONUS, ICHOR_SANITY, ACT3_AWAKENINGS, SEAL_BONUS, HOLD_CHANT_RATE,
} from '../core/constants.js';
import { PACTS, MILESTONES, LORE, APPARITIONS } from '../core/content.js';
import { TRIALS, SEALS, ENDINGS } from '../core/content-acts.js';
import { state } from '../core/state.js';
import { fmt } from '../core/format.js';
import { $, dl } from './dom.js';
import { openModal } from './modal.js';

const GUIDE = [
  { id: 'ritual', title: 'The Ritual', body: () => `
    <p>Something sleeps beneath the world. Your purpose is to wake it.</p>
    <p><b>Chant</b> to earn <b>whispers</b>, the currency of devotion. Spend whispers on
    <b>Followers</b>, who whisper for you even while you're away.</p>
    <p>Earn <b>${fmt(VEIL_GOAL)}</b> whispers in a single run to tear the veil — then call It through.</p>
    <p class="hint">Hover over any number (on a phone, tap it) to see what it means and where it comes from.
    In a list, tap the name to inspect it and the price to buy it.</p>` },

  { id: 'followers', title: 'Followers', body: () => `
    <p>Each follower produces whispers every second. Each one you buy makes the next of that kind
    ${Math.round((COST_GROWTH - 1) * 100)}% more expensive, so spreading out across tiers pays off.</p>
    <p>New kinds of follower reveal themselves once you own one of the kind before it.</p>
    <p><b>Milestones:</b> owning ${MILESTONES.slice(0, 4).join(', ')}… of one kind doubles that kind's output, each time.</p>
    <p>Use <b>×1 / ×10 / Max</b> beside the Followers heading to buy in bulk.</p>
    <p>Greater followers — Ritual Circles and beyond — <b>drain your sanity</b>.</p>` },

  { id: 'rites', title: 'Rites', unlock: s => s.totalEarned >= 50 || s.summonings > 0, body: () => `
    <p>Rites are one-time upgrades that appear as you grow. Some double one kind of follower; some let one kind feed another;
    some empower your chant or everything at once.</p>
    <p><b>Ceaseless Chant</b> lets you press and hold Chant to chant ${HOLD_CHANT_RATE} times a second.</p>
    <p>Rites are forgotten when you summon — unless you've sealed the right Pact.</p>` },

  { id: 'veil', title: 'The Veil', body: () => `
    <p>The bar at the top tracks your progress toward ${fmt(VEIL_GOAL)} whispers earned this run.
    It's logarithmic: going from 1K to 10K moves it as far as 100M to 1B.</p>
    <p>As the veil thins, the world changes. Watch the sky. Watch the circle.</p>` },

  { id: 'sanity', title: 'Sanity', unlock: s => s.stats.minSanity < 100, body: () => `
    <p>Sanity recovers ${SANITY_REGEN}/s on its own, but greater followers drain it. When the drain wins, it falls.
    The ring at the top shows it at a glance.</p>
    <p><b>Madness is power:</b> production scales up to <b>×${1 + MADNESS_MAX_BONUS}</b> as sanity approaches 0%.</p>
    <p><b>Madness is danger:</b> below ${MADNESS_THRESHOLD}%, episodes strike — followers wander into the sea,
    whispers turn on you, though sometimes a vision rewards you.</p>
    <p><b>Steady Mind</b> (Ritual tab) spends ${STEADY_COST * 100}% of your whispers to restore ${STEADY_AMOUNT} sanity.</p>
    <p>Your mind rests while you're away: sanity holds still and madness waits.</p>` },

  { id: 'questions', title: 'Questions', unlock: s => s.stats.choices > 0 || !!s.pendingChoice, body: () => `
    <p>Sometimes your madness asks you something instead of striking. The question waits in the Ritual tab
    until you answer. Each is asked only once, ever.</p>
    <p>There are no wrong answers. But It is listening, and It will remember which road you walked
    when everything ends.</p>` },

  { id: 'apparitions', title: 'Apparitions', unlock: s => s.stats.apparitions > 0, body: () => `
    <p>Things fall through the thin places. Watch the scene: when something strange appears, <b>tap it</b> before it fades.</p>
    ${dl(APPARITIONS.map(a => [a.name, { star: 'followers ×5 for a while', shadow: 'a heap of whispers', mouth: 'chanting ×15 for a while',
      moth: 'sanity, and a moment of stillness', eye: 'madness bonus ×2 for a while' }[a.id]]))}
    <p class="hint">Apparitions only come while you're watching.</p>` },

  { id: 'revelations', title: 'Revelations', body: () => `
    <p>Revelations are milestones of your descent, listed in the Vessel tab. Each one adds
    <b>+${REVELATION_BONUS * 100}%</b> to everything, forever. Some also unlock vestments and lore.</p>
    <p>You have ${state.revelations.length}.</p>` },

  { id: 'summoning', title: 'Summoning', unlock: s => s.lifetimeEarned >= VEIL_GOAL || s.summonings > 0, body: () => `
    <p>Once the veil is torn, <b>Summon It</b> to begin again, stronger. You lose your whispers, followers and rites,
    and gain <b>Eldritch Favor</b>.</p>
    <p>Favor earned = 10 × ∛(whispers this run ÷ ${fmt(VEIL_GOAL)}). Pushing past the goal pays:
    1B → 10, 8B → 20, 27B → 30 (more with Elder Signs and some Sigils and Mutations).</p>
    <p>Each unspent Favor adds <b>+${FAVOR_BONUS * 100}%</b> to everything.</p>` },

  { id: 'pacts', title: 'Pacts', unlock: s => s.summonings > 0, body: () => `
    <p>Spend Favor on Pacts — permanent perks that survive every summoning (but not an Awakening).</p>
    <p>The catch: Favor spent on a Pact no longer gives its +${FAVOR_BONUS * 100}% bonus. Buy the Pacts that change how
    you play, and hoard the rest.</p>
    ${dl(PACTS.map(p => [p.name, `${p.desc} (${p.cost})`]))}` },

  { id: 'awakening', title: 'Awakening', unlock: s => s.summonings >= 3 || s.awakenings > 0, body: () => `
    <p>The second layer. Once you have earned ${AWAKEN_FAVOR} Favor since you last woke, you can <b>Awaken</b>
    (Ritual tab). You lose everything a summoning takes, and also your Favor, Pacts, Ichor and Mutations.</p>
    <p>You gain <b>Elder Signs</b> = 3 × √(Favor earned ÷ ${AWAKEN_FAVOR}). Carve them into <b>Sigils</b> (Rites tab):
    permanent powers, including automation. Every Elder Sign you have ever earned also adds +${SIGN_FAVOR_BONUS * 100}% to the Favor you gain.</p>
    <p>After your first Awakening, the drowned city rises, and you can walk the Trials.</p>` },

  { id: 'ichor', title: 'Ichor', unlock: s => s.awakenings > 0, body: () => `
    <p>Once you have Awakened, your madness weeps <b>Ichor</b> whenever your sanity is below ${ICHOR_SANITY}%.
    The deeper you go and the louder your followers, the faster it flows (it flows while you're away, too).</p>
    <p>Spend Ichor on <b>Mutations</b> (Rites tab): upgrades you can level again and again. Ichor and Mutations
    survive summonings but are lost when you Awaken.</p>` },

  { id: 'trials', title: 'Trials', unlock: s => s.awakenings > 0, body: () => `
    <p>Trials are runs under a rule. Begin one from the Ritual tab (your current run is abandoned), then earn the trial's
    goal in whispers to pass: the rule lifts and your run carries on. Each Trial's reward lasts forever.</p>
    ${dl(TRIALS.map(t => [t.name, `${t.rule} Goal: ${fmt(t.goal)}. <i>${t.reward}</i>`]))}` },

  { id: 'seals', title: 'The Seals', unlock: s => s.awakenings >= ACT3_AWAKENINGS, body: () => `
    <p>After your ${ACT3_AWAKENINGS}rd Awakening, the Seven Seals that keep It asleep become visible (Ritual tab).
    Each needs a feat, done within a run, and an offering of whispers. Broken seals stay broken and multiply everything
    by ${SEAL_BONUS}.</p>
    ${dl(SEALS.map(s => [s.name, s.req]))}
    <p>When the last seal breaks, It wakes, and you must choose how this ends.</p>` },

  { id: 'endings', title: 'Endings', unlock: s => s.seals.length >= 6 || s.endings.length > 0, body: () => `
    <p>There are ${ENDINGS.length} endings. The road you leaned toward with your answers is always open;
    others open if you leaned their way often enough.</p>
    <p>After an ending you can begin again with <b>New Game+</b> (everything multiplied, plus the mark of the ending you chose),
    or <b>keep dreaming</b> and descend forever.</p>
    ${dl(ENDINGS.map(e => [state.endings.includes(e.id) ? e.name : '???', state.endings.includes(e.id) ? `NG+: ${e.ngDesc}` : 'Not yet reached']))}` },

  { id: 'lore', title: 'Lore', unlock: s => LORE.some(l => l.unlock(s)), body: () => {
    const found = LORE.filter(l => l.unlock(state));
    return `<p class="hint">${found.length} of ${LORE.length} fragments recovered.</p>` +
      found.map(l => `<h4>${l.title}</h4><p class="lore">${l.text}</p>`).join('');
  } },

  { id: 'vessel', title: 'Your Vessel', body: () => `
    <p>The figure at the front of the circle is you. Open the <b>Vessel</b> tab to dress it.</p>
    <p>New robes, masks, relics and familiars unlock as you reach milestones. Locked ones hint at how to earn them.</p>
    <p>Purely cosmetic. Purely necessary.</p>` },
];

export function openGrimoire(sectionId = 'ritual') {
  const sealed = sec => sec.unlock && !sec.unlock(state);
  const draw = id => {
    const sec = GUIDE.find(s => s.id === id);
    $('modal-body').innerHTML = `
      <h2 class="modal-title">The Grimoire</h2>
      <div class="grimoire">
        <nav>${GUIDE.map(s => `<button class="small ${s.id === id ? 'active' : ''}" data-sec="${s.id}" ${sealed(s) ? 'disabled' : ''}>
          ${sealed(s) ? '???' : s.title}</button>`).join('')}</nav>
        <article><h3>${sec.title}</h3>${sec.body()}</article>
      </div>`;
  };
  openModal('');
  draw(sectionId);
  $('modal-body').onclick = e => { const b = e.target.closest('[data-sec]'); if (b) draw(b.dataset.sec); };
}
