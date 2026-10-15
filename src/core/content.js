// ============================================================
// CONTENT (Act I) — add content here. Logic and UI read from these lists.
// Act II/III content lives in content-acts.js.
//
// Modifier functions get (m, s): m is the modifier object built in
// economy.modifiers(), s is the state. They multiply/add fields of m.
// ============================================================

export const GENERATORS = [
  { id: 'acolyte',  name: 'Acolyte',            desc: 'Mumbles in their sleep.',                 baseCost: 15,     rate: 0.1,    drain: 0 },
  { id: 'cultist',  name: 'Cultist',            desc: 'Chants with conviction.',                 baseCost: 100,    rate: 1,      drain: 0 },
  { id: 'circle',   name: 'Ritual Circle',      desc: 'Salt, chalk, and something wet.',         baseCost: 1100,   rate: 8,      drain: 0.03 },
  { id: 'library',  name: 'Forbidden Library',  desc: 'The books read themselves aloud.',        baseCost: 12000,  rate: 47,     drain: 0.08 },
  { id: 'temple',   name: 'Drowned Temple',     desc: 'Prayers bubble up from below.',           baseCost: 130000, rate: 260,    drain: 0.2 },
  { id: 'city',     name: 'Dreaming City',      desc: 'An entire population, dreaming of It.',   baseCost: 1.4e6,  rate: 1400,   drain: 0.5 },
  { id: 'spire',    name: 'Impossible Spire',   desc: 'It is taller on the inside.',             baseCost: 2e7,    rate: 7800,   drain: 0.8 },
  { id: 'choir',    name: 'Star Choir',         desc: 'The constellations sing along.',          baseCost: 3.3e8,  rate: 44000,  drain: 1.5 },
  { id: 'moon',     name: 'Drowned Moon',       desc: 'A second moon, rising from the sea.',     baseCost: 5.1e9,  rate: 260000, drain: 3 },
];

// Owning this many of one follower doubles that follower's output (each threshold stacks)
export const MILESTONES = [25, 50, 100, 200, 300, 400, 500, 750, 1000];

const tier = id => (m, k) => { m.gen[id] *= k; };
const per = (target, source, pct) => (m, s) => { m.gen[target] *= 1 + pct * s.owned[source]; };

