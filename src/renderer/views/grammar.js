Views.grammar = {
  topic: null, // open topic
  phase: 'lesson', // lesson | quiz | result
  answers: {},
  checkpoint: null,

  render() {
    if (App.params.id) {
      this.open(GRAMMAR.find((g) => g.id === App.params.id));
      this.checkpoint = App.params.checkpoint || null;
      App.params = {};
    }
    return `<div class="page">${this.topic ? this.topicHtml() : this.listHtml()}</div>`;
  },
  mount(root) {
    this.topic ? this.topicMount(root) : this.listMount(root);
  },
  open(t) {
    this.topic = t;
    this.phase = 'lesson';
    this.answers = {};
  },
  close() {
    this.topic = null;
    this.checkpoint = null;
  },

  // ---------- LIST ----------
  listHtml() {
    const g = App.state.grammar;
    const passed = App.metric('grammarPassed');
    const band = App.latestBand('grammar');
    return `<div class="page-head"><div><h1>Gramer</h1>
      <p class="sub">IELTS'te ayrı bir gramer bölümü yok; ama Writing ve Speaking puanının <b>%25'i</b> Grammatical Range &amp; Accuracy. Bu konular oradan puan kaybettiren yapıları hedefliyor.</p></div>
      <div style="width:220px"><div class="small muted" style="text-align:right">${passed}/${GRAMMAR.length} konu geçildi${band ? ` · band ${fmtBand(band)}` : ''}</div>${bar((passed / GRAMMAR.length) * 100, 'green')}</div></div>
      <div class="grid g2">${GRAMMAR.map((t) => {
        const r = g[t.id];
        const badge = !r ? '<span class="badge b-amber">başlanmadı</span>' : r.best >= 70 ? `<span class="badge b-green">geçildi · %${r.best}</span>` : `<span class="badge b-red">%${r.best} · tekrar et</span>`;
        return `<div class="card" style="margin:0"><div class="row spread"><span class="badge b-blue">${t.id} · ${esc(t.level)}</span>${badge}</div>
          <h2 style="margin:8px 0 4px">${esc(t.title)}</h2>
          <div class="muted small">${esc(t.why)}</div>
          <div class="row" style="margin-top:12px"><button class="btn primary sm" data-open="${t.id}">${r ? 'Tekrar çalış' : 'Başla'}</button>
          <span class="muted small">${t.questions.length} soru${r ? ` · ${r.attempts} deneme` : ''}</span></div></div>`;
      }).join('')}</div>
      <div class="card"><h2>Geçme ölçütü</h2><p class="small muted" style="margin:0">Bir konuyu "geçildi" saymak için <b>%70</b> gerekir (6 sorudan en az 5'i). Plandaki gramer maddeleri geçilen konu sayısına göre kendiliğinden işaretlenir.</p></div>`;
  },
  listMount(root) {
    $$('[data-open]', root).forEach((b) => (b.onclick = () => { this.open(GRAMMAR.find((g) => g.id === b.dataset.open)); App.render(); }));
  },

  // ---------- TOPIC ----------
  topicHtml() {
    const t = this.topic;
    const r = App.state.grammar[t.id];
    return `<div class="page-head"><div><span class="badge b-blue">${t.id} · ${esc(t.level)}</span>
      <h1 style="margin:6px 0 0">${esc(t.title)}</h1><p class="sub">${esc(t.why)}${this.checkpoint ? ` · <span class="badge b-blue">Adım ${this.checkpoint.step + 1} kontrol testi</span>` : ''}</p></div>
      <button class="btn" id="back">← Konulara dön</button></div>
      ${this.phase === 'lesson' ? this.lessonHtml(t, r) : this.phase === 'quiz' ? this.quizHtml(t) : this.resultHtml(t)}`;
  },

  lessonHtml(t, r) {
    return `<div class="card"><h2>Kurallar</h2>
      ${t.rules.map((x, i) => `<div class="def-block"><div><b>${i + 1}.</b> ${esc(x.r)}</div><div class="ex-line">${esc(x.ex)} <button class="btn ghost sm" data-say="${esc(x.ex.split('/')[0].trim())}">🔊</button></div></div>`).join('')}</div>
      <div class="card"><h2>Sık yapılan hatalar</h2>${t.mistakes.map((m) => `<div class="issue">${esc(m)}</div>`).join('')}</div>
      <div class="card"><div class="row spread"><div><b>${t.questions.length} soruluk test</b><div class="muted small">Geçmek için %70 gerekir.${r ? ` En iyi sonucun: %${r.best}` : ''}</div></div>
        <button class="btn primary" id="startq">Teste başla</button></div></div>`;
  },

  quizHtml(t) {
    return `<div class="card">${t.questions.map((q, i) => this.qHtml(q, i, false)).join('')}
      <div class="row" style="margin-top:14px"><button class="btn primary" id="submitq">Cevapları kontrol et</button>
      <span class="muted small">Boş bırakılan soru yanlış sayılır.</span></div></div>`;
  },

  resultHtml(t) {
    const right = t.questions.filter((q, i) => this.isRight(q, this.answers[i])).length;
    const pct = Math.round((right / t.questions.length) * 100);
    const ok = pct >= 70;
    return `<div class="card"><div class="row spread"><div><div class="muted small">Sonuç</div>
      <span class="band">%${pct}</span> <span class="muted" style="margin-left:10px">${right}/${t.questions.length} doğru · tahmini band ${fmtBand(pctToBand(pct))}</span>
      <div style="margin-top:8px"><span class="badge ${ok ? 'b-green' : 'b-red'}">${ok ? 'Konu geçildi' : 'Geçmedi — kuralları tekrar oku'}</span></div></div>
      <div style="width:240px">${bar(pct, ok ? 'green' : '')}<div class="small muted" style="margin-top:4px">Geçme sınırı %70</div></div></div></div>
      <div class="card">${t.questions.map((q, i) => this.qHtml(q, i, true)).join('')}
      <div class="row" style="margin-top:14px"><button class="btn primary" id="again">Tekrar çöz</button><button class="btn" id="lesson">Kuralları oku</button><button class="btn" id="back2">Konulara dön</button></div></div>`;
  },

  qHtml(q, i, checked) {
    const val = this.answers[i] ?? '';
    const ok = checked ? this.isRight(q, val) : null;
    const state = checked ? (ok ? 'right' : 'wrong') : '';
    let body;
    if (q.type === 'mcq')
      body = `<div class="opts">${q.opts.map((o, k) => `<label><input type="radio" name="g${i}" value="${k}" ${String(val) === String(k) ? 'checked' : ''} ${checked ? 'disabled' : ''}> ${esc(o)}</label>`).join('')}</div>`;
    else
      body = `<input type="text" data-gq="${i}" value="${esc(val)}" ${checked ? 'disabled' : ''} style="max-width:${q.type === 'fix' ? '100%' : '320px'}" autocomplete="off" spellcheck="false" placeholder="${q.type === 'fix' ? 'Cümlenin doğru halini yaz' : 'Boşluğu doldur'}">`;
    const answer = checked && !ok ? `<div class="small" style="margin-top:4px"><b>Doğru cevap:</b> ${esc(q.type === 'mcq' ? q.opts[q.a] : q.a[0])}</div>` : '';
    return `<div class="q ${state}"><div style="margin-bottom:6px"><b>${i + 1}.</b> ${esc(q.q)}</div>${body}${answer}</div>`;
  },

  isRight(q, val) {
    if (val === '' || val == null) return false;
    if (q.type === 'mcq') return Number(val) === q.a;
    // free-text answers tolerate punctuation and a typo, not a wrong structure
    return judge(String(val).replace(/[.?!]$/, ''), q.a).verdict !== 'wrong';
  },

  topicMount(root) {
    $('#back').onclick = () => { this.close(); App.render(); };
    $$('[data-say]', root).forEach((b) => (b.onclick = () => speak(b.dataset.say)));
    $('#startq')?.addEventListener('click', () => { this.phase = 'quiz'; this.answers = {}; App.render(); });
    $$('input[type=radio]', root).forEach((r) => r.addEventListener('change', () => { this.answers[+r.name.slice(1)] = r.value; }));
    $$('[data-gq]', root).forEach((i) => i.addEventListener('input', () => { this.answers[+i.dataset.gq] = i.value; }));
    $('#submitq')?.addEventListener('click', () => {
      const t = this.topic;
      const right = t.questions.filter((q, i) => this.isRight(q, this.answers[i])).length;
      const pct = Math.round((right / t.questions.length) * 100);
      App.saveGrammar(t.id, pct);
      App.bump('grammar');
      if (this.checkpoint && pct >= 70) App.completeCheckpoint(this.checkpoint.step, 'grammar');
      this.phase = 'result';
      App.render();
    });
    $('#again')?.addEventListener('click', () => { this.phase = 'quiz'; this.answers = {}; App.render(); });
    $('#lesson')?.addEventListener('click', () => { this.phase = 'lesson'; App.render(); });
    $('#back2')?.addEventListener('click', () => {
      const cp = this.checkpoint;
      this.close();
      cp ? App.go('plan') : App.render();
    });
  },
};
