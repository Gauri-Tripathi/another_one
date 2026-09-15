const { app, BrowserWindow, ipcMain, powerMonitor, Tray, Menu, nativeImage, dialog, shell } = require("electron");
const { ForegroundReader } = require("./foreground.cjs");
const foreground = new ForegroundReader();
let sampling = false;
let suspended = false;
let locked = false;
let trackingError = null;
let generation = 0;
const path = require("node:path");
const os = require("node:os");
const { ActivityStore } = require("./store.cjs");
const { classifyActivity, createLearnedRule } = require("./classifier.cjs");
const { websiteFromSample, BROWSERS } = require("./website.cjs");
let websiteStatus = "Open a browser to detect its active website.";

let mainWindow;
let breakWindow;
let tray;
let store;
let sampleTimer;
let persistTimer;
let lastSampleAt = Date.now();
let activeApp = "Starting tracker…";
let quitting = false;
const deviceId = `${os.hostname()}-${process.platform}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

if (!app.requestSingleInstanceLock()) app.exit(0);

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

function appAsset(name) {
  return app.isPackaged ? path.join(__dirname, "..", "dist", name) : path.join(__dirname, "..", "public", name);
}

function rendererUrl(hash = "") {
  if (process.env.VITE_DEV_SERVER_URL) return `${process.env.VITE_DEV_SERVER_URL}${hash}`;
  return { filePath: path.join(__dirname, "..", "dist", "index.html"), hash: hash.replace(/^#\/?/, "/") };
}

function loadRenderer(window, hash = "") {
  const target = rendererUrl(hash);
  return typeof target === "string" ? window.loadURL(target) : window.loadFile(target.filePath, { hash: target.hash });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1040, minHeight: 700, backgroundColor: "#f4efe7",
    title: "Purrductive", show: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  loadRenderer(mainWindow);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", event => {
    if (!quitting) {
      event.preventDefault();
      store.persist();
      mainWindow.hide();
    }
  });
}

function showBreakWindow() {
  if (breakWindow && !breakWindow.isDestroyed()) return;
  breakWindow = new BrowserWindow({
    fullscreen: true, alwaysOnTop: true, kiosk: true, frame: false, backgroundColor: "#5d1f34", skipTaskbar: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false }
  });
  breakWindow.setAlwaysOnTop(true, "screen-saver");
  loadRenderer(breakWindow, "#/break");
  breakWindow.on("closed", () => { breakWindow = null; });
}

function queryActiveWindow() {
  return foreground.read();
}

async function sampleActivity() {
  if (sampling) return;
  const now = Date.now();
  const elapsed = Math.max(1, Math.min(10, Math.round((now - lastSampleAt) / 1000)));
  lastSampleAt = now;
  if (suspended || locked) return;
  if (store.data.paused) {
    activeApp = "Paused";
    return;
  }
  if (powerMonitor.getSystemIdleTime() >= store.data.settings.idleThresholdSeconds) {
    store.endSession();
    activeApp = "Idle";
    if (powerMonitor.getSystemIdleTime() >= 300) store.data.sittingSeconds = 0;
    return;
  }
  sampling = true;
  const requestGeneration = generation;
  let sample;
  try { sample = await queryActiveWindow(); } finally { sampling = false; }
  if (requestGeneration !== generation || quitting || suspended || locked || store.data.paused) return;
  trackingError = sample ? null : "Cannot read the active window. Retrying automatically.";
  if (!sample?.appName || sample.appName.toLowerCase() === "purrductive") { store.endSession(); return; }
  activeApp = sample.appName;
  const website = websiteFromSample(sample);
  if (BROWSERS.has(sample.appName.toLowerCase())) websiteStatus = website ? "Reading browser address bar" : "Address bar unavailable. Browser app time still counts.";
  const classification = classifyActivity(sample.appName, sample.windowTitle, store.data.learnedRules);
  if (classification.category === "neutral" && website) Object.assign(classification, classifyActivity(sample.appName, website, []));
  store.addSample(sample, elapsed, classification, deviceId);
  if (store.data.sittingSeconds >= store.data.settings.breakIntervalSeconds) showBreakWindow();
}

function refreshTrayMenu() {
  if (!tray) return;
  tray.setToolTip(store.data.paused ? "Purrductive is paused" : "Purrductive is tracking active time");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open dashboard", click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: store.data.paused ? "Resume tracking" : "Pause tracking", click: toggleTracking },
    { label: "Take a movement break", click: showBreakWindow },
    { type: "separator" },
    { label: "Quit Purrductive", click: () => { quitting = true; app.quit(); } }
  ]));
}

function setupTray() {
  const icon = nativeImage.createFromPath(appAsset("cat-coach.png")).resize({ width: 18, height: 18 });
  tray = new Tray(icon);
  refreshTrayMenu();
  tray.on("double-click", () => mainWindow.show());
}

function toggleTracking() {
  store.endSession();
  generation++;
  store.data.paused = !store.data.paused;
  activeApp = store.data.paused ? "Paused" : "Resuming…";
  lastSampleAt = Date.now();
  store.persist();
  refreshTrayMenu();
  return store.data.paused;
}

app.whenReady().then(() => {
  store = new ActivityStore(app.getPath("userData"));
  Menu.setApplicationMenu(null);
  createMainWindow();
  setupTray();
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: store.data.settings.launchAtLogin, path: app.getPath("exe") });
  sampleTimer = setInterval(sampleActivity, 5000);
  persistTimer = setInterval(() => store.persist(), 15000);
  sampleActivity();
  powerMonitor.on("suspend", () => { suspended = true; generation++; foreground.stop(); store.endSession(); store.persist(); });
  powerMonitor.on("lock-screen", () => { locked = true; generation++; store.endSession(); store.persist(); });
  powerMonitor.on("resume", () => { suspended = false; lastSampleAt = Date.now(); store.data.sittingSeconds = 0; });
  powerMonitor.on("unlock-screen", () => { locked = false; lastSampleAt = Date.now(); });
});

app.on("second-instance", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

ipcMain.handle("tracker:snapshot", () => ({
  segments: store.recent(), settings: store.data.settings,
  live: { activeApp, trackingError, websiteStatus, paused: Boolean(store.data.paused), sittingSeconds: store.data.sittingSeconds, nextBreakIn: Math.max(0, store.data.settings.breakIntervalSeconds - store.data.sittingSeconds), lastSavedAt: store.data.updatedAt }
}));

ipcMain.handle("tracker:toggle", () => toggleTracking());

ipcMain.handle("tracker:recategorize", (_event, { id, category }) => {
  if (!["productive", "distraction", "neutral"].includes(category)) return false;
  const segment = store.data.segments.find(item => item.id === id);
  if (!segment) return false;
  const rule = createLearnedRule(segment, category);
  const existing = store.data.learnedRules.find(item => item.appName.toLowerCase() === rule.appName.toLowerCase() && item.windowTitle === rule.windowTitle);
  if (existing) { Object.assign(existing, rule, { weight: Math.min(5, existing.weight + 1) }); }
  else store.data.learnedRules.push(rule);
  Object.assign(segment, { category, confidence: 1, reason: "You taught me this", manual: true });
  store.persist();
  return true;
});

ipcMain.handle("settings:save", (_event, settings) => {
  store.data.settings = {
    ...store.data.settings,
    idleThresholdSeconds: Math.max(30, Math.min(300, Number(settings.idleThresholdSeconds) || 60)),
    breakIntervalSeconds: Math.max(1800, Math.min(10800, Number(settings.breakIntervalSeconds) || 7200)),
    launchAtLogin: Boolean(settings.launchAtLogin),
    sync: { url: String(settings.sync?.url || ""), key: String(settings.sync?.key || "") }
  };
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: store.data.settings.launchAtLogin, path: app.getPath("exe") });
  store.persist();
  return store.data.settings;
});

ipcMain.handle("break:acknowledge", () => {
  store.data.sittingSeconds = 0;
  store.persist();
  if (breakWindow && !breakWindow.isDestroyed()) breakWindow.close();
  return true;
});

ipcMain.handle("data:export", async () => {
  const date = new Date().toISOString().slice(0, 10);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export Purrductive activity",
    defaultPath: path.join(app.getPath("documents"), `purrductive-${date}.csv`),
    filters: [{ name: "CSV spreadsheet", extensions: ["csv"] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  require("node:fs").writeFileSync(result.filePath, store.toCsv(), "utf8");
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("data:reveal", () => {
  store.persist();
  shell.showItemInFolder(store.file);
  return store.file;
});

app.on("before-quit", () => {
  quitting = true;
  foreground.stop();
  clearInterval(sampleTimer); clearInterval(persistTimer);
  if (store) store.persist();
});

app.on("window-all-closed", event => event.preventDefault());
