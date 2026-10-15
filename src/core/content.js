// ============================================================
// CONTENT — add content here. Logic and UI read from these lists.
// ============================================================

export const GENERATORS = [
  { id: 'acolyte',  name: 'Acolyte',            desc: 'Mumbles in their sleep.',            baseCost: 15,    rate: 0.1,  drain: 0 },
  { id: 'cultist',  name: 'Cultist',            desc: 'Chants with conviction.',            baseCost: 100,   rate: 1,    drain: 0 },
  { id: 'circle',   name: 'Ritual Circle',      desc: 'Salt, chalk, and something wet.',    baseCost: 1100,  rate: 8,    drain: 0.03 },
  { id: 'library',  name: 'Forbidden Library',  desc: 'The books read themselves aloud.',   baseCost: 12000, rate: 47,   drain: 0.08 },
  { id: 'temple',   name: 'Drowned Temple',     desc: 'Prayers bubble up from below.',      baseCost: 130000, rate: 260, drain: 0.2 },
  { id: 'city',     name: 'Dreaming City',      desc: 'An entire population, dreaming of It.', baseCost: 1.4e6, rate: 1400, drain: 0.5 },
];

// unlock(state) -> bool; apply(mods) mutates the modifier object
export const UPGRADES = [
  { id: 'syllables', name: 'Guttural Syllables', desc: 'Chanting is twice as effective.', cost: 100,
    unlock: s => s.totalEarned >= 50, apply: m => { m.click *= 2; } },
  { id: 'robes', name: 'Black Robes', desc: 'Acolytes x2.', cost: 200,
    unlock: s => s.owned.acolyte >= 5, apply: m => { m.gen.acolyte *= 2; } },
  { id: 'tithe', name: 'Tithe of Blood', desc: 'Cultists x2.', cost: 1500,
    unlock: s => s.owned.cultist >= 5, apply: m => { m.gen.cultist *= 2; } },
  { id: 'echo', name: 'Echoing Chant', desc: 'Each chant also yields 2% of whispers/sec.', cost: 5000,
    unlock: s => s.totalEarned >= 2000, apply: m => { m.clickWpsPct += 0.02; } },
  { id: 'chalk', name: 'Bone Chalk', desc: 'Ritual Circles x2.', cost: 15000,
    unlock: s => s.owned.circle >= 5, apply: m => { m.gen.circle *= 2; } },
  { id: 'ink', name: 'Ink of the Deep', desc: 'Forbidden Libraries x2.', cost: 150000,
    unlock: s => s.owned.library >= 5, apply: m => { m.gen.library *= 2; } },
  { id: 'geometry', name: 'Non-Euclidean Geometry', desc: 'All followers x1.5.', cost: 1e6,
    unlock: s => s.totalEarned >= 300000, apply: m => { m.all *= 1.5; } },
  { id: 'tides', name: 'Wrong Tides', desc: 'Drowned Temples x2.', cost: 2e6,
    unlock: s => s.owned.temple >= 5, apply: m => { m.gen.temple *= 2; } },
  { id: 'dreams', name: 'Shared Dreams', desc: 'Dreaming Cities x2.', cost: 2e7,
    unlock: s => s.owned.city >= 5, apply: m => { m.gen.city *= 2; } },
];

// Permanent perks bought with Eldritch Favor; they survive summonings.
// Spent Favor no longer boosts production — that's the tradeoff.
export const PACTS = [
  { id: 'deepchant',  name: 'Voice From Below',     desc: 'Chanting x5, forever.',                        cost: 2,
    apply: m => { m.click *= 5; } },
  { id: 'firstborn',  name: 'Pact of the Firstborn', desc: 'Begin each run with 10 Acolytes.',            cost: 3 },
  { id: 'steadfast',  name: 'Iron Mind',            desc: 'Sanity drains half as fast.',                  cost: 5 },
  { id: 'congregation', name: 'The Congregation',   desc: 'Begin each run with 10 Cultists.',             cost: 8 },
  { id: 'faithful',   name: 'The Faithful Multiply', desc: 'Followers recruit themselves (auto-buy cheapest).', cost: 15 },
  { id: 'remembered', name: 'Rites Remembered',     desc: 'Keep all Rites when you summon.',              cost: 25 },
];

// fire(state, api) mutates state and returns the log line.
// api = { topFollower, wps, earn, fmt } so content stays free of logic imports.
export const MADNESS_EVENTS = [
  (s, { topFollower }) => {
    const g = topFollower(); if (!g) return 'You scream into an empty room.';
    const lost = Math.max(1, Math.floor(s.owned[g.id] * 0.1)); s.owned[g.id] -= lost;
    return `${lost} ${g.name}${lost > 1 ? 's' : ''} walked into the sea, smiling.`;
  },
  (s, { fmt }) => {
    const lost = s.whispers * 0.25; s.whispers -= lost;
    return `The whispers turned on you. ${fmt(lost)} of them are gone.`;
  },
  (s, { wps, earn, fmt }) => {
    const gain = wps() * 60; earn(gain);
    return `A vision! You glimpse the shape of It. (+${fmt(gain)})`;
  },
  () => 'You lost an hour. There is chalk under your fingernails.',
];

// Flavor text fired once (ever) when a run's totalEarned crosses the threshold
export const OMENS = [
  [0,     'You hear something beneath the floorboards. It is listening.'],
  [100,   'The candles lean toward you.'],
  [1000,  'Dogs in the neighborhood have stopped barking.'],
  [1e4,   'The stars outside are not quite where they were.'],
  [1e5,   'Your reflection blinks a moment too late.'],
  [1e6,   'The sea is rising, though the moon is new.'],
  [1e7,   'Geometry fails in the corners of the room.'],
  [1e8,   'It knows your name now. It is saying it back.'],
  [5e8,   'The veil is thin as paper. Something presses against it.'],
];

// Logged after each summoning; the last line repeats forever
export const SUMMON_LINES = [
  'It opened one eye. Everything you built is gone. It remembers you.',
  'It came closer this time. The world forgot, but you did not.',
  'Again it looks through. Again the world is unmade around you.',
  'You have done this before. You will do it again. It is pleased.',
];
