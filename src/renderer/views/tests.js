Views.tests = {
  kind: 'reading',
  active: null, // { set, answers, checked, kind }
  checkpoint: null,

  render() {
    if (App.params.kind) {
      this.kind = App.params.kind;
      this.checkpoint = App.params.checkpoint || null;
      const set = (this.kind === 'reading' ? READING : LISTENING).find((x) => x.id === App.params.id);
      App.params = {};
      if (set) this.start(set);
    }
    if (this.active) return `<div class="page">${this.runnerHtml()}</div>`;

    const sets = this.kind === 'reading' ? READING : LISTENING;
    const results = App.state.results.filter((r) => r.skill === this.kind).slice(-8).reverse();
    return `<div class="page">
      <div class="page-head"><div><h1>Testler</h1><p class="sub">Reading ve Listening kontrol testleri. Her testin sonunda tahmini band'ini görürsün.</p></div></div>
      <div class="tabs"><button data-kind="reading" class="${this.kind === 'reading' ? 'on' : ''}">Reading</button><button data-kind="listening" class="${this.kind === 'listening' ? 'on' : ''}">Listening</button></div>
      <div class="grid g3">${sets.map((s) => {
        const last = App.state.results.filter((r) => r.skill === this.kind && r.ref === s.id).slice(-1)[0];
        return `<div class="card" style="margin:0"><span class="badge b-blue">${s.id}</span><h2 style="margin:8px 0 4px">${esc(s.title)}</h2>
          <div class="muted small">${s.questions.length} soru${last ? ` · son band ${fmtBand(last.band)}` : ''}</div>
          <button class="btn primary sm" data-start="${s.id}" style="margin-top:12px">${last ? 'Tekrar çöz' : 'Başla'}</button></div>`;
      }).join('')}</div>
      ${results.length ? `<div class="card"><h2>Geçmiş sonuçlar</h2><table><thead><tr><th>Tarih</th><th>Test</th><th>Doğru</th><th>Band</th></tr></thead><tbody>${results.map((r) => `<tr><td>${fmtDate(r.date)}</td><td>${esc(r.ref || '')}</td><td>${r.score ?? ''}</td><td><b>${fmtBand(r.band)}</b></td></tr>`).join('')}</tbody></table></div>` : ''}
    </div>`;
  },

  mount(root) {
    $$('[data-kind]', root).forEach((b) => (b.onclick = () => { this.kind = b.dataset.kind; this.checkpoint = null; App.render(); }));
    $$('[data-start]', root).forEach((b) => (b.onclick = () => {
      const set = (this.kind === 'reading' ? READING : LISTENING).find((x) => x.id === b.dataset.start);
      this.start(set);
      App.render();
    }));
    if (this.active) this.runnerMount(root);
  },

  start(set) {
    this.active = { set, answers: {}, checked: false, played: 0 };
  },

  runnerHtml() {
    const A = this.active;
    const s = A.set;
    return `<div class="page-head"><div><h1>${esc(s.title)}</h1><p class="sub">${this.kind === 'reading' ? 'Metni oku ve soruları cevapla.' : 'Kaydı dinle (en fazla 2 kez) ve soruları cevapla.'}${this.checkpoint ? ` · <span class="badge b-blue">Adım ${this.checkpoint.step + 1} kontrol testi</span>` : ''}</p></div>
      <button class="btn" id="back">← Listeye dön</button></div>
    <div class="grid" style="grid-template-columns:${this.kind === 'reading' ? '1.15fr 1fr' : '1fr'}">
      ${this.kind === 'reading'
        ? `<div class="card passage" style="margin:0">${s.text.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`
        : `<div class="card" style="margin:0"><div class="row spread"><b>Ses kaydı</b><span class="muted small">${A.played}/2 dinlendi</span></div>
           <div class="row" style="margin-top:10px"><button class="btn primary" id="play" ${A.played >= 2 && !A.checked ? 'disabled' : ''}>▶ Oynat</button><button class="btn" id="pause">⏸ Durdur</button>
           <span class="muted small" id="astate"></span>
           ${A.checked ? '<button class="btn" id="script">Metni göster</button>' : '<span class="muted small">Sorular kayıt sırasında cevaplanır.</span>'}</div>
           <div id="scriptbox" hidden style="margin-top:12px" class="small muted">${esc(s.script)}</div></div>`}
      <div class="card" style="margin:0">${s.questions.map((q, i) => this.qHtml(q, i)).join('')}
        <div class="row" style="margin-top:14px">${A.checked ? `<button class="btn primary" id="finish">Bitir</button>` : `<button class="btn primary" id="submit">Cevapları kontrol et</button>`}</div>
      </div></div>
      ${A.checked ? this.scoreHtml() : ''}`;
  },

  qHtml(q, i) {
    const A = this.active;
    const val = A.answers[i] ?? '';
    const ok = A.checked ? this.isRight(q, val) : null;
    const state = A.checked ? (ok ? 'right' : 'wrong') : '';
    let body;
    if (q.type === 'mcq')
      body = `<div class="opts">${q.opts.map((o, k) => `<label><input type="radio" name="q${i}" value="${k}" ${String(val) === String(k) ? 'checked' : ''} ${A.checked ? 'disabled' : ''}> ${esc(o)}</label>`).join('')}</div>`;
    else if (q.type === 'tfng')
      body = `<div class="opts row">${['True', 'False', 'Not Given'].map((o) => `<label style="margin-right:14px"><input type="radio" name="q${i}" value="${o}" ${val === o ? 'checked' : ''} ${A.checked ? 'disabled' : ''}> ${o}</label>`).join('')}</div>`;
    else body = `<input type="text" data-q="${i}" value="${esc(val)}" ${A.checked ? 'disabled' : ''} style="max-width:260px" autocomplete="off" spellcheck="false">`;
    const answerNote = A.checked && !ok ? `<div class="small" style="margin-top:4px"><b>Doğru cevap:</b> ${esc(q.type === 'mcq' ? q.opts[q.a] : Array.isArray(q.a) ? q.a[0] : q.a)}</div>` : '';
    return `<div class="q ${state}"><div style="margin-bottom:6px"><b>${i + 1}.</b> ${esc(q.q)}</div>${body}${answerNote}</div>`;
  },

  isRight(q, val) {
    if (val === '' || val == null) return false;
    if (q.type === 'mcq') return Number(val) === q.a;
    if (q.type === 'tfng') return val === q.a;
    return judge(val, q.a).verdict !== 'wrong';
  },

  scoreHtml() {
    const A = this.active;
    const right = A.set.questions.filter((q, i) => this.isRight(q, A.answers[i])).length;
    const pct = (right / A.set.questions.length) * 100;
    const band = pctToBand(pct);
    return `<div class="card"><div class="row spread"><div><div class="muted small">Sonuç</div><span class="band">${fmtBand(band)}</span>
      <span class="muted" style="margin-left:10px">${right} / ${A.set.questions.length} doğru · %${Math.round(pct)}</span></div>
      <div style="width:240px">${bar(pct, pct >= 68 ? 'green' : '')}<div class="small muted" style="margin-top:4px">Hedef 6.5 için ~%68 gerekir</div></div></div></div>`;
  },

  runnerMount(root) {
    const A = this.active;
    $('#back').onclick = () => { Audio$.stop(); this.active = null; this.checkpoint = null; App.render(); };
    $$('input[type=radio]', root).forEach((r) => r.addEventListener('change', () => { A.answers[+r.name.slice(1)] = r.value; }));
    $$('[data-q]', root).forEach((i) => i.addEventListener('input', () => { A.answers[+i.dataset.q] = i.value; }));
    $('#play')?.addEventListener('click', () => {
      A.played++;
      const btn = $('#play');
      if (A.played >= 2 && !A.checked) btn.disabled = true;
      Audio$.play(A.set.script, {
        onstate: (s) => {
          const el = $('#astate');
          if (!el) return;
          if (s === 'loading') el.textContent = 'ses hazırlanıyor…';
          else if (s === 'playing') el.textContent = '▶ oynatılıyor';
          else if (s === 'ended') el.textContent = 'bitti';
          else el.innerHTML = `<span style="color:var(--red)">${esc(AUDIO_ERRORS[s] || s)}</span>`;
        },
      });
      $('.card .row.spread .muted.small', root).textContent = `${A.played}/2 dinlendi`;
    });
    $('#pause')?.addEventListener('click', () => { Audio$.stop(); if ($('#astate')) $('#astate').textContent = 'durduruldu'; });
    $('#script')?.addEventListener('click', () => ($('#scriptbox').hidden = !$('#scriptbox').hidden));
    $('#submit')?.addEventListener('click', () => {
      Audio$.stop();
      A.checked = true;
      const right = A.set.questions.filter((q, i) => this.isRight(q, A.answers[i])).length;
      const pct = (right / A.set.questions.length) * 100;
      App.addResult(this.kind, pctToBand(pct), { ref: A.set.id, score: `${right}/${A.set.questions.length}`, step: this.checkpoint?.step });
      App.bump('practice');
      if (this.checkpoint) App.completeCheckpoint(this.checkpoint.step, this.kind);
      App.render();
    });
    $('#finish')?.addEventListener('click', () => {
      Audio$.stop();
      this.active = null;
      const cp = this.checkpoint;
      this.checkpoint = null;
      cp ? App.go('plan') : App.render();
    });
  },
};
