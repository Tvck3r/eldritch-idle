import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VEIL_GOAL, AWAKEN_FAVOR, REVELATION_BONUS, ACT3_AWAKENINGS } from './constants.js';
import { GENERATORS, CHOICES, BUFFS } from './content.js';
import { SEALS, TRIALS, MUTATIONS } from './content-acts.js';
import { state, setState, freshState, fx } from './state.js';
import { on } from './events.js';
import * as eco from './economy.js';
import * as pre from './prestige.js';
import { migrate } from './save.js';

const [acolyte] = GENERATORS;

beforeEach(() => {
  setState(freshState());
  Object.assign(fx, { summonStart: 0, flash: 0, apparition: null, apparitionTimer: 60, ending: null });
});
afterEach(() => vi.restoreAllMocks());

describe('Act I depth', () => {
  it('has nine follower tiers', () => {
    expect(GENERATORS).toHaveLength(9);
  });

  it('milestones double a follower at 25, 50, 100…', () => {
    state.owned.acolyte = 24;
    const before = eco.genRate(acolyte) / 24;
    state.owned.acolyte = 25;
    expect(eco.genRate(acolyte) / 25).toBeCloseTo(before * 2);
    state.owned.acolyte = 100;
    expect(eco.genRate(acolyte) / 100).toBeCloseTo(before * 8);
    expect(eco.nextMilestone(100)).toBe(200);
  });

  it('synergy rites scale with another tier', () => {
    state.owned.acolyte = 10;
    state.owned.cultist = 50;
    const before = eco.genRate(acolyte);
    state.upgrades.push('sermons');
    expect(eco.genRate(acolyte)).toBeCloseTo(before * 1.5);
  });

  it('revelations unlock once and add to everything', () => {
    state.owned.acolyte = 1;
    const base = eco.wps();
    state.stats.chants = 1;
    eco.checkProgress();
    expect(state.revelations).toContain('first-word');
    expect(eco.wps()).toBeCloseTo(base * (1 + REVELATION_BONUS * state.revelations.length));
    const n = state.revelations.length;
    eco.checkProgress();
    expect(state.revelations).toHaveLength(n);
  });

  it('story beats are told once', () => {
    const lines = [];
    on('log', l => lines.push(l));
    state.owned.acolyte = 1;
    eco.checkProgress();
    eco.checkProgress();
    expect(state.story).toEqual(['first-follower']);
    expect(lines.filter(l => l.includes('first acolyte'))).toHaveLength(1);
  });
});

describe('apparitions and buffs', () => {
  it('spawn on a timer during live play, and fade if not caught', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fx.apparitionTimer = 1;
    eco.tick(1.01);
    expect(fx.apparition).not.toBeNull();
    eco.tick(fx.apparition.life + 0.1);
    expect(fx.apparition).toBeNull();
  });

  it('never spawn while away', () => {
    fx.apparitionTimer = 1;
    eco.catchUp(3600);
    expect(fx.apparition).toBeNull();
  });

  it('a wrong-colored star gives a frenzy that runs out', () => {
    state.owned.acolyte = 10;
    const base = eco.wps();
    eco.spawnApparition('star');
    expect(eco.catchApparition()).toBe(true);
    expect(state.stats.apparitions).toBe(1);
    expect(eco.wps()).toBeCloseTo(base * 5);
    eco.catchUp(BUFFS.frenzy.time + 1);
    expect(state.buffs).toHaveLength(0);
    expect(eco.catchApparition()).toBe(false); // nothing left to catch
  });

  it('a shadow grants whispers', () => {
    eco.spawnApparition('shadow');
    eco.catchApparition();
    expect(state.whispers).toBeGreaterThan(0);
  });
});

describe('madness choices', () => {
  it('a question waits for an answer, which shifts your alignment', () => {
    expect(eco.askChoice('door')).toBe(true);
    expect(state.pendingChoice).toBe('door');
    expect(eco.answerChoice(1)).toBe(true);
    expect(state.pendingChoice).toBeNull();
    expect(state.alignment.defiance).toBe(1);
    expect(state.choicesMade.door).toBe(1);
    expect(eco.answerChoice(0)).toBe(false); // nothing pending
  });

  it('each question is asked once, ever', () => {
    for (const c of CHOICES) { eco.askChoice(c.id); eco.answerChoice(0); }
    expect(eco.askChoice()).toBe(false);
  });

  it('madness sometimes asks instead of striking', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    eco.madnessEvent();
    expect(state.pendingChoice).not.toBeNull();
    expect(state.stats.madnessEvents).toBe(1);
  });
});

