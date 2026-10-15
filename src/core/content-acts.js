// ============================================================
// CONTENT (Acts II & III) — awakening, ichor, trials, seals, endings,
// and the revelations (achievements) that span the whole game.
// Same conventions as content.js: data first, logic reads it.
// ============================================================
import { GENERATORS, UPGRADES, PACTS, APPARITIONS } from './content.js';

const followers = s => Object.values(s.owned).reduce((a, b) => a + b, 0);

// ---------- Act II: Elder Signs are spent on Sigils (permanent) ----------
// auto: which automation the sigil unlocks (see state.auto)
export const SIGILS = [
  { id: 'covenant',  name: 'Sigil of Covenant',        cost: 1, desc: 'Begin each awakening with Voice From Below and Iron Mind already sealed.' },
  { id: 'weeping',   name: 'Sigil of the Weeping Mind', cost: 1, desc: 'Ichor flows twice as fast.', apply: m => { m.ichor *= 2; } },
  { id: 'rote',      name: 'Sigil of Rote',            cost: 2, desc: 'Automation: Rites perform themselves once you can afford them.', auto: 'rites' },
  { id: 'stillness', name: 'Sigil of Stillness',       cost: 2, desc: 'Automation: Steady Mind steps in when sanity falls below a line you set.', auto: 'steady' },
  { id: 'openeye',   name: 'Sigil of the Open Eye',    cost: 2, desc: 'Apparitions appear twice as often and linger longer.', apply: m => { m.apparitionRate *= 2; m.apparitionLife *= 1.5; } },
  { id: 'multitude', name: 'Sigil of the Multitude',   cost: 3, desc: 'Automation: followers recruit themselves (no Pact needed).', auto: 'buy' },
  { id: 'return',    name: 'Sigil of Return',          cost: 3, desc: 'Automation: Summon It on its own once the Favor on offer reaches a target you set.', auto: 'summon' },
  { id: 'plenty',    name: 'Sigil of Plenty',          cost: 4, desc: 'Favor gained ×2.', apply: m => { m.favorGain *= 2; } },
  { id: 'depths',    name: 'Sigil of the Depths',      cost: 5, desc: 'Mutations cost half as much Ichor.', apply: m => { m.mutationCost *= 0.5; } },
  { id: 'memory',    name: 'Sigil of Memory',          cost: 6, desc: 'Pacts survive Awakening.' },
  { id: 'dominion',  name: 'Sigil of Dominion',        cost: 8, desc: 'Everything ×3.', apply: m => { m.all *= 3; m.click *= 3; } },
];

// ---------- Act II: Ichor buys Mutations (levelled; reset on Awakening) ----------
export const MUTATIONS = [
  { id: 'flesh',  name: 'Flesh That Sings', baseCost: 5,  desc: l => `Everything +25% per level (now +${l * 25}%).`, apply: (m, l) => { m.all *= 1 + 0.25 * l; m.click *= 1 + 0.25 * l; } },
  { id: 'tongue', name: 'Forked Tongue',    baseCost: 8,  desc: l => `Chanting ×2 per level (now ×${2 ** l}).`, apply: (m, l) => { m.click *= 2 ** l; } },
  { id: 'mind',   name: 'Calcified Mind',   baseCost: 15, max: 6, desc: l => `Sanity drains 5% slower per level (now −${l * 5}%).`, apply: (m, l) => { m.drain *= 1 - 0.05 * l; } },
  { id: 'favor',  name: 'Gift for Favor',   baseCost: 25, desc: l => `Favor gained +15% per level (now +${l * 15}%).`, apply: (m, l) => { m.favorGain *= 1 + 0.15 * l; } },
  { id: 'sight',  name: 'Second Sight',     baseCost: 20, desc: l => `Apparitions grant +25% per level (now +${l * 25}%).`, apply: (m, l) => { m.apparitionPower *= 1 + 0.25 * l; } },
  { id: 'abyss',  name: 'Deeper Abyss',     baseCost: 30, desc: l => `Madness empowers you +20% more per level (now +${l * 20}%).`, apply: (m, l) => { m.madMax *= 1 + 0.2 * l; } },
];
export const MUTATION_GROWTH = 2.2;

