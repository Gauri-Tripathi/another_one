const { app, BrowserWindow, ipcMain, powerMonitor, Tray, Menu, nativeImage, dialog, shell, Notification, screen, safeStorage, systemPreferences } = require("electron");
const {Recognition,KeyVault,recognitionSettings,contextKey}=require('./recognition.cjs');
let recognition,keyVault;
const {performance}=require('node:perf_hooks');
const {PreciseActivityClock, sameContext,breakTick}=require('./timing.cjs');
const {plannerState,changePlanner,dueReminders}=require('./planner.cjs');
const activityClock=new PreciseActivityClock();
const { ForegroundReader } = require("./foreground.cjs");
const foreground = new ForegroundReader({includeAddress:false});
const contextReader = new ForegroundReader();
let browserContext=null, contextBusy=false, contextTimer;
let sampling = false;
let suspended = false;
let locked = false;
let trackingError = null;
const trackingHealth={accepted:0,rejected:0,lastObservedAt:null,lastReadMs:null};
let generation = 0;
const path = require("node:path");
const os = require("node:os");
const { ActivityStore } = require("./store.cjs");
const { classifyActivity, createLearnedRule } = require("./classifier.cjs");
const { websiteFromSample, BROWSERS } = require("./website.cjs");
let websiteStatus = "Open a browser to detect its active website.";

let mainWindow;
let breakWindow;
let breakIsPreview=false;
let tray;
let store;
let sampleTimer;
let persistTimer;
let reminderTimer;
let lastReminderTick=performance.now();
let lastBreakAttempt=0;
let breakError=null;
const notifications=new Set();
let lastSampleAt = Date.now();
let activeApp = "Starting tracker…";
let quitting = false;
let snoozedUntil = 0;
const appIcons = {};
const iconAttempts = new Set();
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

function showBreakWindow(preview=false) {
  if (breakWindow && !breakWindow.isDestroyed()) return;
  breakIsPreview=preview===true;
  lastBreakAttempt=Date.now();
  const area=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  breakWindow = new BrowserWindow({
    ...area, alwaysOnTop:true,frame:false,transparent:true,backgroundColor:'#00000000',skipTaskbar:true,show:false,resizable:false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false,backgroundThrottling:false }
  });
  const overlay=breakWindow;
  overlay.setAlwaysOnTop(true, "screen-saver");
  if(process.platform==='darwin')overlay.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});
  overlay.setIgnoreMouseEvents(true,{forward:true});
  overlay.once('ready-to-show',()=>{if(!overlay.isDestroyed()){overlay.showInactive();breakError=null;}});
  loadRenderer(overlay, "#/break").catch(error=>{breakError='Cat window could not load: '+error.message;if(!overlay.isDestroyed())overlay.close();});
  overlay.on('unresponsive',()=>{breakError='Cat window stopped responding. Retrying.';if(!overlay.isDestroyed())overlay.destroy();});
  overlay.on("closed", () => { if(breakWindow===overlay)breakWindow=null; });
}

function reminderTick() {
  const now=performance.now(),elapsed=now-lastReminderTick;lastReminderTick=now;
  store.data.sittingSeconds=breakTick({seconds:store.data.sittingSeconds,elapsed,paused:store.data.paused,locked,suspended,showing:Boolean(breakWindow)});
  if(!suspended&&!locked&&!store.data.paused&&store.data.sittingSeconds>=store.data.settings.breakIntervalSeconds&&Date.now()>=snoozedUntil&&Date.now()-lastBreakAttempt>30000) showBreakWindow();
  if(suspended||locked)return;
  const due=dueReminders(store.data);
  for(const row of due) {
    if(Notification.isSupported()) {
      const notice=new Notification({title:'A tiny reminder from your cat',body:row.title,silent:false,icon:appAsset('cat-coach.png')});
      notifications.add(notice);
      notice.on('click',()=>{mainWindow.show();mainWindow.focus();});
      notice.on('close',()=>notifications.delete(notice));
      notice.on('failed',()=>notifications.delete(notice));
      notice.show();
    }
    row.notifiedAt=new Date().toISOString();
  }
  if(due.length) {store.persist();mainWindow?.webContents.send('planner:changed');}
}

function queryActiveWindow() {
  return foreground.read();
}

