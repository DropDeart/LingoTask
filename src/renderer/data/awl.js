// Academic Word List (Coxhead, 2000) — 570 headwords, the words that actually recur in
// academic texts and IELTS Reading/Writing. Used to tell whether a word the user added counts
// as academic, so the study plan can track "learn 25 academic words" against real progress.
const AWL_RAW = `
analyse approach area assess assume authority available benefit concept consist constitute context contract create data define derive distribute economy environment establish estimate evident export factor finance formula function identify income indicate individual interpret involve issue labour legal legislate major method occur percent period policy principle proceed process require research respond role section sector significant similar source specific structure theory vary
achieve acquire administrate affect appropriate aspect assist category chapter commission community complex compute conclude conduct consequent construct consume credit culture design distinct element equate evaluate feature final focus impact injure institute invest item journal maintain normal obtain participate perceive positive potential previous primary purchase range region regulate relevant reside resource restrict secure seek select site strategy survey text tradition transfer
alternative circumstance comment compensate component consent considerable constant constrain contribute convene coordinate core corporate correspond criteria deduce demonstrate document dominate emphasis ensure exclude framework fund illustrate immigrate imply initial instance interact justify layer link locate maximise minor negate outcome partner philosophy physical proportion publish react register rely remove scheme sequence shift specify sufficient task technical technique technology valid volume
access adequate annual apparent approximate attitude attribute civil code commit communicate concentrate confer contrast cycle debate despite dimension domestic emerge error ethnic goal grant hence hypothesis implement implicate impose integrate internal investigate label mechanism obvious occupy option output overall parallel parameter phase predict principal prior professional project promote regime resolve retain series statistic status stress subsequent summary undertake
academy adjust alter amend aware capacity challenge clause compound conflict consult contact decline discrete draft enable energy enforce entity equivalent evolve expand expose external facilitate fundamental generate generation image liberal licence logic margin medical mental modify monitor network notion objective orient perspective precise prime psychology pursue ratio reject revenue stable style substitute sustain symbol target transit trend version welfare whereas
abstract accurate acknowledge aggregate allocate assign attach author bond brief capable cite cooperate discriminate display diverse domain edit enhance estate exceed expert explicit federal flexible furthermore gender ignorant incentive incidence incorporate index inhibit initiate input instruct intelligence interval lecture migrate minimum ministry motive neutral nevertheless overseas precede presume rational recover reveal scope subsidy trace transform transport underlie utilise
adapt adult advocate channel chemical classic comprehensive comprise confirm contrary convert couple decade definite deny differentiate dispose dynamic eliminate empirical equip extract finite foundation globe grade guarantee hierarchy identical ideology infer innovate insert intervene isolate media mode paradigm phenomenon priority prohibit publication quote release reverse simulate sole somewhat submit successor survive thesis topic transmit ultimate unique visible voluntary
abandon accompany accumulate ambiguous append appreciate arbitrary automate bias chart clarify commodity complement conform contemporary contradict crucial currency denote detect deviate displace drama eventual exhibit exploit fluctuate guideline highlight implicit induce inevitable infrastructure inspect intense manipulate minimise nuclear offset paragraph practitioner predominant prospect radical random reinforce restore revise schedule tense terminate theme thereby uniform vehicle virtual visual widespread
accommodate analogy anticipate assure attain behalf bulk cease coherent coincide commence incompatible concurrent confine controversy converse device devote diminish distort duration erode ethic format inherent insight integral intermediate manual mature mediate medium military minimal mutual norm overlap passive portion preliminary protocol qualitative refine relax restrain revolution rigid route scenario sphere subordinate supplement suspend temporary trigger unify violate vision
adjacent albeit assemble collapse colleague compile conceive convince depress encounter enormous forthcoming incline integrity intrinsic invoke levy likewise nonetheless notwithstanding ongoing panel persist pose reluctance straightforward undergo whereby
`;

const AWL = new Set(AWL_RAW.trim().split(/\s+/));

// Headwords grouped by their first three letters so lookups stay cheap.
const AWL_INDEX = (() => {
  const m = new Map();
  for (const w of AWL) {
    const k = w.slice(0, 3);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(w);
  }
  return m;
})();

const shared = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

// Endings a headword may shed within its own word family: evident/evidence, respond/response,
// analyse/analytical, identify/identification.
const FAMILY_ENDINGS = new Set(['', 'e', 'y', 't', 'd', 'te', 'se', 'de', 'ate', 'ise', 'nt', 'nce']);

// The AWL lists headwords only, so family members are matched by shared prefix. Requiring what is
// left of the headword to be a real derivational ending keeps look-alikes out: "contain" shares
// five letters with "contact", but "ct" is not an ending any word family drops.
function isAcademic(word) {
  const w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (w.length < 3) return false;
  if (AWL.has(w) || AWL.has(w.replace(/iz/g, 'is'))) return true;

  for (const head of AWL_INDEX.get(w.slice(0, 3)) || []) {
    // vary -> variable, apply -> applicable: the family keeps the i, not the y
    for (const base of head.endsWith('y') ? [head, `${head.slice(0, -1)}i`] : [head]) {
      const n = shared(w, base);
      if (n >= Math.min(5, base.length) && w.length - n <= 8 && FAMILY_ENDINGS.has(base.slice(n))) return true;
    }
  }
  return false;
}