// ---------- Act II: Trials (challenges) ----------
// ruleApply(m) applies while the trial runs; rewardApply(m) applies forever once passed.
// A trial is passed when the run earns `goal` whispers; the rule then lifts and the run goes on.
export const TRIALS = [
  { id: 'silence',   name: 'Trial of Silence',     goal: 1e9, rule: 'You cannot chant.', reward: 'Followers ×1.5, forever.',
    ruleApply: m => { m.noChant = true; }, rewardApply: m => { m.all *= 1.5; } },
  { id: 'edge',      name: 'Trial of the Edge',    goal: 1e9, rule: 'Your sanity is held at 10%. Madness strikes often.', reward: 'Madness empowers you 50% more, forever.',
    ruleApply: m => { m.sanityLock = 10; }, rewardApply: m => { m.madMax *= 1.5; } },
  { id: 'onefaith',  name: 'Trial of One Faith',   goal: 1e7, rule: 'Every kind of follower is revealed, but you may recruit only one: the first kind you choose.', reward: 'Milestones give ×2.5 instead of ×2.',
    ruleApply: m => { m.oneFaith = true; m.revealAll = true; }, rewardApply: m => { m.milestoneBase = 2.5; } },
  { id: 'faithless', name: 'Trial of the Faithless', goal: 1e9, rule: 'Rites cannot be performed.', reward: 'Every Rite you know adds +3% to everything.',
    ruleApply: m => { m.noRites = true; }, rewardApply: m => { m.riteBonus += 0.03; } },
  { id: 'unfavored', name: 'Trial Without Favor',  goal: 1e9, rule: 'Favor and Pacts give you nothing.', reward: 'Each unspent Favor adds +15% instead of +10%.',
    ruleApply: m => { m.noFavor = true; }, rewardApply: m => { m.favorBonus = 0.15; } },
];

// ---------- Act III: the Seven Seals ----------
// Each needs a feat this run (check) and an offering of whispers (cost). Broken seals are
// permanent and double everything. Breaking the last one begins the ending.
export const SEALS = [
  { id: 'flesh', name: 'Seal of Flesh',     req: 'Command 1,000 followers at once.',            check: s => followers(s) >= 1000,       cost: 1e14 },
  { id: 'voice', name: 'Seal of Voice',     req: 'Chant 2,000 times in a single run.',          check: s => s.runChants >= 2000,        cost: 1e16 },
  { id: 'stars', name: 'Seal of Stars',     req: 'Gather 50 Star Choirs.',                      check: s => s.owned.choir >= 50,        cost: 1e18 },
  { id: 'mind',  name: 'Seal of Mind',      req: 'Stay at 0% sanity for 60 seconds straight.',  check: s => s.abyssTime >= 60,          cost: 1e19 },
  { id: 'blood', name: 'Seal of Blood',     req: 'Lose 50 followers to madness in a single run.', check: s => s.runLost >= 50,         cost: 1e20 },
  { id: 'sea',   name: 'Seal of the Sea',   req: 'Raise 100 Drowned Moons.',                    check: s => s.owned.moon >= 100,        cost: 1e21 },
  { id: 'name',  name: 'The Last Seal',     req: 'Break the other six.',                        check: s => s.seals.length >= 6,        cost: 1e22 },
];