async function readBrowserContext() {
  if(contextBusy||suspended||locked||store.data.paused) return;
  contextBusy=true;
  const currentGeneration=generation;
  try {
    const sample=await contextReader.read();
    if(currentGeneration===generation) browserContext=sample?.appName?{sample,receivedAt:performance.now()}:null;
  } finally {contextBusy=false;}
}

async function sampleActivity() {
  if (sampling) return;
  if (suspended || locked) {activityClock.reset();return;}
  if (store.data.paused) {
    activeApp = "Paused";
    activityClock.reset();
    return;
  }
  if (!store.data.settings.countPassiveTime && powerMonitor.getSystemIdleTime() >= store.data.settings.idleThresholdSeconds) {
    store.endSession();
    activityClock.reset();
    activeApp = "Idle";
    return;
  }
  sampling = true;
  const requestGeneration = generation;
  let sample;
  const readStarted=performance.now();
  try { sample = await queryActiveWindow(); } catch(error) {trackingError=error.message;} finally { sampling = false; }
  trackingHealth.lastReadMs=Math.round(performance.now()-readStarted);
  if (requestGeneration !== generation || quitting || suspended || locked || store.data.paused) return;
  trackingError = sample?.unstable ? 'Window changed during lookup. Ambiguous sample skipped.' : sample?.accessibility===false ? 'macOS Accessibility access is needed for window titles and websites. App time still counts. Open Settings → Mac permissions.' : sample ? null : process.platform==='darwin' ? 'Mac collector unavailable. Check Mac permissions in Settings and restart after granting access. Development builds also require npm run build:mac-helper.' : "Cannot read the active window. Retrying automatically.";
  if(process.platform==='darwin')trackingHealth.accessibility=sample?.accessibility??null;
  if (!sample?.appName) {trackingHealth.rejected++;store.endSession();activityClock.reset();return;}
  if(browserContext && performance.now()-browserContext.receivedAt<3000 && sameContext(sample,browserContext.sample)) sample.address=browserContext.sample.address;
  trackingHealth.accepted++;
  trackingHealth.lastObservedAt=new Date(Number.isFinite(sample.observedAt)?sample.observedAt:Date.now()).toISOString();
  const interval=activityClock.observe(sample,Number.isFinite(sample.observedTick)?sample.observedTick:performance.now(),Number.isFinite(sample.observedAt)?sample.observedAt:Date.now());
  if(interval) {
    const previous=interval.sample;
    const website=websiteFromSample(previous);
    const fallback=classifyActivity(previous.appName,previous.windowTitle,store.data.learnedRules,website,store.data.settings.classificationRules || []);
    const context={...previous,website};
    const classification=fallback.confidence===1?fallback:(recognition.lookup(context)||fallback);
    store.addSample(previous,interval.seconds,classification,deviceId,interval.endedAt);
    recognition.track(context,interval.seconds,fallback);
  }
  if(sample.processId===process.pid||sample.appName.toLowerCase()==='purrductive'){store.endSession();activityClock.reset();activeApp='Purrductive dashboard';return;}
  const iconKey=sample.appName.toLowerCase().replace(/\.exe$/, '').replace(/\.root$/, '');
  if (sample.executablePath && !iconAttempts.has(iconKey) && iconAttempts.size<300) {
    iconAttempts.add(iconKey);
    app.getFileIcon(sample.executablePath,{size:'small'}).then(icon => {if (!icon.isEmpty()) appIcons[iconKey]=icon.toDataURL();}).catch(() => {});
  }
  activeApp = sample.appName;
  const website = websiteFromSample(sample);
  if (BROWSERS.has(sample.appName.toLowerCase())) websiteStatus = website ? "Reading browser address bar" : "Address bar unavailable. Browser app time still counts.";
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
  if(process.platform==='darwin')icon.setTemplateImage(true);
  tray = new Tray(icon);
  refreshTrayMenu();
  tray.on("double-click", () => mainWindow.show());
}

function toggleTracking() {
  store.endSession();
  generation++;
  activityClock.reset();
  lastReminderTick=performance.now();
  store.data.paused = !store.data.paused;
  activeApp = store.data.paused ? "Paused" : "Resuming…";
  lastSampleAt = Date.now();
  store.persist();
  refreshTrayMenu();
  return store.data.paused;
}

