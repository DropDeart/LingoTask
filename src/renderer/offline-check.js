// Offline grammar and spelling checker.
//
// Produces the same finding shape as the LanguageTool adapter in src/shared/net.js
// ({ message, offset, length, bad, fixes, kind }) so every view renders both identically.
// It runs on every check; when the device is online its findings are merged with
// LanguageTool's, which has far broader coverage but needs the network.
//
// The rules target the mistakes this app already teaches (see data/grammar.js), so a finding can
// point the learner straight at the lesson that explains it. Precision is valued over recall:
// a false alarm teaches the wrong thing, a missed error only leaves the learner where they were.

const OfflineCheck = (() => {
  let vocabulary = null;

  // Two sets, on purpose:
  //   known  - base words plus mechanically generated inflections, used to decide "is this a word".
  //   base   - real dictionary forms only, the sole source of suggestions. Generated forms are fine
  //            for recognition but must never be offered as a correction ("great" -> "greated").
  function buildVocabulary() {
    const base = new Set([
      ...COMMON_WORDS_RAW.trim().split(/\s+/),
      ...FUNCTION_WORDS.trim().split(/\s+/),
      ...AWL,
      ...CORE_VOCAB.map((v) => v.en.toLowerCase()),
      ...UNCOUNTABLE,
      ...Object.values(MISSPELLINGS).map((v) => v.toLowerCase()),
    ]);

    const known = new Set(base);
    for (const w of base) {
      if (w.length < 3) continue;
      known.add(`${w}s`);
      if (/[^aeiou]y$/.test(w)) { known.add(`${w.slice(0, -1)}ies`); known.add(`${w.slice(0, -1)}ied`); known.add(`${w.slice(0, -1)}ier`); known.add(`${w.slice(0, -1)}iest`); }
      if (/(s|x|z|ch|sh)$/.test(w)) known.add(`${w}es`);
      if (/e$/.test(w)) { known.add(`${w}d`); known.add(`${w.slice(0, -1)}ing`); known.add(`${w}r`); known.add(`${w}st`); }
      else { known.add(`${w}ed`); known.add(`${w}ing`); known.add(`${w}er`); known.add(`${w}est`); }
      known.add(`${w}ly`);
    }
    return { base, known };
  }
  const vocab = () => (vocabulary = vocabulary || buildVocabulary());

  // ---- grammar rules ----
  // Each rule is a global regex plus a handler returning a finding, or null to decline.
  // `g[n]` groups are used to place the marker precisely rather than over the whole match.
  const BASE_VERBS = 'go|come|make|take|have|do|say|see|get|give|know|think|want|use|find|tell|ask|work|seem|feel|try|leave|call|need|become|mean|keep|help|show|hear|play|run|move|live|believe|bring|happen|write|provide|sit|stand|lose|pay|meet|include|continue|learn|change|lead|watch|follow|stop|create|speak|read|spend|grow|open|walk|win|teach|offer|remember|consider|appear|buy|serve|die|send|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull|prefer|depend|agree|increase|reduce|affect|cause|allow|improve|support|explain|contain|prevent|produce|realise|realize|enjoy|expect|understand';
  const PLURAL_PRONOUNS = 'we|they|people|students|children|men|women|users|governments|countries|cities|companies';

  const RULES = [
    {
      // "he go" / "the government provide"
      re: new RegExp(`\\b(he|she|it|this|that)\\s+(${BASE_VERBS})\\b`, 'gi'),
      make: (m) => ({
        group: 2,
        kind: 'grammar',
        message: '3. tekil şahısta fiil -s alır.',
        fixes: [thirdPerson(m[2])],
        topic: 'G1',
      }),
    },
    {
      re: /\b(he|she|it|this|that)\s+(don't|do not|dont)\b/gi,
      make: () => ({ group: 2, kind: 'grammar', message: '3. tekil şahısta “doesn’t” kullanılır.', fixes: ["doesn't"], topic: 'G1' }),
    },
    {
      re: new RegExp(`\\b(${PLURAL_PRONOUNS})\\s+(is|was|has|does)\\b`, 'gi'),
      make: (m) => ({
        group: 2,
        kind: 'grammar',
        message: 'Çoğul özne çoğul fiil ister.',
        fixes: [{ is: 'are', was: 'were', has: 'have', does: 'do' }[m[2].toLowerCase()]],
        topic: 'G10',
      }),
    },
    {
      re: /\bthere\s+is\s+(many|several|few|a lot of|lots of|two|three|four|five|some)\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: '“there is” tekil, çoğul için “there are” gerekir.', fixes: ['there are'], topic: 'G10' }),
    },
    {
      re: /\bthere\s+are\s+(a|an|one)\s/gi,
      make: () => ({ group: 0, kind: 'grammar', message: 'Tekil isimle “there is” kullanılır.', fixes: ['there is'], topic: 'G10' }),
    },
    {
      // "a apple" -- vowel sound, not vowel letter
      re: /\ba\s+([aeiou]\w+)/gi,
      make: (m) => (/^(u[bcdfghjklmnpqrstvwxyz][aeiou]|uni|use|user|usu|euro|one)/i.test(m[1]) ? null
        : { group: 0, kind: 'grammar', message: 'Sesli harf sesiyle başlayan kelimeden önce “an” gelir.', fixes: [`an ${m[1]}`], topic: 'G3' }),
    },
    {
      re: /\ban\s+([bcdfgjklmnpqrstvwxyz]\w+)/gi,
      make: (m) => (/^(hour|honest|honour|hono)/i.test(m[1]) ? null
        : { group: 0, kind: 'grammar', message: 'Sessiz harf sesiyle başlayan kelimeden önce “a” gelir.', fixes: [`a ${m[1]}`], topic: 'G3' }),
    },
    {
      re: /\bmore\s+(\w+(?:er))\b/gi,
      make: (m) => (/^(other|either|over|under|inner|outer|later|former|proper|proper|super|proper)$/i.test(m[1]) ? null
        : { group: 0, kind: 'grammar', message: 'Çift karşılaştırma. “more” ile “-er” birlikte kullanılmaz.', fixes: [m[1]], topic: 'G9' }),
    },
    {
      re: /\b(most|more)\s+better\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: '“better” zaten karşılaştırma hâlidir.', fixes: ['better'], topic: 'G9' }),
    },
    {
      re: /\bdespite\s+of\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: '“despite” tek başına kullanılır; “of” almaz.', fixes: ['despite', 'in spite of'], topic: 'G4' }),
    },
    {
      re: /\b(although|though|even though)\b[^.!?]{3,120}?,\s*but\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: '“although” ile “but” aynı cümlede kullanılmaz; birini seç.', fixes: [], topic: 'G4' }),
    },
    {
      re: /\bbecause of\s+(\w+)\s+(is|are|was|were|has|have|will|can|do|does)\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: '“because of” isim ister; cümle geliyorsa “because” kullan.', fixes: ['because'], topic: 'G4' }),
    },
    {
      re: /\bif\s+[^,.!?]{0,60}?\bwill\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: 'if cümleciğinde “will” kullanılmaz; geniş zaman gelir.', fixes: [], topic: 'G7' }),
    },
    {
      re: /\bif\s+i\s+was\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: 'Varsayımsal koşulda “If I were” kullanılır.', fixes: ['If I were'], topic: 'G7' }),
    },
    {
      re: /\b(much|many|few|little)\s+(information|advice|research|knowledge|equipment|furniture|money|traffic|news|progress|homework|evidence)s?\b/gi,
      make: (m) => {
        const uncountable = m[2].toLowerCase();
        const q = m[1].toLowerCase();
        if (q === 'much' || q === 'little') return null;
        return { group: 0, kind: 'grammar', message: `“${uncountable}” sayılamaz; “much” veya “a great deal of” kullan.`, fixes: [`much ${uncountable}`], topic: 'G8' };
      },
    },
    {
      re: /\bless\s+(\w+s)\b/gi,
      make: (m) => (UNCOUNTABLE.includes(m[1].toLowerCase().replace(/s$/, '')) ? null
        : { group: 0, kind: 'grammar', message: 'Sayılabilir çoğul isimle “fewer” kullanılır.', fixes: [`fewer ${m[1]}`], topic: 'G8' }),
    },
    {
      re: /\bthe number of\s+\w+s?\s+(are|were|have)\b/gi,
      make: (m) => ({ group: 1, kind: 'grammar', message: '“the number of …” tekil fiil alır.', fixes: [{ are: 'is', were: 'was', have: 'has' }[m[1].toLowerCase()]], topic: 'G8' }),
    },
    {
      re: /\b(each|every|everyone|everybody|nobody|somebody|someone)\s+(are|were|have\b|do\b)/gi,
      make: (m) => ({ group: 2, kind: 'grammar', message: 'Bu özneler tekildir.', fixes: [{ are: 'is', were: 'was', have: 'has', do: 'does' }[m[2].trim().toLowerCase()]], topic: 'G10' }),
    },
    {
      re: /\b(i|we|they|you|he|she|it)\s+am\s+agree\b/gi,
      make: (m) => ({ group: 0, kind: 'grammar', message: '“agree” fiildir; “be” ile kullanılmaz.', fixes: [`${m[1]} agree`], topic: 'G1' }),
    },
    {
      re: /\b(can|could|will|would|should|must|may|might)\s+(?:be\s+)?(\w+ed|\w+ing)\b/gi,
      make: (m) => (/ing$/i.test(m[2]) && !/^(be|been)$/i.test(m[2]) ? null : null), // handled by LanguageTool; too many valid forms offline
    },
    {
      re: /\b(the man|the woman|the person|the student|the people|the teacher|the child)\s+which\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: 'İnsan için “who” kullanılır.', fixes: [], topic: 'G5' }),
    },
    {
      re: /\b(discuss|enter|marry|contact|approach|answer|mention|reach|join|lack)\s+(about|to|with|of)\b/gi,
      make: (m) => ({ group: 2, kind: 'grammar', message: `“${m[1].toLowerCase()}” edat almaz; doğrudan nesne alır.`, fixes: [''], topic: 'G4' }),
    },
    {
      re: /\bdepend\s+(of|from)\b/gi,
      make: () => ({ group: 1, kind: 'grammar', message: '“depend on” doğru kalıptır.', fixes: ['on'], topic: 'G4' }),
    },
    {
      re: /\b(is|are|was|were|am)\s+(depend|agree|belong|consist)\b/gi,
      make: (m) => ({ group: 0, kind: 'grammar', message: `“${m[2].toLowerCase()}” durum fiilidir; “be” ile kullanılmaz.`, fixes: [m[2]], topic: 'G1' }),
    },
    {
      re: /\bsince\s+(\d+|a few|several|many|two|three|four|five|ten)\s+(year|month|week|day|hour)s?\b/gi,
      make: (m) => ({ group: 0, kind: 'grammar', message: 'Süre belirtirken “for” kullanılır; “since” başlangıç noktası ister.', fixes: [m[0].replace(/^since/i, 'for')], topic: 'G2' }),
    },
    {
      re: /\b(yesterday|last (?:year|month|week|night)|\d{4}|ago)\b[^.!?]{0,40}?\bhave\s+(\w+ed|been|gone|done|seen|made|written|taken)\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: 'Belirli geçmiş zaman ifadeleriyle Present Perfect kullanılmaz.', fixes: [], topic: 'G2' }),
    },
    {
      re: /\b(\w+)\s+\1\b/gi,
      make: (m) => (/^(had|that|very|no|is)$/i.test(m[1]) ? null
        : { group: 0, kind: 'style', message: 'Kelime tekrarlanmış.', fixes: [m[1]], topic: null }),
    },
    {
      re: /\baccording to me\b/gi,
      make: () => ({ group: 0, kind: 'style', message: '“according to” başkasının görüşü için kullanılır. Kendi görüşün için “in my opinion”.', fixes: ['in my opinion'], topic: null }),
    },
    {
      re: /\bin nowadays\b/gi,
      make: () => ({ group: 0, kind: 'grammar', message: '“nowadays” edat almaz.', fixes: ['nowadays'], topic: null }),
    },
    {
      re: /\ba lot of\s+(information|advice|research)s\b/gi,
      make: (m) => ({ group: 1, kind: 'grammar', message: `“${m[1].toLowerCase()}” çoğul olmaz.`, fixes: [m[1]], topic: 'G8' }),
    },
  ];

  function thirdPerson(v) {
    const w = v.toLowerCase();
    if (w === 'have') return 'has';
    if (w === 'do') return 'does';
    if (w === 'go') return 'goes';
    if (/(s|x|z|ch|sh)$/.test(w)) return `${w}es`;
    if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ies`;
    return `${w}s`;
  }

  // ---- spelling ----
  function spellFindings(text) {
    const out = [];
    const { base, known } = vocab();
    const re = /\b[A-Za-z][A-Za-z']*\b/g;
    let m;
    while ((m = re.exec(text))) {
      const raw = m[0];
      const w = raw.toLowerCase().replace(/'s$/, '');
      if (w.length < 3) continue;

      const fixed = MISSPELLINGS[w];
      if (fixed) {
        out.push({ offset: m.index, length: raw.length, bad: raw, kind: 'spelling', message: 'Yazım hatası.', fixes: [matchCase(raw, fixed)], topic: null });
        continue;
      }
      if (known.has(w)) continue;

      // Unknown: only report when it is close to something we know, so unusual but correct
      // vocabulary passes untouched.
      const near = nearest(w, base);
      if (near) out.push({ offset: m.index, length: raw.length, bad: raw, kind: 'spelling', message: 'Bu kelime sözlükte yok — yazımını kontrol et.', fixes: near.map((n) => matchCase(raw, n)), topic: null });
    }
    return out;
  }

  // Candidates are restricted by first letter and length so this stays linear enough for an essay.
  function nearest(w, known) {
    const max = w.length >= 8 ? 2 : 1;
    const hits = [];
    for (const k of known) {
      if (Math.abs(k.length - w.length) > max || k[0] !== w[0]) continue;
      if (lev(w, k) <= max) {
        hits.push(k);
        if (hits.length >= 3) break;
      }
    }
    return hits.length ? hits : null;
  }

  const matchCase = (src, fix) => (/^[A-Z]/.test(src) ? fix.charAt(0).toUpperCase() + fix.slice(1) : fix);

  // ---- entry point ----
  function check(text) {
    const found = [];
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(text))) {
        const spec = rule.make(m);
        if (!spec) continue;
        const g = spec.group || 0;
        // locate the marked group inside the whole match
        const offset = g === 0 ? m.index : m.index + m[0].indexOf(m[g]);
        const length = (g === 0 ? m[0] : m[g]).length;
        found.push({ offset, length, bad: text.substr(offset, length), kind: spec.kind, message: spec.message, fixes: (spec.fixes || []).filter(Boolean), topic: spec.topic });
        if (m.index === rule.re.lastIndex) rule.re.lastIndex++; // guard zero-length matches
      }
    }
    found.push(...spellFindings(text));
    return dedupe(found);
  }

  // Overlapping findings confuse more than they help; keep the first at each span.
  function dedupe(list) {
    const sorted = list.slice().sort((a, b) => a.offset - b.offset || b.length - a.length);
    const out = [];
    for (const f of sorted) {
      if (out.some((o) => f.offset < o.offset + o.length && o.offset < f.offset + f.length)) continue;
      out.push(f);
    }
    return out;
  }

  // Merge with LanguageTool's findings, preferring LanguageTool where the two overlap.
  function merge(online, offline) {
    const out = online.slice();
    for (const f of offline) {
      if (out.some((o) => f.offset < o.offset + o.length && o.offset < f.offset + f.length)) continue;
      out.push(f);
    }
    return out.sort((a, b) => a.offset - b.offset);
  }

  // Offline stand-in for Datamuse: nearest known spellings to what was typed.
  function suggest(word) {
    const w = String(word).trim().toLowerCase();
    if (!w) return [];
    const { base } = vocab();
    const fixed = MISSPELLINGS[w];
    const out = fixed ? [fixed] : [];
    for (const max of [1, 2]) {
      for (const k of base) {
        if (out.length >= 6) break;
        if (k === w || out.includes(k)) continue;
        if (Math.abs(k.length - w.length) > max || k[0] !== w[0]) continue;
        if (lev(w, k) <= max) out.push(k);
      }
    }
    return out.slice(0, 6);
  }

  return { check, merge, suggest, thirdPerson };
})();
