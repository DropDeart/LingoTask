const { app, BrowserWindow, ipcMain, session, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const api = require('./api');
const tts = require('./tts');

const isDev = process.argv.includes('--dev');
const stateFile = () => path.join(app.getPath('userData'), 'lingotask.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  } catch {
    return null;
  }
}

// atomic write: a crash mid-save never corrupts the user's progress
function writeState(state) {
  const file = stateFile();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, file);
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
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
}

if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(() => {
  // microphone is needed for speaking practice; nothing else is granted
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media'));

  tts.init(path.join(app.getPath('userData'), 'tts-cache'));

  ipcMain.handle('state:load', () => readState());
  ipcMain.handle('state:save', (_e, state) => {
    writeState(state);
    return true;
  });
  ipcMain.handle('api', (_e, name, args) => api.call(name, args));

  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
