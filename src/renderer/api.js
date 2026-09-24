// Offline-aware wrapper around Platform.api.
//
// Every successful lookup is cached in the saved state, so the words the learner actually studies
// become a personal offline dictionary that grows with use. Grammar checking always runs the local
// rules and, when the network is there, merges in LanguageTool's wider coverage.

const Api = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  listeners: [],

  init() {
    const set = (v) => {
      if (this.online === v) return;
      this.online = v;
      this.listeners.forEach((f) => f(v));
    };
    window.addEventListener('online', () => set(true));
    window.addEventListener('offline', () => set(false));
  },
  onChange(fn) {
    this.listeners.push(fn);
  },

  // navigator.onLine only knows whether an interface exists, so it still reports "online" behind a
  // captive portal or a dead access point. Actual request outcomes are the reliable signal, and
  // they are what the pill reflects; a failure suppresses further attempts briefly rather than
  // making every lookup wait for a timeout.
  reachable: true,
  retryAt: 0,
  RETRY_MS: 30000,

  noteFailure() {
    if (this.reachable) {
      this.reachable = false;
      this.listeners.forEach((f) => f(false));
    }
    this.retryAt = Date.now() + this.RETRY_MS;
  },
  noteSuccess() {
    this.retryAt = 0;
    if (!this.reachable) {
      this.reachable = true;
      this.listeners.forEach((f) => f(true));
    }
  },

  // "offline" covers the data-saver setting, a missing interface, and a network that is there
  // but not answering.
  get forced() {
    return App.state?.settings?.netMode === 'offline';
  },
  isOffline() {
    if (this.forced || !this.online) return true;
    return !this.reachable && Date.now() < this.retryAt; // past the backoff, try once more
  },
  statusLabel() {
    if (this.forced) return { text: 'Çevrimdışı mod', cls: 'b-amber', icon: '⛁' };
    if (!this.online) return { text: 'Bağlantı yok', cls: 'b-red', icon: '⚠' };
    if (!this.reachable) return { text: 'Servise ulaşılamıyor', cls: 'b-red', icon: '⚠' };
    return { text: 'Çevrimiçi', cls: 'b-green', icon: '●' };
  },

  cache() {
    const s = App.state;
    s.cache = s.cache || { def: {}, tr: {} };
    return s.cache;
  },
  // Keeps the newest entries; the cache is a convenience, not a record worth growing forever.
  trim(store, max = 1500) {
    const keys = Object.keys(store);
    if (keys.length <= max) return;
    for (const k of keys.slice(0, keys.length - max)) delete store[k];
  },

  async raw(name, ...args) {
    if (this.isOffline()) return { error: 'offline' };
    const r = await Platform.api(name, ...args);
    if (r.error === 'network' || r.error === 'timeout') this.noteFailure();
    else if (!r.error) this.noteSuccess();
    return r;
  },

  // ---- dictionary ----
  async define(word) {
    const key = String(word).trim().toLowerCase();
    const c = this.cache().def;
    if (c[key]) return { data: c[key], cached: true };
    const r = await this.raw('define', key);
    if (r.data) {
      c[key] = r.data;
      this.trim(c);
      App.save();
    }
    return r;
  },

  async translate(text, from, to) {
    const key = `${from}|${to}|${String(text).trim().toLowerCase()}`;
    const c = this.cache().tr;
    if (c[key]) return { data: c[key], cached: true };
    const r = await this.raw('translate', text, from, to);
    if (r.data) {
      c[key] = r.data;
      this.trim(c);
      App.save();
    }
    return r;
  },

  // Offline fallback: the learner's own vocabulary is a usable EN<->TR dictionary.
  localTranslate(text, from) {
    const q = norm(text);
    const hits = App.state.vocab.filter((v) => (from === 'en' ? norm(v.en) === q : splitMeanings(v.tr).some((m) => norm(m) === q)));
    if (!hits.length) return null;
    return from === 'en'
      ? { main: splitMeanings(hits[0].tr)[0], alts: [...new Set(hits.flatMap((h) => splitMeanings(h.tr)))].slice(0, 6), local: true }
      : { main: hits[0].en, alts: [...new Set(hits.map((h) => h.en))].slice(0, 6), local: true };
  },

  async suggest(word) {
    const r = await this.raw('suggest', word);
    if (r.data) return r;
    return { data: OfflineCheck.suggest(word), local: true };
  },

  // ---- grammar / spelling ----
  // The local rules always run: offline they are the whole answer, online they add the
  // learner-specific patterns (Turkish-speaker mistakes) that LanguageTool tends to miss.
  async check(text) {
    const local = OfflineCheck.check(text);
    if (this.isOffline()) return { data: local, local: true };
    const r = await this.raw('check', text);
    if (r.error) return { data: local, local: true, degraded: r.error };
    return { data: OfflineCheck.merge(r.data, local) };
  },
};

const OFFLINE_NOTE = {
  offline: 'Çevrimdışısın — yerel sözlük ve yerel dil kontrolü kullanılıyor.',
  timeout: 'Servis yanıt vermedi; yerel kontrole geçildi.',
  network: 'Bağlantı kurulamadı; yerel kontrole geçildi.',
};
