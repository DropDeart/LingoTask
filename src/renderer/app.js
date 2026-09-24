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

  async init() {
    Api.init();
    Api.onChange(() => this.renderFoot());
    const saved = await Platform.loadState();
    this.state = this.migrate(saved);
    if (!saved) this.saveNow();
    $('#nav').innerHTML = NAV.map(([id, label, icon, short]) => `<button data-nav="${id}"><i>${icon}</i><span class="full">${label}</span><span class="short">${short}</span></button>`).join('');
    $('#nav').addEventListener('click', (e) => {
      const b = e.target.closest('[data-nav]');
      if (b) this.go(b.dataset.nav);
    });
    this.go('dashboard');
  },

  migrate(s) {
    s = s || {};
    s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
    if (!s.settings.startDate) s.settings.startDate = today();
    // add new core words without touching progress on existing ones
    const have = new Map((s.vocab || []).map((v) => [v.id, v]));
    s.vocab = [...(s.vocab || []), ...CORE_VOCAB.filter((v) => !have.has(v.id))];
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

  saveNow() {
    return Platform.saveState(this.state);
  },
  save: debounce(() => App.saveNow(), 400),

  go(view, params = {}) {
    Audio$.stop();
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
    const days = daysBetween(today(), this.state.settings.examDate);
    const net = Api.statusLabel();
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
