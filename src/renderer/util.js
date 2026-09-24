const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---- dates (local time, ISO yyyy-mm-dd) ----
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => iso(new Date());
const parse = (s) => new Date(`${s}T00:00:00`);
const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const fmtDate = (s) => parse(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

// ---- text comparison (Turkish aware) ----
const norm = (s) => String(s).toLocaleLowerCase('tr').replace(/[.,;:!?()"']/g, '').replace(/\s+/g, ' ').trim();
const fold = (s) => norm(s).replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');

function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

// Compares a typed answer with accepted answers.
// 'exact' | 'diacritic' (right word, Turkish letters missing) | 'typo' (1-2 letters off) | 'wrong'
function judge(answer, accepted) {
  const a = norm(answer);
  if (!a) return { verdict: 'wrong' };
  let best = { verdict: 'wrong', target: accepted[0] };
  for (const acc of accepted) {
    const t = norm(acc);
    if (a === t) return { verdict: 'exact', target: acc };
    if (fold(a) === fold(t)) best = { verdict: 'diacritic', target: acc };
    else if (best.verdict === 'wrong') {
      const dist = lev(fold(a), fold(t));
      if (t.length >= 4 && dist <= (t.length >= 8 ? 2 : 1)) best = { verdict: 'typo', target: acc };
    }
  }
  return best;
}

const splitMeanings = (tr) => String(tr).split(/[,;]/).map((s) => s.trim()).filter(Boolean);

// ---- IELTS band helpers ----
const roundHalf = (n) => Math.round(n * 2) / 2;
const fmtBand = (b) => (b == null ? '–' : Number(b).toFixed(1));

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

// ---- audio ----
// Speech is entirely offline on both platforms — Windows SAPI on the desktop, the system TTS
// engine on the phone — so listening practice keeps working with no connection. Platform hides
// which one is in play; this only sequences requests so a new one cancels the last.
const Audio$ = {
  token: 0,

  stop() {
    this.token++;
    Platform.stopSpeech();
  },

  // `onstate` receives 'loading' | 'playing' | 'ended' | an error code
  async play(text, { rate, voice, onstate } = {}) {
    this.stop();
    const mine = this.token;
    onstate?.('loading');
    try {
      const done = Platform.speak(text, {
        rate: rate ?? App.state.settings.speechRate,
        voice: voice ?? App.state.settings.voice ?? '',
      });
      if (mine === this.token) onstate?.('playing');
      await done;
      if (mine === this.token) onstate?.('ended');
    } catch (e) {
      if (mine === this.token) onstate?.(AUDIO_ERRORS[e.message] ? e.message : 'tts-failed');
    }
  },
};

const AUDIO_ERRORS = {
  'no-english-voice': 'Cihazında İngilizce ses paketi yok. Windows: Ayarlar → Saat ve dil → Konuşma → Ses ekle. Android: Ayarlar → Diller → Metin okuma.',
  'tts-failed': 'Ses üretilemedi.',
  unsupported: 'Bu cihazda ses oynatma desteklenmiyor.',
  empty: 'Okunacak metin yok.',
};

// Convenience wrapper for one-off pronunciation buttons.
function speak(text, opts = {}) {
  Audio$.play(text, { ...opts, onstate: (s) => AUDIO_ERRORS[s] && App.toast(AUDIO_ERRORS[s]) });
}

const bar = (pct, cls = '') => `<div class="bar ${cls}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;
