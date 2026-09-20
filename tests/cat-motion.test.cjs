const {test}=require('node:test');
const assert=require('node:assert/strict');

test('crawl advances through eight poses with forward travel',async()=>{
  const {crawlMotion,CRAWL_CYCLE_MS}=await import('../src/lib/cat-motion.mjs');
  let previous=-Infinity;
  for(let i=0;i<8;i++){
    const pose=crawlMotion(i*CRAWL_CYCLE_MS/8,600,1920);
    assert.equal(pose.frame,i);
    assert.ok(pose.x>previous);previous=pose.x;
    assert.equal(pose.done,false);
  }
  assert.equal(crawlMotion(CRAWL_CYCLE_MS,600,1920).frame,0);
});

test('arrival stops at destination; reduced motion skips travel',async()=>{
  const {crawlMotion}=await import('../src/lib/cat-motion.mjs');
  for(const viewport of [800,1920]){
    const initial=crawlMotion(0,400,viewport);
    const end=crawlMotion(initial.duration,400,viewport);
    assert.equal(end.done,true);assert.equal(end.frame,0);
    assert.ok(Math.abs(end.x-viewport*(viewport<=1100?.02:.18))<1e-8);
    assert.deepEqual(crawlMotion(initial.duration*2,400,viewport),end);
    assert.deepEqual(crawlMotion(0,400,viewport,true),end);
  }
  assert.ok(Number.isFinite(crawlMotion(0,0,800).duration));
});

test('frame placement preserves scale and ground baseline',async()=>{
  const {framePlacement}=await import('../src/lib/cat-motion.mjs');
  const frames=[{width:400,height:200},{width:420,height:210}];
  const poses=frames.map(f=>framePlacement(f,frames));
  for(const p of poses){assert.ok(p.x>=0);assert.ok(p.y>=0);assert.ok(Math.abs(p.y+p.height-539)<1e-8);}
  assert.equal(poses[0].width/400,poses[1].width/420);
});

test('atlas detection orders separate silhouettes and rejects missing frames',async()=>{
  const {crawlFrames}=await import('../src/lib/cat-motion.mjs');
  const width=80,height=40,data=new Uint8ClampedArray(width*height*4);
  for(let row=0;row<2;row++)for(let col=0;col<4;col++){
    for(let y=row*20+3;y<row*20+13;y++)for(let x=col*20+2;x<col*20+14;x++)data[(y*width+x)*4+3]=255;
  }
  const frames=crawlFrames(data,width,height);
  assert.equal(frames.length,8);
  assert.deepEqual(frames.map(f=>[f.x,f.y]),[[2,3],[22,3],[42,3],[62,3],[2,23],[22,23],[42,23],[62,23]]);
  assert.throws(()=>crawlFrames(new Uint8ClampedArray(width*height*4),width,height),/eight/);
});