function configureLogin() {
  if(!app.isPackaged)return;
  app.setLoginItemSettings(process.platform==='darwin'?{openAtLogin:store.data.settings.launchAtLogin}:{openAtLogin:store.data.settings.launchAtLogin,path:app.getPath('exe')});
}
app.whenReady().then(() => {
  store = new ActivityStore(app.getPath("userData"));
  keyVault=new KeyVault(app.getPath('userData'),safeStorage);
  store.data.recognitionUsage ||= {day:'',count:0};
  recognition=new Recognition({getSettings:()=>store.data.settings.recognition,getKey:()=>keyVault.get(),usage:store.data.recognitionUsage,onUsage:()=>store.persist(),
    onResult:(sample,decision,since)=>{
      for(const row of store.data.segments) {
        if(row.manual||row.endedAt<since||contextKey(row)!==contextKey(sample))continue;
        const local=classifyActivity(row.appName,row.windowTitle,store.data.learnedRules,row.website,store.data.settings.classificationRules||[]);
        if(local.confidence!==1)Object.assign(row,decision);
      }
      store.persist();
    }});
  if(process.platform==='win32')app.setAppUserModelId('com.purrductive.app');
  Menu.setApplicationMenu(process.platform==='darwin'?Menu.buildFromTemplate([
    {role:'appMenu'},{role:'editMenu'},{role:'viewMenu'},{role:'windowMenu'}
  ]):null);
  createMainWindow();
  setupTray();
  configureLogin();
  sampleTimer = setInterval(()=>sampleActivity().catch(error=>{trackingError=error.message;activityClock.reset();}), 250);
  contextTimer=setInterval(()=>readBrowserContext().catch(()=>{browserContext=null;}),1000);
  persistTimer = setInterval(() => {try {store.persist();}catch(error){trackingError='Could not save activity: '+error.message;}}, 15000);
  lastReminderTick=performance.now();
  reminderTimer=setInterval(()=>{try{reminderTick();if(!locked&&!suspended&&!store.data.paused)recognition.tick().catch(()=>{});}catch(error){breakError='Reminder error: '+error.message;}},1000);
  sampleActivity();
  powerMonitor.on("suspend", () => { suspended = true; generation++; activityClock.reset();foreground.stop();contextReader.stop();browserContext=null; store.endSession(); store.persist(); });
  powerMonitor.on("lock-screen", () => { locked = true; generation++;activityClock.reset(); store.endSession(); store.persist(); });
  powerMonitor.on("resume", () => { suspended = false; lastSampleAt = Date.now(); store.data.sittingSeconds = 0; });
  powerMonitor.on("unlock-screen", () => { locked = false; lastSampleAt = Date.now(); });
});

app.on("second-instance", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});
app.on('activate',()=>{if(!store)return;if(!mainWindow||mainWindow.isDestroyed())createMainWindow();else{mainWindow.show();mainWindow.focus();}});

ipcMain.handle('mac:permissions',()=>({platform:process.platform,
  accessibility:process.platform==='darwin'?systemPreferences.isTrustedAccessibilityClient(false):null,
  collectorAccessibility:trackingHealth.accessibility??null,
  helperAvailable:process.platform==='darwin'?require('node:fs').existsSync(require('./mac-reader.cjs').helperPath({isPackaged:app.isPackaged,resourcesPath:process.resourcesPath})):null
}));
ipcMain.handle('mac:request-access',async()=>{
  if(process.platform!=='darwin')return false;
  systemPreferences.isTrustedAccessibilityClient(true);
  await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
  return true;
});
ipcMain.handle('mac:retry',()=>{
  if(process.platform!=='darwin')return false;
  generation++;foreground.stop();contextReader.stop();browserContext=null;activityClock.reset();store.endSession();return true;
});

ipcMain.handle("tracker:snapshot", () => ({
  segments: store.recent(), settings: store.data.settings, icons: appIcons,
  live: { activeApp, recognitionStatus:recognition.status,trackingError,trackingHealth, breakError,websiteStatus, paused: Boolean(store.data.paused), sittingSeconds: store.data.sittingSeconds, nextBreakIn: Math.max(0,store.data.settings.breakIntervalSeconds-store.data.sittingSeconds,(snoozedUntil-Date.now())/1000), lastSavedAt: store.data.updatedAt }
}));

ipcMain.handle("tracker:toggle", () => toggleTracking());

