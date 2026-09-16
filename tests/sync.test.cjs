const test=require('node:test');
const assert=require('node:assert/strict');
test('cloud uploads batch changes, skip unchanged data, and retry failed batches',async()=>{
  const {pushSegments}=await import('../src/lib/sync.js');
  const batches=[];let fail=false;
  const client={from:()=>({upsert:async rows=>{batches.push(rows);return {error:fail ? new Error('offline') : null};}})};
  const rows=Array.from({length:501},(_,i)=>({id:String(i),seconds:5,appName:'code'}));
  await pushSegments(client,rows,{id:'user'});assert.deepEqual(batches.map(b=>b.length),[250,250,1]);
  await pushSegments(client,rows,{id:'user'});assert.equal(batches.length,3);
  rows[0].seconds=10;fail=true;await assert.rejects(pushSegments(client,rows,{id:'user'}),/offline/);
  fail=false;await pushSegments(client,rows,{id:'user'});assert.equal(batches.at(-1)[0].seconds,10);
});
test('cloud history pagination reads beyond a server page without duplicating rows',async()=>{
  const {pullRecent}=await import('../src/lib/sync.js');
  const all=Array.from({length:1201},(_,i)=>({id:String(i).padStart(6,'0'),device_id:'test',seconds:5}));
  let pages=0;
  const client={from(){let after='';const q={select:()=>q,eq:()=>q,gte:()=>q,order:()=>q,limit:()=>q,gt:(_key,value)=>{after=value;return q;},then(resolve){pages++;resolve({data:all.filter(r=>r.id>after).slice(0,200),error:null});}};return q;}};
  const rows=await pullRecent(client,{id:'user'});assert.equal(rows.length,1201);assert.equal(new Set(rows.map(r=>r.id)).size,1201);assert.equal(pages,8);
});