// ---------- Act III: endings ----------
// The dominant alignment's ending is always offered; any other you leaned toward
// (ENDING_MIN_ALIGN choices or more) is offered too. ng(m) is that ending's NG+ modifier.
export const ENDINGS = [
  { id: 'prophet', align: 'devotion', name: 'The Prophet', verb: 'Kneel',
    ngDesc: 'Favor gained ×3.', ng: m => { m.favorGain *= 3; },
    lines: [
      'You kneel, and It opens Its eye fully, and the world is lit by it.',
      'Your followers kneel behind you, and the cities behind them, and the sea behind the cities.',
      'It speaks, and only you can understand. So you translate.',
      'You will be translating for a very long time.',
      'THE PROPHET',
    ] },
  { id: 'betrayer', align: 'defiance', name: 'The Betrayer', verb: 'Draw the Elder Sign',
    ngDesc: 'Sanity drains half as fast, and Steady Mind costs nothing.', ng: m => { m.drain *= 0.5; m.steadyFree = true; },
    lines: [
      'At the last moment, you draw the sign the right way round.',
      'The eye, vast as the sky, regards you for one long second. It is not angry. It is impressed.',
      'Then it closes. The seals knit. The sea goes down. The second moon sinks.',
      'In the morning, nobody remembers anything. Nobody remembers you.',
      'THE BETRAYER',
    ] },
  { id: 'vessel', align: 'hunger', name: 'The Vessel', verb: 'Open your mouth',
    ngDesc: 'Madness empowers you three times as much.', ng: m => { m.madMax *= 3; },
    lines: [
      'You do not kneel. You do not run. You open your mouth.',
      'It pours in. All of It. It should not fit, and It does.',
      'You look out through Its eye at a world that is very small and very loud.',
      'Somewhere far below, a cult begins to chant your name.',
      'THE VESSEL',
    ] },
];
export const ENDING_MIN_ALIGN = 3;

