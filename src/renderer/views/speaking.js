Views.speaking = {
  part: 'p2',
  idx: 0,
  checkpoint: null,
  phase: 'idle', // idle | prep | speaking | done
  left: 0,
  tick: null,
  rec: null,
  chunks: [],
  audioUrl: null,
  transcript: '',
  result: null,

  card() {
    return this.part === 'p2' ? SPEAKING.p2[this.idx % SPEAKING.p2.length] : SPEAKING.p1[this.idx % SPEAKING.p1.length];
  },

  render() {
    if (App.params.checkpoint) {
      this.checkpoint = App.params.checkpoint;
      this.part = 'p2';
      this.idx = this.checkpoint.ref;
      this.reset();
      App.params = {};
    }
    const c = this.card();
    const hist = App.state.speakings.slice(-6).reverse();
    return `<div class="page">
      <div class="page-head"><div><h1>Konuşma</h1><p class="sub">${this.checkpoint ? `<span class="badge b-blue">Adım ${this.checkpoint.step + 1} kontrol görevi</span> ` : ''}Cue card'ı oku, 1 dakika hazırlan, 2 dakika konuş. Kaydını dinle ve akıcılığını ölç.</p></div>
        <div class="row"><div class="tabs" style="margin:0;border:0"><button data-part="p1" class="${this.part === 'p1' ? 'on' : ''}">Part 1</button><button data-part="p2" class="${this.part === 'p2' ? 'on' : ''}">Part 2 & 3</button></div><button class="btn" id="next">Başka kart</button></div></div>

      <div class="card">
        ${this.part === 'p2'
          ? `<div class="prompt"><b>${esc(c.cue)}</b><div class="small" style="margin-top:8px">You should say:</div><ul style="margin:4px 0">${c.pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`
          : `<div class="prompt"><b>Part 1 · ${esc(c.topic)}</b><ul style="margin:6px 0">${c.qs.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>`}
        <div class="row spread" style="margin-top:16px">
          <div><span class="timer" id="clock">${this.clockText()}</span> <span class="muted small" id="phase">${this.phaseText()}</span></div>
          <div class="row">${this.controls()}</div></div>
        ${this.audioUrl ? `<div style="margin-top:14px"><audio controls src="${this.audioUrl}" style="width:100%"></audio></div>` : ''}
      </div>

      <div class="card"><div class="row spread"><h2 style="margin:0">Konuşma Metni</h2><button class="btn sm" id="listen">🔊 Soruyu dinle</button></div>
        <p class="small muted">Tarayıcı konuşma tanıma açıksa kaydederken otomatik dolar; değilse konuştuklarını buraya yazarak analiz ettirebilirsin.</p>
        <textarea id="tr" style="min-height:130px" spellcheck="false" placeholder="Transcript…">${esc(this.transcript)}</textarea>
        <div class="row" style="margin-top:12px"><button class="btn primary" id="analyze">Analiz et</button>
          ${this.part === 'p2' ? `<span class="muted small">Part 3 devam soruları: ${c.p3.map(esc).join(' · ')}</span>` : ''}</div></div>
      <div id="sres">${this.result ? this.resultHtml(this.result) : ''}</div>
      ${hist.length ? `<div class="card"><h2>Son kayıtlar</h2><table><thead><tr><th>Tarih</th><th>Konu</th><th>Süre</th><th>Kelime/dk</th><th>Band</th></tr></thead><tbody>${hist.map((h) => `<tr><td>${fmtDate(h.date)}</td><td>${esc(h.topic)}</td><td>${h.sec} sn</td><td>${h.wpm}</td><td><b>${fmtBand(h.band)}</b></td></tr>`).join('')}</tbody></table></div>` : ''}
    </div>`;
  },

  controls() {
    if (this.phase === 'idle') return `<button class="btn primary" id="go">${this.part === 'p2' ? '1 dk hazırlık + kayıt' : 'Kaydı başlat'}</button>`;
    if (this.phase === 'prep') return `<button class="btn primary" id="skip">Hazırım, başla</button>`;
    if (this.phase === 'speaking') return `<span class="rec-dot"></span><button class="btn" id="stop">Kaydı bitir</button>`;
    return `<button class="btn" id="again">Yeniden kaydet</button>`;
  },
  clockText() {
    const s = Math.max(this.left, 0);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  },
  phaseText() {
    return { idle: 'hazır', prep: 'hazırlık süresi', speaking: 'kayıtta', done: `kayıt tamam · ${this.spokenSec} sn` }[this.phase] || '';
  },
  reset() {
    clearInterval(this.tick);
    this.tick = null;
    this.phase = 'idle';
    this.left = 0;
    this.transcript = '';
    this.result = null;
    this.audioUrl = null;
    this.spokenSec = 0;
    try { this.rec?.stop(); } catch {}
    try { this.sr?.stop(); } catch {}
    this.rec = this.sr = null;
  },

  mount(root) {
    $$('[data-part]', root).forEach((b) => (b.onclick = () => { this.part = b.dataset.part; this.idx = 0; this.checkpoint = null; this.reset(); App.render(); }));
    $('#next').onclick = () => { this.idx++; this.checkpoint = null; this.reset(); App.render(); };
    $('#go')?.addEventListener('click', () => (this.part === 'p2' ? this.startPrep() : this.startRec()));
    $('#skip')?.addEventListener('click', () => this.startRec());
    $('#stop')?.addEventListener('click', () => this.stopRec());
    $('#again')?.addEventListener('click', () => { this.reset(); App.render(); });
    $('#listen').onclick = () => {
      const c = this.card();
      speak(this.part === 'p2' ? `${c.cue} You should say: ${c.pts.join(', ')}` : c.qs.join(' '));
    };
    const ta = $('#tr');
    ta.addEventListener('input', () => (this.transcript = ta.value));
    $('#analyze').onclick = () => this.analyze();
  },

  refresh() {
    const c = $('#clock');
    if (!c) { clearInterval(this.tick); this.tick = null; return; }
    c.textContent = this.clockText();
    $('#phase').textContent = this.phaseText();
  },
  redrawControls() {
    const row = $('#stop')?.parentElement || $('#go')?.parentElement || $('#skip')?.parentElement || $('#again')?.parentElement;
    if (row) {
      row.innerHTML = this.controls();
      this.mount($('#root'));
    } else App.render();
  },

  startPrep() {
    this.phase = 'prep';
    this.left = 60;
    this.redrawControls();
    clearInterval(this.tick);
    this.tick = setInterval(() => {
      this.left--;
      this.refresh();
      if (this.left <= 0) { clearInterval(this.tick); this.startRec(); }
    }, 1000);
  },

  async startRec() {
    clearInterval(this.tick);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      App.toast('Mikrofona erişilemedi — konuşup metni elle yazabilirsin');
      this.phase = 'done';
      this.spokenSec = 0;
      this.redrawControls();
      return;
    }
    this.chunks = [];
    this.rec = new MediaRecorder(stream);
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      this.audioUrl = URL.createObjectURL(new Blob(this.chunks, { type: this.rec.mimeType }));
      App.render();
    };
    this.rec.start();
    this.startSR();
    this.phase = 'speaking';
    this.left = this.part === 'p2' ? 120 : 90;
    this.startedAt = Date.now();
    this.redrawControls();
    this.tick = setInterval(() => {
      this.left--;
      this.refresh();
      if (this.left <= 0) this.stopRec();
    }, 1000);
  },

  startSR() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    this.sr = new SR();
    this.sr.lang = 'en-GB';
    this.sr.continuous = true;
    this.sr.interimResults = false;
    this.sr.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) this.transcript += `${e.results[i][0].transcript.trim()} `;
      const ta = $('#tr');
      if (ta) ta.value = this.transcript;
    };
    this.sr.onerror = () => {};
    try { this.sr.start(); } catch {}
  },

  stopRec() {
    clearInterval(this.tick);
    this.tick = null;
    this.spokenSec = Math.round((Date.now() - this.startedAt) / 1000);
    this.phase = 'done';
    try { this.sr?.stop(); } catch {}
    try { this.rec?.state === 'recording' && this.rec.stop(); } catch {}
    App.bump('speaking');
    App.render();
  },

  async analyze() {
    const text = (this.transcript || '').trim();
    if (text.split(/\s+/).filter(Boolean).length < 15) return App.toast('Analiz için en az 15 kelimelik metin gerekli');
    $('#sres').innerHTML = '<div class="card empty">Analiz ediliyor…</div>';
    const r = await Api.check(text);
    const issues = r.data || [];
    const words = text.split(/\s+/).filter(Boolean);
    const sec = this.spokenSec || Math.round((words.length / 130) * 60);
    const wpm = Math.round((words.length / Math.max(sec, 1)) * 60);
    const clean = words.map((w) => w.toLowerCase().replace(/[^a-z']/g, '')).filter(Boolean);
    const ttr = new Set(clean).size / Math.max(clean.length, 1);
    const fillers = (text.match(/\b(um+|uh+|er+|like|you know|i mean|actually)\b/gi) || []).length;
    const linkers = (text.match(/\b(because|however|although|for example|so|also|moreover|in addition|that is why|as well as)\b/gi) || []).length;
    const errPer100 = (issues.filter((i) => i.kind !== 'style').length / Math.max(words.length, 1)) * 100;
    const clamp = (x) => Math.max(3.5, Math.min(8, x));
    const fc = clamp(4.6 + (wpm >= 110 && wpm <= 165 ? 1.6 : wpm >= 90 ? 1 : 0.2) + Math.min(linkers, 6) * 0.15 - Math.min(fillers, 8) * 0.12 + (sec >= 90 && this.part === 'p2' ? 0.4 : 0));
    // TTR is inherently high on short samples, so cap its contribution and hold short answers near neutral
    const longRatio = clean.filter((w) => w.length >= 7).length / Math.max(clean.length, 1);
    const shortPenalty = words.length < 90 ? (90 - words.length) / 90 * 1.5 : 0;
    const lex = clamp(4.6 + Math.min(ttr, 0.62) * 3.2 + Math.min(longRatio, 0.3) * 4 - shortPenalty);
    const gra = clamp(7.6 - errPer100 * 0.45);
    const pron = clamp(this.audioUrl ? 6 : 5.5); // needs human judgement; kept neutral
    const band = roundHalf((fc + lex + gra + pron) / 4);
    this.result = { band: band, fc: roundHalf(fc), lex: roundHalf(lex), gra: roundHalf(gra), pron: roundHalf(pron), wpm, sec, fillers, linkers, words: words.length, issues, ttr };
    $('#sres').innerHTML = this.resultHtml(this.result);
    $('#save-sp').onclick = () => this.save();
  },

  resultHtml(a) {
    const tips = [];
    if (a.wpm < 100) tips.push(`Konuşma hızın ${a.wpm} kelime/dk — IELTS için ideal aralık 120-150. Duraksamaları azaltmaya çalış.`);
    if (a.wpm > 170) tips.push('Çok hızlı konuşuyorsun; anlaşılırlık için biraz yavaşla.');
    if (a.fillers > 4) tips.push(`${a.fillers} dolgu ifadesi (um, like, you know) tespit edildi — bunları kısa duraklamalarla değiştir.`);
    if (a.linkers < 3) tips.push('Daha fazla bağlaç kullan: because, although, for example, that is why…');
    if (a.ttr < 0.45) tips.push('Kelime tekrarı yüksek; eş anlamlılarla çeşitlendir.');
    if (this.part === 'p2' && a.sec < 90) tips.push('Part 2 cevabı 1.5-2 dakika sürmeli; her maddeye detay ve örnek ekle.');
    return `<div class="grid" style="grid-template-columns:230px 1fr;margin-top:16px">
      <div class="card" style="margin:0"><div class="muted small">Tahmini band</div><div class="band">${fmtBand(a.band)}</div>
        <div style="margin-top:12px"><div class="crit"><span>Fluency</span><b>${fmtBand(a.fc)}</b></div><div class="crit"><span>Lexical</span><b>${fmtBand(a.lex)}</b></div><div class="crit"><span>Grammar</span><b>${fmtBand(a.gra)}</b></div><div class="crit"><span>Pronunciation*</span><b>${fmtBand(a.pron)}</b></div></div>
        <p class="small muted">*Telaffuz otomatik ölçülemez, nötr varsayıldı.</p>
        <button class="btn primary" id="save-sp" style="width:100%">Kaydet</button></div>
      <div class="card" style="margin:0"><h2>${a.words} kelime · ${a.sec} sn · ${a.wpm} kelime/dk</h2>
        ${tips.map((t) => `<div class="verdict v-near" style="margin:0 0 8px">${esc(t)}</div>`).join('') || '<div class="verdict v-ok">Akıcılık göstergeleri iyi görünüyor.</div>'}
        ${a.issues.length ? `<h3>Dil hataları</h3>${a.issues.slice(0, 12).map((i) => Views.dictionary.issueHtml(i)).join('')}` : ''}</div></div>`;
  },

  save() {
    const a = this.result;
    const c = this.card();
    App.state.speakings.push({ id: Date.now(), date: today(), topic: this.part === 'p2' ? c.cue.slice(0, 44) : c.topic, sec: a.sec, wpm: a.wpm, band: a.band });
    App.addResult('speaking', a.band, { step: this.checkpoint?.step });
    if (this.checkpoint) {
      App.completeCheckpoint(this.checkpoint.step, 'speaking');
      this.checkpoint = null;
    }
    this.reset();
    App.toast('Kaydedildi');
    App.render();
  },
};
