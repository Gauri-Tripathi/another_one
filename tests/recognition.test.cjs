const test=require('node:test'),assert=require('node:assert/strict');
const {Recognition,recognitionSettings,parseDecision,cleanTitle,excluded,KeyVault}=require('../electron/recognition.cjs');
const {PreciseActivityClock,sameContext}=require('../electron/timing.cjs');
const sample={appName:'chrome',windowTitle:'Understanding eigenvectors visually - YouTube',website:'youtube.com'};
const fallback={category:'neutral',confidence:.35};
const reply=decision=>({ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(decision)}]}]})});
function harness(options={}) {
  let now=Date.parse('2026-09-18T12:00:00Z'),config=recognitionSettings({enabled:true}),key='test-only';
  const calls=[],results=[],usage={};
  const engine=new Recognition({getSettings:()=>config,getKey:()=>key,usage,onResult:(...r)=>results.push(r),now:()=>now,
    fetchImpl:async(url,request)=>{calls.push({url,request});return reply({category:'productive',confidence:.9,reason:'Mathematical explanation'});},...options});
  return {engine,calls,results,usage,setConfig:input=>{config=recognitionSettings(input);engine.reset();},setKey:k=>key=k,advance:ms=>now+=ms};
}
test('fractional time stays with its own app through rapid switches, reset, clock changes and sleep',()=>{
  const c=new PreciseActivityClock();c.observe({appName:'a'},0,100000);
  const a=c.observe({appName:'b'},125,100125),b=c.observe({appName:'c'},500,400000);
  assert.equal(a.sample.appName,'a');assert.equal(a.seconds,.125);assert.equal(b.sample.appName,'b');assert.equal(b.seconds,.375);
  assert.equal(b.endedAt.getTime()-a.endedAt.getTime(),375,'wall-clock adjustment cannot expand the interval');
  assert.equal(c.observe({},90000,500000),null);c.reset();assert.equal(c.observe({},91000,501000),null);
  assert.equal(c.observe({},91000,501000),null,'duplicate observations do not count twice');
});
test('slow address results only match the exact window, process and title',()=>{
  const s={processId:1,windowId:'10',windowTitle:'Page A'};
  assert.equal(sameContext(s,{...s}),true);
  for(const k of ['processId','windowId','windowTitle'])assert.equal(sameContext(s,{...s,[k]:'different'}),false);
});
test('no consent, no key, manual decision and excluded domains produce no AI requests',async()=>{
  const h=harness();h.setConfig({enabled:false});h.engine.track(sample,10,fallback);await h.engine.tick();assert.equal(h.calls.length,0);
  h.setConfig({enabled:true});h.setKey('');h.engine.track(sample,10,fallback);await h.engine.tick();assert.equal(h.calls.length,0);
  h.setKey('test');h.engine.track(sample,10,{confidence:1});await h.engine.tick();assert.equal(h.calls.length,0);
  h.setConfig({enabled:true,excludedDomains:'youtube.com'});h.engine.track(sample,10,fallback);await h.engine.tick();assert.equal(h.calls.length,0);
  assert.equal(excluded({...sample,website:'m.youtube.com'},recognitionSettings({excludedDomains:'youtube.com'})),true);
  assert.equal(excluded({...sample,website:null},recognitionSettings()),true,'unknown browser domains cannot bypass privacy exclusions');
});
test('AI uses minimal structured payload, caches purpose, respects dwell and daily limit',async()=>{
  const h=harness();h.setConfig({enabled:true,dailyLimit:1,workContext:'Studying linear algebra'});
  h.engine.track(sample,2,fallback);await h.engine.tick();assert.equal(h.calls.length,0);
  h.engine.track(sample,1,fallback);await h.engine.tick();assert.equal(h.calls.length,1);assert.equal(h.engine.lookup(sample).category,'productive');
  const body=JSON.parse(h.calls[0].request.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(JSON.parse(body.input).domain,'youtube.com');assert.equal(body.input.includes('screenshot'),false);
  h.engine.track(sample,10,fallback);h.advance(6000);await h.engine.tick();assert.equal(h.calls.length,1);
  h.engine.track({...sample,windowTitle:'Other'},5,fallback);await h.engine.tick();assert.equal(h.calls.length,1);assert.match(h.engine.status,/limit reached/);
});
test('uncertain or invalid AI output never becomes confident distraction',()=>{
  assert.equal(parseDecision({category:'distraction',confidence:.5,reason:'unclear'}).category,'neutral');
  for(const bad of [{category:'evil',confidence:1,reason:'x'},{category:'productive',confidence:Infinity,reason:'x'},{category:'productive',confidence:1.1,reason:'x'}])assert.throws(()=>parseDecision(bad));
  assert.equal(cleanTitle('mail me@private.test https://example.com/secret?a=b'),'mail [email omitted] [URL omitted]');
});
test('revoking consent aborts and prevents late results from changing labels',async()=>{
  let resolve;const h=harness({fetchImpl:()=>new Promise(r=>resolve=r)});
  h.engine.track(sample,3,fallback);const pending=h.engine.tick();h.setConfig({enabled:false});resolve(reply({category:'distraction',confidence:1,reason:'stale'}));await pending;
  assert.equal(h.results.length,0);assert.equal(h.engine.cache.size,0);
});
test('provider failure falls back and backs off without losing tracked durations',async()=>{
  let calls=0;const h=harness({fetchImpl:async()=>{calls++;return {ok:false,status:429};}});
  h.engine.track(sample,3,fallback);await h.engine.tick();assert.match(h.engine.status,/local rules active/);assert.equal(h.results.length,0);
  h.engine.track(sample,3,fallback);h.advance(5000);await h.engine.tick();assert.equal(calls,1);
});
test('API key uses encrypted file, never activity settings; unavailable encryption refuses write',()=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'purr-key-test-'));
  try {const safe={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s.split('').reverse().join('')),decryptString:b=>b.toString().split('').reverse().join('')};
    const vault=new KeyVault(dir,safe);vault.set('secret-test');assert.equal(vault.get(),'secret-test');assert.equal(fs.readFileSync(vault.file,'utf8').includes('secret-test'),false);
    assert.equal(new KeyVault(dir,safe).get(),'secret-test');vault.clear();assert.equal(vault.get(),'');assert.equal(fs.existsSync(vault.file),false);
    assert.throws(()=>new KeyVault(dir,{isEncryptionAvailable:()=>false}).set('x'),/unavailable/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
