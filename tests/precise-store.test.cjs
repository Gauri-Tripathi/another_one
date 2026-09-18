const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {PreciseActivityClock}=require('../electron/timing.cjs');
const {ActivityStore}=require('../electron/store.cjs');
test('hundreds of fractional switches conserve per-app totals across persistence',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'purr-precision-'));
  try {
    const store=new ActivityStore(dir),clock=new PreciseActivityClock(),start=Date.now();
    clock.observe({appName:'alpha',windowTitle:'A'},0,start);
    const expected={alpha:0,beta:0};
    let tick=0;
    for(let i=1;i<=600;i++) {
      tick+=125+i%4;
      const row=clock.observe({appName:i%2?'beta':'alpha',windowTitle:'A'},tick,start+tick);
      expected[row.sample.appName]+=row.seconds;
      store.addSample(row.sample,row.seconds,{category:'neutral',confidence:.3,reason:'test'},'device',row.endedAt);
    }
    store.persist();const restored=new ActivityStore(dir);
    const actual={alpha:0,beta:0};let end=0;
    for(const row of restored.data.segments){actual[row.appName]+=row.seconds;assert.ok(Date.parse(row.startedAt)>=end);end=Date.parse(row.endedAt);assert.ok(Math.abs((Date.parse(row.endedAt)-Date.parse(row.startedAt))/1000-row.seconds)<.0011);}
    assert.deepEqual(actual,expected);assert.ok(Math.abs(actual.alpha+actual.beta-tick/1000)<1e-8);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('sub-second entries are displayed honestly and fractional cloud values remain intact',async()=>{
  const {secondsToClock}=await import('../src/lib/time.js');assert.equal(secondsToClock(.125),'<1s');
  const {pushSegments}=await import('../src/lib/sync.js');let sent;
  await pushSegments({from:()=>({upsert:async rows=>{sent=rows;return {};}})},[{id:'test',seconds:.125}],{id:'user'});
  assert.equal(sent[0].seconds,.125);
  await assert.rejects(pushSegments({from:()=>({upsert:async()=>({error:{code:'22P02',message:'invalid input syntax for type integer'}})})},[{id:'test',seconds:.125}],{id:'user'}),/migration/);
});
