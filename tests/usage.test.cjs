const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ActivityStore } = require('../electron/store.cjs');
const { websiteFromSample } = require('../electron/website.cjs');
const classification = { category: 'neutral', confidence: .4, reason: 'test' };

test('domains are normalized without persisting paths or queries', () => {
  const site = address => websiteFromSample({ appName: 'msedge', address });
  assert.equal(site('https://m.youtube.com/watch?v=private'), 'youtube.com');
  assert.equal(site('twitter.com/home'), 'x.com');
  assert.equal(site('https://instagram.com.evil.test/path'), 'instagram.com.evil.test');
  assert.equal(site('cats on youtube'), null);
  assert.equal(site('edge://newtab'), null);
  assert.equal(websiteFromSample({ appName: 'notepad', address: 'youtube.com' }), null);
});

test('title changes do not inflate visits, switching apps and sites does', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'purrductive-visits-'));
  try {
    const store = new ActivityStore(directory);
    const add = (appName, windowTitle, address) => store.addSample({ appName, windowTitle, address }, 5, classification, 'test');
    add('msedge', 'Video A', 'youtube.com/watch?v=a');
    add('msedge', 'Video B', 'youtube.com/watch?v=b');
    add('msedge', 'Feed', 'x.com/home');
    add('WhatsApp', 'Chat', null);
    add('msedge', 'Video A', 'youtube.com/watch?v=a');
    const { usageRows } = await import('../src/lib/usage.mjs');
    const apps = usageRows(store.recent());
    assert.equal(apps.find(r => r.key === 'msedge').count, 2);
    assert.equal(apps.find(r => r.key === 'msedge').seconds, 20);
    assert.equal(usageRows(store.recent(), 'sites').find(r => r.key === 'youtube.com').count, 2);
    store.persist();
    assert.equal(usageRows(new ActivityStore(directory).recent()).find(r => r.key === 'msedge').count, 2);
    store.endSession();
    add('msedge', 'Video A', 'youtube.com/watch?v=a');
    assert.equal(usageRows(store.recent()).find(r => r.key === 'msedge').count, 3);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('legacy time remains available without inventing old visit counts', async () => {
  const { usageRows } = await import('../src/lib/usage.mjs');
  const rows = usageRows([{ appName: 'Spotify', seconds: 60, category: 'neutral' }]);
  assert.equal(rows[0].seconds, 60);
  assert.equal(rows[0].count, 0);
  assert.equal(rows[0].legacy, true);
});