ipcMain.handle("tracker:recategorize", (_event, { id, category }) => {
  if (!["productive", "distraction", "neutral"].includes(category)) return false;
  const segment = store.data.segments.find(item => item.id === id);
  if (!segment) return false;
  const rule = createLearnedRule(segment, category);
  const existing = store.data.learnedRules.find(item => item.appName.toLowerCase() === rule.appName.toLowerCase() && item.windowTitle === rule.windowTitle && (item.website||null)===(rule.website||null));
  if (existing) { Object.assign(existing, rule, { weight: Math.min(5, existing.weight + 1) }); }
  else store.data.learnedRules.push(rule);
  Object.assign(segment, { category, confidence: 1, reason: "You taught me this", manual: true });
  // Apply this exact correction to earlier automatic entries for the same context, not unrelated pages.
  for(const row of store.data.segments) {
    if(!row.manual && row.appName===segment.appName && row.windowTitle===segment.windowTitle && (row.website||null)===(segment.website||null)) Object.assign(row,{category,confidence:1,reason:'Your correction for this exact activity'});
  }
  store.persist();
  return true;
});

ipcMain.handle("settings:save", (_event, settings) => {
  const previousRecognition=JSON.stringify(store.data.settings.recognition);
  store.data.settings = {
    ...store.data.settings,
    idleThresholdSeconds: Math.max(30, Math.min(300, Number(settings.idleThresholdSeconds) || 60)),
    breakIntervalSeconds: Math.max(1800, Math.min(10800, Number(settings.breakIntervalSeconds) || 7200)),
    launchAtLogin: Boolean(settings.launchAtLogin),
    countPassiveTime: Boolean(settings.countPassiveTime),
    catId:['silver','tuxedo','siamese','ginger'].includes(settings.catId)?settings.catId:'silver',
    recognition:recognitionSettings(settings.recognition),
    classificationRules: (Array.isArray(settings.classificationRules)?settings.classificationRules:[]).slice(0,200).filter(r=>['app','website'].includes(r.scope)&&['productive','distraction','neutral'].includes(r.category)&&String(r.match||'').trim()).map(r=>({scope:r.scope,category:r.category,match:String(r.match).trim().toLowerCase().slice(0,180)})),
    sync: { url: String(settings.sync?.url || ""), key: String(settings.sync?.key || ""), companionUrl: String(settings.sync?.companionUrl || "") }
  };
  if(previousRecognition!==JSON.stringify(store.data.settings.recognition))recognition.reset();
  configureLogin();
  store.persist();
  return store.data.settings;
});

ipcMain.handle('recognition:key',(_event,value)=>{
  if(typeof value!=='string'||value.length>512)throw new Error('Invalid key');
  keyVault.set(value);recognition.reset();return {hasKey:Boolean(keyVault.get())};
});
ipcMain.handle('recognition:status',()=>({hasKey:Boolean(keyVault.get()),status:recognition.status,usage:store.data.recognitionUsage}));

ipcMain.handle("break:acknowledge", () => {
  if(!breakIsPreview){snoozedUntil = 0;store.data.sittingSeconds = 0;}
  store.persist();
  if (breakWindow && !breakWindow.isDestroyed()) breakWindow.close();
  return true;
});

ipcMain.handle('break:preview',()=>{showBreakWindow(true);return true;});
ipcMain.on('break:interactive',(event,enabled)=>{if(breakWindow&&!breakWindow.isDestroyed()&&event.sender===breakWindow.webContents)breakWindow.setIgnoreMouseEvents(!enabled,{forward:true});});
ipcMain.handle('planner:get',()=>plannerState(store.data));
ipcMain.handle('planner:change',(_event,action)=>{const result=changePlanner(store.data,action);store.persist();return result;});
ipcMain.handle('tracker:reclassify',()=>{
  let count=0;
  for(const row of store.data.segments) if(!row.manual){const local=classifyActivity(row.appName,row.windowTitle,store.data.learnedRules,row.website,store.data.settings.classificationRules||[]);Object.assign(row,local.confidence===1?local:(recognition.lookup(row)||local));count++;}
  store.persist();return count;
});

ipcMain.handle('break:snooze', () => {
  if(!breakIsPreview)snoozedUntil = Date.now() + 5 * 60000;
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
  recognition?.reset();
  foreground.stop();
  contextReader.stop();
  clearInterval(sampleTimer); clearInterval(persistTimer);clearInterval(reminderTimer);clearInterval(contextTimer);
  if (store) store.persist();
});

// Keep tracking in the menu bar/system tray when the dashboard is closed.
app.on("window-all-closed", () => {});
