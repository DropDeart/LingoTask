Views.dictionary = {
  tab: 'search',
  last: null, // last lookup result, kept while switching tabs

  render() {
    const tabs = [['search', 'Sözlükte Ara'], ['sentence', 'Cümle Kontrolü'], ['pair', 'Çeviri Kontrolü']];
    return `<div class="page">
      <div class="page-head"><div><h1>Sözlük</h1><p class="sub">Free Dictionary, MyMemory, Datamuse ve LanguageTool servisleriyle çalışır (internet gerekir).</p></div></div>
      <div class="tabs">${tabs.map(([id, l]) => `<button data-tab="${id}" class="${this.tab === id ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${this[`${this.tab}View`]()}</div>`;
  },
  mount(root) {
    $$('[data-tab]', root).forEach((b) => b.addEventListener('click', () => { this.tab = b.dataset.tab; App.render(); }));
    this[`${this.tab}Mount`](root);
  },

  netError(r) {
    return `<div class="verdict v-bad">Servise ulaşılamadı (${r.error === 'timeout' ? 'zaman aşımı' : 'bağlantı hatası'}). İnternet bağlantını kontrol edip tekrar dene.</div>`;
  },

  // ---------- SEARCH ----------
  searchView() {
    return `<div class="card"><div class="row" style="flex-wrap:nowrap"><input type="text" id="q" placeholder="İngilizce ya da Türkçe kelime yaz…" autocomplete="off" spellcheck="false" style="flex:1">
        <select id="mode" style="width:150px"><option value="auto">Otomatik</option><option value="en">İngilizce → Türkçe</option><option value="tr">Türkçe → İngilizce</option></select>
        <button class="btn primary" id="go">Ara</button></div></div>
      <div id="result">${this.last ? this.resultHtml(this.last) : ''}</div>
      <div class="card" id="recent">${this.recentHtml()}</div>`;
  },
  recentHtml() {
    const recent = App.state.recent;
    return `<div class="row spread"><h2 style="margin:0">Son Aranılanlar</h2>${recent.length ? '<button class="btn ghost sm" id="clr">Temizle</button>' : ''}</div>
      <div style="margin-top:10px">${recent.length ? recent.map((r) => `<button class="chip" data-recent="${esc(r.en)}" style="margin:0 6px 6px 0">${esc(r.en)}${r.tr ? ` <span class="muted">· ${esc(splitMeanings(r.tr)[0] || r.tr)}</span>` : ''}</button>`).join('') : '<span class="muted">Henüz arama yok. Aradığın ve eklediğin kelimeler burada görünür.</span>'}</div>`;
  },
  bindRecent() {
    const go = () => this.lookup($('#q').value.trim(), $('#mode').value);
    $('#clr')?.addEventListener('click', () => { App.state.recent = []; App.save(); App.render(); });
    $$('[data-recent]', $('#recent')).forEach((b) => (b.onclick = () => { $('#q').value = b.dataset.recent; $('#mode').value = 'en'; go(); }));
  },
  refreshRecent() {
    $('#recent').innerHTML = this.recentHtml();
    this.bindRecent();
  },
  searchMount(root) {
    const go = () => this.lookup($('#q').value.trim(), $('#mode').value);
    $('#go').onclick = go;
    $('#q').addEventListener('keydown', (e) => e.key === 'Enter' && go());
    this.bindRecent();
    this.bindResult(root);
  },

  async lookup(q, mode) {
    if (!q) return;
    const box = $('#result');
    box.innerHTML = '<div class="card empty">Aranıyor…</div>';
    const isWord = (s) => /^[a-z][a-z'-]*$/i.test(s);
    let en = q, fromTr = false, alts = [], def = null, sug = [], local = false;

    if (mode === 'tr' || (mode === 'auto' && /[çğıöşüÇĞİÖŞÜ]/.test(q))) {
      const t = await Api.translate(q, 'tr', 'en');
      // offline, the learner's own vocabulary still answers for words they have studied
      const data = t.data || Api.localTranslate(q, 'tr');
      if (!data) return (box.innerHTML = `<div class="card">${this.netError(t)}</div>`);
      local = local || !!data.local;
      en = data.main; fromTr = true; alts = [q, ...data.alts.filter((a) => a.toLowerCase() !== q.toLowerCase())].slice(0, 5);
    }
    if (isWord(en)) {
      const d = await Api.define(en);
      if (d.error && d.error !== 'offline') return (box.innerHTML = `<div class="card">${this.netError(d)}</div>`);
      def = d.data || null;
      if (d.error === 'offline') local = true;
      if (!def?.found && mode === 'auto' && !fromTr) {
        // maybe it is a Turkish word typed without special characters
        const t = await Api.translate(q, 'tr', 'en');
        if (t.data && t.data.main && t.data.main.toLowerCase() !== q.toLowerCase() && isWord(t.data.main)) {
          en = t.data.main; fromTr = true; alts = [q];
          def = (await Api.define(en)).data;
        }
      }
      if (!def?.found) sug = (await Api.suggest(en)).data || [];
    }
    if (!fromTr) {
      const t = await Api.translate(en, 'en', 'tr');
      const data = t.data || Api.localTranslate(en, 'en');
      if (data) {
        alts = data.alts;
        local = local || !!data.local;
      } else local = true;
    }
    if (!def?.found && !alts.length) {
      return (box.innerHTML = `<div class="card"><div class="verdict v-near">${Api.isOffline()
        ? `Çevrimdışısın ve “${esc(q)}” ne önbellekte ne de kelime listende var. Bağlanınca tekrar dene — aradığın her kelime otomatik önbelleğe alınır.`
        : `“${esc(q)}” için sonuç bulunamadı.`}</div></div>`);
    }
    this.last = { q, en, fromTr, alts, def, sug, local };
    if (def?.found || alts.length) App.addRecent(en, alts.slice(0, 2).join(', '));
    box.innerHTML = this.resultHtml(this.last);
    this.bindResult($('#root'));
    this.refreshRecent();
  },

  resultHtml(r) {
    const d = r.def;
    const meanings = d?.found ? d.meanings : [];
    return `<div class="card">
      <div class="row spread"><div><span style="font-size:26px;font-weight:700;color:var(--navy)">${esc(d?.found ? d.word : r.en)}</span>
        <span class="muted" style="margin-left:8px">${esc(d?.phonetic || '')}</span> <button class="btn ghost sm" id="say">🔊</button></div>
        <button class="btn primary sm" id="addw">+ Kelimelerime ekle</button></div>
      ${r.fromTr ? `<div class="small muted" style="margin-top:2px">“${esc(r.q)}” Türkçe → İngilizce çevrildi</div>` : ''}
      ${r.local ? '<div class="local-note">⛁ Çevrimdışı — kendi kelime listenden ve önbellekten</div>' : ''}
      ${r.alts.length ? `<div style="margin:10px 0">${r.fromTr ? '' : '<span class="muted small">Türkçe: </span>'}${r.alts.map((a) => `<span class="chip" style="margin-right:6px">${esc(a)}</span>`).join('')}</div>` : ''}
      ${d && !d.found ? `<div class="verdict v-near">Sözlükte “${esc(r.en)}” bulunamadı. ${r.sug.length ? `Şunu mu demek istedin: ${r.sug.map((s) => `<button class="chip" data-suggest="${esc(s)}">${esc(s)}</button>`).join(' ')}` : ''}</div>` : ''}
      ${meanings.map((m) => `<div class="def-block"><span class="pos">${esc(m.pos)}</span>
        ${m.defs.map((x, i) => `<div>${i + 1}. ${esc(x.d)}${x.ex ? `<div class="ex-line">“${esc(x.ex)}”</div>` : ''}</div>`).join('')}
        ${m.synonyms.length ? `<div class="small muted" style="margin-top:4px">Eş anlamlılar: ${m.synonyms.map(esc).join(', ')}</div>` : ''}</div>`).join('')}
    </div>`;
  },
  bindResult(root) {
    const r = this.last;
    if (!r) return;
    $('#say', root)?.addEventListener('click', () => (r.def?.audio ? new Audio(r.def.audio).play().catch(() => speak(r.en)) : speak(r.en)));
    $('#addw', root)?.addEventListener('click', () => {
      const en = r.def?.found ? r.def.word : r.en;
      if (App.state.vocab.some((v) => v.en.toLowerCase() === en.toLowerCase())) return App.toast('Bu kelime zaten listende');
      const tr = (r.fromTr ? r.alts : r.alts).slice(0, 3).join(', ');
      App.state.vocab.push({ id: `u${Date.now()}`, en, tr, pos: r.def?.meanings?.[0]?.pos || '', ex: r.def?.meanings?.flatMap((m) => m.defs).find((x) => x.ex)?.ex || '', src: 'user', learned: true, box: 1, due: today(), right: 0, wrong: 0, spell: 0 });
      App.save();
      App.toast(`“${en}” kelimelerine eklendi`);
    });
    $$('[data-suggest]', root).forEach((b) => (b.onclick = () => { $('#q').value = b.dataset.suggest; this.lookup(b.dataset.suggest, 'en'); }));
  },

  // ---------- SENTENCE ----------
  sentenceView() {
    return `<div class="card"><p class="muted" style="margin-top:0">Öğrendiğin bir kelimeyi cümle içinde kullan; gramer, yazım ve kelime kullanımını kontrol edelim.</p>
      <div class="grid" style="grid-template-columns:220px 1fr;gap:12px"><div><label class="f">Kelime (isteğe bağlı)</label><input type="text" id="sw" autocomplete="off" spellcheck="false"></div>
      <div><label class="f">Cümlen</label><textarea id="st" style="min-height:90px" spellcheck="false" placeholder="Write your sentence here…"></textarea></div></div>
      <div style="margin-top:12px"><button class="btn primary" id="sgo">Kontrol et</button></div></div><div id="sres"></div>`;
  },
  sentenceMount() {
    $('#sgo').onclick = async () => {
      const word = $('#sw').value.trim().toLowerCase();
      const text = $('#st').value.trim();
      if (!text) return;
      const out = $('#sres');
      out.innerHTML = '<div class="card empty">Kontrol ediliyor…</div>';
      const [c, d] = await Promise.all([Api.check(text), word ? Api.define(word) : Promise.resolve(null)]);
      if (c.error) return (out.innerHTML = `<div class="card">${this.netError(c)}</div>`);
      const issues = c.data;
      const used = word ? this.usesWord(text, word) : null;
      const words = text.split(/\s+/).length;
      if (word) App.addRecent(word);
      App.bump('practice', 0);
      const examples = d?.data?.found ? d.data.meanings.flatMap((m) => m.defs).filter((x) => x.ex).slice(0, 2) : [];
      out.innerHTML = `<div class="card">
        <div class="row spread"><h2 style="margin:0">Sonuç</h2><span class="badge ${issues.length ? 'b-amber' : 'b-green'}">${issues.length ? `${issues.length} sorun` : 'Sorun bulunmadı'}</span></div>
        ${word ? `<div class="verdict ${used ? 'v-ok' : 'v-bad'}">${used ? `✔ “${esc(word)}” cümlede kullanılmış.` : `✘ “${esc(word)}” cümlede bulunamadı (çekimli hali de aranır).`}</div>` : ''}
        ${words < 8 ? '<div class="verdict v-near">Cümle kısa; IELTS için gerekçe ya da bağlaç ekleyerek uzatmayı dene.</div>' : ''}
        <div style="margin-top:12px">${issues.map((i) => this.issueHtml(i)).join('') || '<div class="muted">Gramer ve yazım açısından temiz görünüyor.</div>'}</div>
        ${examples.length ? `<h3>Sözlükten örnek kullanım</h3>${examples.map((x) => `<div class="ex-line">“${esc(x.ex)}”</div>`).join('')}` : ''}
        <p class="small muted" style="margin-bottom:0">Not: Otomatik kontrol anlam uygunluğunu tam ölçemez; örnek cümlelerle karşılaştır.</p></div>`;
    };
  },
  usesWord(text, word) {
    const stem = word.length > 4 ? word.replace(/(ing|ed|es|s|e|y|ly|ion)$/, '') : word;
    return text.toLowerCase().split(/[^a-z'-]+/).some((t) => t === word || (stem.length >= 3 && t.startsWith(stem)));
  },
  issueHtml(i) {
    const kind = { spelling: 'Yazım', grammar: 'Gramer', style: 'Üslup' }[i.kind];
    return `<div class="issue ${i.kind}"><b>${kind}</b> · <code>${esc(i.bad)}</code> — ${esc(i.message)}${i.fixes.length ? `<div class="small">Öneri: ${i.fixes.map((f) => `<b>${esc(f)}</b>`).join(' · ')}</div>` : ''}</div>`;
  },

  // ---------- PAIR CHECK ----------
  pairView() {
    return `<div class="card"><p class="muted" style="margin-top:0">İngilizce kelimeyi ve Türkçe karşılığını yaz; ikisinin doğru eşleşip eşleşmediğini ve yazımını kontrol edelim.</p>
      <div class="grid g2"><div><label class="f">İngilizce</label><input type="text" id="pe" autocomplete="off" spellcheck="false"></div><div><label class="f">Türkçe</label><input type="text" id="pt" autocomplete="off" spellcheck="false"></div></div>
      <div style="margin-top:12px"><button class="btn primary" id="pgo">Kontrol et</button></div></div><div id="pres"></div>`;
  },
  pairMount() {
    const run = async () => {
      const en = $('#pe').value.trim(), tr = $('#pt').value.trim();
      if (!en || !tr) return;
      const out = $('#pres');
      out.innerHTML = '<div class="card empty">Kontrol ediliyor…</div>';
      const [d, t] = await Promise.all([Api.define(en), Api.translate(en, 'en', 'tr')]);
      if (t.error) return (out.innerHTML = `<div class="card">${this.netError(t)}</div>`);
      let html = '';
      let enOk = true;
      if (d.data && !d.data.found) {
        enOk = false;
        const sug = (await Api.suggest(en)).data || [];
        html += `<div class="verdict v-bad">İngilizce yazım: “${esc(en)}” sözlükte yok. ${sug.length ? `Doğrusu şunlardan biri olabilir: ${sug.map((s) => `<b>${esc(s)}</b>`).join(', ')}` : ''}</div>`;
      }
      const own = App.state.vocab.filter((v) => v.en.toLowerCase() === en.toLowerCase()).flatMap((v) => splitMeanings(v.tr));
      const accepted = [...own, ...t.data.alts.flatMap((a) => splitMeanings(a))];
      const r = judge(tr, accepted);
      const shown = [...new Set(accepted)].slice(0, 6).map((a) => `<span class="chip plain">${esc(a)}</span>`).join(' ');
      if (r.verdict === 'exact' || r.verdict === 'diacritic') html += `<div class="verdict v-ok">✔ Eşleşme doğru. ${r.verdict === 'diacritic' ? `Türkçe karakterlere dikkat: <b>${esc(r.target)}</b>` : ''}</div>`;
      else if (r.verdict === 'typo') html += `<div class="verdict v-near">✎ Anlam doğru ama yazım hatası var: <b>${esc(r.target)}</b></div>`;
      else html += `<div class="verdict v-bad">✘ Bulunan karşılıklarla eşleşmedi.</div>`;
      html += `<div style="margin-top:10px"><span class="muted small">Bulunan karşılıklar:</span> ${shown}</div><p class="small muted" style="margin-bottom:0">Çeviri servisi tek anlam döndürebilir; eşanlamlı bir kelime yazdıysan yanlış çıkabilir.</p>`;
      out.innerHTML = `<div class="card">${html}</div>`;
      if (enOk) App.addRecent(en, tr);
    };
    $('#pgo').onclick = run;
    $('#pt').addEventListener('keydown', (e) => e.key === 'Enter' && run());
  },
};
