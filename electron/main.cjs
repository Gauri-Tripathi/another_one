const { app, BrowserWindow, ipcMain, powerMonitor, Tray, Menu, nativeImage } = require("electron");
const { execFile } = require("node:child_process");
const path = require("node:path");
const os = require("node:os");
const { ActivityStore } = require("./store.cjs");
const { classifyActivity, createLearnedRule } = require("./classifier.cjs");

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
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false }
  });
  loadRenderer(mainWindow);
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
  return new Promise(resolve => {
    if (process.platform !== "win32") return resolve({ appName: "Unsupported platform", windowTitle: "Windows tracking is currently enabled" });
    const script = [
      "$sig='[DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow(); [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);'",
      "Add-Type -MemberDefinition $sig -Name NativeMethods -Namespace Purrductive -ErrorAction SilentlyContinue",
      "$handle=[Purrductive.NativeMethods]::GetForegroundWindow()",
      "$processId=0",
      "[void][Purrductive.NativeMethods]::GetWindowThreadProcessId($handle,[ref]$processId)",
      "$process=Get-Process -Id $processId -ErrorAction SilentlyContinue",
      "@{appName=$process.ProcessName;windowTitle=$process.MainWindowTitle}|ConvertTo-Json -Compress"
    ].join(";");
    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 4000 }, (error, stdout) => {
      if (error) return resolve(null);
      try { resolve(JSON.parse(stdout.trim())); } catch { resolve(null); }
    });
  });
}

async function sampleActivity() {
  const now = Date.now();
  const elapsed = Math.max(1, Math.min(10, Math.round((now - lastSampleAt) / 1000)));
  lastSampleAt = now;
  if (powerMonitor.getSystemIdleTime() >= store.data.settings.idleThresholdSeconds) {
    activeApp = "Idle";
    if (powerMonitor.getSystemIdleTime() >= 300) store.data.sittingSeconds = 0;
    return;
  }
  const sample = await queryActiveWindow();
  if (!sample?.appName || sample.appName.toLowerCase() === "purrductive") return;
  activeApp = sample.appName;
  const classification = classifyActivity(sample.appName, sample.windowTitle, store.data.learnedRules);
  store.addSample(sample, elapsed, classification, deviceId);
  if (store.data.sittingSeconds >= store.data.settings.breakIntervalSeconds) showBreakWindow();
}

function setupTray() {
  const icon = nativeImage.createFromPath(appAsset("cat-coach.png")).resize({ width: 18, height: 18 });
  tray = new Tray(icon);
  tray.setToolTip("Purrductive is tracking active time");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open dashboard", click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: "Take a movement break", click: showBreakWindow },
    { type: "separator" },
    { label: "Quit Purrductive", click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on("double-click", () => mainWindow.show());
}

app.whenReady().then(() => {
  store = new ActivityStore(app.getPath("userData"));
  createMainWindow();
  setupTray();
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: store.data.settings.launchAtLogin, path: app.getPath("exe") });
  sampleTimer = setInterval(sampleActivity, 5000);
  persistTimer = setInterval(() => store.persist(), 15000);
  sampleActivity();
  powerMonitor.on("suspend", () => store.persist());
  powerMonitor.on("lock-screen", () => store.persist());
});

app.on("second-instance", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

ipcMain.handle("tracker:snapshot", () => ({
  segments: store.recent(), settings: store.data.settings,
  live: { activeApp, sittingSeconds: store.data.sittingSeconds, nextBreakIn: Math.max(0, store.data.settings.breakIntervalSeconds - store.data.sittingSeconds) }
}));

ipcMain.handle("tracker:recategorize", (_event, { id, category }) => {
  if (!["productive", "distraction", "neutral"].includes(category)) return false;
  const segment = store.data.segments.find(item => item.id === id);
  if (!segment) return false;
  const rule = createLearnedRule(segment, category);
  const existing = store.data.learnedRules.find(item => item.appName.toLowerCase() === rule.appName.toLowerCase() && item.category === category && item.tokens.some(token => rule.tokens.includes(token)));
  if (existing) { existing.weight = Math.min(5, existing.weight + 1); existing.updatedAt = rule.updatedAt; }
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

app.on("before-quit", () => {
  quitting = true;
  clearInterval(sampleTimer); clearInterval(persistTimer);
  if (store) store.persist();
});

app.on("window-all-closed", event => event.preventDefault());
