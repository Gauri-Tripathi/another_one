const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("purrductive", {
  getSnapshot: () => ipcRenderer.invoke("tracker:snapshot"),
  recategorize: (id, category) => ipcRenderer.invoke("tracker:recategorize", { id, category }),
  saveSettings: settings => ipcRenderer.invoke("settings:save", settings),
  acknowledgeBreak: () => ipcRenderer.invoke("break:acknowledge"),
  platform: process.platform
});

