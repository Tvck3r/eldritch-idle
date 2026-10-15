// ============================================================
// THE GRIMOIRE — the in-game guide. Sections with an unlock stay
// sealed until the player has encountered that mechanic.
// Numbers come from constants, so the guide stays true after rebalancing.
// ============================================================
import {
  VEIL_GOAL, FAVOR_BONUS, COST_GROWTH, SANITY_REGEN, MADNESS_MAX_BONUS, MADNESS_THRESHOLD, STEADY_COST, STEADY_AMOUNT,
} from '../core/constants.js';
import { PACTS } from '../core/content.js';
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
    <p class="hint">Hover over any number (or tap it on mobile) to see what it means and where it comes from.</p>` },

  { id: 'followers', title: 'Followers', body: () => `
    <p>Each follower produces whispers every second. Each one you buy makes the next of that kind
    ${Math.round((COST_GROWTH - 1) * 100)}% more expensive, so spreading out across tiers pays off.</p>
    <p>New kinds of follower reveal themselves once you own one of the kind before it.</p>
    <p>Use <b>×1 / ×10 / Max</b> beside the Followers heading to buy in bulk.</p>
    <p>Greater followers — Ritual Circles and beyond — <b>drain your sanity</b>.</p>` },

  { id: 'rites', title: 'Rites', unlock: s => s.totalEarned >= 50 || s.summonings > 0, body: () => `
    <p>Rites are one-time upgrades that appear as you grow. Most double the output of one kind of follower;
    some empower your chant or everything at once.</p>
    <p>Rites are forgotten when you summon — unless you've sealed the right Pact.</p>` },

  { id: 'veil', title: 'The Veil', body: () => `
    <p>The bar at the top tracks your progress toward ${fmt(VEIL_GOAL)} whispers earned this run.
    It's logarithmic: going from 1K to 10K moves it as far as 100M to 1B.</p>
    <p>As the veil thins, the world changes. Watch the sky. Watch the circle.</p>` },

  { id: 'sanity', title: 'Sanity', unlock: s => s.stats.minSanity < 100, body: () => `
    <p>Sanity recovers ${SANITY_REGEN}/s on its own, but greater followers drain it. When the drain wins, it falls.</p>
    <p><b>Madness is power:</b> production scales up to <b>×${1 + MADNESS_MAX_BONUS}</b> as sanity approaches 0%.</p>
    <p><b>Madness is danger:</b> below ${MADNESS_THRESHOLD}%, random events strike — followers wander into the sea,
    whispers turn on you, though sometimes a vision rewards you.</p>
    <p><b>Steady Mind</b> spends ${STEADY_COST * 100}% of your whispers to restore ${STEADY_AMOUNT} sanity.
    Ride the edge, or stay safe — your call.</p>
    <p>Your mind rests while you're away: sanity holds still and madness waits.</p>` },

  { id: 'summoning', title: 'Summoning', unlock: s => s.lifetimeEarned >= VEIL_GOAL || s.summonings > 0, body: () => `
    <p>Once the veil is torn, <b>Summon It</b> to begin again, stronger. You lose your whispers, followers and rites,
    and gain <b>Eldritch Favor</b>.</p>
    <p>Favor earned = 10 × √(whispers this run ÷ ${fmt(VEIL_GOAL)}). Pushing past the goal pays:
    1B → 10, 4B → 20, 9B → 30.</p>
    <p>Each unspent Favor adds <b>+${FAVOR_BONUS * 100}%</b> to everything.</p>` },

  { id: 'pacts', title: 'Pacts', unlock: s => s.summonings > 0, body: () => `
    <p>Spend Favor on Pacts — permanent perks that survive every summoning.</p>
    <p>The catch: Favor spent on a Pact no longer gives its +${FAVOR_BONUS * 100}% bonus. Buy the Pacts that change how
    you play, and hoard the rest.</p>
    ${dl(PACTS.map(p => [p.name, `${p.desc} (${p.cost})`]))}` },

  { id: 'vessel', title: 'Your Vessel', body: () => `
    <p>The figure at the front of the circle is you. Open <b>Vessel</b> at the top to dress it.</p>
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
