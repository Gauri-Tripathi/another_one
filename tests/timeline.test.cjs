const test=require('node:test');
const assert=require('node:assert/strict');
test('timeline conserves active seconds across hour boundaries',async()=>{
  const {timelineHours}=await import('../src/lib/timeline.mjs');
  const hours=timelineHours([{startedAt:'2026-09-16T09:30:00',endedAt:'2026-09-16T10:30:00',seconds:1800,category:'productive'}],'2026-09-16');
  assert.equal(hours.length,24);assert.equal(hours[9].productive,900);assert.equal(hours[10].productive,900);
  assert.equal(hours.reduce((n,h)=>n+h.productive,0),1800);assert.equal(hours[8].segments.length,0);
});
test('midnight clipping distributes time to the correct day without changing IDs',async()=>{
  const {segmentsForDay}=await import('../src/lib/timeline.mjs');
  const rows=[{id:'original',startedAt:'2026-09-15T23:59:00',endedAt:'2026-09-16T00:01:00',seconds:120}];
  const a=segmentsForDay(rows,'2026-09-15'),b=segmentsForDay(rows,'2026-09-16');
  assert.equal(a[0].seconds,60);assert.equal(b[0].seconds,60);assert.equal(b[0].id,'original');
  assert.equal(segmentsForDay(rows,'2026-09-17').length,0);assert.equal(rows[0].seconds,120);
});
test('timeline ignores invalid spans and does not turn legacy gaps into active time',async()=>{
  const {timelineHours}=await import('../src/lib/timeline.mjs');
  const hours=timelineHours([{startedAt:'bad',endedAt:'bad',seconds:500},{startedAt:'2026-09-16T12:00:00',endedAt:'2026-09-16T14:00:00',seconds:120,category:'neutral'}],'2026-09-16');
  assert.equal(hours[12].neutral,60);assert.equal(hours[13].neutral,60);assert.deepEqual(timelineHours([],'bad'),[]);
});
test('friendly app names merge Windows executable suffixes',async()=>{
  const {usageRows,appLabel}=await import('../src/lib/usage.mjs');
  const rows=usageRows([{appName:'WhatsApp.Root',seconds:60},{appName:'whatsapp.exe',seconds:30}]);
  assert.equal(rows.length,1);assert.equal(rows[0].name,'WhatsApp');assert.equal(rows[0].seconds,90);assert.equal(appLabel('msedge'),'Microsoft Edge');
});
test('pairing accepts public settings and rejects malformed or privileged links',async()=>{
  const {parsePairing}=await import('../src/lib/pairing.mjs');
  const link=x=>'#connect='+encodeURIComponent(JSON.stringify(x));
  const good={url:'https://project.supabase.co',key:'sb_publishable_example'};
  assert.equal(parsePairing(link(good)).url,good.url);
  assert.equal(parsePairing(link({...good,url:'http://project.supabase.co'})),null);
  assert.equal(parsePairing(link({...good,key:'sb_secret_123'})),null);
  const payload=Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url');
  assert.equal(parsePairing(link({...good,key:'header.'+payload+'.signature'})),null);
  assert.equal(parsePairing('#connect=%nope'),null);
});
