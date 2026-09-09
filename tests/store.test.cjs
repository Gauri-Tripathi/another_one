const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ActivityStore } = require("../electron/store.cjs");

test("activity survives repeated checkpoints and a restart", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "purrductive-store-"));
  try {
    const original = new ActivityStore(directory);
    original.addSample(
      { appName: "Code", windowTitle: "Tracker test" },
      15,
      { category: "productive", confidence: .9, reason: "Test" },
      "test-device"
    );
    original.persist();
    original.persist();

    const restarted = new ActivityStore(directory);
    assert.equal(restarted.data.segments.length, 1);
    assert.equal(restarted.data.segments[0].seconds, 15);
    assert.equal(restarted.data.segments[0].appName, "Code");
    assert.ok(fs.existsSync(path.join(directory, "purrductive-data.backup.json")));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("falls back to the backup when the primary file is damaged", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "purrductive-backup-"));
  try {
    const original = new ActivityStore(directory);
    original.addSample(
      { appName: "Code", windowTitle: "Recovery test" },
      20,
      { category: "productive", confidence: .9, reason: "Test" },
      "test-device"
    );
    original.persist();
    original.persist();
    fs.writeFileSync(path.join(directory, "purrductive-data.json"), "not valid json");

    const recovered = new ActivityStore(directory);
    assert.equal(recovered.data.segments.length, 1);
    assert.equal(recovered.data.segments[0].windowTitle, "Recovery test");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