// unlock(state) -> bool; apply(m, s) mutates the modifier object
export const UPGRADES = [
  // chanting
  { id: 'syllables', name: 'Guttural Syllables', desc: 'Chanting is twice as effective.', cost: 100,
    unlock: s => s.totalEarned >= 50, apply: m => { m.click *= 2; } },
  { id: 'ceaseless', name: 'Ceaseless Chant', desc: 'Hold Chant to keep chanting, 8 times a second.', cost: 500,
    unlock: s => s.totalEarned >= 250, apply: m => { m.hold = true; } },
  { id: 'echo', name: 'Echoing Chant', desc: 'Each chant also yields 2% of whispers/sec.', cost: 5000,
    unlock: s => s.totalEarned >= 2000, apply: m => { m.clickWpsPct += 0.02; } },
  { id: 'tongues', name: 'Speaking in Tongues', desc: 'Each chant yields another 3% of whispers/sec.', cost: 2e5,
    unlock: s => s.totalEarned >= 1e5, apply: m => { m.clickWpsPct += 0.03; } },
  { id: 'throat', name: 'Throat of the Deep', desc: 'Chanting ×5.', cost: 5e7,
    unlock: s => s.totalEarned >= 1e7, apply: m => { m.click *= 5; } },
  { id: 'chorus', name: 'The Chorus Joins', desc: 'Chanting +1% for every follower you own.', cost: 1e9,
    unlock: s => s.totalEarned >= 3e8, apply: (m, s) => { m.click *= 1 + 0.01 * Object.values(s.owned).reduce((a, b) => a + b, 0); } },

  // each tier ×2
  { id: 'robes', name: 'Black Robes', desc: 'Acolytes ×2.', cost: 200, unlock: s => s.owned.acolyte >= 5, apply: m => tier('acolyte')(m, 2) },
  { id: 'tithe', name: 'Tithe of Blood', desc: 'Cultists ×2.', cost: 1500, unlock: s => s.owned.cultist >= 5, apply: m => tier('cultist')(m, 2) },
  { id: 'chalk', name: 'Bone Chalk', desc: 'Ritual Circles ×2.', cost: 15000, unlock: s => s.owned.circle >= 5, apply: m => tier('circle')(m, 2) },
  { id: 'ink', name: 'Ink of the Deep', desc: 'Forbidden Libraries ×2.', cost: 150000, unlock: s => s.owned.library >= 5, apply: m => tier('library')(m, 2) },
  { id: 'tides', name: 'Wrong Tides', desc: 'Drowned Temples ×2.', cost: 2e6, unlock: s => s.owned.temple >= 5, apply: m => tier('temple')(m, 2) },
  { id: 'dreams', name: 'Shared Dreams', desc: 'Dreaming Cities ×2.', cost: 2e7, unlock: s => s.owned.city >= 5, apply: m => tier('city')(m, 2) },
  { id: 'angles', name: 'Wrong Angles', desc: 'Impossible Spires ×2.', cost: 2e8, unlock: s => s.owned.spire >= 5, apply: m => tier('spire')(m, 2) },
  { id: 'harmony', name: 'Dissonant Harmony', desc: 'Star Choirs ×2.', cost: 3e9, unlock: s => s.owned.choir >= 5, apply: m => tier('choir')(m, 2) },
  { id: 'pull', name: 'Pull of the Moon', desc: 'Drowned Moons ×2.', cost: 5e10, unlock: s => s.owned.moon >= 5, apply: m => tier('moon')(m, 2) },

  // each tier ×3, later
  { id: 'hymnal', name: 'Hymnal of Teeth', desc: 'Acolytes ×3.', cost: 5000, unlock: s => s.owned.acolyte >= 25, apply: m => tier('acolyte')(m, 3) },
  { id: 'zeal', name: 'Fevered Zeal', desc: 'Cultists ×3.', cost: 50000, unlock: s => s.owned.cultist >= 25, apply: m => tier('cultist')(m, 3) },
  { id: 'salt', name: 'Salt of Ages', desc: 'Ritual Circles ×3.', cost: 5e5, unlock: s => s.owned.circle >= 25, apply: m => tier('circle')(m, 3) },
  { id: 'index', name: 'The Black Index', desc: 'Forbidden Libraries ×3.', cost: 5e6, unlock: s => s.owned.library >= 25, apply: m => tier('library')(m, 3) },
  { id: 'pressure', name: 'Crushing Depths', desc: 'Drowned Temples ×3.', cost: 5e7, unlock: s => s.owned.temple >= 25, apply: m => tier('temple')(m, 3) },
  { id: 'census', name: 'The Dreaming Census', desc: 'Dreaming Cities ×3.', cost: 5e8, unlock: s => s.owned.city >= 25, apply: m => tier('city')(m, 3) },

  // synergies: one tier feeds the next
  { id: 'sermons', name: 'Midnight Sermons', desc: 'Acolytes +1% for each Cultist.', cost: 20000,
    unlock: s => s.owned.cultist >= 10, apply: per('acolyte', 'cultist', 0.01) },
  { id: 'circlework', name: 'Circlework', desc: 'Cultists +1% for each Ritual Circle.', cost: 2e5,
    unlock: s => s.owned.circle >= 10, apply: per('cultist', 'circle', 0.01) },
  { id: 'marginalia', name: 'Marginalia', desc: 'Ritual Circles +1% for each Forbidden Library.', cost: 2e6,
    unlock: s => s.owned.library >= 10, apply: per('circle', 'library', 0.01) },
  { id: 'flooded', name: 'Flooded Stacks', desc: 'Forbidden Libraries +1% for each Drowned Temple.', cost: 2e7,
    unlock: s => s.owned.temple >= 10, apply: per('library', 'temple', 0.01) },
  { id: 'pilgrims', name: 'Pilgrims of Sleep', desc: 'Drowned Temples +1% for each Dreaming City.', cost: 2e8,
    unlock: s => s.owned.city >= 10, apply: per('temple', 'city', 0.01) },
  { id: 'skyline', name: 'Impossible Skyline', desc: 'Dreaming Cities +2% for each Impossible Spire.', cost: 4e9,
    unlock: s => s.owned.spire >= 10, apply: per('city', 'spire', 0.02) },

  // everything
  { id: 'geometry', name: 'Non-Euclidean Geometry', desc: 'All followers ×1.5.', cost: 1e6,
    unlock: s => s.totalEarned >= 300000, apply: m => { m.all *= 1.5; } },
  { id: 'unspeakable', name: 'The Unspeakable Word', desc: 'All followers ×2.', cost: 5e9,
    unlock: s => s.totalEarned >= 1e9, apply: m => { m.all *= 2; } },

  // the mind
  { id: 'calm', name: 'Laughing Calm', desc: 'Sanity drains 25% slower.', cost: 1e6,
    unlock: s => s.stats.minSanity < 50, apply: m => { m.drain *= 0.75; } },
  { id: 'embrace', name: 'Embrace the Abyss', desc: 'Madness empowers you 50% more.', cost: 1e8,
    unlock: s => s.stats.minSanity < 10, apply: m => { m.madMax *= 1.5; } },

  // apparitions
  { id: 'lures', name: 'Lantern of Lures', desc: 'Apparitions appear 30% more often.', cost: 1e5,
    unlock: s => s.stats.apparitions >= 3, apply: m => { m.apparitionRate *= 1.3; } },
  { id: 'feast', name: 'Feast of Shadows', desc: 'Apparitions grant twice as much.', cost: 1e7,
    unlock: s => s.stats.apparitions >= 10, apply: m => { m.apparitionPower *= 2; } },
];