// ---------- revelations (achievements) ----------
// Each one grants +REVELATION_BONUS to everything, forever. Some unlock lore and vestments.
export const REVELATIONS = [
  { id: 'first-word', name: 'The First Word',   desc: 'Chant once.',                         check: s => s.stats.chants >= 1 },
  { id: 'hoarse',     name: 'Hoarse',           desc: 'Chant 1,000 times.',                  check: s => s.stats.chants >= 1000 },
  { id: 'unending',   name: 'Unending',         desc: 'Chant 25,000 times.',                 check: s => s.stats.chants >= 25000 },
  { id: 'murmur',     name: 'A Murmur',         desc: 'Earn 1,000 whispers in total.',       check: s => s.lifetimeEarned >= 1e3 },
  { id: 'chorus',     name: 'A Chorus',         desc: 'Earn 1M whispers in total.',          check: s => s.lifetimeEarned >= 1e6 },
  { id: 'roar',       name: 'A Roar',           desc: 'Earn 1B whispers in total.',          check: s => s.lifetimeEarned >= 1e9 },
  { id: 'hush',       name: 'The Hush After',   desc: 'Earn 1T whispers in total.',          check: s => s.lifetimeEarned >= 1e12 },
  { id: 'uncounted',  name: 'Uncounted',        desc: 'Earn 1Qa whispers in total.',         check: s => s.lifetimeEarned >= 1e15 },
  { id: 'unnumbered', name: 'Unnumbered',       desc: 'Earn 1Qi whispers in total.',         check: s => s.lifetimeEarned >= 1e18 },
  { id: 'flock',      name: 'A Flock',          desc: 'Command 100 followers at once.',      check: s => followers(s) >= 100 },
  { id: 'multitude',  name: 'A Multitude',      desc: 'Command 500 followers at once.',      check: s => followers(s) >= 500 },
  { id: 'legion',     name: 'Legion',           desc: 'Command 1,000 followers at once.',    check: s => followers(s) >= 1000 },
  { id: 'devoted',    name: 'Devotion Rewarded', desc: 'Own 100 of one kind of follower.',   check: s => Math.max(...Object.values(s.owned)) >= 100 },
  { id: 'spire',      name: 'Up, and Up',       desc: 'Raise an Impossible Spire.',          check: s => s.owned.spire >= 1 },
  { id: 'choir',      name: 'Singing Stars',    desc: 'Gather a Star Choir.',                check: s => s.owned.choir >= 1 },
  { id: 'moon',       name: 'Two Moons',        desc: 'Raise a Drowned Moon.',               check: s => s.owned.moon >= 1 },
  { id: 'cracks',     name: 'Hairline Cracks',  desc: 'Let your sanity fall below 50%.',     check: s => s.stats.minSanity < 50 },
  { id: 'bottom',     name: 'The Bottom',       desc: 'Reach 0% sanity.',                    check: s => s.stats.minSanity <= 0 },
  { id: 'voices',     name: 'Familiar Voices',  desc: 'Endure 10 episodes of madness.',      check: s => s.stats.madnessEvents >= 10 },
  { id: 'home',       name: 'At Home in Madness', desc: 'Endure 100 episodes of madness.',   check: s => s.stats.madnessEvents >= 100 },
  { id: 'opens',      name: 'It Opens One Eye', desc: 'Summon It.',                          check: s => s.summonings >= 1 },
  { id: 'friends',    name: 'Old Friends',      desc: 'Summon It 5 times.',                  check: s => s.summonings >= 5 },
  { id: 'routine',    name: 'Routine',          desc: 'Summon It 25 times.',                 check: s => s.summonings >= 25 },
  { id: 'hasty',      name: 'Impatient',        desc: 'Tear the veil within 15 minutes of a run starting.', check: s => s.veilTime > 0 && s.veilTime <= 900 },
  { id: 'terms',      name: 'Terms and Conditions', desc: 'Seal a Pact.',                    check: s => s.pacts.length >= 1 },
  { id: 'bound',      name: 'Bound',            desc: 'Seal every Pact.',                    check: s => s.pacts.length >= PACTS.length },
  { id: 'ritualist',  name: 'Ritualist',        desc: 'Know 10 Rites in a single run.',      check: s => s.upgrades.length >= 10 },
  { id: 'liturgist',  name: 'Liturgist',        desc: 'Know every Rite in a single run.',    check: s => s.upgrades.length >= UPGRADES.length },
  { id: 'fell',       name: 'Something Fell Through', desc: 'Catch an apparition.',          check: s => s.stats.apparitions >= 1 },
  { id: 'collector',  name: 'Collector',        desc: 'Catch 25 apparitions.',               check: s => s.stats.apparitions >= 25 },
  { id: 'thin',       name: 'Thin Places',      desc: 'Catch 100 apparitions.',              check: s => s.stats.apparitions >= 100 },
  { id: 'fork',       name: 'A Fork in the Road', desc: 'Answer your madness.',              check: s => s.stats.choices >= 1 },
  { id: 'road',       name: 'The Road Taken',   desc: 'Answer your madness 10 times.',       check: s => s.stats.choices >= 10 },
  { id: 'awake',      name: 'Awakened',         desc: 'Awaken.',                             check: s => s.awakenings >= 1 },
  { id: 'wide',       name: 'Wide Awake',       desc: 'Awaken 3 times.',                     check: s => s.awakenings >= 3 },
  { id: 'iridescent', name: 'Iridescent',       desc: 'Hold 100 Ichor at once.',             check: s => s.ichor >= 100 },
  { id: 'tested',     name: 'Tested',           desc: 'Complete a Trial.',                   check: s => s.challengesDone.length >= 1 },
  { id: 'tempered',   name: 'Tempered',         desc: 'Complete every Trial.',               check: s => s.challengesDone.length >= TRIALS.length },
  { id: 'knot',       name: 'The First Knot',   desc: 'Break a seal.',                       check: s => s.seals.length >= 1 },
  { id: 'unbound',    name: 'Unbound',          desc: 'Break every seal.',                   check: s => s.seals.length >= SEALS.length },
  { id: 'end',        name: 'The End',          desc: 'Reach an ending.',                    check: s => s.endings.length >= 1 },
  { id: 'every',      name: 'Every Road',       desc: 'Reach all three endings.',            check: s => s.endings.length >= ENDINGS.length },
];

// sanity: content lists that other modules index by id should stay unique
for (const list of [GENERATORS, UPGRADES, PACTS, APPARITIONS, SIGILS, MUTATIONS, TRIALS, SEALS, ENDINGS, REVELATIONS]) {
  const ids = list.map(x => x.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate content id: ' + ids.find((x, i) => ids.indexOf(x) !== i));
}