describe('Act II: awakening', () => {
  it('needs enough Favor earned since the last awakening', () => {
    state.favorEarned = AWAKEN_FAVOR - 1;
    expect(pre.canAwaken()).toBe(false);
    state.favorEarned = AWAKEN_FAVOR;
    expect(pre.signsGain()).toBe(3);
    expect(pre.signsGain(AWAKEN_FAVOR * 4)).toBe(6);
  });

  it('resets Favor, Pacts and Ichor but keeps Elder Signs, revelations and choices', () => {
    Object.assign(state, { favor: 40, favorEarned: AWAKEN_FAVOR, pacts: ['deepchant'], ichor: 50, summonings: 7 });
    state.revelations.push('opens');
    state.choicesMade.door = 0;
    state.owned.cultist = 30;
    expect(pre.awaken()).toBe(3);
    expect(state.favor).toBe(0);
    expect(state.pacts).toEqual([]);
    expect(state.ichor).toBe(0);
    expect(state.owned.cultist).toBe(0);
    expect(state.elderSigns).toBe(3);
    expect(state.awakenings).toBe(1);
    expect(state.summonings).toBe(7);
    expect(state.revelations).toContain('opens');
    expect(state.choicesMade.door).toBe(0);
  });

  it('Sigil of Memory keeps pacts; Covenant grants two', () => {
    Object.assign(state, { favorEarned: AWAKEN_FAVOR, pacts: ['faithful'], sigils: ['memory', 'covenant'] });
    pre.awaken();
    expect(state.pacts).toEqual(expect.arrayContaining(['faithful', 'deepchant', 'steadfast']));
  });

  it('Elder Signs ever earned raise Favor gained', () => {
    state.totalEarned = VEIL_GOAL;
    expect(eco.favorGain()).toBe(10);
    state.elderSignsTotal = 4;
    expect(eco.favorGain()).toBe(20);
  });

  it('sigils cost Elder Signs and switch their automation on', () => {
    state.elderSigns = 2;
    expect(pre.buySigil('rote')).toBe(true);
    expect(state.auto.rites).toBe(true);
    expect(pre.buySigil('rote')).toBe(false);
    expect(state.elderSigns).toBe(0);
  });

  it('automation performs rites on its own', () => {
    Object.assign(state, { sigils: ['rote'], whispers: 1000, totalEarned: 1000 });
    state.auto.rites = true;
    eco.tick(1);
    expect(state.upgrades).toContain('syllables');
  });
});

describe('Act II: ichor and mutations', () => {
  it('only weeps after an awakening, and only when sanity is low', () => {
    state.owned.cultist = 100;
    state.sanity = 0;
    expect(eco.ichorRate()).toBe(0);
    state.awakenings = 1;
    expect(eco.ichorRate()).toBeGreaterThan(0);
    state.sanity = 80;
    expect(eco.ichorRate()).toBe(0);
  });

  it('mutations level up and grow in cost', () => {
    const mu = MUTATIONS.find(x => x.id === 'flesh');
    state.ichor = 1000;
    const c0 = pre.mutationCost('flesh');
    expect(c0).toBe(mu.baseCost);
    expect(pre.buyMutation('flesh')).toBe(true);
    expect(pre.mutationLevel('flesh')).toBe(1);
    expect(pre.mutationCost('flesh')).toBeGreaterThan(c0);
  });

  it('capped mutations stop at their max', () => {
    state.ichor = 1e9;
    for (let i = 0; i < 20; i++) pre.buyMutation('mind');
    expect(pre.mutationLevel('mind')).toBe(MUTATIONS.find(x => x.id === 'mind').max);
  });
});

describe('Act II: trials', () => {
  beforeEach(() => { state.awakenings = 1; });

  it('Trial of Silence forbids chanting', () => {
    expect(pre.startTrial('silence')).toBe(true);
    expect(eco.chant()).toBe(false);
    expect(eco.clickValue()).toBe(0);
  });

  it('Trial of the Edge holds sanity at 10%', () => {
    pre.startTrial('edge');
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    eco.tick(1);
    expect(state.sanity).toBe(10);
    expect(eco.steadyMind()).toBe(false);
  });

  it('Trial of One Faith bars every follower but the first chosen', () => {
    pre.startTrial('onefaith');
    state.whispers = 1e6;
    expect(eco.buyGenerator('cultist', 1)).toBe(true);
    expect(eco.buyGenerator('acolyte', 1)).toBe(false);
  });

  it('Trial of the Faithless forbids rites', () => {
    pre.startTrial('faithless');
    Object.assign(state, { whispers: 1e6, totalEarned: 1e6 });
    expect(eco.buyUpgrade('syllables')).toBe(false);
  });

  it('reaching the goal passes the trial: the rule lifts, the run goes on, the reward lasts', () => {
    pre.startTrial('silence');
    state.owned.acolyte = 10;
    const base = eco.wps();
    state.totalEarned = TRIALS.find(t => t.id === 'silence').goal;
    eco.checkProgress();
    expect(state.challenge).toBeNull();
    expect(state.challengesDone).toEqual(['silence']);
    expect(state.owned.acolyte).toBe(10);           // same run
    expect(eco.chant()).toBe(true);                  // rule lifted
    state.revelations = [];
    expect(eco.wps() / base).toBeCloseTo(1.5);       // reward
  });

  it('Trial of One Faith reveals every tier', () => {
    pre.startTrial('onefaith');
    expect(GENERATORS.every(g => eco.isRevealed(g))).toBe(true);
  });

  it('cannot start a trial before awakening, or two at once', () => {
    state.awakenings = 0;
    expect(pre.startTrial('silence')).toBe(false);
    state.awakenings = 1;
    pre.startTrial('silence');
    expect(pre.startTrial('edge')).toBe(false);
    expect(pre.abandonTrial()).toBe(true);
    expect(state.challenge).toBeNull();
  });

  it('every trial has a rule and a reward', () => {
    for (const t of TRIALS) {
      expect(typeof t.ruleApply).toBe('function');
      expect(typeof t.rewardApply).toBe('function');
    }
  });
});

