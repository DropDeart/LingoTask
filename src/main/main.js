const { app, BrowserWindow, ipcMain, session, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const api = require('./api');
const tts = require('./tts');
const updater = require('./updater');

const isDev = process.argv.includes('--dev');

// One file per profile, plus a small index. Keeping them separate means a save only rewrites the
// profile being studied, and one corrupted file cannot take the others down with it.
const dir = () => app.getPath('userData');
const indexFile = () => path.join(dir(), 'profiles.json');
const stateFile = (id) => path.join(dir(), `state-${id}.json`);
const LEGACY = () => path.join(dir(), 'lingotask.json');

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// atomic write: a crash mid-save never corrupts the user's progress
function writeJson(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

// Single-profile installs predate this; move their save into the new layout on first launch.
function readIndex() {
  const existing = readJson(indexFile());
  if (existing) return existing;

  const legacy = readJson(LEGACY());
  const index = { active: 'p1', list: [{ id: 'p1', name: 'Ben', created: new Date().toISOString().slice(0, 10) }] };
  if (legacy) {
    writeJson(stateFile('p1'), legacy);
    fs.renameSync(LEGACY(), `${LEGACY()}.migrated`);
  }
  writeJson(indexFile(), index);
  return index;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: 'LingoTask',
    // Windows and Linux take the icon from the window; macOS takes it from the bundle.
    icon: path.join(__dirname, '..', '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon-512.png'),
    backgroundColor: '#f4f6fa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // On macOS an app with no menu loses Cmd+Q, Cmd+C and the window controls, so it keeps a
  // minimal one; elsewhere the menu bar is just noise for a single-window app.
  if (!isDev) Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null);
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  updater.start(win);
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(() => {
  // microphone is needed for speaking practice; nothing else is granted
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media'));

  tts.init(path.join(app.getPath('userData'), 'tts-cache'));

  ipcMain.handle('profiles:load', () => readIndex());
  ipcMain.handle('profiles:save', (_e, index) => {
    writeJson(indexFile(), index);
    return true;
  });
  ipcMain.handle('state:load', (_e, id) => readJson(stateFile(id)));
  ipcMain.handle('state:save', (_e, id, state) => {
    writeJson(stateFile(id), state);
    return true;
  });
  ipcMain.handle('state:delete', (_e, id) => {
    fs.rmSync(stateFile(id), { force: true });
    return true;
  });
  ipcMain.handle('api', (_e, name, args) => api.call(name, args));
  ipcMain.handle('update:install', () => updater.install());
  ipcMain.handle('app:version', () => app.getVersion());

  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
