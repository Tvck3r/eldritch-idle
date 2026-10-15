// Balance simulator: plays the real core rules with a simple bot and prints
// when each milestone is reached. Run: node scripts/simulate.mjs [style] [hours]
//   style: active (holds Chant a third of the time, catches apparitions) | idle
// It is a rough player, not an optimal one: the point is to see the shape of
// the curve and catch anything wildly too fast or too slow.
import { GENERATORS, UPGRADES, PACTS, CHOICES } from '../src/core/content.js';
import { SIGILS, MUTATIONS, TRIALS, SEALS } from '../src/core/content-acts.js';
import { HOLD_CHANT_RATE } from '../src/core/constants.js';
import * as S from '../src/core/state.js';
import * as eco from '../src/core/economy.js';
import * as pre from '../src/core/prestige.js';

const style = process.argv[2] ?? 'active';
const hours = Number(process.argv[3] ?? 20);
const active = style === 'active';
globalThis.performance ??= { now: () => Date.now() };

S.setState({ ...S.freshState(), seenIntro: true });
const st = () => S.state;
let t = 0, lastSummonAt = 0, runsSinceAwaken = 0;
const marks = [];
const mark = label => { if (!marks.some(m => m.label === label)) marks.push({ label, t }); };
const fmtT = s => `${Math.floor(s / 3600)}h${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m`;

// ---------- the bot ----------

function bestGenerator() {
  // best production per whisper, looking only at revealed, unbarred tiers
  const m = eco.modifiers();
  let best = null, bestScore = 0;
  for (const g of GENERATORS) {
    if (!eco.isRevealed(g) || eco.isBarred(g.id, m)) continue;
    const gain = g.rate * m.gen[g.id] * m.all || g.rate;
    const score = gain / eco.genCost(g);
    if (score > bestScore) { best = g; bestScore = score; }
  }
  return best;
}

function shop() {
  // saving for the Last Seal: stop buying once the run is strong, just bank whispers
  const saving = st().seals.length === 6 && eco.wps() * 600 > SEALS.at(-1).cost / 100;
  for (let i = 0; i < 200 && !saving; i++) {
    const rite = UPGRADES.filter(u => u.unlock(st()) && eco.canBuyUpgrade(u)).sort((a, b) => a.cost - b.cost)[0];
    if (rite && rite.cost < st().whispers * 0.5) { eco.buyUpgrade(rite.id); continue; }
    const g = bestGenerator();
    if (g && eco.buyGenerator(g.id, 1)) continue;
    break;
  }
  for (const p of PACTS) if (!S.hasPact(p.id) && st().favor >= p.cost * 3) eco.buyPact(p.id);
  for (const s of SIGILS) if (!S.hasSigil(s.id) && st().elderSigns >= s.cost) pre.buySigil(s.id);
  for (const mu of MUTATIONS) while (!pre.mutationMaxed(mu.id) && st().ichor >= pre.mutationCost(mu.id) * 2) pre.buyMutation(mu.id);
  for (const s of SEALS) if (pre.canBreakSeal(s.id)) { pre.breakSeal(s.id); mark(`seal ${st().seals.length}`); }
}

function decide() {
  const s = st();
  if (s.finale) { pre.chooseEnding(pre.availableEndings()[0].id); mark('ENDING'); return true; }
  const wantAbyss = pre.act() >= 3 && !(s.seals.includes('mind') && s.seals.includes('blood'));
  s.auto.steady = !wantAbyss; // a player chasing the Mind seal switches off the Sigil of Stillness
  if (s.pendingChoice) {
    // mostly random; while chasing the Mind seal, avoid the answers that calm you (defiance)
    const opts = CHOICES.find(c => c.id === s.pendingChoice).options.map((o, i) => ({ o, i })).filter(x => !wantAbyss || x.o.align !== 'defiance');
    eco.answerChoice(opts[Math.random() * opts.length | 0].i);
  }
  if (active && S.fx.apparition && Math.random() < 0.6 && !(wantAbyss && S.fx.apparition.id === 'moth')) eco.catchApparition();
  if (s.sanity < 15 && s.whispers > 0 && !s.challenge && !wantAbyss) eco.steadyMind(true);

  // summon when the Favor on offer is worth it, or the run has stalled
  const gain = eco.favorGain(), runLen = t - lastSummonAt;
  const saving = s.seals.length === 6;   // saving up for the Last Seal: one long run
  if (gain > 0 && (gain >= Math.max(10, s.favor * 0.6) || (runLen > 3600 && !saving))) {
    pre.performSummon(); lastSummonAt = t; runsSinceAwaken++;
    mark(`summon 1`); if (s.summonings + 1 === 5) mark('summon 5');
    return false;
  }
  if (pre.act() < 3 && pre.canAwaken() && (pre.signsGain() >= Math.max(3, st().elderSignsTotal) || runsSinceAwaken > 25)) {
    pre.awaken(); runsSinceAwaken = 0; mark(`awaken ${st().awakenings}`);
  }
  // trials: try each one once you've awakened, between seals
  if (pre.trialsUnlocked() && !s.challenge && runsSinceAwaken > 2) {
    const next = TRIALS.find(x => !s.challengesDone.includes(x.id));
    if (next && Math.random() < 0.02) { pre.startTrial(next.id); lastSummonAt = t; }
  }
  if (s.challenge && t - lastSummonAt > 5400) { pre.abandonTrial(); lastSummonAt = t; }
  return false;
}

// ---------- run ----------

const DT = 1;
for (; t < hours * 3600; t += DT) {
  if (active && eco.canHoldChant() && (t % 90) < 30) for (let i = 0; i < HOLD_CHANT_RATE * DT; i++) eco.chant();
  else if (active && (t % 90) < 30) eco.chant();
  else if (!active && st().runTime < 120) eco.chant(); // even an idle player taps to get each run going
  eco.tick(DT);
  if (st().totalEarned >= 1e9) mark('veil 1');
  shop();
  if (decide()) break;
  if (t % 3600 === 0 && t) {
    const s = st();
    console.log(`${fmtT(t)}  [${s.challenge ?? "-"} san ${s.sanity.toFixed(0)} drain ${eco.sanityDrain().toFixed(2)} buffs ${s.buffs.map(b => b.id)} top ${eco.topFollower()?.id}:${s.owned[eco.topFollower()?.id]}]  wps ${eco.wps().toExponential(2)}  favor ${s.favor}  earnedFavor ${s.favorEarned}  summons ${s.summonings}  awakens ${s.awakenings}  signs ${s.elderSignsTotal}  ichor ${s.ichor.toFixed(0)}  trials ${s.challengesDone.length}  seals ${s.seals.join(",")} veilTime ${s.veilTime.toFixed(0)} run ${s.runTime.toFixed(0)}`);
  }
}

console.log(`\n${style} player, milestones:`);
for (const m of marks) console.log(`  ${fmtT(m.t).padStart(7)}  ${m.label}`);
