const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { websiteFromSample } = require("./website.cjs");

const DEFAULT_SETTINGS = {
  idleThresholdSeconds: 60,
  breakIntervalSeconds: 7200,
  launchAtLogin: true,
  sync: { url: "", key: "" }
};

function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

class ActivityStore {
  constructor(directory) {
    this.file = path.join(directory, "purrductive-data.json");
    this.backupFile = path.join(directory, "purrductive-data.backup.json");
    this.data = { version: 1, settings: DEFAULT_SETTINGS, learnedRules: [], segments: [], sittingSeconds: 0, paused: false, lastActivityAt: null, updatedAt: null };
    this.load();
  }

  load() {
    for (const candidate of [this.file, this.backupFile]) {
      try {
        const saved = JSON.parse(fs.readFileSync(candidate, "utf8"));
        this.data = { ...this.data, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings, sync: { ...DEFAULT_SETTINGS.sync, ...saved.settings?.sync } } };
        if (this.data.lastActivityAt && Date.now() - new Date(this.data.lastActivityAt).getTime() >= 300000) this.data.sittingSeconds = 0;
        return;
      } catch (error) {
        if (error.code !== "ENOENT") console.error(`Could not read ${path.basename(candidate)}:`, error.message);
      }
    }
  }

  persist() {
    const temporary = `${this.file}.tmp`;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.data.updatedAt = new Date().toISOString();
    fs.writeFileSync(temporary, JSON.stringify(this.data, null, 2));
    if (fs.existsSync(this.file)) fs.copyFileSync(this.file, this.backupFile);
    try {
      fs.renameSync(temporary, this.file);
    } catch {
      fs.copyFileSync(temporary, this.file);
      fs.unlinkSync(temporary);
    }
  }

  addSample(sample, seconds, classification, deviceId) {
    const now = new Date();
    const today = localDay(now);
    if (this.prunedDay !== today) {
      const oldest = localDay(new Date(Date.now() - 32 * 86400000));
      this.data.segments = this.data.segments.filter(item => localDay(new Date(item.startedAt)) >= oldest);
      this.prunedDay = today;
    }
    const last = this.data.segments.at(-1);
    const appKey = String(sample.appName).toLowerCase();
    const website = websiteFromSample(sample);
    if (this.activeApp !== appKey) {
      this.appSessionId = crypto.randomUUID();
      this.activeApp = appKey;
      this.activeSite = null;
    }
    if (this.activeSite !== website) {
      this.siteSessionId = website ? crypto.randomUUID() : null;
      this.activeSite = website;
    }
    const same = last && last.appSessionId === this.appSessionId && last.website === website && last.siteSessionId === this.siteSessionId && now.getTime() - new Date(last.endedAt).getTime() <= 15000 && last.appName === sample.appName && last.windowTitle === sample.windowTitle && last.category === classification.category && !last.manual && localDay(new Date(last.startedAt)) === today;
    if (same) {
      last.endedAt = now.toISOString();
      last.seconds += seconds;
      last.confidence = classification.confidence;
      last.reason = classification.reason;
    } else {
      this.data.segments.push({
        id: crypto.randomUUID(), deviceId, website, appSessionId: this.appSessionId, siteSessionId: this.siteSessionId || null, startedAt: new Date(now.getTime() - seconds * 1000).toISOString(), endedAt: now.toISOString(), seconds,
        appName: sample.appName || "Unknown", windowTitle: sample.windowTitle || "Untitled", ...classification, manual: false
      });
    }
    this.data.sittingSeconds += seconds;
    this.data.lastActivityAt = now.toISOString();
  }

  today() {
    const today = localDay();
    return this.data.segments.filter(item => localDay(new Date(item.startedAt)) === today).sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  }

  endSession() { this.activeApp = null; this.activeSite = null; this.appSessionId = null; this.siteSessionId = null; }

  recent() { return [...this.data.segments].sort((a, b) => b.endedAt.localeCompare(a.endedAt)); }

  toCsv() {
    const escape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const header = ["started_at", "ended_at", "seconds", "app", "window_title", "category", "confidence", "reason", "manual", "website", "app_session", "website_session"];
    const rows = this.recent().map(item => [item.startedAt, item.endedAt, item.seconds, item.appName, item.windowTitle, item.category, item.confidence, item.reason, item.manual, item.website, item.appSessionId, item.siteSessionId]);
    return [header, ...rows].map(row => row.map(escape).join(",")).join("\r\n");
  }
}

module.exports = { ActivityStore, DEFAULT_SETTINGS };
