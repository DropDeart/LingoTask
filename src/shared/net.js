// The four open-web APIs LingoTask talks to. Written as a UMD module so the exact same code
// runs in the Electron main process (require) and directly in a browser/PWA (script tag) -- all
// four services send permissive CORS headers, so the web build needs no proxy.
//  - Free Dictionary API  : definitions, phonetics, audio, examples
//  - Wiktionary REST      : dictionary fallback (Free Dictionary returns 5xx regularly)
//  - MyMemory             : EN <-> TR translation with alternative matches
//  - Datamuse             : spelling suggestions
//  - LanguageTool (public): grammar / spelling / style checking
(function (root, factory) {
  const mod = factory();
  if (typeof module === "object" && module.exports) module.exports = mod;
  else root.Net = mod;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TIMEOUT = 12000;

  async function http(url, opts = {}) {
    const { ms = TIMEOUT, ...rest } = opts;
    return fetch(url, { ...rest, signal: AbortSignal.timeout(ms) });
  }

  const stripTags = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  // Wiktionary fallback: dictionaryapi.dev is free but regularly returns 5xx.
  async function defineViaWiktionary(w) {
    const r = await http(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(w)}`);
    if (r.status === 404) return { found: false };
    if (!r.ok) throw new Error(`wiktionary ${r.status}`);
    const j = await r.json();
    const en = j.en || [];
    if (!en.length) return { found: false };
    return {
      found: true,
      word: w,
      phonetic: '',
      audio: '',
      meanings: en.slice(0, 4).map((m) => ({
        pos: String(m.partOfSpeech || '').toLowerCase(),
        defs: (m.definitions || [])
          .map((d) => ({ d: stripTags(d.definition), ex: stripTags((d.parsedExamples || d.examples || [])[0]?.example || (d.examples || [])[0] || '') }))
          .filter((d) => d.d)
          .slice(0, 3),
        synonyms: [],
      })).filter((m) => m.defs.length),
    };
  }

  async function define(word) {
    const w = String(word).trim().toLowerCase();
    let r;
    try {
      r = await http(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`, { ms: 6000 });
    } catch {
      return defineViaWiktionary(w);
    }
    if (r.status === 404) return { found: false };
    if (!r.ok) return defineViaWiktionary(w);
    const entries = await r.json();
    const phonetics = entries.flatMap((e) => e.phonetics || []);
    const meanings = entries
      .flatMap((e) => e.meanings || [])
      .map((m) => ({
        pos: m.partOfSpeech,
        defs: (m.definitions || []).slice(0, 3).map((d) => ({ d: d.definition, ex: d.example || '' })),
        synonyms: (m.synonyms || []).slice(0, 6),
      }));
    return {
      found: true,
      word: entries[0].word,
      phonetic: entries[0].phonetic || phonetics.find((p) => p.text)?.text || '',
      audio: phonetics.find((p) => p.audio)?.audio || '',
      meanings,
    };
  }

  async function translate(text, from, to) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const r = await http(url);
    if (!r.ok) throw new Error(`translate ${r.status}`);
    const j = await r.json();
    const main = j.responseData?.translatedText || '';
    const seen = new Set();
    const alts = [main, ...(j.matches || []).map((m) => m.translation)]
      .map((s) => String(s || '').trim())
      .filter((s) => {
        const k = s.toLowerCase();
        if (!s || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 6);
    return { main, alts };
  }

  async function suggest(word) {
    const r = await http(`https://api.datamuse.com/sug?s=${encodeURIComponent(word)}&max=6`);
    if (!r.ok) throw new Error(`datamuse ${r.status}`);
    return (await r.json()).map((x) => x.word);
  }

  async function check(text) {
    const r = await http('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ text, language: 'en-GB' }),
    });
    if (!r.ok) throw new Error(`languagetool ${r.status}`);
    const j = await r.json();
    return j.matches.map((m) => ({
      message: m.message,
      offset: m.offset,
      length: m.length,
      bad: text.substr(m.offset, m.length),
      fixes: (m.replacements || []).slice(0, 3).map((x) => x.value),
      kind: m.rule.category.id === 'TYPOS' ? 'spelling' : m.rule.issueType === 'style' || /STYLE|REDUNDANCY|PLAIN/.test(m.rule.category.id) ? 'style' : 'grammar',
    }));
  }

  return { define, translate, suggest, check };
});
