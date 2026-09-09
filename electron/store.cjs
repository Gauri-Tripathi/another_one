const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

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
    this.data = { version: 1, settings: DEFAULT_SETTINGS, learnedRules: [], segments: [], sittingSeconds: 0 };
    this.load();
  }

  load() {
    try {
      const saved = JSON.parse(fs.readFileSync(this.file, "utf8"));
      this.data = { ...this.data, ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings, sync: { ...DEFAULT_SETTINGS.sync, ...saved.settings?.sync } } };
    } catch (error) {
      if (error.code !== "ENOENT") console.error("Could not read tracker store:", error.message);
    }
  }

  persist() {
    const temporary = `${this.file}.tmp`;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(temporary, JSON.stringify(this.data, null, 2));
    fs.renameSync(temporary, this.file);
  }

  addSample(sample, seconds, classification, deviceId) {
    const now = new Date();
    const today = localDay(now);
    const oldest = localDay(new Date(Date.now() - 32 * 86400000));
    this.data.segments = this.data.segments.filter(item => localDay(new Date(item.startedAt)) >= oldest);
    const last = this.data.segments.at(-1);
    const same = last && last.appName === sample.appName && last.windowTitle === sample.windowTitle && last.category === classification.category && !last.manual && localDay(new Date(last.startedAt)) === today;
    if (same) {
      last.endedAt = now.toISOString();
      last.seconds += seconds;
      last.confidence = classification.confidence;
      last.reason = classification.reason;
    } else {
      this.data.segments.push({
        id: crypto.randomUUID(), deviceId, startedAt: new Date(now.getTime() - seconds * 1000).toISOString(), endedAt: now.toISOString(), seconds,
        appName: sample.appName || "Unknown", windowTitle: sample.windowTitle || "Untitled", ...classification, manual: false
      });
    }
    this.data.sittingSeconds += seconds;
  }

  today() {
    const today = localDay();
    return this.data.segments.filter(item => localDay(new Date(item.startedAt)) === today).sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  }

  recent() { return [...this.data.segments].sort((a, b) => b.endedAt.localeCompare(a.endedAt)); }
}

module.exports = { ActivityStore, DEFAULT_SETTINGS };
