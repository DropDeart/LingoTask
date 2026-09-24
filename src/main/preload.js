const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lingo', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.invoke('state:save', state),
  api: (name, ...args) => ipcRenderer.invoke('api', name, args),
});
