const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("purrductive", {
  getSnapshot: () => ipcRenderer.invoke("tracker:snapshot"),
  toggleTracking: () => ipcRenderer.invoke("tracker:toggle"),
  recategorize: (id, category) => ipcRenderer.invoke("tracker:recategorize", { id, category }),
  saveSettings: settings => ipcRenderer.invoke("settings:save", settings),
  acknowledgeBreak: () => ipcRenderer.invoke("break:acknowledge"),
  snoozeBreak: () => ipcRenderer.invoke('break:snooze'),
  previewBreak: () => ipcRenderer.invoke('break:preview'),
  setBreakInteractive: enabled => ipcRenderer.send('break:interactive',Boolean(enabled)),
  getPlanner: () => ipcRenderer.invoke('planner:get'),
  changePlanner: action => ipcRenderer.invoke('planner:change',action),
  onPlannerChanged: callback => {const listener=()=>callback();ipcRenderer.on('planner:changed',listener);return ()=>ipcRenderer.removeListener('planner:changed',listener);},
  reclassify: () => ipcRenderer.invoke('tracker:reclassify'),
  setRecognitionKey: value => ipcRenderer.invoke('recognition:key',value),
  recognitionStatus: () => ipcRenderer.invoke('recognition:status'),
  exportCsv: () => ipcRenderer.invoke("data:export"),
  revealData: () => ipcRenderer.invoke("data:reveal"),
  platform: process.platform,
  macPermissions: () => ipcRenderer.invoke('mac:permissions'),
  requestMacAccess: () => ipcRenderer.invoke('mac:request-access'),
  retryMacCollector: () => ipcRenderer.invoke('mac:retry')
});
