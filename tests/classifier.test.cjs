const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyActivity, createLearnedRule } = require("../electron/classifier.cjs");

test("classifies development tools as productive", () => {
  assert.equal(classifyActivity("Code", "App.jsx", []).category, "productive");
});

test("classifies entertainment titles as distracting", () => {
  assert.equal(classifyActivity("chrome", "YouTube — cat videos", []).category, "distraction");
});

test("learned corrections beat generic signals", () => {
  const segment = { appName: "chrome", windowTitle: "YouTube creator analytics" };
  const rule = createLearnedRule(segment, "productive");
  assert.equal(classifyActivity("chrome", "YouTube creator analytics", [rule]).category, "productive");
});

test("leaves ambiguous activity unsorted", () => {
  assert.equal(classifyActivity("explorer", "Downloads", []).category, "neutral");
});

