// App shell: state, persistence, routing, and shared study-plan / progress logic.

const Views = {};

const NAV = [
  // [id, label, icon, short label for the phone tab bar]
  ["dashboard", "Panel", "◧", "Panel"],
  ["plan", "Çalışma Planı", "☑", "Plan"],
  ["vocab", "Kelime", "Aa", "Kelime"],
  ["dictionary", "Sözlük", "⌕", "Sözlük"],
  ["grammar", "Gramer", "§", "Gramer"],
  ["writing", "Yazma", "✎", "Yazma"],
  ["speaking", "Konuşma", "☊", "Konuş"],
  ["tests", "Testler", "◔", "Test"],
];

const SKILLS = [
  ['reading', 'Reading'],
  ['listening', 'Listening'],
  ['writing', 'Writing'],
  ['speaking', 'Speaking'],
  ['grammar', 'Gramer'],
];

const App = {
  state: null,
  current: null,
  params: {},

  profiles: null, // { active, list: [{ id, name, created }] }

  async init() {
    Api.init();
    Api.onChange(() => this.renderFoot());
    this.profiles = await Platform.loadProfiles();
    this.loadResult = await this.loadActive();
    $('#nav').innerHTML = NAV.map(([id, label, icon, short]) => `<button data-nav="${id}"><i>${icon}</i><span class="full">${label}</span><span class="short">${short}</span></button>`).join('');
    $('#nav').addEventListener('click', (e) => {
      const b = e.target.closest('[data-nav]');
      if (b) this.go(b.dataset.nav);
    });
    $('#brand').onclick = () => this.openProfileMenu();
    this.renderProfile();
    this.go(this.firstView());
  },

  // Who is studying is a question for the app, not the installer: ask it when the device holds
  // more than one profile. A profile that has not been through setup goes there first.
  firstView() {
    if (this.profiles.list.length > 1) return 'picker';
    if (this.loadResult === 'locked') return 'unlock';
    return this.state.onboarded ? 'dashboard' : 'setup';
  },
  async enterProfile(id) {
    if (id !== this.profiles.active) {
      Vault.clear(); // never carry one profile's key into another
      this.profiles.active = id;
      await Platform.saveProfiles(this.profiles);
      const r = await this.loadActive();
      this.resetViews();
      if (r === 'locked') {
        this.renderProfile();
        return this.go('unlock');
      }
    }
    this.renderProfile();
    this.go(this.state.onboarded ? 'dashboard' : 'setup');
  },

  // ---- profile password ----
  async setProfilePassword(password) {
    await Vault.setPassword(password);
    await this.saveNow(); // rewrites the file as ciphertext
    this.profile().locked = true;
    await Platform.saveProfiles(this.profiles);
  },
  async removeProfilePassword() {
    Vault.clear();
    delete this.profile().locked;
    await Platform.saveProfiles(this.profiles);
    await this.saveNow(); // rewrites it in the clear
  },

  // ---- profiles ----
  // Each profile is an independent learner: its own exam date, vocabulary, plan and progress.
  // Nothing is shared, so two people on one computer never overwrite each other.
  profile() {
    return this.profiles.list.find((p) => p.id === this.profiles.active) || this.profiles.list[0];
  },
  // Returns 'locked' when the profile is password-protected and the key is not held yet; the
  // caller then routes to the unlock gate instead of showing a half-loaded app.
  async loadActive() {
    const saved = await Platform.loadState(this.profiles.active);
    if (Vault.isEncrypted(saved)) {
      if (!Vault.key) {
        this.pendingBlob = saved;
        this.state = null; // nothing readable until the password arrives
        return 'locked';
      }
      this.state = this.migrate(await Vault.open(saved));
      return 'ok';
    }
    this.state = this.migrate(saved);
    if (!saved) await this.saveNow();
    return 'ok';
  },

  // Applies the password the unlock gate collected.
  async unlockActive(password) {
    const state = await Vault.unlock(this.pendingBlob, password); // throws 'wrong-password'
    this.state = this.migrate(state);
    this.pendingBlob = null;
    return true;
  },
  async switchProfile(id) {
    if (id === this.profiles.active) return;
    await this.saveNow(); // flush any debounced edit before swapping the state out
    Vault.clear();
    this.profiles.active = id;
    await Platform.saveProfiles(this.profiles);
    const r = await this.loadActive();
    this.resetViews();
    Views.picker.cache = null; // summaries are stale once a profile has been studied
    if (r === 'locked') return this.go('unlock');
    this.renderProfile();
    this.go(this.state.onboarded ? 'dashboard' : 'setup');
    this.toast(`${this.profile().name} profiline geçildi`);
  },
  async createProfile(name) {
    const id = `p${Date.now().toString(36)}`;
    this.profiles.list.push({ id, name: name.trim().slice(0, 24), created: today() });
    this.profiles.active = id;
    await Platform.saveProfiles(this.profiles);
    this.state = this.migrate(null);
    await this.saveNow();
    this.resetViews();
    Views.picker.cache = null;
    this.renderProfile();
    this.go('setup'); // a brand-new profile has no exam date of its own yet
  },
  async renameProfile(id, name) {
    const p = this.profiles.list.find((x) => x.id === id);
    if (!p || !name.trim()) return;
    p.name = name.trim().slice(0, 24);
    await Platform.saveProfiles(this.profiles);
  },
  async deleteProfile(id) {
    if (this.profiles.list.length < 2) return; // never leave the app with no profile
    this.profiles.list = this.profiles.list.filter((p) => p.id !== id);
    await Platform.deleteState(id);
    if (this.profiles.active === id) {
      this.profiles.active = this.profiles.list[0].id;
      await Platform.saveProfiles(this.profiles);
      await this.loadActive();
      this.resetViews();
      Views.picker.cache = null;
      this.renderProfile();
      this.go(this.state.onboarded ? 'dashboard' : 'setup');
    } else await Platform.saveProfiles(this.profiles);
    Views.picker.cache = null;
  },
  // The switcher lives on the brand so it is reachable from every view. On the phone the brand is
  // hidden, so Settings carries the same controls.
  renderProfile() {
    const el = $('#brand-profile');
    if (el) el.textContent = this.profile().name;
  },
  openProfileMenu() {
    $('#pmenu')?.remove();
    const rows = this.profiles.list
      .map((p) => `<button class="pmenu-row ${p.id === this.profiles.active ? 'on' : ''}" data-switch="${p.id}">
        <span>${esc(p.name)}</span>${p.id === this.profiles.active ? '<span class="tick">✓</span>' : ''}</button>`)
      .join('');
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="pmenu-back" style="position:fixed;inset:0;z-index:6"></div>
       <div id="pmenu"><div class="pmenu-head">Profiller</div>${rows}
         <button class="pmenu-row add" id="pnew">+ Yeni profil</button>
         <button class="pmenu-row add" id="pmanage">Profilleri yönet…</button></div>`,
    );
    const close = () => { $('#pmenu')?.remove(); $('#pmenu-back')?.remove(); };
    $('#pmenu-back').onclick = close;
    $$('[data-switch]').forEach((b) => (b.onclick = () => { close(); this.switchProfile(b.dataset.switch); }));
    $('#pnew').onclick = () => { close(); this.promptNewProfile(); };
    $('#pmanage').onclick = () => { close(); Views.dashboard.settings(); };
  },
  promptNewProfile() {
    Dialog.prompt('Yeni profil', 'Bu profil sıfırdan başlar: kendi sınav tarihi, kelimeleri ve ilerlemesi olur.', 'İsim', '', (name) => {
      if (name.trim()) this.createProfile(name);
    });
  },

  // Views hold per-session state (open topic, draft essay, running quiz) that belongs to the
  // profile that was active; clear it so nothing leaks across a switch.
  resetViews() {
    Audio$.stop();
    Object.assign(Views.vocab, { tab: 'learn', session: null, learnQueue: null, filter: 'all' });
    Object.assign(Views.dictionary, { tab: 'search', last: null });
    Object.assign(Views.grammar, { topic: null, phase: 'lesson', answers: {}, checkpoint: null });
    Object.assign(Views.writing, { tab: 'write', draft: '', analysis: null, checkpoint: null, openId: null, revising: null, timerSec: 0, offset: 0 });
    Views.speaking.reset();
    Views.speaking.checkpoint = null;
    Object.assign(Views.tests, { active: null, checkpoint: null });
  },

  migrate(s) {
    s = s || {};
    s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
    if (!s.settings.startDate) s.settings.startDate = today();
    // add new core words without touching progress on existing ones
    const have = new Map((s.vocab || []).map((v) => [v.id, v]));
    // Copy each entry: CORE_VOCAB is a module-level array, so handing out the objects themselves
    // would let one profile's progress (learned, box, right/wrong) show up in the next.
    s.vocab = [...(s.vocab || []), ...CORE_VOCAB.filter((v) => !have.has(v.id)).map((v) => ({ ...v }))];
    s.vocab.forEach((v) => {
      if (v.academic === undefined) v.academic = isAcademic(v.en);
      if (v.spell === undefined) v.spell = 0;
    });
    s.recent = s.recent || [];
    s.todos = s.todos || [];
    s.checks = s.checks || {}; // manual plan items + checkpoints
    s.daily = s.daily || {};
    s.results = s.results || [];
    s.writings = s.writings || [];
    s.writings.forEach((w) => (w.revisions = w.revisions || []));
    s.speakings = s.speakings || [];
    s.grammar = s.grammar || {}; // topicId -> { best, attempts, lastDate }
    return s;
  },

  // ---- metrics that drive auto-completing plan tasks ----
  METRICS: {
    academicLearned: (s) => s.vocab.filter((v) => v.learned && v.academic).length,
    learned: (s) => s.vocab.filter((v) => v.learned).length,
    reviewCorrect: (s) => s.vocab.reduce((n, v) => n + v.right, 0),
    writings: (s) => s.writings.length,
    writingsT2: (s) => s.writings.filter((w) => w.promptId.startsWith('T2')).length,
    writingsT1: (s) => s.writings.filter((w) => w.promptId.startsWith('T1')).length,
    revisions: (s) => s.writings.reduce((n, w) => n + w.revisions.length, 0),
    speakings: (s) => s.speakings.length,
    readingDone: (s) => s.results.filter((r) => r.skill === 'reading').length,
    listeningDone: (s) => s.results.filter((r) => r.skill === 'listening').length,
    practiceDone: (s) => s.results.filter((r) => r.skill === 'reading' || r.skill === 'listening').length,
    grammarPassed: (s) => Object.values(s.grammar).filter((g) => g.best >= 70).length,
    grammarDone: (s) => Object.keys(s.grammar).length,
  },
  metric(name) {
    return this.METRICS[name]?.(this.state) ?? 0;
  },

  async saveNow() {
    const payload = Vault.key ? await Vault.seal(this.state) : this.state;
    return Platform.saveState(this.profiles.active, payload);
  },
  save: debounce(() => App.saveNow(), 400),

  GATES: ['picker', 'setup', 'unlock'],

  go(view, params = {}) {
    Audio$.stop();
    document.body.classList.toggle("gated", this.GATES.includes(view));
    this.current = view;
    this.params = params;
    $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.nav === view));
    this.render();
  },

  render() {
    const v = Views[this.current];
    const root = $('#root');
    root.innerHTML = v.render();
    root.scrollTop = 0;
    v.mount?.(root);
    this.renderFoot();
  },

  renderFoot() {
    // A locked profile has no decrypted state yet, and the gate views hide the sidebar anyway.
    if (!this.state) return;
    const days = daysBetween(today(), this.state.settings.examDate);
    const net = Api.statusLabel();
    this.renderProfile();
    $('#side-foot').innerHTML = `<div class="count"><b>${Math.max(days, 0)}</b><span>gün kaldı</span></div>
      <small>Sınav: ${fmtDate(this.state.settings.examDate)}</small>
      <button class="netpill ${net.cls}" id="netpill" title="Çevrimdışı modu aç / kapat"><span class="ic">${net.icon}</span><span class="txt">${net.text}</span></button>`;
    $('#netpill').onclick = () => {
      const s = this.state.settings;
      s.netMode = s.netMode === 'offline' ? 'auto' : 'offline';
      this.saveNow();
      this.renderFoot();
      this.toast(s.netMode === 'offline' ? 'Çevrimdışı mod açık — ağ kullanılmayacak' : 'Otomatik mod — bağlantı varsa kullanılacak');
    };
  },

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(this._tt);
    this._tt = setTimeout(() => (t.hidden = true), 2400);
  },

  // ---- daily activity ----
  day(d = today()) {
    return (this.state.daily[d] = this.state.daily[d] || { learned: 0, reviewed: 0, writing: 0, speaking: 0, practice: 0, grammar: 0 });
  },
  bump(key, n = 1) {
    this.day()[key] += n;
    this.save();
  },
  streak() {
    let n = 0;
    let d = today();
    const active = (x) => {
      const r = this.state.daily[x];
      return r && Object.values(r).some((v) => v > 0);
    };
    if (!active(d)) d = addDays(d, -1); // today may still be empty
    while (active(d)) {
      n++;
      d = addDays(d, -1);
    }
    return n;
  },

  // ---- recent lookups ----
  addRecent(en, tr = '') {
    if (!en) return;
    const r = this.state.recent;
    const i = r.findIndex((x) => x.en.toLowerCase() === en.toLowerCase());
    const prev = i >= 0 ? r.splice(i, 1)[0] : {};
    r.unshift({ en, tr: tr || prev.tr || '', ts: Date.now() });
    r.length = Math.min(r.length, 40);
    this.save();
  },

  // ---- vocabulary (Leitner boxes) ----
  INTERVALS: [0, 1, 2, 4, 7, 15, 30],
  dueWords() {
    const t = today();
    return this.state.vocab.filter((v) => v.learned && v.due && v.due <= t);
  },
  grade(word, ok) {
    if (ok) {
      word.right++;
      word.box = Math.min(word.box + 1, 6);
    } else {
      word.wrong++;
      word.box = 1;
    }
    word.due = addDays(today(), this.INTERVALS[word.box]);
    this.save();
  },

  // ---- study plan ----
  steps() {
    const { startDate, examDate } = this.state.settings;
    const total = Math.max(daysBetween(startDate, examDate), STEP_DEFS.length);
    const len = total / STEP_DEFS.length;
    return STEP_DEFS.map((def, i) => {
      const start = addDays(startDate, Math.round(len * i));
      const end = addDays(startDate, Math.round(len * (i + 1)) - 1);
      const t = STEP_TESTS[i];
      const items = [
        ...def.tasks.map((task, k) => {
          const item = { key: `s${i}:t${k}`, text: task.text, kind: 'task' };
          if (task.auto) {
            const [metric, target] = task.auto;
            const now = this.metric(metric);
            Object.assign(item, { kind: 'auto', metric, target, now, done: now >= target });
          }
          return item;
        }),
        { key: `s${i}:reading`, text: `Reading kontrol testi (${t.reading})`, kind: 'test', skill: 'reading', ref: t.reading },
        { key: `s${i}:listening`, text: `Listening kontrol testi (${t.listening})`, kind: 'test', skill: 'listening', ref: t.listening },
        { key: `s${i}:grammar`, text: `Gramer kontrol testi (${t.grammar} · ${GRAMMAR.find((g) => g.id === t.grammar).title})`, kind: 'test', skill: 'grammar', ref: t.grammar },
        { key: `s${i}:writing`, text: `Writing kontrol görevi (${t.writing})`, kind: 'test', skill: 'writing', ref: t.writing },
        { key: `s${i}:speaking`, text: `Speaking kontrol görevi (Part 2, #${t.speaking + 1})`, kind: 'test', skill: 'speaking', ref: t.speaking },
      ];
      return { index: i, ...def, start, end, items };
    });
  },
  isDone(item) {
    return item.kind === 'auto' ? item.done : !!this.state.checks[item.key];
  },
  currentStep() {
    const t = today();
    const steps = this.steps();
    return steps.find((s) => t >= s.start && t <= s.end) || (t < steps[0].start ? steps[0] : steps[steps.length - 1]);
  },
  stepProgress(step) {
    const done = step.items.filter((i) => this.isDone(i)).length;
    return { done, total: step.items.length, pct: (done / step.items.length) * 100 };
  },
  planProgress() {
    const all = this.steps().flatMap((s) => s.items);
    const done = all.filter((i) => this.isDone(i)).length;
    return { done, total: all.length, pct: (done / all.length) * 100 };
  },
  timeProgress() {
    const { startDate, examDate } = this.state.settings;
    return (daysBetween(startDate, today()) / Math.max(daysBetween(startDate, examDate), 1)) * 100;
  },
  completeCheckpoint(stepIndex, skill) {
    this.state.checks[`s${stepIndex}:${skill}`] = true;
    this.save();
  },

  // ---- vocabulary statistics ----
  vocabStats() {
    const v = this.state.vocab;
    const learned = v.filter((x) => x.learned);
    const right = v.reduce((n, x) => n + x.right, 0);
    const wrong = v.reduce((n, x) => n + x.wrong, 0);
    const spell = v.reduce((n, x) => n + x.spell, 0);
    const asked = right + wrong;
    return {
      total: v.length,
      learned: learned.length,
      academic: learned.filter((x) => x.academic).length,
      academicTotal: v.filter((x) => x.academic).length,
      own: v.filter((x) => x.src === 'user').length,
      right,
      wrong,
      spell,
      asked,
      accuracy: asked ? Math.round((right / asked) * 100) : null,
      mastered: learned.filter((x) => x.box >= 4).length,
      shaky: learned.filter((x) => x.wrong > x.right).length,
      boxes: [1, 2, 3, 4, 5, 6].map((b) => learned.filter((x) => x.box === b).length),
    };
  },

  // ---- grammar ----
  saveGrammar(topicId, pct) {
    const g = (this.state.grammar[topicId] = this.state.grammar[topicId] || { best: 0, attempts: 0, lastDate: null });
    g.attempts++;
    g.best = Math.max(g.best, pct);
    g.lastDate = today();
    this.addResult('grammar', pctToBand(pct), { ref: topicId, score: `%${pct}` });
    this.save();
    return g;
  },

  latestBand(skill) {
    const r = this.state.results.filter((x) => x.skill === skill);
    return r.length ? r[r.length - 1].band : null;
  },
  addResult(skill, band, extra = {}) {
    this.state.results.push({ id: Date.now(), skill, band, date: today(), ...extra });
    this.save();
  },
};

// Update banner. Only the desktop build reports anything; the phone version updates itself
// through the service worker, which needs no prompt.
const Updater = {
  init() {
    if (!window.lingo?.onUpdate) return;
    window.lingo.onUpdate((msg) => this.show(msg));
  },
  show(msg) {
    if (msg.state === 'error') return; // silent: no release yet, offline, or rate-limited
    $('#update-bar')?.remove();
    if (msg.state === 'downloading') {
      const pct = msg.percent != null ? ` %${msg.percent}` : '';
      document.body.insertAdjacentHTML('beforeend', `<div id="update-bar" class="updbar"><span>Yeni sürüm indiriliyor${pct}…</span></div>`);
      return;
    }
    if (msg.state !== 'ready') return;
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div id="update-bar" class="updbar ready">
        <span><b>Sürüm ${esc(msg.version)}</b> hazır. Yeniden başlatınca kurulacak.</span>
        <button class="btn sm primary" id="upd-now">Şimdi yeniden başlat</button>
        <button class="btn sm ghost" id="upd-later">Sonra</button>
      </div>`,
    );
    $('#upd-now').onclick = () => window.lingo.installUpdate();
    $('#upd-later').onclick = () => $('#update-bar').remove();
  },
};
