const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lingo', {
  loadProfiles: () => ipcRenderer.invoke('profiles:load'),
  saveProfiles: (index) => ipcRenderer.invoke('profiles:save', index),
  loadState: (id) => ipcRenderer.invoke('state:load', id),
  saveState: (id, state) => ipcRenderer.invoke('state:save', id, state),
  deleteState: (id) => ipcRenderer.invoke('state:delete', id),
  api: (name, ...args) => ipcRenderer.invoke('api', name, args),
  appVersion: () => ipcRenderer.invoke('app:version'),
  onUpdate: (fn) => ipcRenderer.on('update', (_e, msg) => fn(msg)),
  installUpdate: () => ipcRenderer.invoke('update:install'),
});
