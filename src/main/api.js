// Main-process API surface: the shared network functions plus Windows-only speech synthesis.
// The renderer reaches these over IPC; the web build calls src/shared/net.js directly instead.
const net = require('../shared/net');
const tts = require('./tts');

const fns = { ...net, speak: tts.speak, voices: tts.listVoices };

async function call(name, args) {
  if (!fns[name]) return { error: 'unknown' };
  try {
    return { data: await fns[name](...args) };
  } catch (e) {
    if (/^(no-english-voice|tts-failed|unsupported|empty)$/.test(e.message)) return { error: e.message };
    return { error: e.name === 'TimeoutError' ? 'timeout' : 'network', detail: String(e.message || e) };
  }
}

module.exports = { call, fns };