describe('Act III: seals and endings', () => {
  beforeEach(() => { state.awakenings = ACT3_AWAKENINGS; });

  it('a seal needs its feat and its offering', () => {
    const flesh = SEALS.find(s => s.id === 'flesh');
    state.whispers = flesh.cost;
    expect(pre.canBreakSeal('flesh')).toBe(false); // no followers
    state.owned.acolyte = 1000;
    expect(pre.breakSeal('flesh')).toBe(true);
    expect(state.whispers).toBe(0);
    expect(pre.breakSeal('flesh')).toBe(false);
  });

  it('each broken seal doubles everything', () => {
    state.owned.acolyte = 10;
    const base = eco.wps();
    state.seals = ['flesh', 'mind'];
    expect(eco.wps()).toBeCloseTo(base * 4);
  });

  it('the seals are hidden before Act III', () => {
    state.awakenings = 2;
    state.owned.acolyte = 1000;
    state.whispers = 1e24;
    expect(pre.canBreakSeal('flesh')).toBe(false);
  });

  it('the Last Seal opens the finale; the leaning ending is offered', () => {
    state.seals = SEALS.slice(0, 6).map(s => s.id);
    state.whispers = 1e24;
    state.alignment = { devotion: 1, defiance: 4, hunger: 0 };
    expect(pre.breakSeal('name')).toBe(true);
    expect(state.finale).toBe(true);
    expect(pre.availableEndings().map(e => e.id)).toEqual(['betrayer']);
    expect(pre.chooseEnding('prophet')).toBe(false);
    expect(pre.chooseEnding('betrayer')).toBe(true);
    expect(state.endings).toEqual(['betrayer']);
    expect(fx.ending.id).toBe('betrayer');
  });

  it('strong leanings open more than one road', () => {
    state.alignment = { devotion: 5, defiance: 3, hunger: 1 };
    expect(pre.availableEndings().map(e => e.id)).toEqual(['prophet', 'betrayer']);
  });

  it('New Game+ starts over with the ending\'s mark and a bonus', () => {
    Object.assign(state, { ending: 'prophet', endings: ['prophet'], favor: 99, seals: ['flesh'], awakenings: 4 });
    state.revelations.push('end');
    expect(pre.newGamePlus()).toBe(true);
    expect(state.ngPlus).toBe(1);
    expect(state.ngMods).toEqual(['prophet']);
    expect(state.favor).toBe(0);
    expect(state.seals).toEqual([]);
    expect(state.awakenings).toBe(0);
    expect(state.revelations).toContain('end');
    state.owned.acolyte = 10;
    const ng = eco.wps();
    state.ngPlus = 0;
    expect(ng / eco.wps()).toBeCloseTo(2);
  });

  it('keep dreaming: endless depths, each tripling everything', () => {
    state.ending = 'vessel';
    expect(pre.dreamDeeper()).toBe(false);
    pre.keepDreaming();
    state.whispers = pre.depthCost();
    expect(pre.dreamDeeper()).toBe(true);
    expect(state.depth).toBe(1);
    expect(pre.depthCost()).toBeGreaterThan(state.whispers);
  });
});

describe('saves', () => {
  it('a v2 save (before the acts) loads with every new field filled in', () => {
    const v2 = { v: 2, state: { ...freshState(), whispers: 5 } };
    for (const k of ['revelations', 'alignment', 'auto', 'seals', 'sigils', 'mutations', 'buffs']) delete v2.state[k];
    delete v2.state.owned.moon;
    const s = migrate(JSON.parse(JSON.stringify(v2)));
    expect(s.whispers).toBe(5);
    expect(s.alignment).toEqual({ devotion: 0, defiance: 0, hunger: 0 });
    expect(s.auto.summonAt).toBe(50);
    expect(s.owned.moon).toBe(0);
    expect(s.seals).toEqual([]);
  });
});
