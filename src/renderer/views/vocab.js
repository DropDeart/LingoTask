Views.vocab = {
  tab: 'learn',
  session: null, // review session
  learnQueue: null,

  render() {
    if (App.params.tab) {
      this.tab = App.params.tab;
      App.params = {};
      this.session = null;
      this.learnQueue = null;
    }
    const tabs = [['learn', 'Öğren'], ['review', 'Tekrar & Test'], ['bank', 'Kelimelerim'], ['add', 'Kelime Ekle']];
    const st = App.vocabStats();
    const acc = st.accuracy;
    return `<div class="page">
      <div class="page-head"><div><h1>Kelime</h1><p class="sub">Aralıklı tekrar (Leitner) ile İngilizce ↔ Türkçe kelime çalışması ve yazım kontrolü.</p></div></div>
      <div class="grid g4" style="margin-bottom:16px">
        <div class="card stat"><b>${st.learned}<small class="muted"> / ${st.total}</small></b><span>öğrenilen kelime</span>${bar((st.learned / st.total) * 100)}</div>
        <div class="card stat"><b>${st.academic}<small class="muted"> / ${st.academicTotal}</small></b><span>akademik (AWL) kelime</span>${bar((st.academic / Math.max(st.academicTotal, 1)) * 100, 'teal')}</div>
        <div class="card stat"><b style="color:${acc == null ? 'var(--muted)' : acc >= 80 ? 'var(--green)' : acc >= 60 ? 'var(--amber)' : 'var(--red)'}">${acc == null ? '–' : `%${acc}`}</b>
          <span>doğruluk · ${st.right} doğru / ${st.wrong} yanlış</span>${acc == null ? '' : bar(acc, acc >= 80 ? 'green' : '')}</div>
        <div class="card stat"><b>${st.mastered}</b><span>pekişmiş (kutu 4+) · ${st.shaky} zayıf</span>${bar((st.mastered / Math.max(st.learned, 1)) * 100, 'green')}</div>
      </div>
      <div class="tabs">${tabs.map(([id, l]) => `<button data-tab="${id}" class="${this.tab === id ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="vbody">${this[`${this.tab}View`]()}</div></div>`;
  },

  mount(root) {
    $$('[data-tab]', root).forEach((b) =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab;
        this.session = null;
        this.learnQueue = null;
        App.render();
      }),
    );
    this[`${this.tab}Mount`]?.(root);
  },

  refreshBody() {
    $('#vbody').innerHTML = this[`${this.tab}View`]();
    this[`${this.tab}Mount`]?.($('#root'));
  },

  // ---------- LEARN ----------
  learnView() {
    const s = App.state;
    const day = App.day();
    if (!this.learnQueue) {
      const left = Math.max(s.settings.dailyNew - day.learned, 0) || 0;
      this.learnQueue = { items: s.vocab.filter((v) => !v.learned).slice(0, left || 0).map((v) => v.id), i: 0, reveal: false, extra: false };
    }
    const q = this.learnQueue;
    const remaining = s.vocab.filter((v) => !v.learned).length;
    if (q.i >= q.items.length) {
      return `<div class="card empty"><h2>${remaining ? 'Bugünkü kelimeler tamam ✔' : 'Tüm kelimeleri öğrendin 🎉'}</h2>
        <p>Bugün ${day.learned} yeni kelime öğrendin. Öğrendiklerin yarından itibaren tekrar listene girecek.</p>
        <div class="row" style="justify-content:center">${remaining ? '<button class="btn" id="more">+5 kelime daha</button>' : ''}<button class="btn primary" id="torev">Tekrara geç</button></div></div>`;
    }
    const w = s.vocab.find((v) => v.id === q.items[q.i]);
    return `<div class="card flash">
      <div class="small muted">${q.i + 1} / ${q.items.length} · ${esc(w.pos)}</div>
      <div class="w">${esc(w.en)} <button class="btn ghost sm" id="say" title="Dinle">🔊</button></div>
      <div class="ex">“${esc(w.ex)}”</div>
      ${q.reveal ? `<div class="tr">${esc(w.tr)}</div><div class="row" style="justify-content:center;margin-top:22px"><button class="btn" id="skip">Sonra</button><button class="btn primary" id="got">Öğrendim</button></div>`
        : `<div style="margin-top:22px"><button class="btn primary" id="show">Anlamı göster</button></div>`}
    </div>`;
  },
  learnMount(root) {
    const q = this.learnQueue;
    const s = App.state;
    const w = q && q.i < q.items.length ? s.vocab.find((v) => v.id === q.items[q.i]) : null;
    $('#say', root)?.addEventListener('click', () => speak(w.en));
    $('#show', root)?.addEventListener('click', () => { q.reveal = true; this.refreshBody(); });
    $('#skip', root)?.addEventListener('click', () => { q.i++; q.reveal = false; this.refreshBody(); });
    $('#got', root)?.addEventListener('click', () => {
      w.learned = true;
      w.box = 1;
      w.due = addDays(today(), 1);
      App.bump('learned');
      q.i++;
      q.reveal = false;
      this.refreshBody();
    });
    $('#more', root)?.addEventListener('click', () => {
      this.learnQueue = { items: s.vocab.filter((v) => !v.learned).slice(0, 5).map((v) => v.id), i: 0, reveal: false };
      this.refreshBody();
    });
    $('#torev', root)?.addEventListener('click', () => { this.tab = 'review'; App.render(); });
  },

  // ---------- REVIEW ----------
  reviewView() {
    if (!this.session) {
      const due = App.dueWords();
      const extra = App.state.vocab.filter((v) => v.learned && !due.includes(v));
      return `<div class="card"><h2>Tekrar & Test</h2>
        <p><b>${due.length}</b> kelime bugün tekrar bekliyor. Bir kelime gösterilir; Türkçe ya da İngilizce karşılığını yazarsın. Yazım hatası yaparsan uyarılırsın.</p>
        <div class="row"><button class="btn primary" id="start" ${due.length ? '' : 'disabled'}>Tekrarı başlat (${Math.min(due.length, 20)})</button>
        <button class="btn" id="startall" ${extra.length + due.length ? '' : 'disabled'}>Öğrendiklerimden rastgele 10 test</button></div></div>`;
    }
    const S = this.session;
    if (S.i >= S.queue.length) {
      const pct = S.total ? Math.round((S.right / S.total) * 100) : 0;
      return `<div class="card empty"><h2>Oturum bitti</h2><p>${S.right} / ${S.total} doğru · %${pct} · ${S.typos} yazım hatası</p><button class="btn primary" id="again">Tamam</button></div>`;
    }
    const card = S.queue[S.i];
    const w = App.state.vocab.find((v) => v.id === card.id);
    const toTr = card.dir === 'en-tr';
    return `<div class="card flash">
      <div class="small muted">${S.i + 1} / ${S.queue.length} · ${toTr ? 'İngilizce → Türkçe' : 'Türkçe → İngilizce (yazımına dikkat)'}</div>
      <div class="w">${esc(toTr ? w.en : splitMeanings(w.tr)[0])}</div>
      ${toTr ? `<button class="btn ghost sm" id="say">🔊 Dinle</button>` : `<div class="muted small">${esc(w.pos)}</div>`}
      <div class="answer"><input type="text" id="ans" autocomplete="off" spellcheck="false" placeholder="${toTr ? 'Türkçe anlamı' : 'İngilizce karşılığı'}" ${card.checked ? 'disabled' : ''} value="${esc(card.value || '')}">
      ${card.checked ? `${card.html}<div style="margin-top:12px"><button class="btn primary" id="next">Sıradaki</button></div>` : `<div style="margin-top:12px"><button class="btn primary" id="check">Kontrol et</button> <button class="btn ghost" id="idk">Bilmiyorum</button></div>`}</div>
    </div>`;
  },
  reviewMount(root) {
    $('#start', root)?.addEventListener('click', () => this.startSession(App.dueWords().slice(0, 20)));
    $('#startall', root)?.addEventListener('click', () => {
      const pool = App.state.vocab.filter((v) => v.learned);
      this.startSession(pool.sort(() => Math.random() - 0.5).slice(0, 10), true);
    });
    $('#again', root)?.addEventListener('click', () => { this.session = null; App.render(); });
    const S = this.session;
    if (!S || S.i >= S.queue.length) return;
    const card = S.queue[S.i];
    const w = App.state.vocab.find((v) => v.id === card.id);
    $('#say', root)?.addEventListener('click', () => speak(w.en));
    const input = $('#ans', root);
    input?.focus();
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') ($('#check', root) || $('#next', root))?.click();
    });
    $('#check', root)?.addEventListener('click', () => this.check(card, w, input.value));
    $('#idk', root)?.addEventListener('click', () => this.check(card, w, ''));
    $('#next', root)?.addEventListener('click', () => { S.i++; this.refreshBody(); });
  },
  startSession(words, practice = false) {
    this.session = {
      queue: words.map((w) => ({ id: w.id, dir: Math.random() < 0.5 ? 'en-tr' : 'tr-en' })),
      i: 0, right: 0, total: 0, typos: 0, practice,
    };
    this.refreshBody();
  },
  check(card, w, value) {
    const S = this.session;
    const toTr = card.dir === 'en-tr';
    const accepted = toTr ? splitMeanings(w.tr) : [w.en];
    const r = judge(value, accepted);
    card.value = value;
    card.checked = true;
    const answerLine = `<b>${esc(toTr ? w.tr : w.en)}</b>`;
    if (r.verdict === 'exact' || r.verdict === 'diacritic') {
      S.right++; S.total++;
      if (!S.practice) App.grade(w, true);
      card.html = `<div class="verdict v-ok">✔ Doğru! ${r.verdict === 'diacritic' ? `Türkçe karakterlere dikkat: <b>${esc(r.target)}</b>` : ''}<div class="small">${esc(w.ex)}</div></div>`;
    } else if (r.verdict === 'typo') {
      S.typos++;
      w.spell++;
      S.queue.push({ id: w.id, dir: card.dir }); // ask again at the end of the session
      card.html = `<div class="verdict v-near">✎ Yazım hatası — doğru yazım: <b>${esc(r.target)}</b><div class="small">Bu kelime oturumun sonunda tekrar sorulacak.</div></div>`;
    } else {
      S.total++;
      if (!S.practice) App.grade(w, false);
      card.html = `<div class="verdict v-bad">✘ Yanlış — doğrusu: ${answerLine}<div class="small">${esc(w.ex)}</div></div>`;
    }
    if (!S.practice || r.verdict) App.day().reviewed += 1;
    App.save();
    this.refreshBody();
  },

  // ---------- BANK ----------
  filter: 'all',
  bankView() {
    const st = App.vocabStats();
    const filters = [['all', `Tümü (${st.total})`], ['academic', `Akademik (${st.academicTotal})`], ['own', `Kendi eklediklerim (${st.own})`], ['shaky', `Zorlandıklarım (${st.shaky})`], ['mastered', `Pekişmiş (${st.mastered})`]];
    return `<div class="card"><div class="row spread" style="margin-bottom:10px"><input type="text" id="q" placeholder="Ara (İngilizce veya Türkçe)…" style="max-width:320px">
      <div class="row">${filters.map(([k, l]) => `<button class="chip ${this.filter === k ? '' : 'plain'}" data-filter="${k}">${l}</button>`).join('')}</div></div>
      <div class="scroll"><table><thead><tr><th>Kelime</th><th>Anlam</th><th>Tür</th><th>Seviye</th><th>Doğru / Yanlış</th><th>Başarı</th><th></th></tr></thead><tbody id="rows">${this.rows('')}</tbody></table></div></div>`;
  },
  rows(q) {
    const t = fold(q);
    const list = App.state.vocab
      .filter((w) => {
        if (this.filter === 'academic' && !w.academic) return false;
        if (this.filter === 'own' && w.src !== 'user') return false;
        if (this.filter === 'shaky' && !(w.learned && w.wrong > w.right)) return false;
        if (this.filter === 'mastered' && !(w.learned && w.box >= 4)) return false;
        return !t || fold(w.en).includes(t) || fold(w.tr).includes(t);
      })
      .sort((a, b) => b.wrong - a.wrong) // words you keep missing first; stable otherwise
      .slice(0, 200);
    if (!list.length) return '<tr><td colspan="7" class="empty">Sonuç yok</td></tr>';
    return list.map((w) => {
      const asked = w.right + w.wrong;
      const pct = asked ? Math.round((w.right / asked) * 100) : null;
      const cls = pct == null ? 'muted' : pct >= 80 ? 'b-green' : pct >= 50 ? 'b-amber' : 'b-red';
      return `<tr><td><b>${esc(w.en)}</b> <span class="muted small">${esc(w.pos || '')}</span>${w.spell ? ` <span class="badge b-amber" title="yazım hatası sayısı">✎${w.spell}</span>` : ''}</td><td>${esc(w.tr)}</td>
      <td>${w.academic ? '<span class="badge b-teal">akademik</span>' : '<span class="muted small">genel</span>'}${w.src === 'user' ? ' <span class="badge b-blue">kendi</span>' : ''}</td>
      <td>${w.learned ? `<span class="badge ${w.box >= 4 ? 'b-green' : 'b-blue'}">Kutu ${w.box}</span>` : '<span class="badge b-amber">yeni</span>'}</td>
      <td class="muted">${w.right} / ${w.wrong}</td>
      <td>${pct == null ? '<span class="muted small">—</span>' : `<span class="badge ${cls}">%${pct}</span>`}</td>
      <td>${w.src === 'user' ? `<button class="btn ghost sm" data-del="${w.id}">Sil</button>` : ''}</td></tr>`;
    }).join('');
  },
  bankMount(root) {
    $('#q', root).addEventListener('input', debounce((e) => { $('#rows').innerHTML = this.rows(e.target.value); }, 150));
    $$('[data-filter]', root).forEach((b) => (b.onclick = () => { this.filter = b.dataset.filter; this.refreshBody(); }));
    root.addEventListener('click', (e) => {
      const d = e.target.closest('[data-del]');
      if (!d) return;
      App.state.vocab = App.state.vocab.filter((w) => w.id !== d.dataset.del);
      App.save();
      $('#rows').innerHTML = this.rows($('#q').value);
    });
  },

  // ---------- ADD ----------
  addView() {
    return `<div class="card" style="max-width:560px"><h2>Kendi kelimeni ekle</h2>
      <label class="f">İngilizce</label><input type="text" id="a-en" autocomplete="off" spellcheck="false">
      <div id="a-hint" class="small" style="margin:4px 0 12px;min-height:18px"></div>
      <label class="f">Türkçe anlamı (birden fazlaysa virgülle ayır)</label>
      <div class="row" style="flex-wrap:nowrap"><input type="text" id="a-tr" autocomplete="off"><button class="btn" id="a-auto" style="white-space:nowrap">Otomatik çevir</button></div>
      <label class="f" style="margin-top:12px">Örnek cümle (isteğe bağlı)</label><input type="text" id="a-ex">
      <div class="row" style="margin-top:16px"><button class="btn primary" id="a-save">Kelimelerime ekle</button></div></div>`;
  },
  addMount() {
    const en = $('#a-en'), tr = $('#a-tr');
    $('#a-auto').onclick = async () => {
      if (!en.value.trim()) return;
      $('#a-auto').textContent = '…';
      const r = await Api.translate(en.value.trim(), 'en', 'tr');
      $('#a-auto').textContent = 'Otomatik çevir';
      if (r.error) return App.toast('Çeviri servisine ulaşılamadı');
      tr.value = r.data.alts.slice(0, 3).join(', ');
    };
    en.addEventListener('blur', async () => {
      const w = en.value.trim();
      if (!w || w.includes(' ')) return;
      const r = await Api.define(w);
      if (r.data && !r.data.found) {
        const sug = await Api.suggest(w);
        $('#a-hint').innerHTML = `<span style="color:var(--red)">Sözlükte bulunamadı — yazım hatası olabilir.</span> ${(sug.data || []).map((x) => `<button class="chip" data-fix="${esc(x)}">${esc(x)}</button>`).join(' ')}`;
        $$('[data-fix]').forEach((b) => (b.onclick = () => { en.value = b.dataset.fix; $('#a-hint').textContent = ''; }));
      } else $('#a-hint').textContent = '';
    });
    $('#a-save').onclick = () => {
      if (!en.value.trim() || !tr.value.trim()) return App.toast('İngilizce ve Türkçe alanlarını doldur');
      App.state.vocab.push({ id: `u${Date.now()}`, en: en.value.trim(), tr: tr.value.trim(), pos: '', ex: $('#a-ex').value.trim(), src: 'user', learned: true, box: 1, due: today(), right: 0, wrong: 0, spell: 0 });
      App.addRecent(en.value.trim(), tr.value.trim());
      App.save();
      App.toast('Eklendi — bugünkü tekrara dahil');
      en.value = tr.value = $('#a-ex').value = '';
    };
  },
};
