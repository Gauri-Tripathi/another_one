const test=require('node:test');const assert=require('node:assert/strict');
const {classifyActivity,createLearnedRule}=require('../electron/classifier.cjs');
const {ActivityClock}=require('../electron/timing.cjs');
test('gossip is entertainment, vague dashboard/project titles do not imply productive browsing',()=>{
  assert.equal(classifyActivity('chrome','Bollywood Gossip Hub - Google Chrome',[],'reddit.com').category,'distraction');
  assert.equal(classifyActivity('chrome','My dashboard - Reddit',[],'reddit.com').category,'neutral');
  assert.equal(classifyActivity('chrome','Project ideas',[],'google.com').category,'neutral');
  assert.equal(classifyActivity('chrome','Research on celebrity gossip',[],'reddit.com').category,'neutral');
});
test('new exact corrections do not leak across websites with identical page titles',()=>{
  const rules=[createLearnedRule({appName:'chrome',windowTitle:'Home',website:'work.example'},'productive')];
  assert.equal(classifyActivity('chrome','Home',rules,'work.example').category,'productive');
  assert.equal(classifyActivity('chrome','Home',rules,'reddit.com').category,'neutral');
  assert.equal(classifyActivity('chrome','Home',[{...rules[0],website:undefined}],'reddit.com').category,'neutral');
});
test('observation timestamps avoid adding variable lookup latency to recorded activity',()=>{
  const clock=new ActivityClock();clock.observe({appName:'code'},1000,100000);
  // The second lookup might finish much later, but acquisition timestamps define the interval.
  const interval=clock.observe({appName:'chrome'},3000,102000);
  assert.equal(interval.seconds,2);assert.equal(interval.endedAt.getTime(),102000);assert.equal(interval.sample.appName,'code');
});
test('hour selection clips both chart and detail durations to the same interval',async()=>{
  const {timelineHours}=await import('../src/lib/timeline.mjs');
  const rows=[{id:'one',startedAt:'2026-09-18T12:59:30',endedAt:'2026-09-18T13:00:30',seconds:60,category:'productive'}];
  const hours=timelineHours(rows,'2026-09-18');
  assert.equal(hours[12].productive,30);assert.equal(hours[12].segments[0].seconds,30);assert.equal(hours[13].segments[0].seconds,30);
  assert.equal(rows[0].seconds,60);
});
test('session grouping preserves totals and IDs without bridging different apps, categories or long gaps',async()=>{
  const {timelineSessions}=await import('../src/lib/timeline.mjs');
  const base={appName:'chrome',website:'reddit.com',category:'neutral',deviceId:'a',appSessionId:'visit'};
  const rows=[{...base,id:'a',startedAt:'2026-09-18T12:00:00',endedAt:'2026-09-18T12:00:02',seconds:2},{...base,id:'b',startedAt:'2026-09-18T12:00:02',endedAt:'2026-09-18T12:00:07',seconds:5},{...base,id:'c',category:'distraction',startedAt:'2026-09-18T12:00:07',endedAt:'2026-09-18T12:00:10',seconds:3}];
  const grouped=timelineSessions(rows);assert.equal(grouped.length,2);assert.equal(grouped[0].seconds,7);assert.deepEqual(grouped[0].entries.map(s=>s.id),['a','b']);assert.equal(grouped.reduce((sum,s)=>sum+s.seconds,0),10);assert.equal(rows[0].seconds,2);
  assert.equal(timelineSessions([rows[0],{...rows[1],appName:'code'}]).length,2);
  assert.equal(timelineSessions([rows[0],{...rows[1],startedAt:'2026-09-18T12:01:00',endedAt:'2026-09-18T12:01:05'}]).length,2);
});
