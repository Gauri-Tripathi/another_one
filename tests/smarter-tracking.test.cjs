const test=require('node:test');const assert=require('node:assert/strict');
const {classifyActivity,createLearnedRule}=require('../electron/classifier.cjs');
const {ActivityClock,breakTick}=require('../electron/timing.cjs');
test('learning on YouTube is productive; ambiguous social use is not condemned',()=>{
  assert.equal(classifyActivity('chrome','Python tutorial - YouTube',[],'youtube.com').category,'productive');
  assert.equal(classifyActivity('discord','Study group lecture notes').category,'productive');
  for(const app of ['Spotify','Discord','WhatsApp.Root'])assert.equal(classifyActivity(app,'Home').category,'neutral');
  assert.equal(classifyActivity('chrome','YouTube',[],'youtube.com').category,'neutral');
});
test('a generic shared token never spreads a correction to unrelated activities',()=>{
  const rule={...createLearnedRule({appName:'chrome',windowTitle:'YouTube funny cats'},'distraction'),tokens:['youtube'],weight:5};
  assert.equal(classifyActivity('chrome','YouTube calculus lecture',[rule]).category,'productive');
  assert.equal(classifyActivity('decodeplayer','Home').category,'neutral');
});
test('exact correction beats domain rule which beats app default',()=>{
  const rules=[{scope:'app',match:'chrome',category:'distraction'},{scope:'website',match:'youtube.com',category:'productive'}];
  assert.equal(classifyActivity('chrome','Home',[],'youtube.com',rules).category,'productive');
  const learned=[createLearnedRule({appName:'chrome',windowTitle:'Home',website:'youtube.com'},'neutral')];
  assert.equal(classifyActivity('chrome','Home',learned,'youtube.com',rules).category,'neutral');
});
test('fractional polling does not invent time and elapsed time belongs to previous foreground app',()=>{
  const clock=new ActivityClock();let seconds=0;
  assert.equal(clock.observe({appName:'code'},0,100000),null);
  for(let i=1;i<=100;i++){const interval=clock.observe({appName:'code'},i*2100,100000+i*2100);seconds+=interval?.seconds||0;}
  assert.equal(seconds,210);
  const interval=clock.observe({appName:'chrome'},212000,312000);assert.equal(interval.sample.appName,'code');assert.equal(interval.seconds,2);
  clock.reset();assert.equal(clock.observe({appName:'chrome'},215000,315000),null);
  assert.equal(clock.observe({appName:'chrome'},300000,400000),null);
});
test('break clock is independent of idle or failed window samples; blocked states stop it',()=>{
  const input={seconds:7199,elapsed:1000,paused:false,locked:false,suspended:false,showing:false};
  assert.equal(breakTick(input),7200);
  for(const key of ['paused','locked','suspended','showing'])assert.equal(breakTick({...input,[key]:true}),7199);
  assert.equal(breakTick({...input,elapsed:80000}),7199);
});
test('duration formatting retains seconds above minute and hour boundaries',async()=>{
  const {secondsToClock}=await import('../src/lib/time.js');
  assert.equal(secondsToClock(59),'59s');assert.equal(secondsToClock(61),'1m 01s');assert.equal(secondsToClock(3661),'1h 01m 01s');assert.equal(secondsToClock(0),'0s');
});
