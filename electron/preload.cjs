const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("purrductive", {
  getSnapshot: () => ipcRenderer.invoke("tracker:snapshot"),
  toggleTracking: () => ipcRenderer.invoke("tracker:toggle"),
  recategorize: (id, category) => ipcRenderer.invoke("tracker:recategorize", { id, category }),
  saveSettings: settings => ipcRenderer.invoke("settings:save", settings),
  acknowledgeBreak: () => ipcRenderer.invoke("break:acknowledge"),
  snoozeBreak: () => ipcRenderer.invoke('break:snooze'),
  exportCsv: () => ipcRenderer.invoke("data:export"),
  revealData: () => ipcRenderer.invoke("data:reveal"),
  platform: process.platform
});
