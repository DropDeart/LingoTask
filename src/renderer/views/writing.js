Views.writing = {
  tab: 'write', // write | history
  task: 't2',
  offset: 0,
  draft: '',
  timerSec: 0,
  timerId: null,
  analysis: null,
  checkpoint: null,
  openId: null, // writing being viewed in history
  revising: null, // { id, draft, analysis } while writing a corrected version

  dayIndex() {
    const d = new Date();
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  },
  prompt() {
    if (this.checkpoint) return [...WRITING_T2, ...WRITING_T1].find((p) => p.id === this.checkpoint.ref);
    const list = this.task === 't1' ? WRITING_T1 : WRITING_T2;
    return list[(this.dayIndex() + this.offset) % list.length];
  },

  render() {
    if (App.params.checkpoint) {
      this.checkpoint = App.params.checkpoint;
      this.tab = 'write';
      this.task = this.checkpoint.ref.startsWith('T1') ? 't1' : 't2';
      this.draft = '';
      this.analysis = null;
      this.revising = null;
      this.timerSec = 0;
      App.params = {};
    }
    if (this.revising) return `<div class="page">${this.reviseHtml()}</div>`;
    if (this.tab === 'history') return `<div class="page">${this.historyHtml()}</div>`;
    const p = this.prompt();
    const limit = this.task === 't1' ? 20 : 40;
    const min = this.task === 't1' ? 150 : 250;
    return `<div class="page">
      <div class="page-head"><div><h1>Yazma</h1><p class="sub">${this.checkpoint ? `<span class="badge b-blue">Adım ${this.checkpoint.step + 1} kontrol görevi</span> ` : ''}Günün topic'ini yaz, gramer ve yazımı kontrol ettir, tahmini band'ini gör.</p></div>
        ${this.checkpoint ? '' : `<div class="row"><div class="tabs" style="margin:0;border:0"><button data-task="t2" class="${this.task === 't2' ? 'on' : ''}">Task 2 · Essay</button><button data-task="t1" class="${this.task === 't1' ? 'on' : ''}">Task 1 · Tablo</button></div><button class="btn" id="other">Başka topic</button><button class="btn" id="tohist">Geçmiş (${App.state.writings.length})</button></div>`}</div>

      <div class="card">
        <div class="row spread"><span class="badge b-blue">${this.checkpoint ? 'Kontrol' : 'Günün topic\'i'} · ${p.id}</span><span class="muted small">Hedef: ${min}+ kelime · ${limit} dk</span></div>
        <div class="prompt" style="margin-top:10px"><b>${esc(p.q)}</b>${p.rows ? `<div class="scroll" style="margin-top:10px"><table style="background:#fff"><thead><tr>${p.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${p.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
        ${this.task === 't2' ? '<div class="small muted" style="margin-top:8px">Giving reasons for your answer, include relevant examples from your own knowledge or experience.</div>' : '<div class="small muted" style="margin-top:8px">Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</div>'}</div>
        <div class="row spread" style="margin:14px 0 8px"><div><span class="timer" id="timer">00:00</span> <button class="btn sm" id="tstart">${this.timerId ? 'Durdur' : 'Zamanlayıcı başlat'}</button></div><div><b id="wc">0</b> <span class="muted">kelime</span></div></div>
        <textarea id="essay" spellcheck="false" placeholder="Write your answer here…">${esc(this.draft)}</textarea>
        <div class="row" style="margin-top:12px"><button class="btn primary" id="check">Kontrol et</button><button class="btn" id="save" ${this.analysis ? '' : 'disabled'}>Kaydet</button><span class="muted small" id="status"></span></div>
      </div>
      <div id="analysis">${this.analysis ? this.analysisHtml(this.analysis) : ''}</div>
    </div>`;
  },

  // ---------- HISTORY ----------
  historyHtml() {
    const list = App.state.writings.slice().reverse();
    const open = this.openId && App.state.writings.find((w) => w.id === this.openId);
    return `<div class="page-head"><div><h1>Yazma Geçmişi</h1><p class="sub">Yazdıklarını tekrar oku, bulunan hataları gözden geçir ve düzeltilmiş halini yazıp yeniden değerlendir.</p></div>
      <button class="btn" id="towrite">← Yazmaya dön</button></div>
      ${!list.length ? '<div class="card empty">Henüz kaydedilmiş bir yazı yok. Bir topic yazıp “Kontrol et” → “Kaydet” dediğinde burada görünür.</div>' : ''}
      ${list.length ? `<div class="card"><table><thead><tr><th>Tarih</th><th>Görev</th><th>Kelime</th><th>Band</th><th>Düzeltme</th><th></th></tr></thead><tbody>
        ${list.map((w) => {
          const last = w.revisions[w.revisions.length - 1];
          const delta = last ? last.band - w.band : null;
          return `<tr${open && open.id === w.id ? ' style="background:var(--blue-soft)"' : ''}><td>${fmtDate(w.date)}</td><td>${esc(w.promptId)}</td><td>${w.words}</td>
            <td><b>${fmtBand(w.band)}</b></td>
            <td>${last ? `<b>${fmtBand(last.band)}</b> <span class="badge ${delta > 0 ? 'b-green' : delta < 0 ? 'b-red' : 'b-blue'}">${delta > 0 ? '+' : ''}${delta.toFixed(1)}</span>` : `<span class="muted small">—</span>`}</td>
            <td><button class="btn sm" data-open="${w.id}">${open && open.id === w.id ? 'Kapat' : 'Aç'}</button></td></tr>`;
        }).join('')}</tbody></table></div>` : ''}
      ${open ? this.detailHtml(open) : ''}`;
  },

  detailHtml(w) {
    const p = [...WRITING_T2, ...WRITING_T1].find((x) => x.id === w.promptId);
    const versions = [{ label: 'İlk hali', ...w }, ...w.revisions.map((r, i) => ({ label: `Düzeltme ${i + 1}`, ...r }))];
    return `<div class="card"><div class="row spread"><h2 style="margin:0">${esc(w.promptId)} · ${fmtDate(w.date)}</h2>
        <button class="btn primary" data-revise="${w.id}">✎ Düzeltilmiş halini yaz</button></div>
      ${p ? `<div class="prompt" style="margin-top:10px">${esc(p.q)}</div>` : ''}
      ${versions.map((v) => `<div style="margin-top:16px"><div class="row spread"><b>${esc(v.label)}</b>
          <span class="muted small">${fmtDate(v.date)} · ${v.words} kelime · band <b>${fmtBand(v.band)}</b></span></div>
        <div class="card" style="background:#fafbfd;margin-top:6px;white-space:pre-wrap">${this.markedUp(v)}</div>
        ${v.issues?.length ? `<div class="small muted" style="margin:6px 0 0">Altı çizili ${v.issues.length} sorun:</div>${v.issues.slice(0, 20).map((i) => Views.dictionary.issueHtml(i)).join('')}` : '<div class="verdict v-ok">Dil kontrolünde sorun bulunmadı.</div>'}</div>`).join('')}
    </div>`;
  },

  // ---------- REVISION ----------
  reviseHtml() {
    const r = this.revising;
    const w = App.state.writings.find((x) => x.id === r.id);
    const p = [...WRITING_T2, ...WRITING_T1].find((x) => x.id === w.promptId);
    const min = w.promptId.startsWith('T1') ? 150 : 250;
    return `<div class="page-head"><div><h1>Düzeltilmiş Hali</h1>
      <p class="sub">${esc(w.promptId)} · ilk band <b>${fmtBand(w.band)}</b> · ${w.words} kelime. Hataları düzeltip yeniden değerlendir; iki sonuç yan yana gösterilir.</p></div>
      <button class="btn" id="cancelrev">← Vazgeç</button></div>
      ${p ? `<div class="card"><div class="prompt">${esc(p.q)}</div></div>` : ''}
      <div class="grid g2" style="margin-top:16px">
        <div class="card" style="margin:0"><div class="row spread"><b>İlk hali</b><span class="muted small">band ${fmtBand(w.band)}</span></div>
          <div style="margin-top:8px;white-space:pre-wrap;max-height:300px;overflow-y:auto;background:#fafbfd;padding:10px;border-radius:8px">${this.markedUp(w)}</div>
          <div class="small muted" style="margin-top:8px">Altı çizili yerler dil kontrolünün işaretlediği noktalar.</div></div>
        <div class="card" style="margin:0"><div class="row spread"><b>Düzeltilmiş hali</b><span><b id="rwc">0</b> <span class="muted">/ ${min} kelime</span></span></div>
          <textarea id="revtext" spellcheck="false" style="min-height:300px;margin-top:8px">${esc(r.draft)}</textarea>
          <div class="row" style="margin-top:10px"><button class="btn primary" id="revcheck">Kontrol et</button>
            <button class="btn" id="revsave" ${r.analysis ? '' : 'disabled'}>Kaydet</button>
            <button class="btn ghost" id="revcopy">İlk halini kopyala</button><span class="muted small" id="revstatus"></span></div></div>
      </div>
      <div id="revanalysis">${r.analysis ? this.compareHtml(w, r.analysis) : ''}</div>`;
  },

  // underlines the spans LanguageTool flagged, right to left so earlier offsets stay valid
  markedUp(w) {
    let text = w.text;
    const issues = (w.issues || []).slice().sort((a, b) => b.offset - a.offset);
    for (const i of issues) {
      const color = i.kind === 'spelling' ? 'var(--red)' : i.kind === 'grammar' ? 'var(--amber)' : 'var(--blue)';
      text = `${text.slice(0, i.offset)}\u0001${color}\u0002${text.slice(i.offset, i.offset + i.length)}\u0003${text.slice(i.offset + i.length)}`;
    }
    return esc(text)
      .replace(/\u0001([^\u0002]*)\u0002/g, '<span style="border-bottom:2px solid $1">')
      .replace(/\u0003/g, '</span>');
  },

  compareHtml(w, a) {
    const e = a.est;
    const row = (label, before, after) => {
      const d = after - before;
      return `<div class="crit"><span>${label}</span><span>${fmtBand(before)} → <b>${fmtBand(after)}</b> <span class="badge ${d > 0 ? 'b-green' : d < 0 ? 'b-red' : 'b-blue'}">${d > 0 ? '+' : ''}${d.toFixed(1)}</span></span></div>`;
    };
    const b = w.crit || { tr: w.band, cc: w.band, lr: w.band, gra: w.band };
    return `<div class="grid" style="grid-template-columns:300px 1fr;margin-top:16px">
      <div class="card" style="margin:0"><div class="muted small">Band değişimi</div>
        <div class="row" style="gap:12px;align-items:baseline"><span class="band" style="font-size:26px;color:var(--muted)">${fmtBand(w.band)}</span>
          <span style="font-size:20px">→</span><span class="band">${fmtBand(e.band)}</span></div>
        <div style="margin-top:12px">${row('Task Response', b.tr, e.tr)}${row('Coherence', b.cc, e.cc)}${row('Lexical', b.lr, e.lr)}${row('Grammar', b.gra, e.gra)}</div>
        <div class="crit"><span>Sorun sayısı</span><span>${(w.issues || []).length} → <b>${a.issues.length}</b></span></div></div>
      <div class="card" style="margin:0"><h2>Düzeltilmiş halde kalan sorunlar</h2>
        ${a.issues.length ? a.issues.slice(0, 25).map((i) => Views.dictionary.issueHtml(i)).join('') : '<div class="verdict v-ok">Hiç sorun kalmamış — temiz bir metin.</div>'}</div></div>`;
  },

  mount(root) {
    if (this.revising) return this.reviseMount(root);
    if (this.tab === 'history') return this.historyMount(root);
    const ta = $('#essay');
    const count = () => {
      this.draft = ta.value;
      $('#wc').textContent = this.words(ta.value).length;
    };
    ta.addEventListener('input', count);
    count();
    this.drawTimer();
    $$('[data-task]', root).forEach((b) => (b.onclick = () => { this.task = b.dataset.task; this.offset = 0; this.draft = ''; this.analysis = null; App.render(); }));
    $('#other')?.addEventListener('click', () => { this.offset++; this.draft = ''; this.analysis = null; App.render(); });
    $('#tohist')?.addEventListener('click', () => { this.tab = 'history'; App.render(); });
    $('#tstart').onclick = () => {
      if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
      else this.timerId = setInterval(() => { if (!$('#timer')) { clearInterval(this.timerId); this.timerId = null; return; } this.timerSec++; this.drawTimer(); }, 1000);
      $('#tstart').textContent = this.timerId ? 'Durdur' : 'Zamanlayıcı başlat';
    };
    $('#check').onclick = () => this.run();
    $('#save').onclick = () => this.save();
  },

  historyMount(root) {
    $('#towrite').onclick = () => { this.tab = 'write'; App.render(); };
    $$('[data-open]', root).forEach((b) => (b.onclick = () => {
      this.openId = this.openId === +b.dataset.open ? null : +b.dataset.open;
      App.render();
    }));
    $$('[data-revise]', root).forEach((b) => (b.onclick = () => {
      this.revising = { id: +b.dataset.revise, draft: '', analysis: null };
      App.render();
    }));
  },

  reviseMount() {
    const r = this.revising;
    const w = App.state.writings.find((x) => x.id === r.id);
    const ta = $('#revtext');
    const count = () => { r.draft = ta.value; $('#rwc').textContent = this.words(ta.value).length; };
    ta.addEventListener('input', count);
    count();
    ta.focus();
    $('#cancelrev').onclick = () => { this.revising = null; App.render(); };
    $('#revcopy').onclick = () => { ta.value = w.text; count(); ta.focus(); };
    $('#revcheck').onclick = async () => {
      const text = r.draft.trim();
      if (this.words(text).length < 20) return App.toast('Önce en az 20 kelime yaz');
      $('#revstatus').textContent = 'Kontrol ediliyor…';
      $('#revcheck').disabled = true;
      const res = await Api.check(text);
      $('#revcheck').disabled = false;
      $('#revstatus').textContent = '';
      this.task = w.promptId.startsWith('T1') ? 't1' : 't2'; // estimate() reads the task length target
      r.analysis = { text, issues: res.data, est: this.estimate(text, res.data), local: res.local };
      $('#revanalysis').innerHTML = this.compareHtml(w, r.analysis);
      $('#revsave').disabled = false;
    };
    $('#revsave').onclick = () => {
      if (!r.analysis) return;
      const a = r.analysis;
      w.revisions.push({ date: today(), text: a.text, words: a.est.n, band: a.est.band, crit: { tr: a.est.tr, cc: a.est.cc, lr: a.est.lr, gra: a.est.gra }, issues: a.issues });
      App.addResult('writing', a.est.band, { promptId: w.promptId, revision: true });
      App.bump('writing');
      this.revising = null;
      this.openId = w.id;
      this.tab = 'history';
      App.toast(`Düzeltme kaydedildi · ${fmtBand(w.band)} → ${fmtBand(a.est.band)}`);
      App.render();
    };
  },

  drawTimer() {
    const t = $('#timer');
    if (t) t.textContent = `${String(Math.floor(this.timerSec / 60)).padStart(2, '0')}:${String(this.timerSec % 60).padStart(2, '0')}`;
  },
  words: (t) => t.trim().split(/\s+/).filter(Boolean),

  async run() {
    const text = this.draft.trim();
    if (this.words(text).length < 20) return App.toast('Önce en az 20 kelime yaz');
    $('#status').textContent = 'Kontrol ediliyor…';
    $('#check').disabled = true;
    const r = await Api.check(text);
    $('#check').disabled = false;
    $('#status').textContent = '';
    this.analysis = { text, issues: r.data, est: this.estimate(text, r.data), saved: false, local: r.local };
    $('#analysis').innerHTML = this.analysisHtml(this.analysis);
    $('#save').disabled = false;
  },

  // Heuristic estimate from measurable features — a rough guide, not an examiner's mark.
  estimate(text, issues) {
    const words = this.words(text);
    const n = words.length;
    const min = this.task === 't1' ? 150 : 250;
    const paras = text.split(/\n\s*\n/).filter((s) => s.trim()).length;
    const sents = text.split(/[.!?]+(\s|$)/).filter((s) => s && s.trim().length > 1);
    const clean = words.map((w) => w.toLowerCase().replace(/[^a-z']/g, '')).filter(Boolean);
    const ttr = new Set(clean).size / Math.max(clean.length, 1);
    const longRatio = clean.filter((w) => w.length >= 7).length / Math.max(clean.length, 1);
    const linkers = (text.match(/\b(however|moreover|furthermore|in addition|therefore|consequently|for example|for instance|on the other hand|in contrast|as a result|while|although|whereas|in conclusion|overall|firstly|secondly|finally|despite|nevertheless)\b/gi) || []).length;
    const per100 = (k) => (issues.filter((i) => i.kind === k).length / Math.max(n, 1)) * 100;
    const avgSent = n / Math.max(sents.length, 1);
    const clamp = (x) => Math.max(3.5, Math.min(8, x));

    let tr = 6.5 - Math.max(0, ((min - n) / min) * 3.5) - (paras < 3 ? 0.5 : 0) + (n > min * 1.6 ? -0.5 : 0);
    let cc = 5.2 + Math.min(linkers, 8) * 0.2 + (paras >= 4 ? 0.5 : paras >= 3 ? 0.2 : -0.3);
    // cap the diversity terms: short texts score a high type/token ratio for free
    let lr = 4.2 + Math.min(ttr, 0.62) * 4.2 + Math.min(longRatio, 0.3) * 4 - per100('spelling') * 0.5;
    let gra = 7.8 - per100('grammar') * 0.5 - per100('spelling') * 0.2 - (avgSent < 11 || avgSent > 30 ? 0.5 : 0);
    const crit = { tr: roundHalf(clamp(tr)), cc: roundHalf(clamp(cc)), lr: roundHalf(clamp(lr)), gra: roundHalf(clamp(gra)) };
    const band = roundHalf((crit.tr + crit.cc + crit.lr + crit.gra) / 4);
    return { ...crit, band, n, min, paras, linkers, ttr, avgSent };
  },

  analysisHtml(a) {
    const e = a.est;
    const tips = [];
    if (e.n < e.min) tips.push(`Kelime sayısı düşük (${e.n}/${e.min}). Eksik kelime sayısı Task Response puanını düşürür.`);
    if (e.paras < 3 && this.task === 't2') tips.push('Essay 4 paragraf olmalı: giriş, 2 gelişme, sonuç.');
    if (e.linkers < 4) tips.push('Bağlaç çeşitliliğini artır (however, moreover, as a result, whereas…).');
    if (e.ttr < 0.5) tips.push('Aynı kelimeleri çok tekrar ediyorsun; eş anlamlı ve akademik kelimeler kullan.');
    if (e.avgSent < 11) tips.push('Cümleler kısa; karmaşık cümleler (although, which, who…) ekle.');
    const counts = ['spelling', 'grammar', 'style'].map((k) => a.issues.filter((i) => i.kind === k).length);
    return `<div class="grid" style="grid-template-columns:230px 1fr;margin-top:16px">
      <div class="card" style="margin:0"><div class="muted small">Tahmini band</div><div class="band">${fmtBand(e.band)}</div>
        <div style="margin-top:12px"><div class="crit"><span>Task Response</span><b>${fmtBand(e.tr)}</b></div><div class="crit"><span>Coherence</span><b>${fmtBand(e.cc)}</b></div><div class="crit"><span>Lexical</span><b>${fmtBand(e.lr)}</b></div><div class="crit"><span>Grammar</span><b>${fmtBand(e.gra)}</b></div></div>
        <p class="small muted">Otomatik tahmindir; resmî değerlendirme yerine geçmez.</p></div>
      <div class="card" style="margin:0"><h2>Bulgular · ${counts[0]} yazım, ${counts[1]} gramer, ${counts[2]} üslup
        ${a.local ? '<span class="local-note">⛁ yerel kontrol — bağlanınca daha ayrıntılı taranır</span>' : ''}</h2>
        ${tips.map((t) => `<div class="verdict v-near" style="margin:0 0 8px">${esc(t)}</div>`).join('')}
        ${a.issues.slice(0, 25).map((i) => Views.dictionary.issueHtml(i)).join('') || '<div class="verdict v-ok">Gramer ve yazım açısından sorun bulunmadı.</div>'}</div></div>`;
  },

  save() {
    const a = this.analysis;
    if (!a || a.saved) return;
    a.saved = true;
    const p = this.prompt();
    const e = a.est;
    App.state.writings.push({
      id: Date.now(), date: today(), promptId: p.id, words: e.n, band: e.band, text: a.text,
      crit: { tr: e.tr, cc: e.cc, lr: e.lr, gra: e.gra }, issues: a.issues, revisions: [],
    });
    App.bump('writing');
    App.addResult('writing', a.est.band, { promptId: p.id, step: this.checkpoint?.step });
    if (this.checkpoint) {
      App.completeCheckpoint(this.checkpoint.step, 'writing');
      this.checkpoint = null;
    }
    this.draft = '';
    this.analysis = null;
    this.timerSec = 0;
    clearInterval(this.timerId);
    this.timerId = null;
    App.toast('Kaydedildi');
    App.render();
  },
};
