// Speech synthesis via Windows SAPI, run in the main process.
// Chromium's speechSynthesis reports 0-1 voices here and silently falls back to the Turkish
// system voice when asked for en-GB, which made English playback unintelligible.

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const run = promisify(execFile);
// In a packaged build the sources live inside app.asar, which only Node's patched fs can read.
// powershell.exe is an outside process, so the script is shipped unpacked (see build.asarUnpack)
// and the path is redirected to the extracted copy.
const SCRIPT = path.join(__dirname, 'tts.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
const PS = process.env.SystemRoot ? path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe') : 'powershell.exe';

let cacheDir = path.join(os.tmpdir(), 'lingotask-tts');
let voices = null;

function init(dir) {
  cacheDir = dir;
}

const ps = (args) => run(PS, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, ...args], { windowsHide: true, timeout: 30000, maxBuffer: 1 << 20 });

async function listVoices() {
  if (voices) return voices;
  if (process.platform !== 'win32') return (voices = []);
  try {
    const { stdout } = await ps(['-Mode', 'list']);
    const parsed = JSON.parse(stdout.trim() || '[]');
    voices = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    voices = [];
  }
  return voices;
}

// `rate` is SAPI's -10..10 scale; the UI exposes slow / normal / fast.
async function speak(text, { rate = -1, voice = '' } = {}) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) throw new Error('empty');
  if (process.platform !== 'win32') throw new Error('unsupported');

  const key = crypto.createHash('sha1').update(`${clean}|${rate}|${voice}`).digest('hex');
  const wav = path.join(cacheDir, `${key}.wav`);

  try {
    return { wav: await fs.readFile(wav, 'base64'), cached: true };
  } catch {
    /* not cached yet */
  }

  await fs.mkdir(cacheDir, { recursive: true });
  const txt = path.join(cacheDir, `${key}.txt`);
  await fs.writeFile(txt, clean, 'utf8');
  try {
    const { stdout } = await ps(['-Mode', 'speak', '-In', txt, '-Out', wav, '-Rate', String(rate), '-Voice', voice]);
    return { wav: await fs.readFile(wav, 'base64'), voice: stdout.trim(), cached: false };
  } catch (e) {
    if (/no-english-voice/.test(e.stderr || e.message)) throw new Error('no-english-voice');
    throw new Error('tts-failed');
  } finally {
    fs.unlink(txt).catch(() => {});
  }
}

module.exports = { init, speak, listVoices };