// Permanent perks bought with Eldritch Favor; they survive summonings.
// Spent Favor no longer boosts production — that's the tradeoff.
export const PACTS = [
  { id: 'deepchant',  name: 'Voice From Below',     desc: 'Chanting ×5, forever.',                        cost: 2,
    apply: m => { m.click *= 5; } },
  { id: 'firstborn',  name: 'Pact of the Firstborn', desc: 'Begin each run with 10 Acolytes.',            cost: 3 },
  { id: 'steadfast',  name: 'Iron Mind',            desc: 'Sanity drains half as fast.',                  cost: 5,
    apply: m => { m.drain *= 0.5; } },
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

// ---------- apparitions: tappable things in the scene ----------
// where: 'sky' (high up) or 'ground' (near the circle). weight = how often.
// grant(api) applies the reward and returns the log line.
export const APPARITIONS = [
  { id: 'star', name: 'A Wrong-Colored Star', where: 'sky', weight: 3,
    grant: ({ addBuff }) => { addBuff('frenzy'); return 'You pluck the wrong star from the sky. Your followers are frenzied!'; } },
  { id: 'shadow', name: 'A Shadow at the Edge', where: 'ground', weight: 3,
    grant: ({ s, wps, clickValue, earn, fmt, power }) => {
      const gain = (Math.min(s.whispers * 0.2, wps() * 900) + clickValue() * 30) * power;
      earn(gain);
      return `The shadow leaves something behind as it flees. (+${fmt(gain)})`;
    } },
  { id: 'mouth', name: 'A Mouth in the Wall', where: 'ground', weight: 2,
    grant: ({ addBuff }) => { addBuff('tongue'); return 'The mouth teaches you a word. Your chant is enormous.'; } },
  { id: 'moth', name: 'A Pale Moth', where: 'sky', weight: 2,
    grant: ({ s, addBuff }) => { s.sanity = Math.min(100, s.sanity + 30); addBuff('calm'); return 'The moth lands on your tongue. Your mind is quiet.'; } },
  { id: 'eye', name: 'An Opening Eye', where: 'sky', weight: 1, unlock: s => s.summonings > 0,
    grant: ({ addBuff }) => { addBuff('gaze'); return 'It looks at you directly. Madness pours in like light.'; } },
];
export const APPARITION_LIFE = 12;            // seconds before it fades
export const APPARITION_INTERVAL = [45, 110]; // seconds between apparitions (min, max), before modifiers

// Temporary effects. Durations in seconds (scaled by apparition power).
export const BUFFS = {
  frenzy: { name: 'Frenzy', desc: 'Followers ×5', time: 30, apply: m => { m.all *= 5; } },
  tongue: { name: 'Black Tongue', desc: 'Chanting ×15', time: 20, apply: m => { m.click *= 15; } },
  calm:   { name: 'Stillness', desc: 'No sanity drain', time: 60, apply: m => { m.drain = 0; } },
  gaze:   { name: 'Its Gaze', desc: 'Madness bonus ×2', time: 30, apply: m => { m.madMax *= 2; } },
  zeal:   { name: 'Zeal', desc: 'Followers ×2', time: 60, apply: m => { m.all *= 2; } },
};

// ---------- madness choices ----------
// Some madness episodes ask a question instead. Each is asked once, ever,
// and the answer leans you toward an ending: devotion (Its prophet),
// defiance (betray It) or hunger (become It).
// option.effect(api) -> log line; api = { s, wps, earn, addBuff, topFollower, fmt }
export const CHOICES = [
  { id: 'name', text: 'A voice offers you a name. It is not yours. Speak it?', options: [
    { label: 'Speak the name', align: 'hunger', effect: ({ s, wps, earn, fmt }) => { const g = wps() * 120; earn(g); s.sanity = Math.max(0, s.sanity - 15); return `Your mouth fills with the taste of copper. (+${fmt(g)})`; } },
    { label: 'Bite your tongue', align: 'defiance', effect: ({ s }) => { s.sanity = Math.min(100, s.sanity + 20); return 'The voice sighs, and waits.'; } },
  ] },
  { id: 'door', text: 'A door has appeared in your cellar. It is warm to the touch.', options: [
    { label: 'Open it', align: 'devotion', effect: ({ s, topFollower }) => { const g = topFollower(); if (g) s.owned[g.id] += Math.max(1, Math.ceil(s.owned[g.id] * 0.1)); return 'Something walks out wearing a follower\'s face. It kneels.'; } },
    { label: 'Brick it up', align: 'defiance', effect: ({ s }) => { s.sanity = Math.min(100, s.sanity + 25); s.whispers *= 0.95; return 'The bricks are warm too. You do not think about it.'; } },
  ] },
  { id: 'drawing', text: 'A child of the congregation shows you a drawing. It is you, but with too many eyes.', options: [
    { label: 'Praise it', align: 'devotion', effect: ({ addBuff }) => { addBuff('zeal'); return 'The congregation weeps with joy. They work twice as hard.'; } },
    { label: 'Burn it', align: 'defiance', effect: ({ s }) => { s.sanity = Math.min(100, s.sanity + 30); return 'The smoke smells like the sea.'; } },
  ] },
  { id: 'mirror', text: 'Your reflection asks to trade places, just for a while.', options: [
    { label: 'Let it', align: 'hunger', effect: ({ s, addBuff }) => { s.sanity = 0; addBuff('gaze'); return 'You watch yourself from behind the glass. You look happy.'; } },
    { label: 'Shatter the mirror', align: 'defiance', effect: ({ s }) => { s.sanity = Math.min(100, s.sanity + 30); return 'Seven years. You have less than that.'; } },
  ] },
  { id: 'feast', text: 'The congregation has prepared a feast. The meat is still singing.', options: [
    { label: 'Eat', align: 'hunger', effect: ({ addBuff }) => { addBuff('frenzy'); return 'The song continues inside you.'; } },
    { label: 'Bless it, and let them eat', align: 'devotion', effect: ({ addBuff }) => { addBuff('zeal'); return 'They eat. They sing. You are adored.'; } },
  ] },
  { id: 'letter', text: 'A letter arrives in your mother\'s handwriting. She has been dead for years. It asks you to stop.', options: [
    { label: 'Stop, for a moment', align: 'defiance', effect: ({ s }) => { s.sanity = 100; s.whispers *= 0.8; return 'You sit with the letter until morning. Something is lost. Something is kept.'; } },
    { label: 'Burn the letter', align: 'devotion', effect: ({ wps, earn, fmt }) => { const g = wps() * 300; earn(g); return `It burns green. The followers cheer. (+${fmt(g)})`; } },
  ] },
  { id: 'eyes', text: 'A follower has put out his eyes so that he might see It. Others are reaching for spoons.', options: [
    { label: 'Encourage them', align: 'devotion', effect: ({ s, addBuff }) => { addBuff('frenzy'); s.sanity = Math.max(0, s.sanity - 10); return 'They see It now. They will not stop describing It.'; } },
    { label: 'Stop them', align: 'defiance', effect: ({ s }) => { s.sanity = Math.min(100, s.sanity + 20); return 'You take the spoons. Some of them will hate you for it.'; } },
  ] },
  { id: 'hunger', text: 'You are hungry, but not for food.', options: [
    { label: 'Feed', align: 'hunger', effect: ({ s, topFollower, earn, fmt, wps }) => { const g = topFollower(); const gain = wps() * 200; if (g) s.owned[g.id] = Math.floor(s.owned[g.id] * 0.95); earn(gain); return `Fewer followers come back from the feast. (+${fmt(gain)})`; } },
    { label: 'Starve it', align: 'defiance', effect: ({ s }) => { s.sanity = Math.min(100, s.sanity + 20); return 'It gnaws, and gnaws, and does not stop.'; } },
  ] },
  { id: 'stars', text: 'The stars rearrange themselves into a question: WHO ARE YOU?', options: [
    { label: '"Its servant."', align: 'devotion', effect: ({ addBuff }) => { addBuff('zeal'); return 'The stars approve. They will remember.'; } },
    { label: '"Myself."', align: 'defiance', effect: ({ s }) => { s.sanity = Math.min(100, s.sanity + 25); return 'The stars go out, one by one, and then come back.'; } },
    { label: '"It."', align: 'hunger', effect: ({ addBuff }) => { addBuff('gaze'); return 'The stars laugh. It is not a kind sound. It is not unkind.'; } },
  ] },
  { id: 'prayer', text: 'Someone in the city is praying for you to fail. You can hear them through the walls.', options: [
    { label: 'Find them', align: 'devotion', effect: ({ s }) => { s.owned.cultist += 5; return 'They pray for you now. Five of them.'; } },
    { label: 'Pray with them', align: 'defiance', effect: ({ s }) => { s.sanity = Math.min(100, s.sanity + 25); return 'For a moment, the walls are just walls.'; } },
  ] },
  { id: 'crown', text: 'Your followers have woven you a crown from their hair.', options: [
    { label: 'Wear it', align: 'hunger', effect: ({ addBuff }) => { addBuff('frenzy'); return 'It fits as if it grew there. Perhaps it did.'; } },
    { label: 'Lay it on the altar', align: 'devotion', effect: ({ addBuff }) => { addBuff('zeal'); return 'It is not your crown. It was never your crown.'; } },
  ] },
  { id: 'sleep', text: 'For the first time in weeks, you could sleep. Really sleep.', options: [
    { label: 'Sleep', align: 'defiance', effect: ({ s }) => { s.sanity = 100; return 'You dream of nothing at all. It is the best night of your life.'; } },
    { label: 'Keep watch', align: 'devotion', effect: ({ wps, earn, fmt }) => { const g = wps() * 180; earn(g); return `You keep the vigil. The circle hums. (+${fmt(g)})`; } },
  ] },
];
export const CHOICE_CHANCE = 0.35; // share of madness episodes that ask a question (while any remain)

// ---------- omens & story ----------

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

// Story beats: fired once (ever) when `when` first holds. They carry the arc across all three acts.
export const STORY = [
  { id: 'first-follower', when: s => s.owned.acolyte > 0, text: 'Your first acolyte asks what you are praying to. You find you do not know its name.' },
  { id: 'first-madness', when: s => s.stats.madnessEvents > 0, text: 'Since the first episode, the house hums at night. A low note, just below hearing.' },
  { id: 'first-summon', when: s => s.summonings >= 1, text: 'It looked at you. Only you. The world reset around you like a held breath, but you remember.' },
  { id: 'third-summon', when: s => s.summonings >= 3, text: 'Each time It comes closer, It stays longer. You are beginning to think It is not coming through. It is waking up.' },
  { id: 'first-pact', when: s => s.pacts.length > 0, text: 'The pact is signed in something that was once ink. You do not remember holding the pen.' },
  { id: 'apparition', when: s => s.stats.apparitions > 0, text: 'Things leak through the thin places now. Some of them are gifts.' },
  { id: 'abyss', when: s => s.stats.minSanity <= 0, text: 'At the bottom of your mind there is a door, and It is on the other side, and It is knocking politely.' },
  { id: 'moon', when: s => s.owned.moon > 0, text: 'A second moon rises from the sea. The tides do not know which one to obey.' },
  { id: 'awakening-near', when: s => s.favorEarned >= 100 && s.awakenings === 0, text: 'Its Favor sits heavy on you. It is not enough to be noticed. You could ask to be woken.' },
  { id: 'first-awakening', when: s => s.awakenings >= 1, text: 'Everything is gone again, even Its Favor. But you hold Elder Signs now, and the drowned city has risen to meet you.' },
  { id: 'ichor', when: s => s.ichor > 0, text: 'Your madness weeps something dark and iridescent. It is worth more than whispers.' },
  { id: 'trials', when: s => s.challengesDone.length > 0, text: 'You have been tested. It is not the last time.' },
  { id: 'act3', when: s => s.awakenings >= 3, text: 'Seven seals hold It in Its sleep. You can feel them now, like knots in your own spine.' },
  { id: 'first-seal', when: s => s.seals.length >= 1, text: 'A seal breaks. Somewhere very deep, something rolls over in its sleep.' },
  { id: 'four-seals', when: s => s.seals.length >= 4, text: 'The sky has a seam in it now. Through it, an eye the size of the world.' },
  { id: 'six-seals', when: s => s.seals.length >= 6, text: 'One seal remains. It is shaped like your name.' },
];

// Lore fragments, collected in the Grimoire as you progress
export const LORE = [
  { id: 'floorboards', title: 'Beneath the Floorboards', unlock: s => s.lifetimeEarned >= 100,
    text: 'The house was cheap because of the noises. The agent called it settling. You have learned that houses do not settle. They listen.' },
  { id: 'acolytes', title: 'On Acolytes', unlock: s => s.owned.acolyte >= 10 || s.summonings > 0,
    text: 'They come at night, in ones and twos, and they say they dreamed of your address. None of them can say what they dreamed of you.' },
  { id: 'circles', title: 'On Circles', unlock: s => s.owned.circle >= 1 || s.summonings > 0,
    text: 'A circle is a door drawn in the shape of a wall. The trick is in which side you are standing on.' },
  { id: 'library', title: 'The Library That Reads', unlock: s => s.owned.library >= 1 || s.summonings > 0,
    text: 'No one writes the books. They are found, already written, already reading themselves aloud. The voices are always the reader\'s own.' },
  { id: 'sea', title: 'The Sea', unlock: s => s.owned.temple >= 1 || s.summonings > 0,
    text: 'The temples were always under the water. The water simply forgot to keep them hidden.' },
  { id: 'veil', title: 'What the Veil Is', unlock: s => s.lifetimeEarned >= 1e9,
    text: 'It is not a curtain. It is an eyelid. You have been looking at the inside of it your whole life.' },
  { id: 'favor', title: 'On Favor', unlock: s => s.summonings >= 1,
    text: 'It does not love you. It notices you, which from something that size is much worse, and much better.' },
  { id: 'madness', title: 'Madness, a Taxonomy', unlock: s => s.stats.madnessEvents >= 3,
    text: 'The first stage is fear. The second is curiosity. The third is gratitude. There is a fourth stage, but it cannot be written by anyone still in the first three.' },
  { id: 'apparitions', title: 'Thin Places', unlock: s => s.stats.apparitions >= 5,
    text: 'Where the veil is worn, things fall through: stars of the wrong colour, moths that eat sorrow, mouths that teach words. Catch them before they remember where they came from.' },
  { id: 'choices', title: 'The Three Roads', unlock: s => s.stats.choices >= 3,
    text: 'Every servant of It walks one of three roads. Some kneel. Some turn back. Some are simply hungry. It does not mind which. It only minds that you walk.' },
  { id: 'pacts', title: 'The Terms', unlock: s => s.pacts.length >= 3,
    text: 'Each pact is a promise It makes to you. It has never broken one. That is the frightening part.' },
  { id: 'elder', title: 'Elder Signs', unlock: s => s.awakenings >= 1,
    text: 'The old ones drew the sign to keep It sleeping. You have learned to draw it backwards.' },
  { id: 'rlyeh', title: 'The Drowned City', unlock: s => s.awakenings >= 1,
    text: 'It rose without a sound. The angles of it are wrong, and the wrongness is beautiful, and you are already forgetting what right angles looked like.' },
  { id: 'ichor', title: 'Ichor', unlock: s => s.ichor > 0 || s.awakenings >= 2,
    text: 'What weeps from a mind that has gone too deep. It remembers the shape of whatever it touches, and can be taught new shapes.' },
  { id: 'trials', title: 'The Trials', unlock: s => s.challengesDone.length >= 1,
    text: 'It tests Its servants as a sculptor tests stone: by striking.' },
  { id: 'seals', title: 'The Seven Seals', unlock: s => s.awakenings >= 3,
    text: 'Flesh, Mind, Voice, Stars, Sea, Blood, and a Name. Seven knots in the rope that holds It down. The last one is tied around you.' },
  { id: 'dream', title: 'What It Dreams', unlock: s => s.seals.length >= 4,
    text: 'It dreams of a small house, and a cellar, and someone at the top of the stairs who will not stop calling It. It dreams of you. It has always dreamed of you.' },
  { id: 'end', title: 'After', unlock: s => s.endings.length >= 1,
    text: 'There is always an after. Even for It. Especially for It.' },
];

// Logged after each summoning; the last line repeats forever
export const SUMMON_LINES = [
  'It opened one eye. Everything you built is gone. It remembers you.',
  'It came closer this time. The world forgot, but you did not.',
  'Again it looks through. Again the world is unmade around you.',
  'You have done this before. You will do it again. It is pleased.',
];
