// Self-update against GitHub Releases.
//
// electron-builder writes a latest*.yml next to each installer describing the newest version;
// the app fetches that file, compares versions, downloads the installer in the background and
// applies it on quit. The user is asked before anything is installed — an exam-prep app has no
// business restarting itself in the middle of a writing task.
//
// Platform support is uneven and worth stating plainly:
//   Windows (NSIS)   - works
//   Linux (AppImage) - works
//   macOS            - requires a signed and notarised build; unsigned apps cannot self-update,
//                      so the check is skipped rather than failing loudly every launch
//   portable .exe    - no installer to replace, so nothing to do

const { autoUpdater } = require('electron-updater');
const { app } = require('electron');

const CHECK_DELAY = 4000; // let the window paint before touching the network
const RECHECK_MS = 6 * 60 * 60 * 1000;

let win = null;
let ready = null; // the update that finished downloading, if any

const send = (msg) => win && !win.isDestroyed() && win.webContents.send('update', msg);

function supported() {
  if (!app.isPackaged) return false;
  if (process.env.PORTABLE_EXECUTABLE_DIR) return false; // portable build: nothing to replace
  if (process.platform === 'darwin') return false; // unsigned; see note above
  return true;
}

function start(browserWindow) {
  win = browserWindow;
  if (!supported()) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false; // only after the user agrees

  autoUpdater.on('update-available', (info) => send({ state: 'downloading', version: info.version }));
  autoUpdater.on('download-progress', (p) => send({ state: 'downloading', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (info) => {
    ready = info;
    send({ state: 'ready', version: info.version, notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '' });
  });
  // A failed check is not worth interrupting anyone over: no release yet, no network, rate limit.
  autoUpdater.on('error', (e) => send({ state: 'error', message: String(e?.message || e) }));

  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, CHECK_DELAY);
  setInterval(check, RECHECK_MS);
}

// Called when the user accepts. quitAndInstall closes the app, runs the installer and reopens it.
function install() {
  if (!ready) return false;
  autoUpdater.quitAndInstall(false, true);
  return true;
}

module.exports = { start, install, supported, version: () => app.getVersion() };
