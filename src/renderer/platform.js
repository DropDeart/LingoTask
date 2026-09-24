// Everything platform-specific lives here, so the views never know whether they are running in
// Electron on the desktop or as an installed web app on a phone.
//
//   electron - state over IPC to a JSON file, network in the main process, speech via Windows SAPI
//   web      - state in IndexedDB, network straight from the page (all four APIs send CORS
//              headers), speech via the browser's own engine, which on Android is the system
//              TTS and works properly, unlike Chromium's on Windows
const Platform = (() => {
  const isElectron = typeof window !== 'undefined' && !!window.lingo;

  // ---- web state: IndexedDB, so writings and their revisions never hit a 5 MB ceiling ----
  const idb = {
    db: null,
    open() {
      return (this.db = this.db || new Promise((res, rej) => {
        const r = indexedDB.open('lingotask', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }));
    },
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction('kv', mode);
        const req = fn(tx.objectStore('kv'));
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
    },
    get: (k) => idb.run('readonly', (s) => s.get(k)),
    set: (k, v) => idb.run('readwrite', (s) => s.put(v, k)),
    del: (k) => idb.run('readwrite', (s) => s.delete(k)),
  };

  const newIndex = () => ({ active: 'p1', list: [{ id: 'p1', name: 'Ben', created: new Date().toISOString().slice(0, 10) }] });

  // ---- web speech ----
  // Voices arrive asynchronously and the first getVoices() is usually empty; wait for them once.
  let voicesReady = null;
  function webVoices() {
    return (voicesReady = voicesReady || new Promise((res) => {
      const got = () => speechSynthesis.getVoices();
      if (got().length) return res(got());
      const t = setTimeout(() => res(got()), 3000);
      speechSynthesis.onvoiceschanged = () => { clearTimeout(t); res(got()); };
    }));
  }

  // Browser speech. Used directly by the web build, and by the desktop build on macOS and Linux
  // where there is no SAPI — on those platforms Chromium talks to the OS engine properly, which
  // is exactly what it fails to do on Windows.
  async function browserSpeak(text, { rate = -1, voice = '' } = {}) {
    if (!('speechSynthesis' in window)) throw new Error('unsupported');
    const voices = await webVoices();
    const pick = voices.find((v) => v.name === voice) || voices.find((v) => v.lang === 'en-GB') || voices.find((v) => /^en/i.test(v.lang));
    if (!pick) throw new Error('no-english-voice');

    speechSynthesis.cancel();
    // A long utterance gets cut off part-way, so feed the engine a sentence at a time.
    const chunks = String(text).match(/[^.!?]+[.!?]*/g) || [String(text)];
    return new Promise((resolve, reject) => {
      let i = 0;
      const next = () => {
        if (i >= chunks.length) return resolve();
        const u = new SpeechSynthesisUtterance(chunks[i++].trim());
        u.voice = pick;
        u.lang = pick.lang;
        u.rate = { '-3': 0.6, '-2': 0.75, '-1': 0.9, 0: 1.05, 2: 1.3 }[String(rate)] ?? 0.9;
        u.onend = next;
        u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(new Error('tts-failed')));
        speechSynthesis.speak(u);
      };
      next();
    });
  }

  async function browserVoices() {
    const vs = await webVoices();
    return { data: vs.filter((v) => /^en/i.test(v.lang)).map((v) => ({ name: v.name, lang: v.lang })) };
  }

  const web = {
    kind: 'web',
    async loadProfiles() {
      try {
        const existing = await idb.get('profiles');
        if (existing) return existing;
        // installs that predate profiles keep their save under the old key
        const legacy = await idb.get('state');
        const index = newIndex();
        if (legacy) {
          await idb.set('state:p1', legacy);
          await idb.del('state');
        }
        await idb.set('profiles', index);
        return index;
      } catch {
        return newIndex();
      }
    },
    async saveProfiles(index) {
      await idb.set('profiles', index);
      return true;
    },
    async loadState(id) {
      try {
        return (await idb.get(`state:${id}`)) || null;
      } catch {
        return null;
      }
    },
    async saveState(id, state) {
      await idb.set(`state:${id}`, state);
      return true;
    },
    async deleteState(id) {
      await idb.del(`state:${id}`);
      return true;
    },
    async api(name, ...args) {
      if (name === 'voices') return browserVoices();
      if (!Net[name]) return { error: 'unknown' };
      try {
        return { data: await Net[name](...args) };
      } catch (e) {
        return { error: e.name === 'TimeoutError' ? 'timeout' : 'network', detail: String(e.message || e) };
      }
    },
    // Resolves when playback finishes; rejects with a code the caller can show.
    speak: browserSpeak,
    stopSpeech: () => speechSynthesis.cancel(),
  };

  const electron = {
    kind: 'electron',
    // Windows synthesises in the main process (SAPI); elsewhere there is no SAPI and the browser
    // engine is the right answer, so the whole speech path falls back to it.
    nativeSpeech: true,
    loadProfiles: () => window.lingo.loadProfiles(),
    saveProfiles: (index) => window.lingo.saveProfiles(index),
    loadState: (id) => window.lingo.loadState(id),
    saveState: (id, s) => window.lingo.saveState(id, s),
    deleteState: (id) => window.lingo.deleteState(id),
    async api(name, ...args) {
      if (name === 'voices' && !this.nativeSpeech) return browserVoices();
      const r = await window.lingo.api(name, ...args);
      if (name === 'voices' && (r.error || !r.data?.length)) {
        this.nativeSpeech = false;
        return browserVoices();
      }
      return r;
    },
    // The main process returns a whole WAV; play it through an <audio> element.
    async speak(text, opts) {
      if (!this.nativeSpeech) return browserSpeak(text, opts);
      const r = await window.lingo.api('speak', text, opts);
      if (r.error === 'unsupported' || r.error === 'tts-failed') {
        this.nativeSpeech = false; // macOS / Linux, or SAPI unavailable
        return browserSpeak(text, opts);
      }
      if (r.error) throw new Error(r.error);
      const bytes = Uint8Array.from(atob(r.data.wav), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
      const el = new Audio(url);
      this._el = el;
      try {
        await el.play();
      } catch {
        throw new Error('tts-failed');
      }
      await new Promise((res, rej) => {
        el.onended = res;
        el.onerror = () => rej(new Error('tts-failed'));
      }).finally(() => URL.revokeObjectURL(url));
    },
    stopSpeech() {
      if (!this.nativeSpeech && 'speechSynthesis' in window) speechSynthesis.cancel();
      if (this._el) {
        this._el.pause();
        this._el.onended = null;
        this._el = null;
      }
    },
  };

  return isElectron ? electron : web;
})();
