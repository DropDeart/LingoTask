// Two full-screen gates that run before the app proper.
//
//   picker - shown when the device has more than one profile, so whoever sits down chooses who
//            they are. This is where "which user" belongs; the installer should not ask it.
//   setup  - first run of a profile: asks for the handful of settings the study plan is built
//            from, one question at a time, instead of dropping the learner into a dashboard
//            already counting down to a date they never chose.

Views.picker = {
  render() {
    const list = App.profiles.list;
    return `<div class="gate">
      <div class="gate-card">
        <div class="gate-logo">L</div>
        <h1>Kim çalışıyor?</h1>
        <p class="sub">Her profilin kendi sınav tarihi, kelimeleri ve ilerlemesi var.</p>
        <div class="gate-list">
          ${list.map((p) => `<button class="gate-profile" data-pick="${p.id}">
            <span class="av">${esc(p.name.slice(0, 1).toUpperCase())}</span>
            <span class="who"><b>${esc(p.name)}</b><small>${esc(this.summary(p.id))}</small></span>
          </button>`).join('')}
          <button class="gate-profile add" id="gate-new"><span class="av">+</span><span class="who"><b>Yeni profil</b><small>Sıfırdan başla</small></span></button>
        </div>
      </div></div>`;
  },
  // Reads straight from the saved file so each row can show real progress without loading it
  // as the active profile.
  summary(id) {
    const s = this.cache?.[id];
    if (!s) return 'yükleniyor…';
    const learned = (s.vocab || []).filter((v) => v.learned).length;
    const exam = s.settings?.examDate;
    const days = exam ? Math.max(daysBetween(today(), exam), 0) : null;
    return `${learned} kelime${days != null ? ` · sınava ${days} gün` : ''}`;
  },
  async mount(root) {
    $$('[data-pick]', root).forEach((b) => (b.onclick = () => App.enterProfile(b.dataset.pick)));
    $('#gate-new').onclick = () => App.promptNewProfile();
    if (this.cache) return;
    // fill the summaries once the saved files come back
    this.cache = {};
    for (const p of App.profiles.list) this.cache[p.id] = await Platform.loadState(p.id);
    if (App.current === 'picker') App.render();
  },
};

Views.setup = {
  step: 0,
  draft: null,

  STEPS: [
    {
      title: 'Sana nasıl hitap edelim?',
      note: 'Profil adı olarak görünecek. İstediğin zaman değiştirebilirsin.',
      field: (d) => `<input type="text" id="w-name" maxlength="24" value="${esc(d.name)}" placeholder="Adın">`,
      read: (d) => { d.name = $('#w-name').value.trim(); },
      valid: (d) => d.name.length > 0,
    },
    {
      title: 'Sınav ne zaman?',
      note: 'Çalışma planı bugünden sınav gününe kadar 6 adıma bölünür. Tarihi bilmiyorsan tahmini gir, sonra değiştirirsin.',
      field: (d) => `<input type="date" id="w-exam" value="${d.examDate}">`,
      read: (d) => { d.examDate = $('#w-exam').value || d.examDate; },
      valid: (d) => daysBetween(today(), d.examDate) > 0,
      error: 'Sınav tarihi bugünden sonra olmalı.',
    },
    {
      title: 'Hedef band kaç?',
      note: 'Beceri çubuklarında hedef çizgisi buna göre çizilir.',
      field: (d) => `<div class="w-choices">${[5.5, 6, 6.5, 7, 7.5, 8].map((b) => `<button class="w-choice ${d.target === b ? 'on' : ''}" data-target="${b}">${b.toFixed(1)}</button>`).join('')}</div>`,
      read: () => {},
      valid: () => true,
    },
    {
      title: 'Günde kaç yeni kelime?',
      note: 'Bunlar her gün panelde görev olarak çıkar. 8 kelime çoğu kişi için sürdürülebilir bir tempodur.',
      field: (d) => `<div class="w-choices">${[5, 8, 12, 20].map((n) => `<button class="w-choice ${d.dailyNew === n ? 'on' : ''}" data-daily="${n}">${n}</button>`).join('')}</div>`,
      read: () => {},
      valid: () => true,
    },
    {
      title: 'Sesi deneyelim',
      note: 'Listening testleri ve telaffuz bu sesle okunur. Cihazında İngilizce ses paketi yoksa burada anlarsın.',
      field: () => `<div class="row" style="justify-content:center"><button class="btn primary" id="w-test">🔊 Dene</button></div>
        <div class="small muted" id="w-teststate" style="margin-top:10px;min-height:20px"></div>`,
      read: () => {},
      valid: () => true,
    },
  ],

  render() {
    if (!this.draft) {
      const s = App.state.settings;
      this.draft = { name: App.profile().name, examDate: s.examDate, target: s.target, dailyNew: s.dailyNew };
      this.step = 0;
    }
    const st = this.STEPS[this.step];
    const last = this.step === this.STEPS.length - 1;
    return `<div class="gate">
      <div class="gate-card">
        <div class="gate-steps">${this.STEPS.map((_, i) => `<span class="${i === this.step ? 'on' : i < this.step ? 'done' : ''}"></span>`).join('')}</div>
        <h1>${esc(st.title)}</h1>
        <p class="sub">${esc(st.note)}</p>
        <div class="w-field">${st.field(this.draft)}</div>
        <div class="small" id="w-error" style="color:var(--red);min-height:18px"></div>
        <div class="row" style="justify-content:space-between;margin-top:14px">
          <button class="btn ghost" id="w-back" ${this.step === 0 ? 'disabled' : ''}>← Geri</button>
          <button class="btn primary" id="w-next">${last ? 'Başla' : 'Devam'}</button>
        </div>
      </div></div>`;
  },

  mount(root) {
    const st = this.STEPS[this.step];
    $('#w-name', root)?.focus();
    $$('[data-target]', root).forEach((b) => (b.onclick = () => { this.draft.target = +b.dataset.target; App.render(); }));
    $$('[data-daily]', root).forEach((b) => (b.onclick = () => { this.draft.dailyNew = +b.dataset.daily; App.render(); }));
    $('#w-test', root)?.addEventListener('click', () => {
      const el = $('#w-teststate');
      Audio$.play('This is how the listening tests will sound. Good luck with your exam.', {
        onstate: (x) => (el.textContent = { loading: 'hazırlanıyor…', playing: '▶ oynatılıyor', ended: 'Ses çalışıyor ✓' }[x] ?? (AUDIO_ERRORS[x] || x)),
      });
    });
    $('#w-back').onclick = () => { this.step--; App.render(); };
    $('#w-next').onclick = () => this.next();
    root.addEventListener('keydown', (e) => e.key === 'Enter' && this.next());
  },

  next() {
    const st = this.STEPS[this.step];
    st.read(this.draft);
    if (!st.valid(this.draft)) {
      $('#w-error').textContent = st.error || 'Bu alanı doldur.';
      return;
    }
    if (this.step < this.STEPS.length - 1) {
      this.step++;
      App.render();
      return;
    }
    this.finish();
  },

  async finish() {
    const d = this.draft;
    Object.assign(App.state.settings, { examDate: d.examDate, target: d.target, dailyNew: d.dailyNew });
    App.state.settings.startDate = today(); // the plan is measured from the day setup was completed
    App.state.onboarded = true;
    await App.renameProfile(App.profiles.active, d.name);
    await App.saveNow();
    this.draft = null;
    App.renderProfile();
    App.go('dashboard');
    App.toast(`Hoş geldin ${d.name} — planın hazır`);
  },
};
